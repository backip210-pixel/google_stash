import { useState, useEffect } from 'react';
import type { GPMediaItem, Tag } from '../types';
import { photosApi } from '../api/photosApi';
import {
  getAllTags,
  createTag,
  deleteTag,
  tagPhoto,
  untagPhoto,
  getPhotoTags,
  getAllCategories,
  createCategory,
  deleteCategory,
  setPhotoRating,
  setPhotoNotes,
  getPhotoMetadata,
  type PhotoMetadata,
} from '../db/database';
import { X, Star, Tag as TagIcon, Plus, Trash2, ExternalLink, Camera, Calendar, Zap, Loader2 } from 'lucide-react';
import { tpdbApi, type TPDBScene } from '../api/tpdbApi';

interface PhotoDetailProps {
  photo: GPMediaItem;
  onClose: () => void;
  onRefreshTags: () => void;
}

const TAG_COLORS = [
  '#1f6feb', '#238636', '#da3633', '#f85149', '#bc8cff',
  '#3fb950', '#58a6ff', '#d29922', '#f778ba', '#79c0ff',
  '#a371f7', '#56d364', '#e3b341', '#ff7b72', '#8b949e',
];

export function PhotoDetail({ photo, onClose, onRefreshTags }: PhotoDetailProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [metadata, setMetadata] = useState<PhotoMetadata | undefined>();
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [autoTagResults, setAutoTagResults] = useState<TPDBScene[]>([]);
  const [autoTagging, setAutoTagging] = useState(false);
  const [showAutoTag, setShowAutoTag] = useState(false);

  const isVideo = photo.mimeType?.startsWith('video/');
  const fullUrl = isVideo
    ? photosApi.getVideoThumbnailUrl(photo.baseUrl, 1200, 1200)
    : photosApi.getFullSizeUrl(photo.baseUrl);

  useEffect(() => {
    loadData();
  }, [photo.id]);

  async function loadData() {
    const [photoTags, allT, cats, meta] = await Promise.all([
      getPhotoTags(photo.id),
      getAllTags(),
      getAllCategories(),
      getPhotoMetadata(photo.id),
    ]);
    setTags(photoTags);
    setAllTags(allT);
    setCategories(cats);
    setMetadata(meta);
    setNotes(meta?.notes || '');
    setRating(meta?.rating || 0);
  }

  async function handleToggleTag(tag: Tag) {
    const isTagged = tags.some(t => t.id === tag.id);
    if (isTagged && tag.id) {
      await untagPhoto(photo.id, tag.id);
    } else if (tag.id) {
      await tagPhoto(photo.id, tag.id);
    }
    await loadData();
    onRefreshTags();
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim(), newTagColor);
    setNewTagName('');
    await loadData();
    onRefreshTags();
  }

  async function handleDeleteTag(tagId: number) {
    await deleteTag(tagId);
    await loadData();
    onRefreshTags();
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    await createCategory(newCategoryName.trim(), '🏷️');
    setNewCategoryName('');
    setShowNewCategory(false);
    await loadData();
  }

  async function handleDeleteCategory(catId: number) {
    await deleteCategory(catId);
    await loadData();
  }

  async function handleRatingChange(newRating: number) {
    const r = rating === newRating ? 0 : newRating;
    setRating(r);
    await setPhotoRating(photo.id, r);
  }

  async function handleNotesBlur() {
    await setPhotoNotes(photo.id, notes);
  }

  const creationDate = new Date(photo.mediaMetadata?.creationTime || '').toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const untaggedTags = allTags.filter(t => !tags.some(pt => pt.id === t.id));

  async function handleAutoTag() {
    if (!tpdbApi.getApiKey()) {
      alert('Please configure your ThePornDB API key in Settings first.');
      return;
    }
    setAutoTagging(true);
    setShowAutoTag(true);
    try {
      const response = await tpdbApi.searchScenesByFilename(photo.filename || '');
      setAutoTagResults(response.data || []);
    } catch (err: any) {
      console.error('Auto-tag error:', err);
      alert(err.message);
    } finally {
      setAutoTagging(false);
    }
  }

  async function applySceneMatch(scene: TPDBScene) {
    // Apply performer tags
    for (const performer of scene.performers || []) {
      let tag = allTags.find(t => t.name.toLowerCase() === performer.name.toLowerCase());
      if (!tag) {
        const tagId = await createTag(performer.name, '#bc8cff');
        tag = { id: tagId, name: performer.name, color: '#bc8cff', createdAt: new Date(), updatedAt: new Date() };
      }
      if (tag.id) await tagPhoto(photo.id, tag.id);
    }

    // Apply site/studio tag
    if (scene.site) {
      let tag = allTags.find(t => t.name.toLowerCase() === scene.site!.name.toLowerCase());
      if (!tag) {
        const tagId = await createTag(scene.site.name, '#f778ba');
        tag = { id: tagId, name: scene.site.name, color: '#f778ba', createdAt: new Date(), updatedAt: new Date() };
      }
      if (tag.id) await tagPhoto(photo.id, tag.id);
    }

    // Apply scene tags
    for (const sceneTag of scene.tags || []) {
      let tag = allTags.find(t => t.name.toLowerCase() === sceneTag.name.toLowerCase());
      if (!tag) {
        const tagId = await createTag(sceneTag.name, '#1f6feb');
        tag = { id: tagId, name: sceneTag.name, color: '#1f6feb', createdAt: new Date(), updatedAt: new Date() };
      }
      if (tag.id) await tagPhoto(photo.id, tag.id);
    }

    setShowAutoTag(false);
    setAutoTagResults([]);
    await loadData();
    onRefreshTags();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col md:flex-row fade-in"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Photo panel */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-medium truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
            {photo.filename}
          </h2>
          <div className="flex items-center gap-2">
            <a
              href={photo.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
              title="Open in Google Photos"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {isVideo ? (
            <video
              src={fullUrl}
              controls
              className="max-w-full max-h-full rounded-lg"
              style={{ maxHeight: '70vh' }}
            />
          ) : (
            <img
              src={fullUrl}
              alt={photo.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </div>
      </div>

      {/* Side panel */}
      <div
        className="w-full md:w-96 overflow-y-auto slide-in"
        style={{
          background: 'var(--color-bg-secondary)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {/* Photo info */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <Calendar size={14} />
              <span>{creationDate}</span>
            </div>
            {photo.mediaMetadata?.photo && (
              <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <Camera size={14} />
                <span>
                  {photo.mediaMetadata.photo.cameraMake} {photo.mediaMetadata.photo.cameraModel}
                </span>
              </div>
            )}
            <div style={{ color: 'var(--color-text-secondary)' }}>
              {photo.mediaMetadata?.width} × {photo.mediaMetadata?.height}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => handleRatingChange(star)}
                className="cursor-pointer p-0.5"
              >
                <Star
                  size={20}
                  fill={star <= rating ? '#f0c000' : 'none'}
                  color={star <= rating ? '#f0c000' : 'var(--color-text-secondary)'}
                />
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes..."
              rows={3}
              className="w-full p-2 rounded-lg text-sm resize-none outline-none"
              style={{
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>
        </div>

        {/* Tags section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
              <TagIcon size={14} />
              Tags ({tags.length})
            </h3>
            <button
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="p-1 rounded cursor-pointer"
              style={{ color: 'var(--color-accent)' }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Current tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.length === 0 && !showTagPicker && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                No tags yet
              </p>
            )}
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => tag.id && handleToggleTag(tag)}
                className="tag-pill group"
                style={{ background: tag.color }}
              >
                {tag.name}
                <X size={12} className="ml-1 opacity-50 group-hover:opacity-100" />
              </button>
            ))}
          </div>

          {/* Auto-tag button */}
          <button
            onClick={handleAutoTag}
            disabled={autoTagging}
            className="w-full py-2 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-1.5 mb-3 disabled:opacity-50"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent)', border: '1px dashed var(--color-border)' }}
          >
            {autoTagging ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {autoTagging ? 'Searching...' : 'Auto-Tag from ThePornDB'}
          </button>

          {/* Auto-tag results */}
          {showAutoTag && (
            <div className="space-y-2 mb-3 p-3 rounded-lg fade-in" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Matches for "{photo.filename}"
              </p>
              {autoTagResults.length === 0 && !autoTagging && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No matches found</p>
              )}
              {autoTagResults.slice(0, 5).map(scene => (
                <button
                  key={scene.id}
                  onClick={() => applySceneMatch(scene)}
                  className="w-full text-left p-2 rounded-lg cursor-pointer transition-all"
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {scene.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scene.site && (
                      <span className="text-xs" style={{ color: '#f778ba', fontSize: '10px' }}>
                        {scene.site.name}
                      </span>
                    )}
                    {scene.performers?.slice(0, 3).map(p => (
                      <span key={p.id} className="text-xs" style={{ color: '#bc8cff', fontSize: '10px' }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setShowAutoTag(false); setAutoTagResults([]); }}
                className="w-full text-xs py-1 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Tag picker */}
          {showTagPicker && (
            <div className="space-y-3 p-3 rounded-lg fade-in" style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
              {/* Quick tag from existing */}
              {untaggedTags.length > 0 && (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>Add existing tag:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {untaggedTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => tag.id && handleToggleTag(tag)}
                        className="tag-pill text-xs"
                        style={{ background: tag.color }}
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Create new tag */}
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>Create new tag:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="flex-1 px-2 py-1.5 rounded text-sm outline-none"
                    style={{
                      background: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                  <button
                    onClick={handleCreateTag}
                    className="px-3 py-1.5 rounded text-sm font-medium text-white cursor-pointer"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className="w-5 h-5 rounded-full cursor-pointer"
                      style={{
                        background: color,
                        outline: newTagColor === color ? '2px solid white' : 'none',
                        outlineOffset: '1px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowTagPicker(false)}
                className="w-full text-xs py-1 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Tag Management section */}
        <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Manage Tags
          </h3>

          {/* Categories */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Categories</p>
              <button
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="text-xs cursor-pointer"
                style={{ color: 'var(--color-accent)' }}
              >
                + New
              </button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 px-2 py-1 rounded text-xs outline-none"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
                <button
                  onClick={handleCreateCategory}
                  className="px-2 py-1 rounded text-xs cursor-pointer"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  Add
                </button>
              </div>
            )}
            <div className="space-y-1">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center justify-between py-1 px-2 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                  <span className="text-xs">{cat.icon} {cat.name}</span>
                  <button
                    onClick={() => cat.id && handleDeleteCategory(cat.id)}
                    className="cursor-pointer"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* All tags list */}
          <div className="space-y-1">
            {allTags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: 'var(--color-bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: tag.color }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                </div>
                <button
                  onClick={() => tag.id && handleDeleteTag(tag.id)}
                  className="cursor-pointer"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
