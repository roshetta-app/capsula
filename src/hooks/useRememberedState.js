import { useState, useCallback } from 'react'

// 2026-11-10: works like useState, but the value is also kept in a small
// memory outside the component. The condition editor rebuilds its content area
// after an undo or a redo; without this, every open block, open drug row and
// open patient group tab would close and forget itself. Give each piece of
// state a stable key (for example 'row:<row id>'); the same key restores the
// same value after the rebuild. The memory is emptied whenever the editor
// page is opened or left, so a fresh visit always starts closed.
const memory = new Map()

export function clearRememberedState() {
  memory.clear()
}

export function useRememberedState(key, initial) {
  const [value, setValue] = useState(() => {
    if (key != null && memory.has(key)) return memory.get(key)
    return typeof initial === 'function' ? initial() : initial
  })

  const set = useCallback(next => {
    setValue(prev => {
      const v = typeof next === 'function' ? next(prev) : next
      if (key != null) memory.set(key, v)
      return v
    })
  }, [key])

  return [value, set]
}
