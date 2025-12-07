import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { SessionSSTLog } from './sst';

// Persistence configuration
const SESSIONS_DIR = path.join(process.cwd(), '.sessions');
const SESSION_FILE = path.join(SESSIONS_DIR, 'store.json');
let store: Map<string, SessionSSTLog> | null = null;
let saveTimer: NodeJS.Timeout | null = null;

// Ensure storage directory exists
try {
    if (!fs.existsSync(SESSIONS_DIR)) {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
} catch (e) {
    console.error('[SessionStore] Failed to create sessions directory', e);
}

// Load sessions from disk
function loadStore(): Map<string, SessionSSTLog> {
    if (store) return store;
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = fs.readFileSync(SESSION_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            store = new Map(Object.entries(parsed));
            console.log(`[SessionStore] Loaded ${store.size} sessions from disk.`);
        } else {
            store = new Map();
        }
    } catch (e) {
        console.error('[SessionStore] Failed to load sessions, starting fresh', e);
        store = new Map();
    }
    return store!;
}

// Debounced save to disk
function triggerSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            if (store) {
                const obj = Object.fromEntries(store);
                fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), 'utf-8');
            }
        } catch (e) {
            console.error('[SessionStore] Failed to save sessions', e);
        }
        saveTimer = null;
    }, 1000); // Save 1s after last update
}

export function getSession(sid: string): SessionSSTLog | null {
    const s = loadStore();
    return s.get(sid) || null;
}

export function createSession(sid: string, session: SessionSSTLog): void {
    const s = loadStore();
    s.set(sid, session);
    triggerSave();
}

export function updateSession(sid: string, updater: (session: SessionSSTLog) => void): void {
    const s = loadStore();
    const session = s.get(sid);
    if (session) {
        updater(session);
        triggerSave();
    }
}

export function deleteSession(sid: string): void {
    const s = loadStore();
    s.delete(sid);
    triggerSave();
}
