import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import type { PhotoAsset, Tag, AppView } from './src/types';
import { TAG_COLORS, DEFAULT_CATEGORIES } from './src/types';
import { fetchPhotos, requestPermissions, extractTagsFromFilename } from './src/services/photoService';
import { renamePhoto, batchRenamePhotos } from './src/services/fileService';

// Theme colors
const COLORS = {
  bg: '#0d1117',
  bgSecondary: '#161b22',
  bgTertiary: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textSecondary: '#8b949e',
  accent: '#58a6ff',
  danger: '#f85149',
  success: '#3fb950',
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('gallery');
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  
  // Tag management
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  
  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);
  
  async function checkPermissions() {
    const granted = await requestPermissions();
    setPermissionsGranted(granted);
    if (granted) {
      loadPhotos();
    }
  }
  
  async function loadPhotos(reset: boolean = false) {
    if (loading) return;
    setLoading(true);
    try {
      const result = await fetchPhotos(50, reset ? undefined : endCursor);
      setPhotos((prev) => (reset ? result.photos : [...prev, ...result.photos]));
      setHasNextPage(result.hasNextPage);
      setEndCursor(result.endCursor ?? undefined);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }
  
  function toggleSelection(photoId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
        if (next.size === 0) {
          setIsSelecting(false);
        }
      } else {
        next.add(photoId);
        setIsSelecting(true);
      }
      return next;
    });
  }
  
  function clearSelection() {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }
  
  function openTagEditor() {
    if (selectedIds.size === 0) {
      Alert.alert('No photos selected', 'Please select at least one photo');
      return;
    }
    setShowTagEditor(true);
  }
  
  async function applyTags() {
    if (selectedTags.length === 0) {
      Alert.alert('No tags', 'Please add at least one tag');
      return;
    }
    
    setLoading(true);
    try {
      const selectedPhotos = photos.filter((p) => selectedIds.has(p.id));
      const result = await batchRenamePhotos(
        selectedPhotos.map((p) => ({ uri: p.uri, filename: p.filename })),
        selectedTags
      );
      
      Alert.alert(
        'Done',
        `Successfully tagged ${result.successful}/${result.total} photos`
      );
      
      clearSelection();
      setShowTagEditor(false);
      setSelectedTags([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to apply tags');
    } finally {
      setLoading(false);
    }
  }
  
  function addNewTag() {
    if (!newTagName.trim()) return;
    
    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
      createdAt: Date.now(),
    };
    
    setTags([...tags, newTag]);
    setSelectedTags([...selectedTags, newTag.name]);
    setNewTagName('');
  }
  
  function toggleTagSelection(tagName: string) {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  }
  
  function removeTag(tagName: string) {
    setTags(tags.filter((t) => t.name !== tagName));
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  }
  
  // Render permission request screen
  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emoji}>📸</Text>
          <Text style={styles.title}>Stash Photos</Text>
          <Text style={styles.subtitle}>
            Tag & organize your photos before uploading to Google Photos
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={checkPermissions}>
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render photo grid
  const renderPhoto = ({ item }: { item: PhotoAsset }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.photoItem, isSelected && styles.photoItemSelected]}
        onPress={() => toggleSelection(item.id)}
        onLongPress={() => toggleSelection(item.id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.uri }} style={styles.photo} />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        )}
        {item.existingTags.length > 0 && (
          <View style={styles.tagIndicator}>
            <Text style={styles.tagIndicatorText}>
              {item.existingTags.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isSelecting ? `${selectedIds.size} selected` : 'Stash Photos'}
        </Text>
        <View style={styles.headerActions}>
          {isSelecting && (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={clearSelection}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tagButton} onPress={openTagEditor}>
                <Text style={styles.tagButtonText}>Tag</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      {/* Photo Grid */}
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={3}
        onEndReached={() => loadPhotos()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
          ) : null
        }
        contentContainerStyle={styles.grid}
      />
      
      {/* Tag Editor Modal */}
      <Modal
        visible={showTagEditor}
        animationType="slide"
        onRequestClose={() => setShowTagEditor(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Tags</Text>
            <TouchableOpacity onPress={() => setShowTagEditor(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {/* Selected tags */}
            <Text style={styles.sectionTitle}>Selected Tags</Text>
            <View style={styles.selectedTagsContainer}>
              {selectedTags.map((tagName) => (
                <TouchableOpacity
                  key={tagName}
                  style={styles.selectedTag}
                  onPress={() => toggleTagSelection(tagName)}
                >
                  <Text style={styles.selectedTagText}>{tagName} ✕</Text>
                </TouchableOpacity>
              ))}
              {selectedTags.length === 0 && (
                <Text style={styles.emptyText}>No tags selected</Text>
              )}
            </View>
            
            {/* Add new tag */}
            <Text style={styles.sectionTitle}>Add New Tag</Text>
            <View style={styles.addTagRow}>
              <TextInput
                style={styles.tagInput}
                placeholder="Tag name"
                placeholderTextColor={COLORS.textSecondary}
                value={newTagName}
                onChangeText={setNewTagName}
                onSubmitEditing={addNewTag}
              />
              <TouchableOpacity style={styles.addButton} onPress={addNewTag}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {/* Available tags */}
            <Text style={styles.sectionTitle}>All Tags</Text>
            <View style={styles.tagsGrid}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag.name) && styles.tagChipSelected,
                  ]}
                  onPress={() => toggleTagSelection(tag.name)}
                  onLongPress={() => {
                    Alert.alert('Delete Tag', `Delete "${tag.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => removeTag(tag.name) },
                    ]);
                  }}
                >
                  <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
                  <Text style={styles.tagChipText}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Apply button */}
          <TouchableOpacity style={styles.applyButton} onPress={applyTags}>
            <Text style={styles.applyButtonText}>
              Apply Tags ({selectedIds.size} photos)
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  tagButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tagButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    padding: 2,
  },
  photoItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 1,
    position: 'relative',
  },
  photoItemSelected: {
    opacity: 0.7,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tagIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagIndicatorText: {
    color: 'white',
    fontSize: 10,
  },
  loader: {
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 16,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
  },
  selectedTag: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedTagText: {
    color: 'white',
    fontSize: 14,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: COLORS.bgTertiary,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipSelected: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(88, 166, 255, 0.1)',
  },
  tagColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tagChipText: {
    color: COLORS.text,
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: COLORS.success,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
