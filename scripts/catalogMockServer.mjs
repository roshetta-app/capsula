// A small stand-in for the Supabase REST interface, for testing scripts/build-catalog.mjs offline.
// It understands only what the build script and fetchFlatDrugs ask for: select with nested embeds,
// is_published / id / table_name / created_at filters, order, limit/offset, the exact row count,
// and the single-object answer.

import http from 'node:http'

export function parseSelect(sel) {
  let i = 0
  function level() {
    const cols = []
    const embeds = {}
    let token = ''
    const flush = () => { const t = token.trim(); if (t) cols.push(t); token = '' }
    while (i < sel.length) {
      const ch = sel[i]
      if (ch === ',') { flush(); i++ }
      else if (ch === '(') {
        const name = token.trim().replace(/!.*$/, '').trim()
        token = ''
        i++
        embeds[name] = level()
      } else if (ch === ')') { i++; flush(); return { cols, embeds } }
      else { token += ch; i++ }
    }
    flush()
    return { cols, embeds }
  }
  return level()
}

function project(row, tree, lookups) {
  const out = {}
  for (const c of tree.cols) out[c] = row[c] === undefined ? null : row[c]
  for (const [name, sub] of Object.entries(tree.embeds)) {
    if (name === 'formulations') {
      const f = lookups.formulations.get(row.formulation_id)
      out.formulations = f ? project(f, sub, lookups) : null
    } else if (name === 'generics') {
      const g = lookups.generics.get(row.generic_id)
      out.generics = g ? project(g, sub, lookups) : null
    }
  }
  return out
}

/**
 * @param {object} o
 * @param {{generics: object[], formulations: object[], brands: object[]}} o.tables
 * @param {() => string} o.getStamp                the current version stamp (called on every read of app_metadata)
 * @param {Array<object>} [o.auditRows]
 * @param {(rows: object[]) => object[]} [o.nestedTransform]   changes the nested brand answer (the "today's download" path)
 */
export async function startMockSupabase({ tables, getStamp, auditRows = [], nestedTransform }) {
  const lookups = {
    formulations: new Map(tables.formulations.map(r => [r.id, r])),
    generics: new Map(tables.generics.map(r => [r.id, r])),
  }
  const stats = { requests: 0, nestedRequests: 0, flatTableRequests: 0, apikeys: new Set(), authorizations: new Set() }

  const server = http.createServer((req, res) => {
    stats.requests++
    stats.apikeys.add(req.headers.apikey ?? '')
    if (req.headers.authorization) stats.authorizations.add(req.headers.authorization)
    const url = new URL(req.url, 'http://x')
    const table = url.pathname.replace('/rest/v1/', '')
    const p = url.searchParams
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers })
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body))
    }

    let rows
    if (table === 'app_metadata') rows = [{ id: 1, drugs_updated_at: getStamp(), conditions_updated_at: '2026-01-01T00:00:00Z' }]
    else if (table === 'audit_log') rows = auditRows
    else if (tables[table]) rows = tables[table]
    else return send(404, { message: `no table ${table}` })

    // filters
    for (const [key, value] of p) {
      if (['select', 'order', 'limit', 'offset'].includes(key)) continue
      const m = value.match(/^(eq|gt|in)\.(.*)$/)
      if (!m) return send(400, { message: `mock does not understand ${key}=${value}` })
      const [, op, arg] = m
      if (op === 'eq') rows = rows.filter(r => String(r[key]) === arg)
      else if (op === 'gt') rows = rows.filter(r => String(r[key]) > arg)
      else if (op === 'in') rows = rows.filter(r => arg.replace(/^\(|\)$/g, '').split(',').includes(String(r[key])))
    }
    // order
    const order = p.get('order')
    if (order) {
      const [col, dir] = order.split('.')
      rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1))
    }
    const total = rows.length
    // paging
    let offset = Number(p.get('offset') ?? 0)
    let limit = p.get('limit') != null ? Number(p.get('limit')) : Infinity
    const range = req.headers.range
    if (range && /^\d+-\d+$/.test(range)) { const [a, b] = range.split('-').map(Number); offset = a; limit = b - a + 1 }
    rows = rows.slice(offset, offset + limit)

    const tree = parseSelect(p.get('select') ?? '*')
    const nested = 'formulations' in tree.embeds
    if (table === 'brands') { if (nested) stats.nestedRequests++; else stats.flatTableRequests++ }
    let out = (p.get('select') ?? '*') === '*' ? rows : rows.map(r => project(r, tree, lookups))
    if (nested && nestedTransform) out = nestedTransform(out)

    const headers = {}
    if ((req.headers.prefer ?? '').includes('count=exact')) {
      headers['content-range'] = rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}`
    }
    if ((req.headers.accept ?? '').includes('vnd.pgrst.object')) {
      if (out.length !== 1) return send(406, { message: 'expected a single row' })
      return send(200, out[0], headers)
    }
    send(200, out, headers)
  })

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  return { url, stats, close: () => new Promise(resolve => server.close(resolve)) }
}
