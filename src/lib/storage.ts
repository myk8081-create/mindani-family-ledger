const prefix = 'mindani-ledger';

export const storageKey = (name: string) => `${prefix}:${name}`;

export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(storageKey(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeJson = <T>(key: string, value: T) => {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
};

export const removeJson = (key: string) => {
  localStorage.removeItem(storageKey(key));
};
