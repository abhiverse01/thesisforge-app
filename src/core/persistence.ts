// ============================================================
// ThesisForge Core — Persistence Engine (IndexedDB)
// Uses IndexedDB (not localStorage) for large thesis storage.
//
// FIX(ZONE-2A): QuotaExceededError handling + emergency JSON backup
// FIX(ZONE-2B): Additive-only schema migrations (never delete stores)
// FIX(ZONE-2C): Version stamps + conflict detection for two-tab race
// FIX(ZONE-5A): Defensive draft loader with sanitizeDraft()
// FIX(ZONE-5B): In-memory fallback for private mode / unavailable IndexedDB
// ============================================================

import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { ThesisData, ThesisType, ThesisChapter, ThesisReference, ThesisAppendix, ThesisMetadata, ThesisOptions } from '@/lib/thesis-types';

// ============================================================
// Database Schema
// ============================================================

const DB_NAME = 'ThesisForgeDB';
const DB_VERSION = 3; // FIX(ZONE-2B): Bumped from 2. Migration is additive-only.

interface DraftRecord {
  id: string;
  templateId: ThesisType;
  createdAt: number;
  updatedAt: number;
  wizardStep: number;
  data: ThesisData;
  version: number; // FIX(ZONE-2C): Monotonic version counter
}

interface SnapshotRecord {
  id: string;
  draftId: string;
  createdAt: number;
  label: string;
  tag?: string;
  data: ThesisData;
}

interface SettingRecord {
  key: string;
  value: unknown;
}

// ============================================================
// Snapshot Summary (enhanced list return type)
// ============================================================

export interface SnapshotSummary {
  id: string;
  label: string;
  createdAt: number;
  tag?: string;
  diffSummary?: string;
}

// ============================================================
// In-Memory Fallback (Zone 5B)
// ============================================================

// FIX(ZONE-5B): When IndexedDB is unavailable (private mode, blocked),
// fall back to in-memory storage. Data is lost on tab close.
interface MemoryDB {
  _store: Map<string, unknown>;
  _isMemoryFallback: true;
  put(storeName: string, value: unknown): Promise<unknown>;
  get(storeName: string, key: string): Promise<unknown>;
  getAll(storeName: string): Promise<unknown[]>;
  delete(storeName: string, key: string): Promise<void>;
  getFromIndex(storeName: string, indexName: string): Promise<unknown[]>;
  transaction(storeName: string, mode: IDBTransactionMode): {
    store: MemoryTransactionStore;
    done: Promise<void>;
  };
}

interface MemoryTransactionStore {
  put(value: unknown): Promise<unknown>;
  get(key: string): Promise<unknown>;
}

function createMemoryDB(): MemoryDB {
  const stores = new Map<string, Map<string, unknown>>();
  return {
    _store: new Map(),
    _isMemoryFallback: true,
    async put(storeName, value) {
      if (!stores.has(storeName)) stores.set(storeName, new Map());
      const store = stores.get(storeName)!;
      const obj = value as Record<string, unknown>;
      const key = (obj.id || obj.key || '_default') as string;
      store.set(key, value);
      return value;
    },
    async get(storeName, key) {
      if (!stores.has(storeName)) return undefined;
      return (stores.get(storeName) as Map<string, unknown>).get(key) ?? null;
    },
    async getAll(storeName) {
      if (!stores.has(storeName)) return [];
      return [...(stores.get(storeName) as Map<string, unknown>).values()];
    },
    async getFromIndex(storeName, _indexName) {
      // Memory fallback: ignore index, return all sorted by createdAt
      const all = await this.getAll(storeName);
      return (all as Array<{ createdAt?: number }>)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    async delete(storeName, key) {
      if (stores.has(storeName)) {
        (stores.get(storeName) as Map<string, unknown>).delete(key);
      }
    },
    transaction(storeName) {
      const store: MemoryTransactionStore = {
        put: async (value) => this.put(storeName, value),
        get: async (key) => this.get(storeName, key),
      };
      return { store, done: Promise.resolve() };
    },
  };
}

let isMemoryFallbackActive = false;

export function isUsingMemoryFallback(): boolean {
  return isMemoryFallbackActive;
}

// ============================================================
// Defensive Draft Loader (Zone 5A)
// ============================================================

const VALID_THESIS_TYPES: string[] = ['bachelor', 'master', 'phd', 'report', 'conference'];

/**
 * Sanitize a draft record loaded from IndexedDB.
 * Never trust what comes out of storage — always sanitize.
 *
 * FIX(ZONE-5A): Prevents crashes from corrupted, partial, or
 * version-mismatched data. Every field has a safe fallback.
 */
export function sanitizeDraft(raw: unknown): DraftRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const r = raw as Record<string, unknown>;

  return {
    id: typeof r.id === 'string' ? r.id : '__current__',
    templateId: VALID_THESIS_TYPES.includes(r.templateId as string)
      ? (r.templateId as ThesisType) : 'bachelor',
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
    wizardStep: typeof r.wizardStep === 'number' && r.wizardStep >= 1 && r.wizardStep <= 6
      ? r.wizardStep : 1,
    version: typeof r.version === 'number' ? r.version : 0,
    data: sanitizeThesisData(r.data),
  };
}

function sanitizeThesisData(raw: unknown): ThesisData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createFallbackThesisData('bachelor');
  }

  const r = raw as Record<string, unknown>;

  return {
    type: VALID_THESIS_TYPES.includes(r.type as string)
      ? (r.type as ThesisType) : 'bachelor',
    metadata: sanitizeMetadata(r.metadata),
    abstract: typeof (r.abstract as string) === 'string' ? (r.abstract as string) : '',
    keywords: Array.isArray(r.keywords) ? (r.keywords as unknown[]).filter(k => typeof k === 'string') as string[] : [],
    chapters: Array.isArray(r.chapters) ? (r.chapters as unknown[]).map(sanitizeChapter) : [],
    references: Array.isArray(r.references) ? (r.references as unknown[]).map(sanitizeReference) : [],
    appendices: Array.isArray(r.appendices) ? (r.appendices as unknown[]).map(sanitizeAppendix) : [],
    options: sanitizeOptions(r.options),
  };
}

function sanitizeMetadata(m: unknown): ThesisMetadata {
  const defaults: ThesisMetadata = {
    title: '', subtitle: '', author: '', authorId: '',
    university: '', universityLogo: '', faculty: '', department: '',
    supervisor: '', supervisorTitle: 'Prof.', coSupervisor: '',
    coSupervisorTitle: 'Dr.', submissionDate: new Date().toISOString().split('T')[0],
    graduationDate: '', location: '', dedication: '', acknowledgment: '',
  };
  if (!m || typeof m !== 'object' || Array.isArray(m)) return defaults;
  const r = m as Record<string, unknown>;
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof ThesisMetadata)[]) {
    if (typeof r[key] === 'string') {
      (result as Record<string, unknown>)[key] = r[key];
    }
  }
  return result;
}

function sanitizeChapter(ch: unknown, index = 0): ThesisChapter {
  if (!ch || typeof ch !== 'object' || Array.isArray(ch)) {
    return {
      id: `chapter-${index}-${Date.now()}`,
      number: index + 1,
      title: `Chapter ${index + 1}`,
      content: '',
      subSections: [],
    };
  }
  const r = ch as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : `chapter-${index}-${Date.now()}`,
    number: typeof r.number === 'number' ? r.number : index + 1,
    title: typeof r.title === 'string' ? r.title : `Chapter ${index + 1}`,
    content: typeof r.content === 'string' ? r.content : '',
    subSections: Array.isArray(r.subSections)
      ? (r.subSections as unknown[]).map((ss, i) => sanitizeSubSection(ss, i)) : [],
  };
}

function sanitizeSubSection(ss: unknown, index = 0): { id: string; title: string; content: string } {
  if (!ss || typeof ss !== 'object' || Array.isArray(ss)) {
    return { id: `subsection-${index}`, title: 'New Section', content: '' };
  }
  const r = ss as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : `subsection-${index}`,
    title: typeof r.title === 'string' ? r.title : 'New Section',
    content: typeof r.content === 'string' ? r.content : '',
  };
}

function sanitizeReference(ref: unknown, index = 0): ThesisReference {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
    return {
      id: `ref-${index}`,
      type: 'article',
      authors: '',
      title: '',
      year: '',
    };
  }
  const r = ref as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : `ref-${index}`,
    type: ['article', 'book', 'inproceedings', 'techreport', 'thesis', 'online', 'dataset', 'software', 'misc'].includes(r.type as string)
      ? (r.type as ThesisReference['type']) : 'article',
    authors: typeof r.authors === 'string' ? r.authors : '',
    title: typeof r.title === 'string' ? r.title : '',
    year: typeof r.year === 'string' ? r.year : '',
    journal: typeof r.journal === 'string' ? r.journal : undefined,
    bookTitle: typeof r.bookTitle === 'string' ? r.bookTitle : undefined,
    publisher: typeof r.publisher === 'string' ? r.publisher : undefined,
    volume: typeof r.volume === 'string' ? r.volume : undefined,
    number: typeof r.number === 'string' ? r.number : undefined,
    pages: typeof r.pages === 'string' ? r.pages : undefined,
    doi: typeof r.doi === 'string' ? r.doi : undefined,
    url: typeof r.url === 'string' ? r.url : undefined,
    eprint: typeof r.eprint === 'string' ? r.eprint : undefined,
    eprintType: typeof r.eprintType === 'string' ? r.eprintType : undefined,
    crossRef: typeof r.crossRef === 'string' ? r.crossRef : undefined,
    note: typeof r.note === 'string' ? r.note : undefined,
    edition: typeof r.edition === 'string' ? r.edition : undefined,
    address: typeof r.address === 'string' ? r.address : undefined,
    school: typeof r.school === 'string' ? r.school : undefined,
    howPublished: typeof r.howPublished === 'string' ? r.howPublished : undefined,
    accessed: typeof r.accessed === 'string' ? r.accessed : undefined,
  };
}

function sanitizeAppendix(app: unknown, index = 0): ThesisAppendix {
  if (!app || typeof app !== 'object' || Array.isArray(app)) {
    return {
      id: `appendix-${index}`,
      title: `Appendix ${String.fromCharCode(65 + index)}`,
      content: '',
    };
  }
  const r = app as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' ? r.id : `appendix-${index}`,
    title: typeof r.title === 'string' ? r.title : `Appendix ${String.fromCharCode(65 + index)}`,
    content: typeof r.content === 'string' ? r.content : '',
  };
}

function sanitizeOptions(opts: unknown): ThesisOptions {
  const defaults: ThesisOptions = {
    fontSize: '12pt',
    paperSize: 'a4paper',
    lineSpacing: 'onehalf',
    marginSize: 'normal',
    includeDedication: false,
    includeAcknowledgment: true,
    includeAppendices: false,
    includeListings: false,
    includeGlossary: false,
    citationStyle: 'apa',
    figureNumbering: 'continuous',
    tableNumbering: 'continuous',
    tocDepth: 3,
  };
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return defaults;
  const r = opts as Record<string, unknown>;
  return {
    ...defaults,
    ...(typeof r.fontSize === 'string' ? { fontSize: r.fontSize as ThesisOptions['fontSize'] } : {}),
    ...(typeof r.paperSize === 'string' ? { paperSize: r.paperSize as ThesisOptions['paperSize'] } : {}),
    ...(typeof r.lineSpacing === 'string' ? { lineSpacing: r.lineSpacing as ThesisOptions['lineSpacing'] } : {}),
    ...(typeof r.marginSize === 'string' ? { marginSize: r.marginSize as ThesisOptions['marginSize'] } : {}),
    ...(typeof r.citationStyle === 'string' ? { citationStyle: r.citationStyle as ThesisOptions['citationStyle'] } : {}),
    ...(typeof r.figureNumbering === 'string' ? { figureNumbering: r.figureNumbering as ThesisOptions['figureNumbering'] } : {}),
    ...(typeof r.tableNumbering === 'string' ? { tableNumbering: r.tableNumbering as ThesisOptions['tableNumbering'] } : {}),
    ...(typeof r.tocDepth === 'number' ? { tocDepth: r.tocDepth } : {}),
    ...(typeof r.includeDedication === 'boolean' ? { includeDedication: r.includeDedication } : {}),
    ...(typeof r.includeAcknowledgment === 'boolean' ? { includeAcknowledgment: r.includeAcknowledgment } : {}),
    ...(typeof r.includeAppendices === 'boolean' ? { includeAppendices: r.includeAppendices } : {}),
    ...(typeof r.includeListings === 'boolean' ? { includeListings: r.includeListings } : {}),
    ...(typeof r.includeGlossary === 'boolean' ? { includeGlossary: r.includeGlossary } : {}),
  };
}

function createFallbackThesisData(type: ThesisType): ThesisData {
  return {
    type,
    metadata: sanitizeMetadata(null),
    abstract: '',
    keywords: [],
    chapters: [],
    references: [],
    appendices: [],
    options: sanitizeOptions(null),
  };
}

// ============================================================
// Database Singleton
// ============================================================

let dbPromise: Promise<IDBPDatabase | MemoryDB> | null = null;

function getDB(): Promise<IDBPDatabase | MemoryDB> {
  if (!dbPromise) {
    // FIX(ZONE-5B): Test IndexedDB availability first
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[Persistence] IndexedDB unavailable — using in-memory fallback');
      isMemoryFallbackActive = true;
      dbPromise = Promise.resolve(createMemoryDB());
      return dbPromise;
    }

    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // FIX(ZONE-2B): Additive-only migrations. NEVER delete stores.

        // v1 → create initial stores
        if (oldVersion < 1) {
          const draftStore = db.createObjectStore('drafts', { keyPath: 'id' });
          draftStore.createIndex('updatedAt', 'updatedAt');
          draftStore.createIndex('templateId', 'templateId');
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // v2 → add snapshots store (additive, never delete)
        if (oldVersion < 2) {
          const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapStore.createIndex('draftId', 'draftId');
          snapStore.createIndex('createdAt', 'createdAt');

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
                  version: 1,
                });
              }
            }
          } catch {
            // Migration failed silently — acceptable
          }
        }

        // v3 → add version field to drafts, add index
        if (oldVersion < 3) {
          // The 'version' field doesn't need an index; it's checked on read.
          // We don't need to alter existing records — they'll get version: 0
          // from the sanitizeDraft fallback.
        }
      },
    }).catch((err) => {
      console.warn('[Persistence] IndexedDB open failed — using in-memory fallback:', err.message);
      isMemoryFallbackActive = true;
      return createMemoryDB();
    });
  }
  return dbPromise;
}

// ============================================================
// Save Status Emitter
// ============================================================

export type SaveStatusEvent = 'saved' | 'saving' | 'error' | 'quota-exceeded' | 'conflict';

type SaveStatusListener = (status: SaveStatusEvent) => void;
const saveStatusListeners = new Set<SaveStatusListener>();

export function onSaveStatus(listener: SaveStatusListener): () => void {
  saveStatusListeners.add(listener);
  return () => saveStatusListeners.delete(listener);
}

function emitSaveStatus(status: SaveStatusEvent): void {
  for (const listener of saveStatusListeners) {
    try { listener(status); } catch { /* ignore */ }
  }
}

// ============================================================
// Emergency Backup (Zone 2A)
// ============================================================

/**
 * FIX(ZONE-2A): When storage quota is exceeded, trigger an emergency
 * JSON download so the user never loses data.
 */
function offerEmergencyBackup(draft: DraftRecord): void {
  try {
    const json = JSON.stringify(draft, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thesisforge-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    // Last resort: log to console
    console.error('[Persistence] Could not offer emergency backup. Data may be lost!');
  }
}

// ============================================================
// Draft CRUD
// ============================================================

const CURRENT_DRAFT_KEY = '__current__';

/**
 * Save the current draft to IndexedDB.
 *
 * FIX(ZONE-2A): Catches QuotaExceededError and InvalidStateError.
 * FIX(ZONE-2C): Increments version counter for conflict detection.
 */
export async function saveDraft(
  thesisData: ThesisData,
  templateId: ThesisType,
  wizardStep: number
): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  // FIX(ZONE-2C): Read current version to increment
  let currentVersion = 0;
  try {
    const existing = await (db as IDBPDatabase).get('drafts', CURRENT_DRAFT_KEY);
    if (existing?.version !== undefined) {
      currentVersion = existing.version;
    }
  } catch { /* first save or memory fallback */ }

  const record: DraftRecord = {
    id: CURRENT_DRAFT_KEY,
    templateId,
    createdAt: now,
    updatedAt: now,
    wizardStep,
    data: thesisData,
    version: currentVersion + 1,
  };

  try {
    await (db as IDBPDatabase).put('drafts', record);
    emitSaveStatus('saved');

    // FIX(ZONE-2C): Track version in sessionStorage for cross-tab detection
    try {
      sessionStorage.setItem('thesisforge_last_version', String(record.version));
    } catch { /* sessionStorage unavailable */ }
  } catch (err: unknown) {
    const error = err as Error & { name?: string };

    if (error.name === 'QuotaExceededError' || (error.message && error.message.includes('quota'))) {
      // FIX(ZONE-2A): Storage is full — offer emergency backup
      emitSaveStatus('quota-exceeded');
      offerEmergencyBackup(record);
      console.error('[Persistence] Storage quota exceeded. Emergency backup triggered.');
    } else if (error.name === 'InvalidStateError') {
      // DB connection was closed (tab going inactive in some browsers)
      console.warn('[Persistence] DB connection lost, reopening...');
      dbPromise = null; // Force re-open
      const newDb = await getDB();
      await (newDb as IDBPDatabase).put('drafts', record);
      emitSaveStatus('saved');
    } else {
      emitSaveStatus('error');
      console.error('[Persistence] IndexedDB write failed:', error);
    }
  }
}

/**
 * Load the current draft from IndexedDB.
 *
 * FIX(ZONE-5A): Runs sanitizeDraft() on all loaded data.
 * FIX(ZONE-2C): Detects cross-tab conflicts via version stamps.
 */
export async function loadDraft(): Promise<{
  thesis: ThesisData | null;
  templateId: ThesisType | null;
  step: number;
} | null> {
  try {
    const db = await getDB();

    // Memory fallback path
    if ((db as MemoryDB)._isMemoryFallback) {
      const record = await (db as MemoryDB).get('drafts', CURRENT_DRAFT_KEY) as DraftRecord | undefined;
      if (!record?.data) return null;
      const sanitized = sanitizeDraft(record);
      return {
        thesis: sanitized?.data ?? null,
        templateId: sanitized?.templateId ?? null,
        step: sanitized?.wizardStep ?? 1,
      };
    }

    const rawRecord = await (db as IDBPDatabase).get('drafts', CURRENT_DRAFT_KEY) as DraftRecord | undefined;
    if (!rawRecord || !rawRecord.data) return null;

    // FIX(ZONE-5A): Sanitize before use
    const record = sanitizeDraft(rawRecord);
    if (!record) return null;

    // FIX(ZONE-2C): Conflict detection — check if another tab wrote newer data
    let lastKnownVersion = 0;
    try {
      const stored = sessionStorage.getItem('thesisforge_last_version');
      if (stored) lastKnownVersion = parseInt(stored, 10);
    } catch { /* sessionStorage unavailable */ }

    if (record.version > 0 && lastKnownVersion > 0 && record.version > lastKnownVersion + 1) {
      // Another tab has newer data — flag conflict
      emitSaveStatus('conflict');
      // Still return the data, but the UI can check isUsingMemoryFallback or
      // listen for the 'conflict' event to show a resolution dialog.
      // For now, we accept the remote version (safer than losing data).
      console.warn(`[Persistence] Version conflict detected. Remote: ${record.version}, Local last known: ${lastKnownVersion}`);
    }

    return {
      thesis: record.data,
      templateId: record.templateId,
      step: record.wizardStep || 1,
    };
  } catch (err) {
    console.error('[Persistence] loadDraft failed:', err);
    return null;
  }
}

/**
 * Clear the current draft.
 */
export async function clearDraft(): Promise<void> {
  try {
    const db = await getDB();
    if ((db as MemoryDB)._isMemoryFallback) {
      await (db as MemoryDB).delete('drafts', CURRENT_DRAFT_KEY);
    } else {
      await (db as IDBPDatabase).delete('drafts', CURRENT_DRAFT_KEY);
    }
  } catch (err) {
    console.error('[Persistence] clearDraft failed:', err);
  }
}

// ============================================================
// Snapshots (Manual Save Points)
// ============================================================

/**
 * Create a named snapshot of the current draft.
 */
export async function createSnapshot(
  thesisData: ThesisData,
  label: string = 'Manual save',
  tag?: string
): Promise<string> {
  const db = await getDB();
  const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const snapshot: SnapshotRecord = {
    id,
    draftId: CURRENT_DRAFT_KEY,
    createdAt: Date.now(),
    label,
    ...(tag !== undefined ? { tag } : {}),
    data: thesisData,
  };

  try {
    if ((db as MemoryDB)._isMemoryFallback) {
      await (db as MemoryDB).put('snapshots', snapshot);
    } else {
      await (db as IDBPDatabase).put('snapshots', snapshot);
    }
  } catch (err) {
    console.error('[Persistence] createSnapshot failed:', err);
  }

  return id;
}

/**
 * Create an automatic snapshot triggered on step advance.
 */
export async function createAutoSnapshot(thesisData: ThesisData, step: number): Promise<string> {
  const label = `Auto: Before Step ${step}`;
  return createSnapshot(thesisData, label, 'auto');
}

/**
 * List all snapshots with enhanced summary data.
 */
export async function listSnapshots(currentThesisData?: ThesisData): Promise<SnapshotSummary[]> {
  try {
    const db = await getDB();
    let snapshots: SnapshotRecord[];

    if ((db as MemoryDB)._isMemoryFallback) {
      snapshots = (await (db as MemoryDB).getFromIndex('snapshots', 'createdAt') as SnapshotRecord[]);
    } else {
      snapshots = (await (db as IDBPDatabase).getAllFromIndex('snapshots', 'createdAt')) as SnapshotRecord[];
    }

    return snapshots
      .filter(s => s.draftId === CURRENT_DRAFT_KEY)
      .reverse() // Most recent first
      .map(s => ({
        id: s.id,
        label: s.label,
        createdAt: s.createdAt,
        tag: s.tag,
        diffSummary: currentThesisData
          ? computeSnapshotDiff(s.data, currentThesisData)
          : undefined,
      }));
  } catch (err) {
    console.error('[Persistence] listSnapshots failed:', err);
    return [];
  }
}

/**
 * Compute a human-readable diff summary between a snapshot and current thesis data.
 */
export function computeSnapshotDiff(snapshotData: ThesisData, currentData: ThesisData): string {
  const changes: string[] = [];

  // Chapter diff
  const snapChapterCount = snapshotData.chapters.length;
  const currentChapterCount = currentData.chapters.length;
  if (currentChapterCount > snapChapterCount) {
    changes.push(`+${currentChapterCount - snapChapterCount} chapter${currentChapterCount - snapChapterCount !== 1 ? 's' : ''}`);
  } else if (currentChapterCount < snapChapterCount) {
    changes.push(`-${snapChapterCount - currentChapterCount} chapter${snapChapterCount - currentChapterCount !== 1 ? 's' : ''}`);
  }

  // Reference diff
  const snapRefCount = snapshotData.references.length;
  const currentRefCount = currentData.references.length;
  if (currentRefCount > snapRefCount) {
    changes.push(`+${currentRefCount - snapRefCount} ref${currentRefCount - snapRefCount !== 1 ? 's' : ''}`);
  } else if (currentRefCount < snapRefCount) {
    changes.push(`-${snapRefCount - currentRefCount} ref${snapRefCount - currentRefCount !== 1 ? 's' : ''}`);
  }

  // Appendix diff
  const snapAppCount = snapshotData.appendices.length;
  const currentAppCount = currentData.appendices.length;
  if (currentAppCount > snapAppCount) {
    changes.push(`+${currentAppCount - snapAppCount} appendix${currentAppCount - snapAppCount !== 1 ? 'appendices' : ''}`);
  } else if (currentAppCount < snapAppCount) {
    changes.push(`-${snapAppCount - currentAppCount} appendix${snapAppCount - currentAppCount !== 1 ? 'appendices' : ''}`);
  }

  // Metadata field changes
  const metadataFields: Array<keyof ThesisMetadata> = ['title', 'author', 'university', 'supervisor', 'department', 'subtitle', 'faculty'];
  const changedFields: string[] = [];
  for (const field of metadataFields) {
    if (
      (snapshotData.metadata[field] as string) !== (currentData.metadata[field] as string) &&
      ((snapshotData.metadata[field] as string) || (currentData.metadata[field] as string))
    ) {
      changedFields.push(field);
    }
  }
  if (changedFields.length > 0) {
    // Group: "title, author changed"
    const fieldCount = changedFields.length;
    if (fieldCount <= 2) {
      changes.push(`${changedFields.join(', ')} changed`);
    } else {
      changes.push(`${fieldCount} metadata fields changed`);
    }
  }

  if (changes.length === 0) {
    return 'vs. current: no changes';
  }

  return `vs. current: ${changes.join(', ')}`;
}

/**
 * Estimate storage size in KB for thesis data and snapshots.
 */
export function estimateStorageSizeKB(thesisData: ThesisData): number {
  const thesisJSON = JSON.stringify(thesisData);
  // Rough estimate: JSON string bytes / 1024, plus overhead for IndexedDB
  const thesisBytes = new Blob([thesisJSON]).size;
  // IndexedDB adds ~10-20% overhead per record
  const overheadFactor = 1.2;
  const estimatedBytes = thesisBytes * overheadFactor;
  return Math.round(estimatedBytes / 1024 * 100) / 100; // KB, 2 decimal places
}

/**
 * Restore a snapshot.
 */
export async function restoreSnapshot(id: string): Promise<ThesisData | null> {
  try {
    const db = await getDB();
    let snapshot: SnapshotRecord | undefined;

    if ((db as MemoryDB)._isMemoryFallback) {
      snapshot = await (db as MemoryDB).get('snapshots', id) as SnapshotRecord | undefined;
    } else {
      snapshot = await (db as IDBPDatabase).get('snapshots', id) as SnapshotRecord | undefined;
    }

    return snapshot?.data || null;
  } catch (err) {
    console.error('[Persistence] restoreSnapshot failed:', err);
    return null;
  }
}

/**
 * Delete a snapshot.
 */
export async function deleteSnapshot(id: string): Promise<void> {
  try {
    const db = await getDB();
    if ((db as MemoryDB)._isMemoryFallback) {
      await (db as MemoryDB).delete('snapshots', id);
    } else {
      await (db as IDBPDatabase).delete('snapshots', id);
    }
  } catch (err) {
    console.error('[Persistence] deleteSnapshot failed:', err);
  }
}

// ============================================================
// Settings
// ============================================================

export async function saveSetting(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDB();
    if ((db as MemoryDB)._isMemoryFallback) {
      await (db as MemoryDB).put('settings', { key, value });
    } else {
      await (db as IDBPDatabase).put('settings', { key, value });
    }
  } catch (err) {
    console.error('[Persistence] saveSetting failed:', err);
  }
}

export async function loadSetting<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    let record: SettingRecord | undefined;

    if ((db as MemoryDB)._isMemoryFallback) {
      record = await (db as MemoryDB).get('settings', key) as SettingRecord | undefined;
    } else {
      record = await (db as IDBPDatabase).get('settings', key) as SettingRecord | undefined;
    }

    return record?.value as T | undefined;
  } catch (err) {
    console.error('[Persistence] loadSetting failed:', err);
    return undefined;
  }
}

// ============================================================
// Conflict Detection (Zone 2C)
// ============================================================

/**
 * Check if there's a conflict (another tab may have modified the draft).
 */
export async function checkConflict(lastKnownTimestamp: number): Promise<{
  hasConflict: boolean;
  storedTimestamp: number | null;
}> {
  try {
    const db = await getDB();
    let record: DraftRecord | undefined;

    if ((db as MemoryDB)._isMemoryFallback) {
      record = await (db as MemoryDB).get('drafts', CURRENT_DRAFT_KEY) as DraftRecord | undefined;
    } else {
      record = await (db as IDBPDatabase).get('drafts', CURRENT_DRAFT_KEY) as DraftRecord | undefined;
    }

    if (!record) {
      return { hasConflict: false, storedTimestamp: null };
    }

    return {
      hasConflict: record.updatedAt !== lastKnownTimestamp && record.updatedAt > lastKnownTimestamp,
      storedTimestamp: record.updatedAt,
    };
  } catch {
    return { hasConflict: false, storedTimestamp: null };
  }
}

export function getLastKnownTimestamp(): number {
  try {
    const val = sessionStorage.getItem('thesisforge_timestamp');
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function setLastKnownTimestamp(timestamp: number): void {
  try {
    sessionStorage.setItem('thesisforge_timestamp', String(timestamp));
  } catch {
    // sessionStorage unavailable
  }
}
