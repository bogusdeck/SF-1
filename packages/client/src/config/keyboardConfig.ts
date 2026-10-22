export interface KeyMapping {
  up: string;
  down: string;
  left: string;
  right: string;
  attack: string;
  jump: string;
  defend: string;
}

export const DEFAULT_KEY_MAPPING: KeyMapping = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  attack: 'A',
  jump: 'S',
  defend: 'D',
};

const STORAGE_KEY = 'lf_keymap_p1';

export function loadKeyMapping(): KeyMapping {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_KEY_MAPPING };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_KEY_MAPPING, ...parsed };
    }
  } catch {
    // Ignore JSON errors and fallback
  }
  return { ...DEFAULT_KEY_MAPPING };
}

export function saveKeyMapping(mapping: KeyMapping): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
  } catch {
    // Ignore storage quota errors
  }
}
