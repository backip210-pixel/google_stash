import { useState, useEffect } from 'react';
import {
  getAllTags,
  getAllCategories,
  createTag,
  updateTag,
  deleteTag,
  createCategory,
  deleteCategory,
  getTagCounts,
} from '../db/database';
import type { Tag, TagCategory } from '../types';
import { Plus, Trash2, Edit2, Check, X, FolderTree } from 'lucide-react';

const TAG_COLORS = [
  '#1f6feb', '#238636', '#da3633', '#f85149', '#bc8cff',
  '#3fb950', '#58a6ff', '#d29922', '#f778ba', '#79c0ff',
  '#a371f7', '#56d364', '#e3b341', '#ff7b72', '#8b949e',
];

interface TagManagerProps {
  onTagsChange: () => void;
  allTags: Tag[];
}

export function TagManager({ onTagsChange, allTags }: TagManagerProps) {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [tagCounts, setTagCounts] = useState<Map<number, number>>(new Map());
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [newTagCategory, setNewTagCategory] = useState<number | undefined>();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [cats, counts] = await Promise.all([getAllCategories(), getTagCounts()]);
    setCategories(cats);
    setTagCounts(counts);
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim(), newTagColor, newTagCategory);
    setNewTagName('');
    await loadData();
    onTagsChange();
  }

  async function handleUpdateTag(tagId: number) {
    await updateTag(tagId, { name: editName, color: editColor });
    setEditingTag(null);
    await loadData();
    onTagsChange();
  }

  async function handleDeleteTag(tagId: number) {
    if (confirm('Delete this tag? It will be removed from all photos.')) {
      await deleteTag(tagId);
      await loadData();
      onTagsChange();
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    await createCategory(newCategoryName.trim(), '🏷️');
    setNewCategoryName('');
    await loadData();
  }

  async function handleDeleteCategory(catId: number) {
    if (confirm('Delete this category? Tags will be unassigned but not deleted.')) {
      await deleteCategory(catId);
      await loadData();
    }
  }

  // Group tags by category
  const groupedTags = new Map<number | undefined, Tag[]>();
  const filteredTags = filterCategory !== null
    ? allTags.filter(t => t.categoryId === filterCategory)
    : allTags;

  for (const tag of filteredTags) {
    const catId = tag.categoryId;
    if (!groupedTags.has(catId)) groupedTags.set(catId, []);
    groupedTags.get(catId)!.push(tag);
  }

  const totalTagged = Array.from(tagCounts.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{allTags.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Tags</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{categories.length}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Categories</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>{totalTagged}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Tagged Photos</p>
        </div>
      </div>

      {/* Create tag */}
      <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Create New Tag
        </h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="flex-1 min-w-[150px] px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
          />
          <select
            value={newTagCategory || ''}
            onChange={(e) => setNewTagCategory(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value="">No category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleCreateTag}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer flex items-center gap-1.5"
            style={{ background: 'var(--color-accent)' }}
          >
            <Plus size={14} /> Create
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {TAG_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setNewTagColor(color)}
              className="w-6 h-6 rounded-full cursor-pointer transition-transform"
              style={{
                background: color,
                outline: newTagColor === color ? '2px solid white' : 'none',
                outlineOffset: '2px',
                transform: newTagColor === color ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
            <FolderTree size={14} />
            Categories
          </h2>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
          />
          <button
            onClick={handleCreateCategory}
            className="px-3 py-2 rounded-lg text-sm cursor-pointer"
            style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory(null)}
            className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
            style={{
              background: filterCategory === null ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: filterCategory === null ? 'white' : 'var(--color-text-secondary)',
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                onClick={() => setFilterCategory(cat.id!)}
                className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                style={{
                  background: filterCategory === cat.id ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  color: filterCategory === cat.id ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {cat.icon} {cat.name}
              </button>
              <button
                onClick={() => cat.id && handleDeleteCategory(cat.id)}
                className="p-1 rounded cursor-pointer"
                style={{ color: 'var(--color-danger)' }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tags list */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Tags ({filteredTags.length})
          </h2>
        </div>

        {filteredTags.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {allTags.length === 0 ? 'No tags yet. Create your first tag above!' : 'No tags in this category.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filteredTags.map(tag => (
              <div key={tag.id} className="flex items-center gap-3 px-4 py-3">
                {editingTag === tag.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded text-sm outline-none"
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && tag.id && handleUpdateTag(tag.id)}
                    />
                    <div className="flex gap-1">
                      {TAG_COLORS.slice(0, 8).map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className="w-4 h-4 rounded-full"
                          style={{
                            background: color,
                            outline: editColor === color ? '2px solid white' : 'none',
                          }}
                        />
                      ))}
                    </div>
                    <button onClick={() => tag.id && handleUpdateTag(tag.id)} className="p-1 cursor-pointer" style={{ color: 'var(--color-success)' }}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingTag(null)} className="p-1 cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ background: tag.color }} />
                    <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{tag.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
                      {tagCounts.get(tag.id!) || 0} photos
                    </span>
                    {tag.categoryId && (
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {categories.find(c => c.id === tag.categoryId)?.name}
                      </span>
                    )}
                    <button
                      onClick={() => { setEditingTag(tag.id!); setEditName(tag.name); setEditColor(tag.color); }}
                      className="p-1 cursor-pointer"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => tag.id && handleDeleteTag(tag.id)}
                      className="p-1 cursor-pointer"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
