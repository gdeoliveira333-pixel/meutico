import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { Search, ShieldCheck, Copy, Star } from 'lucide-react'
import { PageHeader, Card, StatCard, BtnPrimary, BtnDanger, EmptyState, Alert } from '../components/UI'

export default function Duplicates() {
  const [groups, setGroups]     = useState(null)
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [committing, setCommitting] = useState(null)
  const [result, setResult]     = useState(null)

  const detect = async () => {
    setLoading(true); setGroups(null); setResult(null)
    try {
      const res = await api.detectDuplicates()
      setGroups(res.groups)
      setSummary({ total: res.total_duplicates, mb: res.wasted_mb, bytes: res.wasted_bytes })
    } finally { setLoading(false) }
  }

  const quarantine = async (fileIds, groupId) => {
    setCommitting(groupId)
    try {
      const res = await api.commit(fileIds)
      setResult(res)
      detect()
    } finally { setCommitting(null) }
  }

  const fmt = b => b > 1024 * 1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${(b/1024).toFixed(1)} KB`

  return (
    <div>
      <PageHeader
        title="Detecção de Duplicatas"
        subtitle="Identifica cópias exatas por hash SHA-256 em 2 estágios."
        action={
          <BtnPrimary onClick={detect} disabled={loading}>
            <Search size={13} /> {loading ? 'Analisando...' : 'Detectar'}
          </BtnPrimary>
        }
      />

      {result && (
        <div className="mb-6">
          <Alert type={result.success ? 'success' : 'error'}>
            {result.success
              ? `✓ ${result.moved?.length} arquivo(s) movidos para quarentena com segurança.`
              : `Erro: ${result.errors?.join(', ')}`}
          </Alert>
        </div>
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

              {/* Header */}
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
                <BtnDanger
                  onClick={() => quarantine(g.files.filter(f => !f.is_original).map(f => f.id), g.group_id)}
                  disabled={committing === g.group_id}>
                  <ShieldCheck size={11} />
                  {committing === g.group_id ? 'Enviando...' : 'Quarentenar cópias'}
                </BtnDanger>
              </div>

              {/* Files */}
              <div>
                {g.files.map((f, fi) => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: fi < g.files.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    {f.is_original
                      ? <Star size={11} style={{ color: '#00f5d4', shrink: 0 }} />
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
        <EmptyState icon={Search} message="Clique em 'Detectar' para analisar duplicatas no manifesto atual." />
      )}
    </div>
  )
}
