import { useState, useRef, useEffect } from 'react';
import type { GPMediaItem, GPAlbum } from '../types';
import { photosApi } from '../api/photosApi';
import { getPhotoTags } from '../db/database';
import type { Tag } from '../types';
import { Loader2, Play } from 'lucide-react';

interface GalleryProps {
  items: GPMediaItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectPhoto: (photo: GPMediaItem) => void;
  selectedAlbum: string | null;
  albums: GPAlbum[];
  onSelectAlbum: (albumId: string | null) => void;
  taggedPhotoIds: Set<string>;
}

function PhotoCard({ item, onSelect, isTagged }: { item: GPMediaItem; onSelect: () => void; isTagged: boolean }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.mimeType?.startsWith('video/');
  const thumbUrl = photosApi.getThumbnailUrl(item.baseUrl, 300, 300);

  useEffect(() => {
    getPhotoTags(item.id).then(setTags);
  }, [item.id]);

  return (
    <div
      className="photo-card relative rounded-lg overflow-hidden cursor-pointer group"
      style={{
        aspectRatio: '1',
        background: 'var(--color-bg-tertiary)',
        boxShadow: isTagged ? '0 0 0 2px var(--color-tag)' : undefined,
      }}
      onClick={onSelect}
    >
      <img
        src={thumbUrl}
        alt={item.filename || ''}
        className="w-full h-full object-cover"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
      />

      {/* Video indicator */}
      {isVideo && (
        <div className="absolute bottom-2 right-2 bg-black/70 rounded-full p-1">
          <Play size={12} fill="white" color="white" />
        </div>
      )}

      {/* Tag indicator */}
      {tags.length > 0 && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          {tags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: tag.color, color: 'white', fontSize: '10px' }}
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '10px' }}>
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}
      >
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-xs text-white truncate">{item.filename}</p>
        </div>
      </div>
    </div>
  );
}

export function Gallery({
  items,
  loading,
  hasMore,
  onLoadMore,
  onSelectPhoto,
  selectedAlbum,
  albums,
  onSelectAlbum,
  taggedPhotoIds,
}: GalleryProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <div className="p-4">
      {/* Album breadcrumb */}
      {selectedAlbum && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => onSelectAlbum(null)}
            className="text-sm cursor-pointer"
            style={{ color: 'var(--color-accent)' }}
          >
            ← All Photos
          </button>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            / {albums.find(a => a.id === selectedAlbum)?.title}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {items.length} photo{items.length !== 1 ? 's' : ''}
          {taggedPhotoIds.size > 0 && (
            <span> · {taggedPhotoIds.size} tagged</span>
          )}
        </p>
      </div>

      {/* Grid */}
      {items.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="text-4xl mb-4">📷</span>
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            No photos found
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Your Google Photos library will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
            {items.map(item => (
              <PhotoCard
                key={item.id}
                item={item}
                onSelect={() => onSelectPhoto(item)}
                isTagged={taggedPhotoIds.has(item.id)}
              />
            ))}
          </div>

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {loading && <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-accent)' }} />}
            {!hasMore && items.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                End of library
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
