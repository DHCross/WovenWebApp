import { randomUUID } from 'crypto';
import type { SessionSSTLog } from './sst';

// In-memory store for development
const store = new Map<string, SessionSSTLog>();

export function getSession(sid: string): SessionSSTLog | null {
    return store.get(sid) || null;
}

export function createSession(sid: string, session: SessionSSTLog): void {
    store.set(sid, session);
}

export function updateSession(sid: string, updater: (session: SessionSSTLog) => void): void {
    const session = store.get(sid);
    if (session) {
        updater(session);
    }
}

export function deleteSession(sid: string): void {
    store.delete(sid);
}
