// ============================================================
// ThesisForge Core — Persistence Engine (IndexedDB)
// Uses IndexedDB (not localStorage) for large thesis storage.
// ============================================================

import { openDB, type IDBPDatabase } from 'idb';
import type { ThesisData, ThesisType } from '@/lib/thesis-types';

// ============================================================
// Database Schema
// ============================================================

const DB_NAME = 'ThesisForgeDB';
const DB_VERSION = 2;

interface DraftRecord {
  id: string;
  templateId: ThesisType;
  createdAt: number;
  updatedAt: number;
  wizardStep: number;
  data: ThesisData;
}

interface SnapshotRecord {
  id: string;
  draftId: string;
  createdAt: number;
  label: string;
  data: ThesisData;
}

interface SettingRecord {
  key: string;
  value: unknown;
}

// ============================================================
// Database Singleton
// ============================================================

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Create drafts store
        if (!db.objectStoreNames.contains('drafts')) {
          const draftStore = db.createObjectStore('drafts', { keyPath: 'id' });
          draftStore.createIndex('updatedAt', 'updatedAt');
          draftStore.createIndex('templateId', 'templateId');
        }

        // Create snapshots store
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapStore.createIndex('draftId', 'draftId');
          snapStore.createIndex('createdAt', 'createdAt');
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Migration from v1
        if (oldVersion < 2) {
          // Migrate from localStorage if available
          try {
            const legacy = localStorage.getItem('thesisforge_state');
            if (legacy) {
              const parsed = JSON.parse(legacy);
              if (parsed.thesis && parsed.selectedTemplate) {
                const tx = db.transaction('drafts', 'readwrite');
                tx.store.put({
                  id: 'legacy-migration',
                  templateId: parsed.selectedTemplate,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  wizardStep: parsed.currentStep || 1,
                  data: parsed.thesis,
                });
              }
            }
          } catch {
            // Migration failed silently
          }
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================
// Draft CRUD
// ============================================================

const CURRENT_DRAFT_KEY = '__current__';

/**
 * Save the current draft to IndexedDB.
 */
export async function saveDraft(
  thesisData: ThesisData,
  templateId: ThesisType,
  wizardStep: number
): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  const record: DraftRecord = {
    id: CURRENT_DRAFT_KEY,
    templateId,
    createdAt: now,
    updatedAt: now,
    wizardStep,
    data: thesisData,
  };

  await db.put('drafts', record);
}

/**
 * Load the current draft from IndexedDB.
 */
export async function loadDraft(): Promise<{
  thesis: ThesisData | null;
  templateId: ThesisType | null;
  step: number;
} | null> {
  try {
    const db = await getDB();
    const record = await db.get('drafts', CURRENT_DRAFT_KEY) as DraftRecord | undefined;

    if (!record || !record.data) return null;

    return {
      thesis: record.data,
      templateId: record.templateId,
      step: record.wizardStep || 1,
    };
  } catch {
    return null;
  }
}

/**
 * Clear the current draft.
 */
export async function clearDraft(): Promise<void> {
  const db = await getDB();
  await db.delete('drafts', CURRENT_DRAFT_KEY);
}

// ============================================================
// Snapshots (Manual Save Points)
// ============================================================

/**
 * Create a named snapshot of the current draft.
 */
export async function createSnapshot(
  thesisData: ThesisData,
  label: string = 'Manual save'
): Promise<string> {
  const db = await getDB();
  const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const snapshot: SnapshotRecord = {
    id,
    draftId: CURRENT_DRAFT_KEY,
    createdAt: Date.now(),
    label,
    data: thesisData,
  };

  await db.put('snapshots', snapshot);
  return id;
}

/**
 * List all snapshots.
 */
export async function listSnapshots(): Promise<Array<{
  id: string;
  label: string;
  createdAt: number;
}>> {
  const db = await getDB();
  const snapshots = await db.getAllFromIndex('snapshots', 'createdAt') as SnapshotRecord[];
  return snapshots
    .filter(s => s.draftId === CURRENT_DRAFT_KEY)
    .reverse() // Most recent first
    .map(s => ({ id: s.id, label: s.label, createdAt: s.createdAt }));
}

/**
 * Restore a snapshot.
 */
export async function restoreSnapshot(id: string): Promise<ThesisData | null> {
  const db = await getDB();
  const snapshot = await db.get('snapshots', id) as SnapshotRecord | undefined;
  return snapshot?.data || null;
}

/**
 * Delete a snapshot.
 */
export async function deleteSnapshot(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('snapshots', id);
}

// ============================================================
// Settings
// ============================================================

/**
 * Save a setting.
 */
export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

/**
 * Load a setting.
 */
export async function loadSetting<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const record = await db.get('settings', key) as SettingRecord | undefined;
  return record?.value as T | undefined;
}

// ============================================================
// Conflict Detection
// ============================================================

/**
 * Check if there's a conflict (another tab may have modified the draft).
 */
export async function checkConflict(lastKnownTimestamp: number): Promise<{
  hasConflict: boolean;
  storedTimestamp: number | null;
}> {
  const db = await getDB();
  const record = await db.get('drafts', CURRENT_DRAFT_KEY) as DraftRecord | undefined;

  if (!record) {
    return { hasConflict: false, storedTimestamp: null };
  }

  return {
    hasConflict: record.updatedAt !== lastKnownTimestamp && record.updatedAt > lastKnownTimestamp,
    storedTimestamp: record.updatedAt,
  };
}

/**
 * Get the last known timestamp from sessionStorage for conflict detection.
 */
export function getLastKnownTimestamp(): number {
  try {
    const val = sessionStorage.getItem('thesisforge_timestamp');
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Set the last known timestamp in sessionStorage.
 */
export function setLastKnownTimestamp(timestamp: number): void {
  try {
    sessionStorage.setItem('thesisforge_timestamp', String(timestamp));
  } catch {
    // sessionStorage unavailable
  }
}
