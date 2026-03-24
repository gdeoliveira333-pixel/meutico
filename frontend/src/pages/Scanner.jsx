import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { Play, FileText, CheckCircle, Database } from 'lucide-react'
import { PageHeader, Card, StatCard, BtnPrimary, EmptyState, Alert } from '../components/UI'

const EXT_COLOR = {
  '.jpg': '#f59e0b', '.jpeg': '#f59e0b', '.png': '#f59e0b', '.gif': '#f59e0b', '.webp': '#f59e0b',
  '.mp4': '#8b5cf6', '.mov': '#8b5cf6', '.avi': '#8b5cf6', '.mkv': '#8b5cf6',
  '.pdf': '#ef4444', '.doc': '#3b82f6', '.docx': '#3b82f6', '.xls': '#10b981', '.xlsx': '#10b981',
  '.zip': '#f97316', '.rar': '#f97316',
}

function fmt(bytes) {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function Scanner() {
  const [results, setResults] = useState(null)
  const [files, setFiles] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runScan = async () => {
    setLoading(true); setResults(null); setFiles(null); setError('')
    try {
      const res = await api.scan()
      setResults(res.results)
      const f = await api.getFiles({ limit: 200 })
      setFiles(f)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const totalAdded = results?.reduce((s, r) => s + r.added, 0) ?? 0
  const totalUpdated = results?.reduce((s, r) => s + r.updated, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Scanner"
        subtitle="Varre origens autorizadas e indexa todos os arquivos com hash criptográfico."
        action={
          <BtnPrimary onClick={runScan} disabled={loading}>
            <Play size={13} className={loading ? 'animate-pulse' : ''} />
            {loading ? 'Varrendo...' : 'Iniciar Scan'}
          </BtnPrimary>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <AnimatePresence>
        {results && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={totalAdded}   label="novos arquivos"    color="#00f5d4" />
              <StatCard value={totalUpdated} label="atualizados"       color="#38bdf8" />
              <StatCard value={files?.total ?? 0} label="total indexado" color="#a78bfa" />
            </div>

            {/* Per-root results */}
            <div className="grid gap-3 sm:grid-cols-2">
              {results.map((r, i) => (
                <Card key={i}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={12} style={{ color: '#34d399' }} />
                    <span className="text-xs font-medium" style={{ color: '#34d399' }}>Concluído</span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{r.root.split('\\').pop()}</p>
                  <p className="text-xs mt-0.5 mb-3 truncate" style={{ color: 'rgba(148,163,184,0.4)' }}>{r.root}</p>
                  <div className="flex gap-4 text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    <span><span className="text-white font-medium">{r.added}</span> novos</span>
                    <span><span className="text-white font-medium">{r.updated}</span> atualizados</span>
                    {r.errors > 0 && <span><span style={{ color: '#f87171' }} className="font-medium">{r.errors}</span> erros</span>}
                  </div>
                </Card>
              ))}
            </div>

            {/* File list */}
            {files && files.files.length > 0 && (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Database size={13} style={{ color: '#00f5d4' }} />
                  <span className="text-sm font-medium text-white">{files.total} arquivos no manifesto</span>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {files.files.map((f, i) => {
                    const dotColor = EXT_COLOR[f.extension] || 'rgba(148,163,184,0.4)'
                    return (
                      <motion.div key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="flex items-center justify-between px-5 py-2.5 group"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                          {f.is_duplicate && <span className="tag-warn shrink-0">dup</span>}
                          <span className="text-sm truncate" style={{ color: 'rgba(226,232,240,0.8)' }}>{f.name}</span>
                        </div>
                        <span className="text-xs shrink-0 ml-3" style={{ color: 'rgba(148,163,184,0.4)' }}>{fmt(f.size_bytes)}</span>
                      </motion.div>
                    )
                  })}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!results && !loading && (
        <EmptyState icon={FileText} message="Clique em 'Iniciar Scan' para indexar suas pastas." />
      )}
    </div>
  )
}
