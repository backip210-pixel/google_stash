import React, { useState } from 'react';
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

  React.useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setPermissionsGranted(status === 'granted');
  }

  async function selectFiles() {
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        sortBy: ['modificationTime'],
        first: 100,
      });

      const files = result.assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        mediaType: asset.mediaType,
        width: asset.width,
        height: asset.height,
      }));

      setSelectedFiles(files);
    } catch (error) {
      Alert.alert('Error', 'Failed to load photos');
    }
  }

  async function generateHashes() {
    if (selectedFiles.length === 0) {
      Alert.alert('No files', 'Please select files first');
      return;
    }

    if (!tpdbApiKey) {
      Alert.alert('No API Key', 'Please enter your ThePornDB API key');
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: selectedFiles.length });

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

    Alert.alert('Complete', `Processed ${hashes.length} files`);
  }

  async function generateFileHash(file: any) {
    const fileInfo = await FileSystem.getInfoAsync(file.uri);
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
    const tags = [];

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
      const newName = `${date}_${tags.join('_')}_${originalName}${extension}`;

      // Copy file with new name
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

      Alert.alert('Success', `File tagged and saved: ${newName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to apply tags');
    }
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}></Text>
        <Text style={styles.title}>Stash Photos</Text>
        <Text style={styles.subtitle}>Tag & organize your photos</Text>
        <TouchableOpacity style={styles.button} onPress={checkPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}> Stash Photos</Text>
        <Text style={styles.subtitle}>ThePornDB Auto-Tagger</Text>
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
                    <Text key={i} style={styles.tag}>
                      {tag}
                    </Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
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
    color: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
});
