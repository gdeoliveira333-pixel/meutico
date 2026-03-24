import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, FileText, CheckCircle, Database, FolderOpen } from 'lucide-react'
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

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export default function Scanner() {
  const [scanned, setScanned] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFiles = async (e) => {
    const fileList = Array.from(e.target.files || [])
    if (!fileList.length) return

    setLoading(true); setScanned(null); setError('')
    setProgress(`Lendo ${fileList.length} arquivos...`)

    try {
      const indexed = fileList.map((f, i) => ({
        id: i,
        name: f.name,
        path: f.webkitRelativePath || f.name,
        size_bytes: f.size,
        extension: getExt(f.name),
        lastModified: f.lastModified,
        file: f,
      }))

      const rootName = indexed[0]?.path.split('/')[0] || 'Pasta selecionada'
      setScanned({ files: indexed, rootName, total: indexed.length })
      setProgress('')

      // Salva no sessionStorage para Duplicatas usar
      const meta = indexed.map(({ id, name, path, size_bytes, extension, lastModified }) =>
        ({ id, name, path, size_bytes, extension, lastModified })
      )
      sessionStorage.setItem('scanned_files', JSON.stringify(meta))
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const totalSize = scanned?.files.reduce((s, f) => s + f.size_bytes, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Scanner"
        subtitle="Selecione uma pasta do seu computador para indexar os arquivos."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              style={{ display: 'none' }}
              onChange={handleFiles}
            />
            <BtnPrimary onClick={() => inputRef.current?.click()} disabled={loading}>
              <FolderOpen size={13} />
              {loading ? 'Lendo...' : 'Selecionar Pasta'}
            </BtnPrimary>
          </>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {progress && <div className="mb-4"><Alert type="info">{progress}</Alert></div>}

      <AnimatePresence>
        {scanned && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <StatCard value={scanned.total} label="arquivos encontrados" color="#00f5d4" />
              <StatCard value={fmt(totalSize)} label="tamanho total" color="#38bdf8" />
              <StatCard value={scanned.rootName} label="pasta" color="#a78bfa" />
            </div>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={12} style={{ color: '#34d399' }} />
                <span className="text-xs font-medium" style={{ color: '#34d399' }}>Scan concluído</span>
              </div>
              <p className="text-sm font-medium text-white">{scanned.rootName}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.5)' }}>
                {scanned.total} arquivos · {fmt(totalSize)} — vá para <strong className="text-white">Duplicatas</strong> para detectar cópias
              </p>
            </Card>

            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Database size={13} style={{ color: '#00f5d4' }} />
                <span className="text-sm font-medium text-white">{scanned.total} arquivos indexados</span>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {scanned.files.map((f, i) => {
                  const dotColor = EXT_COLOR[f.extension] || 'rgba(148,163,184,0.4)'
                  return (
                    <motion.div key={f.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}
                      className="flex items-center justify-between px-5 py-2.5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                        <span className="text-sm truncate" style={{ color: 'rgba(226,232,240,0.8)' }}>{f.path}</span>
                      </div>
                      <span className="text-xs shrink-0 ml-3" style={{ color: 'rgba(148,163,184,0.4)' }}>{fmt(f.size_bytes)}</span>
                    </motion.div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!scanned && !loading && (
        <EmptyState icon={FileText} message="Selecione uma pasta para começar o scan local." />
      )}
    </div>
  )
}
