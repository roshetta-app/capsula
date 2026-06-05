import { useState, useMemo } from 'react'
import {
  CheckCircle, XCircle, RotateCcw, Search,
  ToggleLeft, ToggleRight, Package, PackageX
} from 'lucide-react'

export default function StockManager({ drugs, onUpdate }) {
  const [filter, setFilter] = useState('all')   // 'all' | 'in' | 'out'
  const [query, setQuery]   = useState('')
  const [toast, setToast]   = useState(null)
  const [snapshot, setSnapshot] = useState(null)

  const inCount  = drugs.filter(d => d.inStock).length
  const outCount = drugs.length - inCount
  const pct      = drugs.length ? Math.round(inCount / drugs.length * 100) : 0

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return drugs.filter(d => {
      const matchQ = d.name.toLowerCase().includes(q) ||
                     (d.category ?? '').toLowerCase().includes(q)
      const matchF = filter === 'all'
        || (filter === 'in'  && d.inStock)
        || (filter === 'out' && !d.inStock)
      return matchQ && matchF
    })
  }, [drugs, query, filter])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  function toggle(id) {
    onUpdate(drugs.map(d => d.id === id ? { ...d, inStock: !d.inStock } : d))
  }

  function stockAll() {
    setSnapshot([...drugs])
    onUpdate(drugs.map(d => ({ ...d, inStock: true })))
    showToast('All drugs stocked')
  }

  function unstockAll() {
    setSnapshot([...drugs])
    onUpdate(drugs.map(d => ({ ...d, inStock: false })))
    showToast('All drugs unstocked')
  }

  function reset() {
    setSnapshot([...drugs])
    onUpdate(drugs.map(d => ({ ...d, inStock: d.defaultStock ?? d.inStock })))
    showToast('Reset to defaults')
  }

  function undo() {
    if (snapshot) { onUpdate(snapshot); setSnapshot(null); setToast(null) }
  }

  const filterBtnClass = (f) =>
    `px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ` +
    (filter === f
      ? 'bg-gray-900 text-white border-gray-900'
      : 'text-gray-500 border-gray-200 hover:border-gray-400')

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">In stock</p>
          <p className="text-2xl font-medium text-emerald-700">{inCount}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Out of stock</p>
          <p className="text-2xl font-medium text-red-600">{outCount}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Availability</p>
          <p className="text-2xl font-medium text-gray-800">{pct}%</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search drugs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <button onClick={() => setFilter('all')} className={filterBtnClass('all')}>All</button>
        <button onClick={() => setFilter('in')}  className={filterBtnClass('in')}>In stock</button>
        <button onClick={() => setFilter('out')} className={filterBtnClass('out')}>Out of stock</button>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={stockAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border
                     border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors">
          <CheckCircle size={15} /> Stock all
        </button>
        <button onClick={unstockAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border
                     border-red-200 text-red-600 hover:bg-red-50 transition-colors">
          <XCircle size={15} /> Unstock all
        </button>
        <button onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border
                     border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ml-auto">
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {/* Drug list */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">No drugs match your search.</p>
        )}
        {visible.map(drug => (
          <button
            key={drug.id}
            onClick={() => toggle(drug.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left
                        transition-all cursor-pointer
                        ${drug.inStock
                          ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-gray-200 bg-white hover:bg-gray-50'}`}
          >
            {drug.inStock
              ? <ToggleRight size={22} className="text-emerald-600 shrink-0" />
              : <ToggleLeft  size={22} className="text-gray-400 shrink-0" />}

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate
                             ${drug.inStock ? 'text-emerald-900' : 'text-gray-700'}`}>
                {drug.name}
              </p>
              {drug.category && (
                <p className="text-xs text-gray-400">{drug.category}</p>
              )}
            </div>

            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0
                              ${drug.inStock
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-500'}`}>
              {drug.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </button>
        ))}
      </div>

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50
                        flex items-center gap-3 bg-gray-900 text-white
                        text-sm px-4 py-2.5 rounded-xl shadow-lg">
          <span>{toast}</span>
          {snapshot && (
            <button onClick={undo}
              className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-md transition-colors">
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
