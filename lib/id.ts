// Centralized ID generation with layered fallbacks.
// Ensures environments lacking crypto.randomUUID still produce RFC4122 v4 IDs.
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  if (typeof crypto !== 'undefined') {
    try {
      if (typeof (crypto as any).randomUUID === 'function') return (crypto as any).randomUUID();
    } catch {}
    try {
      if (typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
        const hex: string[] = [];
        for (let i = 0; i < bytes.length; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));
        return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
      }
    } catch {}
  }
  return uuidv4();
}
