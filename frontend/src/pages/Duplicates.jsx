import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Copy, Star, FolderOpen, ShieldCheck } from 'lucide-react'
import { PageHeader, Card, StatCard, BtnPrimary, EmptyState, Alert } from '../components/UI'

function fmt(bytes) {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function hashFile(file) {
  const buf = await file.arrayBuffer()
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Duplicates() {
  const [groups, setGroups] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const detect = async (fileList) => {
    setLoading(true); setGroups(null); setSummary(null); setError('')

    try {
      const files = Array.from(fileList)

      // Stage 1: agrupar por tamanho
      const bySize = {}
      files.forEach((f, i) => {
        const key = f.size
        if (!bySize[key]) bySize[key] = []
        bySize[key].push({ file: f, id: i })
      })

      // Stage 2: calcular hash só dos grupos com tamanho igual (potenciais duplicatas)
      const candidates = Object.values(bySize).filter(g => g.length > 1)
      const total = candidates.reduce((s, g) => s + g.length, 0)
      let done = 0

      const byHash = {}
      for (const group of candidates) {
        for (const item of group) {
          setProgress(`Calculando hash... ${done + 1}/${total}`)
          const hash = await hashFile(item.file)
          if (!byHash[hash]) byHash[hash] = []
          byHash[hash].push({ ...item, hash })
          done++
        }
      }

      // Montar grupos de duplicatas
      const dupGroups = Object.entries(byHash)
        .filter(([, g]) => g.length > 1)
        .map(([hash, g], gi) => ({
          group_id: gi,
          hash,
          count: g.length,
          size_bytes: g[0].file.size,
          wasted_bytes: g[0].file.size * (g.length - 1),
          files: g.map((item, fi) => ({
            id: item.id,
            name: item.file.name,
            path: item.file.webkitRelativePath || item.file.name,
            size_bytes: item.file.size,
            is_original: fi === 0,
          }))
        }))

      const totalDups = dupGroups.reduce((s, g) => s + g.count - 1, 0)
      const wastedBytes = dupGroups.reduce((s, g) => s + g.wasted_bytes, 0)

      setGroups(dupGroups)
      setSummary({ total: totalDups, bytes: wastedBytes, mb: (wastedBytes / 1024 / 1024).toFixed(1) })
      setProgress('')
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFiles = (e) => {
    const files = e.target.files
    if (files?.length) detect(files)
  }

  return (
    <div>
      <PageHeader
        title="Detecção de Duplicatas"
        subtitle="Selecione uma pasta — o hash SHA-256 é calculado direto no seu browser."
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
              {loading ? 'Analisando...' : 'Selecionar Pasta'}
            </BtnPrimary>
          </>
        }
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      {progress && (
        <div className="mb-4"><Alert type="info">{progress}</Alert></div>
      )}

      <AnimatePresence>
        {summary && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 mb-6">
            <StatCard value={summary.total} label="arquivos duplicados" color="#fbbf24" />
            <StatCard value={`${summary.mb} MB`} label="espaço desperdiçado" color="#00f5d4" />
          </motion.div>
        )}
      </AnimatePresence>

      {groups?.length === 0 && (
        <EmptyState icon={Copy} message="Nenhuma duplicata encontrada. Seus arquivos estão únicos!" />
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {groups?.map((g, i) => (
            <motion.div key={g.group_id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl overflow-hidden card-hover"
              style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>

              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <Copy size={13} style={{ color: '#fbbf24' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{g.count} cópias idênticas</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                      {fmt(g.size_bytes)} cada · {fmt(g.wasted_bytes)} desperdiçados
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-lg" style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <ShieldCheck size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Envie cópias pro Drive para liberar espaço
                </span>
              </div>

              <div>
                {g.files.map((f, fi) => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: fi < g.files.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    {f.is_original
                      ? <Star size={11} style={{ color: '#00f5d4', flexShrink: 0 }} />
                      : <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'rgba(251,191,36,0.4)' }} />}
                    <span className={`text-xs shrink-0 ${f.is_original ? 'tag-cyan' : 'tag-warn'}`}>
                      {f.is_original ? 'original' : 'cópia'}
                    </span>
                    <span className="text-sm truncate" style={{ color: f.is_original ? 'rgba(226,232,240,0.9)' : 'rgba(148,163,184,0.6)' }}>
                      {f.path}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!groups && !loading && (
        <EmptyState icon={Search} message="Selecione uma pasta para detectar duplicatas localmente." />
      )}
    </div>
  )
}
