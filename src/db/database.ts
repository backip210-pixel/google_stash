import Dexie, { type Table } from 'dexie';
import type { Tag, TagCategory, PhotoTag, PhotoMetadata } from '../types';

export class StashPhotosDB extends Dexie {
  tags!: Table<Tag>;
  tagCategories!: Table<TagCategory>;
  photoTags!: Table<PhotoTag>;
  photoMetadata!: Table<PhotoMetadata>;

  constructor() {
    super('StashPhotosDB');
    this.version(1).stores({
      tags: '++id, name, categoryId',
      tagCategories: '++id, name',
      photoTags: '++id, photoId, tagId, [photoId+tagId]',
      photoMetadata: 'photoId, rating',
    });
  }
}

export const db = new StashPhotosDB();

// Tag operations
export async function createTag(name: string, color: string, categoryId?: number): Promise<number> {
  return await db.tags.add({
    name,
    color,
    categoryId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getAllTags(): Promise<Tag[]> {
  return await db.tags.orderBy('name').toArray();
}

export async function getTagsByCategory(categoryId: number): Promise<Tag[]> {
  return await db.tags.where('categoryId').equals(categoryId).toArray();
}

export async function updateTag(id: number, updates: Partial<Tag>): Promise<void> {
  await db.tags.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteTag(id: number): Promise<void> {
  await db.transaction('rw', db.tags, db.photoTags, async () => {
    await db.photoTags.where('tagId').equals(id).delete();
    await db.tags.delete(id);
  });
}

// Category operations
export async function createCategory(name: string, icon: string): Promise<number> {
  return await db.tagCategories.add({
    name,
    icon,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getAllCategories(): Promise<TagCategory[]> {
  return await db.tagCategories.orderBy('name').toArray();
}

export async function deleteCategory(id: number): Promise<void> {
  await db.transaction('rw', db.tagCategories, db.tags, async () => {
    await db.tags.where('categoryId').equals(id).modify({ categoryId: undefined });
    await db.tagCategories.delete(id);
  });
}

// Photo-Tag association operations
export async function tagPhoto(photoId: string, tagId: number): Promise<void> {
  const existing = await db.photoTags.where({ photoId, tagId }).first();
  if (!existing) {
    await db.photoTags.add({ photoId, tagId, createdAt: new Date() });
  }
}

export async function untagPhoto(photoId: string, tagId: number): Promise<void> {
  await db.photoTags.where({ photoId, tagId }).delete();
}

export async function getPhotoTags(photoId: string): Promise<Tag[]> {
  const photoTags = await db.photoTags.where('photoId').equals(photoId).toArray();
  const tagIds = photoTags.map(pt => pt.tagId);
  if (tagIds.length === 0) return [];
  return await db.tags.where('id').anyOf(tagIds).toArray();
}

export async function getPhotosByTag(tagId: number): Promise<string[]> {
  const photoTags = await db.photoTags.where('tagId').equals(tagId).toArray();
  return photoTags.map(pt => pt.photoId);
}

export async function getTagCounts(): Promise<Map<number, number>> {
  const allPhotoTags = await db.photoTags.toArray();
  const counts = new Map<number, number>();
  for (const pt of allPhotoTags) {
    counts.set(pt.tagId, (counts.get(pt.tagId) || 0) + 1);
  }
  return counts;
}

// Photo metadata operations
export async function setPhotoRating(photoId: string, rating: number): Promise<void> {
  const existing = await db.photoMetadata.get(photoId);
  if (existing) {
    await db.photoMetadata.update(photoId, { rating, updatedAt: new Date() });
  } else {
    await db.photoMetadata.add({
      photoId,
      notes: '',
      rating,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function setPhotoNotes(photoId: string, notes: string): Promise<void> {
  const existing = await db.photoMetadata.get(photoId);
  if (existing) {
    await db.photoMetadata.update(photoId, { notes, updatedAt: new Date() });
  } else {
    await db.photoMetadata.add({
      photoId,
      notes,
      rating: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export async function getPhotoMetadata(photoId: string): Promise<PhotoMetadata | undefined> {
  return await db.photoMetadata.get(photoId);
}

// Search
export async function searchPhotos(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();

  // Find tags matching the query
  const matchingTags = await db.tags
    .filter(t => t.name.toLowerCase().includes(lowerQuery))
    .toArray();

  // Find photos with those tags
  const photoIds = new Set<string>();
  for (const tag of matchingTags) {
    if (tag.id) {
      const pts = await db.photoTags.where('tagId').equals(tag.id).toArray();
      pts.forEach(pt => photoIds.add(pt.photoId));
    }
  }

  // Also search in notes
  const matchingMetadata = await db.photoMetadata
    .filter(m => m.notes.toLowerCase().includes(lowerQuery))
    .toArray();
  matchingMetadata.forEach(m => photoIds.add(m.photoId));

  return Array.from(photoIds);
}
