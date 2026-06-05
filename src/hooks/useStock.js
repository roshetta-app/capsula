import { useState, useEffect } from 'react'
import { loadStockMap, saveStockMap, clearStockMap } from '../utils/stockStorage'

export function useStock(drugs) {
  const [stockMap, setStockMap] = useState(() => {
    // Try loading from localStorage first
    const saved = loadStockMap()
    if (saved) return saved
    // Otherwise build from drugs.json defaults
    const map = {}
    drugs.forEach(d => { map[d.id] = d.inStock })
    return map
  })

  // Persist to localStorage whenever stockMap changes
  useEffect(() => {
    saveStockMap(stockMap)
  }, [stockMap])

  const toggleStock = (id, value) => {
    setStockMap(prev => ({ ...prev, [id]: value }))
  }

  const resetAll = () => {
    clearStockMap()
    const map = {}
    drugs.forEach(d => { map[d.id] = d.inStock })
    setStockMap(map)
  }

  const setAllStock = (value) => {
    setStockMap(prev => {
      const map = { ...prev }
      drugs.forEach(d => { map[d.id] = value })
      return map
    })
  }

  return { stockMap, toggleStock, resetAll, setAllStock }
}