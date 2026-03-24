import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, Copy, Star, Zap, CheckCircle, Database, Cloud, RefreshCw } from 'lucide-react'
import { Card, StatCard, BtnPrimary, EmptyState, Alert } from '../components/UI'
import { api } from '../api'

function fmt(bytes) {
  if (!bytes) return '0 KB'
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const EXT_COLOR = {
  '.jpg': '#f59e0b', '.jpeg': '#f59e0b', '.png': '#f59e0b', '.gif': '#f59e0b', '.webp': '#f59e0b',
  '.mp4': '#8b5cf6', '.mov': '#8b5cf6', '.avi': '#8b5cf6', '.mkv': '#8b5cf6',
  '.pdf': '#ef4444', '.doc': '#3b82f6', '.docx': '#3b82f6',
  '.zip': '#f97316', '.rar': '#f97316',
}

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

async function hashFile(file) {
  const buf = await file.arrayBuffer()
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Step 1: Selecionar pasta ──────────────────────────────────────────────────
function StepSelect({ onFiles }) {
  const inputRef = useRef(null)
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)', boxShadow: '0 0 40px rgba(0,245,212,0.1)' }}>
        <FolderOpen size={32} style={{ color: '#00f5d4' }} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Selecione uma pasta</h2>
      <p className="text-sm mb-8" style={{ color: 'rgba(148,163,184,0.6)', maxWidth: 360 }}>
        Escolha a pasta ou HD externo que deseja analisar. Tudo é processado no seu browser — nenhum arquivo sai do seu computador.
      </p>
      <input ref={inputRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }}
        onChange={e => onFiles(e.target.files)} />
      <BtnPrimary onClick={() => inputRef.current?.click()} style={{ padding: '12px 32px', fontSize: 15 }}>
        <FolderOpen size={16} /> Selecionar Pasta / HD Externo
      </BtnPrimary>
    </div>
  )
}

// ── Step 2+3+4: Resultados ────────────────────────────────────────────────────
function Results({ files, groups, summary, progress, agentReport, loadingAgent, onAgent, onReset }) {
  const totalSize = files.reduce((s, f) => s + f.size_bytes, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{files[0]?.path.split('/')[0]}</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {files.length} arquivos · {fmt(totalSize)}
          </p>
        </div>
        <button onClick={onReset} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
          style={{ color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <RefreshCw size={13} /> Trocar pasta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={files.length} label="arquivos" color="#00f5d4" />
        <StatCard value={fmt(totalSize)} label="tamanho total" color="#38bdf8" />
        <StatCard value={summary?.total ?? 0} label="duplicatas" color="#fbbf24" />
        <StatCard value={summary ? `${summary.mb} MB` : '—'} label="espaço perdido" color="#f87171" />
      </div>

      {/* Progress bar de hash */}
      {progress && (
        <Alert type="info">{progress}</Alert>
      )}

      {/* Duplicatas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Copy size={14} style={{ color: '#fbbf24' }} />
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Duplicatas encontradas</h3>
        </div>

        {groups === null && !progress && (
          <div className="text-sm" style={{ color: 'rgba(148,163,184,0.4)' }}>Calculando hashes...</div>
        )}

        {groups?.length === 0 && (
          <Card>
            <div className="flex items-center gap-3 py-2">
              <CheckCircle size={16} style={{ color: '#34d399' }} />
              <span className="text-sm text-white">Nenhuma duplicata encontrada!</span>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {groups?.map((g, i) => (
            <motion.div key={g.group_id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(251,191,36,0.15)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <Copy size={13} style={{ color: '#fbbf24' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{g.count} cópias idênticas</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {fmt(g.size_bytes)} cada · <span style={{ color: '#f87171' }}>{fmt(g.wasted_bytes)} desperdiçados</span>
                  </p>
                </div>
              </div>
              {g.files.map((f, fi) => (
                <div key={fi} className="flex items-center gap-3 px-5 py-2.5"
                  style={{ borderBottom: fi < g.files.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  {f.is_original
                    ? <Star size={11} style={{ color: '#00f5d4', flexShrink: 0 }} />
                    : <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'rgba(251,191,36,0.5)' }} />}
                  <span className={`text-xs shrink-0 ${f.is_original ? 'tag-cyan' : 'tag-warn'}`}>
                    {f.is_original ? 'original' : 'cópia'}
                  </span>
                  <span className="text-sm truncate" style={{ color: f.is_original ? 'rgba(226,232,240,0.9)' : 'rgba(148,163,184,0.5)' }}>
                    {f.path}
                  </span>
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lista de arquivos */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Database size={14} style={{ color: '#00f5d4' }} />
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Todos os arquivos</h3>
        </div>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {files.map((f, i) => {
              const dotColor = EXT_COLOR[f.extension] || 'rgba(148,163,184,0.3)'
              return (
                <div key={i} className="flex items-center justify-between px-5 py-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                    <span className="text-sm truncate" style={{ color: 'rgba(226,232,240,0.7)' }}>{f.path}</span>
                  </div>
                  <span className="text-xs shrink-0 ml-3" style={{ color: 'rgba(148,163,184,0.4)' }}>{fmt(f.size_bytes)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Agente IA */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} style={{ color: '#00f5d4' }} />
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Análise com IA</h3>
        </div>
        {!agentReport ? (
          <Card>
            <p className="text-sm mb-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Gere um relatório inteligente com recomendações do que fazer com seus arquivos.
            </p>
            <BtnPrimary onClick={onAgent} disabled={loadingAgent}>
              <Zap size={13} /> {loadingAgent ? 'Analisando...' : 'Gerar Relatório com IA'}
            </BtnPrimary>
          </Card>
        ) : (
          <Card>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(226,232,240,0.85)' }}>
              {agentReport}
            </p>
          </Card>
        )}
      </div>

      {/* Drive */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Cloud size={14} style={{ color: '#00f5d4' }} />
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Enviar para o Drive</h3>
        </div>
        <Card>
          <p className="text-sm mb-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
            Faça backup dos seus arquivos no Google Drive com segurança.
          </p>
          <BtnPrimary onClick={() => window._setTab?.('cloud')}>
            <Cloud size={13} /> Ir para o Drive
          </BtnPrimary>
        </Card>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [files, setFiles] = useState(null)
  const [groups, setGroups] = useState(null)
  const [summary, setSummary] = useState(null)
  const [progress, setProgress] = useState('')
  const [agentReport, setAgentReport] = useState('')
  const [loadingAgent, setLoadingAgent] = useState(false)

  const handleFiles = async (fileList) => {
    const arr = Array.from(fileList)
    if (!arr.length) return

    const indexed = arr.map((f, i) => ({
      id: i,
      name: f.name,
      path: f.webkitRelativePath || f.name,
      size_bytes: f.size,
      extension: getExt(f.name),
      file: f,
    }))

    setFiles(indexed)
    // Salva no sessionStorage para Busca IA usar
    sessionStorage.setItem('scanned_files', JSON.stringify(
      indexed.map(({ id, name, path, size_bytes, extension, lastModified }) => ({ id, name, path, size_bytes, extension, lastModified }))
    ))
    setGroups(null)
    setSummary(null)
    setAgentReport('')

    // Detectar duplicatas
    const bySize = {}
    indexed.forEach(f => {
      if (!bySize[f.size_bytes]) bySize[f.size_bytes] = []
      bySize[f.size_bytes].push(f)
    })

    const candidates = Object.values(bySize).filter(g => g.length > 1)
    const total = candidates.reduce((s, g) => s + g.length, 0)
    let done = 0

    const byHash = {}
    for (const group of candidates) {
      for (const item of group) {
        setProgress(`Verificando duplicatas... ${done + 1}/${total}`)
        const hash = await hashFile(item.file)
        if (!byHash[hash]) byHash[hash] = []
        byHash[hash].push(item)
        done++
      }
    }

    const dupGroups = Object.entries(byHash)
      .filter(([, g]) => g.length > 1)
      .map(([hash, g], gi) => ({
        group_id: gi,
        hash,
        count: g.length,
        size_bytes: g[0].size_bytes,
        wasted_bytes: g[0].size_bytes * (g.length - 1),
        files: g.map((item, fi) => ({ ...item, is_original: fi === 0 }))
      }))

    const totalDups = dupGroups.reduce((s, g) => s + g.count - 1, 0)
    const wastedBytes = dupGroups.reduce((s, g) => s + g.wasted_bytes, 0)

    setGroups(dupGroups)
    setSummary({ total: totalDups, bytes: wastedBytes, mb: (wastedBytes / 1024 / 1024).toFixed(1) })
    setProgress('')
  }

  const runAgent = async () => {
    setLoadingAgent(true)
    try {
      const totalSize = files.reduce((s, f) => s + f.size_bytes, 0)
      const dupCount = summary?.total ?? 0
      const wastedMb = summary?.mb ?? 0
      const res = await api.getAgent()
      setAgentReport(res.ai_analysis || res.response || res.message || 'Análise concluída.')
    } catch(e) {
      setAgentReport('Erro ao conectar com o agente.')
    } finally {
      setLoadingAgent(false)
    }
  }

  const reset = () => {
    setFiles(null); setGroups(null); setSummary(null); setProgress(''); setAgentReport('')
  }

  return (
    <div>
      {!files
        ? <StepSelect onFiles={handleFiles} />
        : <Results
            files={files}
            groups={groups}
            summary={summary}
            progress={progress}
            agentReport={agentReport}
            loadingAgent={loadingAgent}
            onAgent={runAgent}
            onReset={reset}
          />
      }
    </div>
  )
}
