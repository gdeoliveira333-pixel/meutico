import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { Folder, Cloud, Clock, Plus, Trash2, ChevronRight, Timer, CalendarDays, RotateCcw, HardDrive, CheckCircle } from 'lucide-react'
import { PageHeader, EmptyState } from '../components/UI'

const INTERVALS = [
  { value: 'hourly', label: 'A cada hora',  icon: Timer,       desc: 'Para quem recebe arquivos constantemente' },
  { value: 'daily',  label: 'Todo dia',     icon: CalendarDays,desc: 'Todo dia às 08:00 — mais recomendado' },
  { value: 'weekly', label: 'Toda semana',  icon: RotateCcw,   desc: 'Toda segunda-feira às 08:00' },
]

export default function Scheduler() {
  const [jobs, setJobs]             = useState([])
  const [roots, setRoots]           = useState([])
  const [driveFolders, setDriveFolders] = useState([])
  const [connected, setConnected]   = useState(false)

  const [sourceRoot, setSourceRoot] = useState(null)
  const [destFolder, setDestFolder] = useState(null)
  const [interval, setInterval]     = useState('daily')
  const [loading, setLoading]       = useState(false)
  const [removing, setRemoving]     = useState(null)
  const [error, setError]           = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const [j, r, status] = await Promise.all([
      api.getSchedules(),
      api.getRoots(),
      fetch('/api/cloud/status').then(r => r.json()).catch(() => ({ connected: false })),
    ])
    setJobs(Array.isArray(j) ? j : [])
    setRoots(Array.isArray(r) ? r : [])
    setConnected(status.connected)
    if (status.connected) {
      const folders = await fetch('/api/cloud/folders').then(r => r.json()).catch(() => [])
      setDriveFolders(Array.isArray(folders) ? folders : [])
    }
  }

  const create = async () => {
    if (!sourceRoot || !destFolder) return
    setLoading(true); setError('')
    try {
      const jobId = `backup_${Date.now()}`
      const label = `${sourceRoot.label || sourceRoot.path.split('\\').pop()} → Drive`
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          interval,
          label,
          source_path: sourceRoot.path,
          folder_id: destFolder === 'root' ? 'root' : destFolder.id,
        }),
      })
      setSourceRoot(null); setDestFolder(null); setInterval('daily')
      loadAll()
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const remove = async (id) => {
    setRemoving(id)
    await api.deleteSchedule(id)
    loadAll()
    setRemoving(null)
  }

  const fmtNext = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    const diff = d - new Date()
    if (diff < 3600000) return `em ${Math.round(diff/60000)} min`
    if (diff < 86400000) return `em ${Math.round(diff/3600000)}h`
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const canCreate = sourceRoot && destFolder

  return (
    <div>
      <PageHeader
        title="Backup Automático"
        subtitle="Configure backups automáticos das suas pastas para o Google Drive."
      />

      {/* Setup wizard */}
      <div style={{
        background: 'rgba(10,15,25,0.8)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
      }}>

        {/* Step 1 — Source */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 8,
              background: sourceRoot ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${sourceRoot ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: sourceRoot ? '#00f5d4' : 'rgba(148,163,184,0.4)',
            }}>
              {sourceRoot ? <CheckCircle size={12} /> : '1'}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>De onde fazer o backup?</p>
            <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', marginLeft: 4 }}>Escolha uma pasta de origem</p>
          </div>

          {roots.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', padding: '10px 0' }}>
              Nenhuma pasta indexada. Adicione uma pasta na aba Origens primeiro.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {roots.map(r => {
                const active = sourceRoot?.id === r.id
                return (
                  <button key={r.id} onClick={() => setSourceRoot(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 12,
                      background: active ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? '#00f5d4' : 'rgba(226,232,240,0.6)',
                      fontSize: 13, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}>
                    <HardDrive size={12} />
                    {r.label || r.path.split('\\').pop() || r.path}
                  </button>
                )
              })}
            </div>
          )}

          {sourceRoot && (
            <p style={{ fontSize: 11, color: 'rgba(0,245,212,0.5)', marginTop: 10 }}>
              📁 {sourceRoot.path}
            </p>
          )}
        </div>

        {/* Step 2 — Destination */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: sourceRoot ? 1 : 0.4, transition: 'opacity 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 8,
              background: destFolder ? 'rgba(0,245,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${destFolder ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: destFolder ? '#00f5d4' : 'rgba(148,163,184,0.4)',
            }}>
              {destFolder ? <CheckCircle size={12} /> : '2'}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Para onde no Google Drive?</p>
          </div>

          {!connected ? (
            <p style={{ fontSize: 12, color: 'rgba(248,113,113,0.7)' }}>
              ⚠️ Google Drive não conectado. Conecte na aba Drive primeiro.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {/* Root option */}
              <button onClick={() => setDestFolder('root')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 12,
                  background: destFolder === 'root' ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${destFolder === 'root' ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: destFolder === 'root' ? '#00f5d4' : 'rgba(226,232,240,0.6)',
                  fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <Cloud size={12} /> Raiz do Drive
              </button>
              {driveFolders.map(f => {
                const active = destFolder?.id === f.id
                return (
                  <button key={f.id} onClick={() => setDestFolder(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 12,
                      background: active ? 'rgba(0,245,212,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? '#00f5d4' : 'rgba(226,232,240,0.6)',
                      fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <Folder size={12} /> {f.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Step 3 — Frequency */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: canCreate ? 1 : 0.4, transition: 'opacity 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.4)',
            }}>3</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Com que frequência?</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {INTERVALS.map(opt => {
              const active = interval === opt.value
              return (
                <button key={opt.value} onClick={() => setInterval(opt.value)}
                  style={{
                    flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 14,
                    background: active ? 'rgba(0,245,212,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? 'rgba(0,245,212,0.28)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: active ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                  }}>
                    <opt.icon size={13} style={{ color: active ? '#00f5d4' : '#64748b' }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: active ? '#fff' : 'rgba(226,232,240,0.5)', marginBottom: 4 }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: active ? 'rgba(0,245,212,0.6)' : 'rgba(100,116,139,0.5)', lineHeight: 1.4 }}>{opt.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Create button */}
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {error && <p style={{ fontSize: 12, color: '#f87171' }}>{error}</p>}
          {!error && (
            <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.35)' }}>
              {canCreate
                ? `Backup de "${sourceRoot.label || sourceRoot.path.split('\\').pop()}" → Drive ${INTERVALS.find(i => i.value === interval)?.label.toLowerCase()}`
                : 'Selecione origem e destino para continuar'}
            </p>
          )}
          <button onClick={create} disabled={!canCreate || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: canCreate ? 'rgba(0,245,212,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${canCreate ? 'rgba(0,245,212,0.28)' : 'rgba(255,255,255,0.06)'}`,
              color: canCreate ? '#00f5d4' : 'rgba(100,116,139,0.4)',
              fontSize: 13, fontWeight: 600,
              cursor: canCreate ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}>
            <Plus size={13} />
            {loading ? 'Criando...' : 'Criar backup automático'}
          </button>
        </div>
      </div>

      {/* Active backups */}
      {jobs.length === 0
        ? <EmptyState icon={Clock} message="Nenhum backup agendado. Configure um acima." />
        : (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(148,163,184,0.3)', marginBottom: 12 }}>
              {jobs.length} backup{jobs.length > 1 ? 's' : ''} agendado{jobs.length > 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              <AnimatePresence>
                {jobs.map((job, i) => {
                  const intv = INTERVALS.find(iv => iv.value === job.interval) || INTERVALS[1]
                  const sourceName = job.source_path ? job.source_path.split('\\').pop() || job.source_path : '—'
                  return (
                    <motion.div key={job.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: 'rgba(10,15,25,0.8)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16, padding: '14px 18px',
                      }}>

                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(0,245,212,0.07)',
                        border: '1px solid rgba(0,245,212,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <intv.icon size={14} style={{ color: '#00f5d4' }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{sourceName}</span>
                          <ChevronRight size={12} style={{ color: 'rgba(0,245,212,0.4)', flexShrink: 0 }} />
                          <Cloud size={11} style={{ color: 'rgba(0,245,212,0.5)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'rgba(0,245,212,0.6)', truncate: true }}>Google Drive</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 99,
                            background: 'rgba(0,245,212,0.07)', border: '1px solid rgba(0,245,212,0.15)',
                            color: 'rgba(0,245,212,0.7)',
                          }}>{intv.label}</span>
                          <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} /> Próximo: {fmtNext(job.next_run)}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.4)' }} />
                        <span style={{ fontSize: 11, color: 'rgba(52,211,153,0.6)' }}>ativo</span>
                      </div>

                      <button onClick={() => remove(job.id)} disabled={removing === job.id}
                        style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
                          color: '#f87171', cursor: 'pointer',
                          opacity: removing === job.id ? 0.4 : 1,
                          transition: 'all 0.15s',
                        }}>
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )
      }
    </div>
  )
}
