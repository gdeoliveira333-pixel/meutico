import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { Cloud as CloudIcon, CheckCircle, Upload, Folder, ExternalLink, RefreshCw, Film } from 'lucide-react'
import { PageHeader, Card, StatCard, BtnPrimary, EmptyState, Alert } from '../components/UI'

function ProgressBar({ value }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg, #00f5d4, #38bdf8)', boxShadow: '0 0 8px rgba(0,245,212,0.4)' }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  )
}

export default function Cloud() {
  const [connected, setConnected]     = useState(false)
  const [folders, setFolders]         = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [files, setFiles]             = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [jobs, setJobs]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const pollRef                       = useRef(null)

  const checkStatus = async () => {
    const res = await api.cloudStatus().catch(() => ({ connected: false }))
    setConnected(res.connected)
    if (res.connected) loadFolders()
  }

  const loadFolders = async () => {
    const res = await api.cloudFolders().catch(() => [])
    setFolders(Array.isArray(res) ? res : [])
  }

  const loadFiles = async () => {
    const res = await api.getFiles({ limit: 200 }).catch(() => ({ files: [] }))
    setFiles(res.files || [])
  }

  const loadJobs = async () => {
    const res = await api.cloudJobs().catch(() => [])
    setJobs(Array.isArray(res) ? res : [])
  }

  useEffect(() => {
    checkStatus()
    loadFiles()
    loadJobs()
    pollRef.current = setInterval(loadJobs, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  const connect = async () => {
    setError('')
    try {
      const res = await api.cloudAuthUrl()
      if (res.url) window.open(res.url, '_blank', 'width=500,height=650')
      setTimeout(checkStatus, 5000)
    } catch(e) { setError(e.message) }
  }

  const startUpload = async () => {
    if (!selectedFiles.length || !selectedFolder) return
    setLoading(true)
    try {
      const res = await api.cloudUpload({ file_ids: selectedFiles, folder_id: selectedFolder })
      loadJobs()
      setSelectedFiles([])
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const toggleFile = (id) => setSelectedFiles(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const runningJobs = jobs.filter(j => j.status === 'running')
  const doneJobs    = jobs.filter(j => j.status === 'done')

  const fmt = b => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${(b/1024).toFixed(1)} KB`

  return (
    <div>
      <PageHeader
        title="Google Drive"
        subtitle="Envie seus arquivos para a nuvem com segurança e controle total."
      />

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {/* Connection status */}
      <Card className="mb-6" glow={connected}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: connected ? 'rgba(52,211,153,0.1)' : 'rgba(148,163,184,0.05)', border: `1px solid ${connected ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
              <CloudIcon size={18} style={{ color: connected ? '#34d399' : '#64748b' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Google Drive</p>
              <p className="text-xs mt-0.5" style={{ color: connected ? '#34d399' : 'rgba(148,163,184,0.5)' }}>
                {connected ? '● Conectado' : '○ Não conectado'}
              </p>
            </div>
          </div>
          {connected
            ? <button onClick={checkStatus} className="p-2 rounded-lg transition-colors" style={{ color: '#94a3b8' }}><RefreshCw size={14} /></button>
            : <BtnPrimary onClick={connect}><ExternalLink size={13} /> Conectar conta Google</BtnPrimary>
          }
        </div>

        {!connected && (
          <div className="mt-4 pt-4 text-xs space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.5)' }}>
            <p>Para conectar, você precisa de um arquivo <code className="text-cyan-400">google_credentials.json</code> na pasta backend.</p>
            <p>Crie em <span style={{ color: '#00f5d4' }}>console.cloud.google.com</span> → APIs & Services → Credentials → OAuth 2.0.</p>
          </div>
        )}
      </Card>

      {connected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={doneJobs.length}    label="enviados"        color="#34d399" />
            <StatCard value={runningJobs.length} label="em andamento"    color="#00f5d4" />
            <StatCard value={files.length}       label="arquivos locais" color="#a78bfa" />
          </div>

          {/* Upload panel */}
          <Card>
            <p className="text-xs font-semibold mb-4 uppercase tracking-widest" style={{ color: 'rgba(0,245,212,0.7)' }}>
              Novo upload
            </p>

            {/* Folder selector */}
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: 'rgba(148,163,184,0.5)' }}>Destino no Drive</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedFolder('root')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
                  style={{
                    background: selectedFolder === 'root' ? 'rgba(0,245,212,0.1)' : 'rgba(15,22,35,0.6)',
                    border: `1px solid ${selectedFolder === 'root' ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: selectedFolder === 'root' ? '#00f5d4' : '#94a3b8',
                  }}>
                  <Folder size={11} /> Raiz do Drive
                </button>
                {folders.map(f => (
                  <button key={f.id} onClick={() => setSelectedFolder(f.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
                    style={{
                      background: selectedFolder === f.id ? 'rgba(0,245,212,0.1)' : 'rgba(15,22,35,0.6)',
                      border: `1px solid ${selectedFolder === f.id ? 'rgba(0,245,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: selectedFolder === f.id ? '#00f5d4' : '#94a3b8',
                    }}>
                    <Folder size={11} /> {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* File selector */}
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: 'rgba(148,163,184,0.5)' }}>Selecionar arquivos ({selectedFiles.length} selecionados)</p>
              <div style={{ maxHeight: 240, overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                {files.map(f => {
                  const sel = selectedFiles.includes(f.id)
                  return (
                    <div key={f.id} onClick={() => toggleFile(f.id)}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
                      style={{
                        background: sel ? 'rgba(0,245,212,0.06)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}>
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{ background: sel ? 'rgba(0,245,212,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${sel ? 'rgba(0,245,212,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                        {sel && <CheckCircle size={10} style={{ color: '#00f5d4' }} />}
                      </div>
                      <Film size={12} style={{ color: '#fbbf24', shrink: 0 }} />
                      <span className="text-sm flex-1 truncate" style={{ color: sel ? '#fff' : 'rgba(226,232,240,0.7)' }}>{f.name}</span>
                      <span className="text-xs shrink-0" style={{ color: 'rgba(148,163,184,0.35)' }}>{fmt(f.size_bytes)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <BtnPrimary onClick={startUpload} disabled={!selectedFiles.length || !selectedFolder || loading}>
              <Upload size={13} />
              {loading ? 'Iniciando...' : `Enviar ${selectedFiles.length > 0 ? selectedFiles.length + ' arquivo(s)' : ''} para o Drive`}
            </BtnPrimary>
          </Card>

          {/* Jobs */}
          {jobs.length > 0 && (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(0,245,212,0.7)' }}>Uploads</p>
              </div>
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
                {jobs.map(j => (
                  <div key={j.job_id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm truncate text-white">{j.file?.split('\\').pop()}</span>
                      <span className="text-xs ml-2 shrink-0" style={{
                        color: j.status === 'done' ? '#34d399' : j.status === 'error' ? '#f87171' : '#00f5d4'
                      }}>
                        {j.status === 'done' ? '✓ enviado' : j.status === 'error' ? '✗ erro' : `${j.progress}%`}
                      </span>
                    </div>
                    {j.status === 'running' && <ProgressBar value={j.progress} />}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {!connected && (
        <EmptyState icon={CloudIcon} message="Conecte sua conta Google para começar a enviar arquivos para a nuvem." />
      )}
    </div>
  )
}
