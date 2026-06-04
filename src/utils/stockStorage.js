const STORAGE_KEY = 'capsula_stock_v1'

export function loadStockMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveStockMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function clearStockMap() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // fail silently
  }
}