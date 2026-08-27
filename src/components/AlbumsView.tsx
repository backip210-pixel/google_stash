import { useEffect } from 'react';
import type { GPAlbum } from '../types';
import { photosApi } from '../api/photosApi';
import { FolderOpen, Image } from 'lucide-react';

interface AlbumsViewProps {
  albums: GPAlbum[];
  selectedAlbum: string | null;
  onSelectAlbum: (albumId: string | null) => void;
  onLoadAlbums: () => void;
}

export function AlbumsView({ albums, selectedAlbum, onSelectAlbum, onLoadAlbums }: AlbumsViewProps) {
  useEffect(() => {
    if (albums.length === 0) {
      onLoadAlbums();
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Albums
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {albums.length} album{albums.length !== 1 ? 's' : ''}
        </p>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FolderOpen size={48} style={{ color: 'var(--color-text-secondary)' }} />
          <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No albums found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map(album => (
            <div
              key={album.id}
              className="rounded-xl overflow-hidden cursor-pointer group"
              style={{
                background: 'var(--color-bg-secondary)',
                border: selectedAlbum === album.id
                  ? '2px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
              }}
              onClick={() => onSelectAlbum(album.id === selectedAlbum ? null : album.id!)}
            >
              {/* Cover image */}
              <div className="aspect-square relative overflow-hidden">
                {album.coverPhotoBaseUrl ? (
                  <img
                    src={photosApi.getThumbnailUrl(album.coverPhotoBaseUrl, 300, 300)}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-bg-tertiary)' }}>
                    <Image size={32} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">
                  {album.mediaItemsCount}
                </div>
              </div>

              {/* Title */}
              <div className="p-3">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {album.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {album.mediaItemsCount} item{album.mediaItemsCount !== '1' ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
