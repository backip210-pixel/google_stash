import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

const COLORS = {
  bg: '#0d1117',
  bgSecondary: '#161b22',
  bgTertiary: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textSecondary: '#8b949e',
  accent: '#58a6ff',
  success: '#3fb950',
  danger: '#f85149',
};

export default function App() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [tpdbApiKey, setTpdbApiKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    try {
      if (Platform.OS === 'android') {
        // For Android 13+ (API 33+), use new granular permissions
        if (Platform.Version >= 33) {
          const permissions = [
            'android.permission.READ_MEDIA_IMAGES',
            'android.permission.READ_MEDIA_VIDEO',
          ];
          
          const results = await PermissionsAndroid.requestMultiple(permissions);
          const allGranted = Object.values(results).every(
            r => r === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (allGranted) {
            setPermissionsGranted(true);
          } else {
            setError('Media permissions are required. Please enable them in Settings.');
          }
        } else {
          // For Android 12 and below
          const readPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          
          if (readPermission === PermissionsAndroid.RESULTS.GRANTED) {
            setPermissionsGranted(true);
          } else {
            setError('Storage permissions are required. Please enable them in Settings.');
          }
        }
      } else {
        // iOS
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          setPermissionsGranted(true);
        } else {
          setError('Photo library permissions are required');
        }
      }
    } catch (err) {
      setError('Failed to check permissions: ' + String(err));
      console.error(err);
    }
  }

  async function selectFiles() {
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        sortBy: ['modificationTime'],
        first: 50,
      });

      const files = result.assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        mediaType: asset.mediaType,
      }));

      setSelectedFiles(files);
      setError('');
    } catch (err) {
      setError('Failed to load photos');
      console.error(err);
    }
  }

  async function generateHashes() {
    if (selectedFiles.length === 0) {
      Alert.alert('No files', 'Please select files first');
      return;
    }

    if (!tpdbApiKey.trim()) {
      Alert.alert('No API Key', 'Please enter your ThePornDB API key');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: selectedFiles.length });
    setResults([]);
    setError('');

    const hashes = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      try {
        const hash = await generateFileHash(file);
        hashes.push(hash);
      } catch (error) {
        console.error(`Error processing ${file.filename}:`, error);
      }
      setProgress({ current: i + 1, total: selectedFiles.length });
    }

    // Query ThePornDB API
    const matchedResults = await queryThePornDB(hashes);
    setResults(matchedResults);
    setGenerating(false);
  }

  async function generateFileHash(file: any) {
    const fileInfo = await FileSystem.getInfoAsync(file.uri);
    
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const sha256 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    let osHash = null;
    if (file.mediaType === 'video') {
      osHash = await generateOSHash(file.uri, fileInfo.size || 0);
    }

    return {
      sha256,
      osHash,
      size: fileInfo.size || 0,
      filename: file.filename,
      uri: file.uri,
      mediaType: file.mediaType,
    };
  }

  async function generateOSHash(fileUri: string, fileSize: number) {
    const CHUNK_SIZE = 65536;
    
    const firstChunk = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: Math.min(CHUNK_SIZE, fileSize),
    });

    const lastPosition = Math.max(0, fileSize - CHUNK_SIZE);
    const lastChunk = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: lastPosition,
      length: Math.min(CHUNK_SIZE, fileSize - lastPosition),
    });

    const combined = `${fileSize}:${firstChunk}:${lastChunk}`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  async function queryThePornDB(hashes: any[]) {
    const results = [];

    for (const hash of hashes) {
      try {
        const response = await fetch(
          `https://api.theporndb.net/scenes?parse=${encodeURIComponent(hash.filename)}&hash=${hash.sha256}`,
          {
            headers: {
              'Authorization': `Bearer ${tpdbApiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            results.push({
              file: hash,
              matches: data.data,
              tags: extractTags(data.data[0]),
            });
          } else {
            results.push({ file: hash, matches: [], tags: [] });
          }
        } else {
          console.error('TPDB API error:', response.status);
          results.push({ file: hash, matches: [], tags: [] });
        }
      } catch (error) {
        console.error('TPDB API error:', error);
        results.push({ file: hash, matches: [], tags: [] });
      }
    }

    return results;
  }

  function extractTags(scene: any) {
    const tags: string[] = [];

    if (scene.site) {
      tags.push(scene.site.name);
    }

    if (scene.performers) {
      scene.performers.forEach((p: any) => {
        if (p.name) tags.push(p.name);
      });
    }

    if (scene.tags) {
      scene.tags.forEach((t: any) => {
        if (t.name) tags.push(t.name);
      });
    }

    return [...new Set(tags)];
  }

  async function applyTags(result: any) {
    if (result.tags.length === 0) {
      Alert.alert('No tags', 'No tags to apply');
      return;
    }

    try {
      const tags = result.tags;
      const date = new Date().toISOString().split('T')[0];
      const originalName = result.file.filename.replace(/\.[^.]+$/, '');
      const extension = result.file.filename.match(/\.[^.]+$/)?.[0] || '';
      const newName = `${date}_${tags.slice(0, 3).join('_')}_${originalName}${extension}`;

      const appDir = `${FileSystem.documentDirectory}tagged/`;
      const dirInfo = await FileSystem.getInfoAsync(appDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(appDir, { intermediates: true });
      }

      const newPath = `${appDir}${newName}`;
      await FileSystem.copyAsync({
        from: result.file.uri,
        to: newPath,
      });

      Alert.alert('Success', `File tagged: ${newName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to apply tags');
      console.error(error);
    }
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📸 Stash Photos</Text>
        <Text style={styles.subtitle}>ThePornDB Auto-Tagger</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={checkPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
        {error && (
          <Text style={styles.helpText}>
            If the button doesn't work, go to Settings → Apps → Stash Photos → Permissions and enable Photos/Videos
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📸 Stash Photos</Text>
        <Text style={styles.headerSubtitle}>ThePornDB Auto-Tagger</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. ThePornDB API Key</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your TPDB API key"
          placeholderTextColor={COLORS.textSecondary}
          value={tpdbApiKey}
          onChangeText={setTpdbApiKey}
          secureTextEntry
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Select Files</Text>
        <TouchableOpacity style={styles.button} onPress={selectFiles}>
          <Text style={styles.buttonText}>
            {selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : 'Choose Files'}
          </Text>
        </TouchableOpacity>
        {selectedFiles.length > 0 && (
          <View style={styles.fileList}>
            {selectedFiles.slice(0, 5).map((file, index) => (
              <Text key={index} style={styles.fileName} numberOfLines={1}>
                {file.filename}
              </Text>
            ))}
            {selectedFiles.length > 5 && (
              <Text style={styles.moreFiles}>
                +{selectedFiles.length - 5} more
              </Text>
            )}
          </View>
        )}
      </View>

      {selectedFiles.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Generate Hashes & Tag</Text>
          {generating && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.progressText}>
                {progress.current}/{progress.total}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, generating && styles.buttonDisabled]}
            onPress={generateHashes}
            disabled={generating}
          >
            <Text style={styles.buttonText}>
              {generating ? 'Processing...' : 'Generate & Tag'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {results.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Results</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <Text style={styles.filename} numberOfLines={1}>
                {result.file.filename}
              </Text>
              {result.tags.length > 0 ? (
                <View style={styles.tagsContainer}>
                  {result.tags.slice(0, 5).map((tag, i) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  {result.tags.length > 5 && (
                    <Text style={styles.moreTags}>
                      +{result.tags.length - 5} more
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noMatch}>No match found</Text>
              )}
              {result.tags.length > 0 && (
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => applyTags(result)}
                >
                  <Text style={styles.applyButtonText}>Apply Tags</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tagged files are saved to app storage
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  error: {
    color: COLORS.danger,
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  helpText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 30,
    fontSize: 12,
    lineHeight: 18,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    margin: 15,
    padding: 20,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  input: {
    backgroundColor: COLORS.bgTertiary,
    color: COLORS.text,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fileList: {
    marginTop: 15,
    maxHeight: 150,
  },
  fileName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginVertical: 2,
  },
  moreFiles: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  progressText: {
    color: COLORS.text,
    marginTop: 10,
    fontSize: 14,
  },
  resultItem: {
    backgroundColor: COLORS.bgTertiary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  filename: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  tag: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
  },
  moreTags: {
    color: COLORS.textSecondary,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  noMatch: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 10,
  },
  applyButton: {
    backgroundColor: COLORS.success,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
