import { useState, useEffect } from 'react'
import { loadStockMap, saveStockMap } from '../utils/stockStorage'

export function useStock(drugs) {
  const [stockMap, setStockMap] = useState(() => {
    const saved = loadStockMap()
    if (saved) return saved
    const map = {}
    drugs.forEach(d => { map[d.id] = d.inStock })
    return map
  })

  useEffect(() => {
    saveStockMap(stockMap)
  }, [stockMap])

  const toggleStock = (id, value) => {
    setStockMap(prev => ({ ...prev, [id]: value }))
  }

  const setAllStock = (ids, value) => {
    setStockMap(prev => {
      const next = { ...prev }
      ids.forEach(id => { next[id] = value })
      return next
    })
  }

  return { stockMap, toggleStock, setAllStock }
}
