import { useState, useEffect, useCallback } from 'react';
import type { GPMediaItem } from '../types';
import { tpdbApi, type TPDBScene } from '../api/tpdbApi';
import { photosApi } from '../api/photosApi';
import {
  createTag,
  tagPhoto,
  getAllTags,
  getPhotoTags,
} from '../db/database';
import type { Tag } from '../types';
import { Search, Check, X, Zap, ChevronRight, Loader2, AlertCircle, User, Building, Tag as TagIcon } from 'lucide-react';

interface TaggerProps {
  items: GPMediaItem[];
  onTagsChange: () => void;
}

interface ScanResult {
  photoId: string;
  filename: string;
  thumbnailUrl: string;
  matches: TPDBScene[];
  selectedMatch: TPDBScene | null;
  status: 'pending' | 'searching' | 'found' | 'no-match' | 'applied' | 'skipped' | 'error';
  error?: string;
}

export function Tagger({ items, onTagsChange }: TaggerProps) {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    const key = tpdbApi.getApiKey();
    setApiKeyConfigured(!!key);
    loadTags();
  }, []);

  async function loadTags() {
    const tags = await getAllTags();
    setAllTags(tags);
  }

  // Get untagged items
  const getUntaggedItems = useCallback(async () => {
    const untagged: GPMediaItem[] = [];
    for (const item of items) {
      const tags = await getPhotoTags(item.id);
      if (tags.length === 0) untagged.push(item);
    }
    return untagged;
  }, [items]);

  // Scan all untagged items
  async function startScan() {
    const untagged = await getUntaggedItems();
    if (untagged.length === 0) return;

    setScanning(true);
    setScanProgress({ current: 0, total: untagged.length });

    const results: ScanResult[] = [];

    for (let i = 0; i < untagged.length; i++) {
      const item = untagged[i];
      setScanProgress({ current: i + 1, total: untagged.length });

      const result: ScanResult = {
        photoId: item.id,
        filename: item.filename || '',
        thumbnailUrl: photosApi.getThumbnailUrl(item.baseUrl, 200, 200),
        matches: [],
        selectedMatch: null,
        status: 'searching',
      };

      try {
        // Parse filename and search
        const parsed = tpdbApi.parseFilename(item.filename || '');
        const response = await tpdbApi.searchScenesByFilename(item.filename || '');

        if (response.data && response.data.length > 0) {
          result.matches = response.data;
          result.status = 'found';

          // Auto-select if only one match
          if (response.data.length === 1) {
            result.selectedMatch = response.data[0];
          }
        } else {
          result.status = 'no-match';
        }
      } catch (err: any) {
        result.status = 'error';
        result.error = err.message;

        // If rate limited, stop scanning
        if (err.message.includes('rate limit')) {
          results.push(result);
          setScanResults(results);
          setScanning(false);
          return;
        }
      }

      results.push(result);
      setScanResults([...results]);

      // Small delay to avoid rate limiting
      if (i < untagged.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setScanning(false);
  }

  // Select a match for a result
  function selectMatch(result: ScanResult, scene: TPDBScene) {
    const updated = scanResults.map(r =>
      r.photoId === result.photoId ? { ...r, selectedMatch: scene, status: 'found' as const } : r
    );
    setScanResults(updated);
    setSelectedResult({ ...result, selectedMatch: scene, status: 'found' });
  }

  // Apply selected match tags to a photo
  async function applyMatch(result: ScanResult) {
    if (!result.selectedMatch) return;
    const scene = result.selectedMatch;

    try {
      // Create tags for performers
      for (const performer of scene.performers || []) {
        let tag = allTags.find(t => t.name.toLowerCase() === performer.name.toLowerCase());
        if (!tag) {
          const tagId = await createTag(performer.name, '#bc8cff');
          tag = { id: tagId, name: performer.name, color: '#bc8cff', createdAt: new Date(), updatedAt: new Date() };
        }
        if (tag.id) await tagPhoto(result.photoId, tag.id);
      }

      // Create tag for site/studio
      if (scene.site) {
        let tag = allTags.find(t => t.name.toLowerCase() === scene.site!.name.toLowerCase());
        if (!tag) {
          const tagId = await createTag(scene.site.name, '#f778ba');
          tag = { id: tagId, name: scene.site.name, color: '#f778ba', createdAt: new Date(), updatedAt: new Date() };
        }
        if (tag.id) await tagPhoto(result.photoId, tag.id);
      }

      // Create tags for scene tags
      for (const sceneTag of scene.tags || []) {
        let tag = allTags.find(t => t.name.toLowerCase() === sceneTag.name.toLowerCase());
        if (!tag) {
          const tagId = await createTag(sceneTag.name, '#1f6feb');
          tag = { id: tagId, name: sceneTag.name, color: '#1f6feb', createdAt: new Date(), updatedAt: new Date() };
        }
        if (tag.id) await tagPhoto(result.photoId, tag.id);
      }

      // Update result status
      const updated = scanResults.map(r =>
        r.photoId === result.photoId ? { ...r, status: 'applied' as const } : r
      );
      setScanResults(updated);
      setSelectedResult(null);
      await loadTags();
      onTagsChange();
    } catch (err: any) {
      console.error('Failed to apply tags:', err);
    }
  }

  // Apply all selected matches at once
  async function applyAll() {
    const toApply = scanResults.filter(r => r.status === 'found' && r.selectedMatch);
    for (const result of toApply) {
      await applyMatch(result);
    }
  }

  // Skip a result
  function skipResult(result: ScanResult) {
    const updated = scanResults.map(r =>
      r.photoId === result.photoId ? { ...r, status: 'skipped' as const } : r
    );
    setScanResults(updated);
  }

  const filteredResults = filterStatus === 'all'
    ? scanResults
    : scanResults.filter(r => r.status === filterStatus);

  const statusCounts = {
    found: scanResults.filter(r => r.status === 'found').length,
    applied: scanResults.filter(r => r.status === 'applied').length,
    'no-match': scanResults.filter(r => r.status === 'no-match').length,
    skipped: scanResults.filter(r => r.status === 'skipped').length,
    error: scanResults.filter(r => r.status === 'error').length,
  };

  if (!apiKeyConfigured) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          ThePornDB API Key Required
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          To use automatic tagging, you need an API key from{' '}
          <a href="https://theporndb.net" target="_blank" className="underline" style={{ color: 'var(--color-accent)' }}>
            ThePornDB
          </a>.
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          Go to Settings → enter your TPDB API key → come back here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Auto Tagger
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Match your media against ThePornDB to auto-apply performer, studio, and category tags
          </p>
        </div>
        <button
          onClick={startScan}
          disabled={scanning}
          className="px-4 py-2 rounded-lg font-medium text-white cursor-pointer flex items-center gap-2 disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
          {scanning ? 'Scanning...' : 'Scan Untagged'}
        </button>
      </div>

      {/* Progress bar */}
      {scanning && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Scanning... {scanProgress.current} / {scanProgress.total}</span>
            <span>{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(scanProgress.current / scanProgress.total) * 100}%`,
                background: 'var(--color-accent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      {scanResults.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'all', label: `All (${scanResults.length})` },
            { key: 'found', label: `Matches (${statusCounts.found})` },
            { key: 'applied', label: `Applied (${statusCounts.applied})` },
            { key: 'no-match', label: `No Match (${statusCounts['no-match']})` },
            { key: 'skipped', label: `Skipped (${statusCounts.skipped})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{
                background: filterStatus === key ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: filterStatus === key ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
          {statusCounts.found > 1 && (
            <button
              onClick={applyAll}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer ml-auto"
              style={{ background: 'var(--color-success)', color: 'white' }}
            >
              Apply All Matches ({statusCounts.found})
            </button>
          )}
        </div>
      )}

      {/* Results grid */}
      {filteredResults.length === 0 && !scanning ? (
        <div className="text-center py-16">
          <Search size={40} style={{ color: 'var(--color-text-secondary)' }} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {scanResults.length === 0
              ? 'Click "Scan Untagged" to match your media against ThePornDB'
              : 'No results match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map(result => (
            <div
              key={result.photoId}
              className="rounded-xl p-4 flex gap-4 items-start"
              style={{
                background: 'var(--color-bg-secondary)',
                border: `1px solid ${
                  result.status === 'applied' ? 'var(--color-success)' :
                  result.status === 'found' ? 'var(--color-accent)' :
                  'var(--color-border)'
                }`,
              }}
            >
              {/* Thumbnail */}
              <img
                src={result.thumbnailUrl}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {result.filename}
                </p>

                {/* Status badge */}
                <div className="flex items-center gap-2 mt-1">
                  {result.status === 'searching' && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                      <Loader2 size={10} className="animate-spin" /> Searching...
                    </span>
                  )}
                  {result.status === 'found' && (
                    <span className="text-xs" style={{ color: 'var(--color-accent)' }}>
                      {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''} found
                    </span>
                  )}
                  {result.status === 'applied' && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                      <Check size={10} /> Tags applied
                    </span>
                  )}
                  {result.status === 'no-match' && (
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No match</span>
                  )}
                  {result.status === 'skipped' && (
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Skipped</span>
                  )}
                  {result.status === 'error' && (
                    <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{result.error}</span>
                  )}
                </div>

                {/* Match details */}
                {result.status === 'found' && result.matches.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {result.matches.slice(0, 3).map((scene, idx) => (
                      <div
                        key={scene.id}
                        className="p-2 rounded-lg cursor-pointer transition-all"
                        style={{
                          background: result.selectedMatch?.id === scene.id
                            ? 'rgba(88, 166, 255, 0.15)'
                            : 'var(--color-bg-tertiary)',
                          border: result.selectedMatch?.id === scene.id
                            ? '1px solid var(--color-accent)'
                            : '1px solid transparent',
                        }}
                        onClick={() => selectMatch(result, scene)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {scene.title}
                          </span>
                          {scene.date && (
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {scene.date}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {scene.site && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                              <Building size={10} /> {scene.site.name}
                            </span>
                          )}
                          {scene.performers?.slice(0, 4).map(p => (
                            <span key={p.id} className="text-xs flex items-center gap-1" style={{ color: '#bc8cff' }}>
                              <User size={10} /> {p.name}
                            </span>
                          ))}
                          {scene.performers && scene.performers.length > 4 && (
                            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              +{scene.performers.length - 4} more
                            </span>
                          )}
                        </div>
                        {scene.tags && scene.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {scene.tags.slice(0, 6).map(t => (
                              <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ background: 'var(--color-tag)', color: 'white', fontSize: '10px' }}>
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {result.selectedMatch && (
                        <button
                          onClick={() => applyMatch(result)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer flex items-center gap-1"
                          style={{ background: 'var(--color-success)' }}
                        >
                          <Check size={12} /> Apply Tags
                        </button>
                      )}
                      <button
                        onClick={() => skipResult(result)}
                        className="px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1"
                        style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
                      >
                        <X size={12} /> Skip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
