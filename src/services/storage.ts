import { SavedItem, SavedItemType } from '../types';

const STORAGE_KEY = 'ai_study_saved_library_v1';

export function getAllSavedItems(): SavedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved library items from localStorage', err);
    return [];
  }
}

export function saveLibraryItem(
  type: SavedItemType,
  title: string,
  topic: string,
  snippet: string,
  data: any,
  tags: string[] = []
): SavedItem {
  const items = getAllSavedItems();
  
  // Check if an item with same topic & type already exists, update it if so
  const existingIdx = items.findIndex(
    (item) => item.type === type && item.topic.toLowerCase() === topic.toLowerCase()
  );

  const newItem: SavedItem = {
    id: existingIdx >= 0 ? items[existingIdx].id : `saved-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type,
    title,
    topic,
    snippet: snippet.slice(0, 200),
    data,
    tags,
    createdAt: existingIdx >= 0 ? items[existingIdx].createdAt : new Date().toISOString(),
    isBookmarked: true,
  };

  if (existingIdx >= 0) {
    items[existingIdx] = newItem;
  } else {
    items.unshift(newItem);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('library-storage-updated'));
  } catch (err) {
    console.error('Failed to write item to localStorage', err);
  }

  return newItem;
}

export function deleteSavedItem(id: string): void {
  const items = getAllSavedItems().filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('library-storage-updated'));
  } catch (err) {
    console.error('Failed to delete item from localStorage', err);
  }
}

export function toggleBookmarkStatus(id: string): boolean {
  const items = getAllSavedItems();
  const target = items.find((i) => i.id === id);
  if (!target) return false;

  target.isBookmarked = !target.isBookmarked;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('library-storage-updated'));
    return target.isBookmarked;
  } catch (err) {
    console.error('Failed to update bookmark in localStorage', err);
    return false;
  }
}

export function isItemSaved(topic: string, type: SavedItemType): boolean {
  if (!topic) return false;
  const items = getAllSavedItems();
  return items.some((i) => i.type === type && i.topic.toLowerCase() === topic.toLowerCase().trim());
}

export function removeSavedByTopic(topic: string, type: SavedItemType): void {
  if (!topic) return;
  const items = getAllSavedItems().filter(
    (i) => !(i.type === type && i.topic.toLowerCase() === topic.toLowerCase().trim())
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('library-storage-updated'));
  } catch (err) {
    console.error('Failed to remove item by topic', err);
  }
}
