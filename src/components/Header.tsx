import { useState } from 'react';
import type { AppView, Tag } from '../types';
import { LayoutGrid, Tags, FolderOpen, Settings, Search, LogOut, User, ChevronDown, Zap } from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  userName: string | null;
  userPhoto: string | null;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  allTags: Tag[];
  selectedTags: number[];
  onToggleTag: (tagId: number) => void;
  onClearTags: () => void;
}

export function Header({
  currentView,
  setCurrentView,
  userName,
  userPhoto,
  onLogout,
  searchQuery,
  onSearchChange,
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const navItems: { view: AppView; icon: any; label: string }[] = [
    { view: 'gallery', icon: LayoutGrid, label: 'Gallery' },
    { view: 'tags', icon: Tags, label: 'Tags' },
    { view: 'albums', icon: FolderOpen, label: 'Albums' },
    { view: 'tagger', icon: Zap, label: 'Tagger' },
    { view: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <header
      style={{
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl">📸</span>
          <h1 className="text-lg font-bold hidden sm:block" style={{ color: 'var(--color-text-primary)' }}>
            Stash Photos
          </h1>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          />
        </div>

        {/* Tag filter button */}
        <button
          onClick={() => setShowTagFilter(!showTagFilter)}
          className="p-2 rounded-lg cursor-pointer relative"
          style={{
            background: selectedTags.length > 0 ? 'var(--color-tag)' : 'var(--color-bg-tertiary)',
            color: 'white',
          }}
          title="Filter by tags"
        >
          <Tags size={18} />
          {selectedTags.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: 'var(--color-accent)' }}>
              {selectedTags.length}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            {userPhoto ? (
              <img src={userPhoto} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <User size={16} style={{ color: 'var(--color-text-secondary)' }} />
            )}
            <span className="text-sm hidden sm:block" style={{ color: 'var(--color-text-primary)' }}>
              {userName}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--color-text-secondary)' }} />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-lg py-1 z-50 shadow-xl fade-in"
              style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
            >
              <div className="px-4 py-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {userName}
              </div>
              <button
                onClick={() => { onLogout(); setShowUserMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 cursor-pointer hover:opacity-80"
                style={{ color: 'var(--color-danger)' }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tag filter dropdown */}
      {showTagFilter && (
        <div
          className="px-4 pb-3 fade-in"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Filter by tags
            </span>
            {selectedTags.length > 0 && (
              <button onClick={onClearTags} className="text-xs cursor-pointer" style={{ color: 'var(--color-accent)' }}>
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.length === 0 ? (
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                No tags yet. Go to Tags to create some.
              </span>
            ) : (
              allTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => tag.id && onToggleTag(tag.id)}
                  className={`tag-pill ${selectedTags.includes(tag.id!) ? 'active' : ''}`}
                  style={!selectedTags.includes(tag.id!) ? { backgroundColor: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex gap-1 px-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        {navItems.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium cursor-pointer border-b-2 transition-colors"
            style={{
              color: currentView === view ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderColor: currentView === view ? 'var(--color-accent)' : 'transparent',
            }}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
