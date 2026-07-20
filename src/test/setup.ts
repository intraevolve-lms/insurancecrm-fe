import '@testing-library/jest-dom/vitest'

// Node 22+ ships an experimental native `localStorage` global that jsdom detects and defers to
// instead of installing its own — but without `--localstorage-file` that native implementation is
// inert, silently breaking anything that persists to it (e.g. zustand's persist middleware).
// Polyfill a working in-memory Storage so tests get real storage regardless of Node version.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, String(value)) }
}

for (const prop of ['localStorage', 'sessionStorage'] as const) {
  const current = window[prop]
  if (!current || typeof current.setItem !== 'function') {
    Object.defineProperty(window, prop, { value: new MemoryStorage(), configurable: true })
  }
}
