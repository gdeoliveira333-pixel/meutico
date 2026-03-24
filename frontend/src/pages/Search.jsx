import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { SearchIcon, FileText, Sparkles, ArrowRight, FolderOpen } from 'lucide-react'
import { PageHeader, Card, EmptyState, Alert } from '../components/UI'

const SUGGESTIONS = [
  'fotos de viagem', 'vídeos grandes', 'documentos antigos', 'backups zip', 'planilhas'
]

const EXT_ICON = {
  '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️', '.webp': '🖼️',
  '.mp4': '🎬', '.mov': '🎬', '.avi': '🎬', '.mkv': '🎬',
  '.mp3': '🎵', '.wav': '🎵',
  '.pdf': '📄', '.doc': '📝', '.docx': '📝',
  '.xls': '📊', '.xlsx': '📊',
  '.zip': '📦', '.rar': '📦',
}

function fmt(b) {
  if (b > 1024*1024*1024) return `${(b/1024/1024/1024).toFixed(1)} GB`
  if (b > 1024*1024) return `${(b/1024/1024).toFixed(1)} MB`
  return `${(b/1024).toFixed(1)} KB`
}

function getLocalFiles() {
  try {
    return JSON.parse(sessionStorage.getItem('scanned_files') || '[]')
  } catch { return [] }
}

export default function Search() {
  const [query, setQuery]     = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const localFiles = getLocalFiles()

  const search = async (q = query) => {
    if (!q.trim()) return
    setLoading(true); setResult(null); setError('')
    try {
      if (localFiles.length > 0) {
        // Busca local: envia lista de arquivos + query pro backend IA filtrar
        const res = await api.search(q.trim(), localFiles.map(f => ({
          name: f.name, path: f.path, size_bytes: f.size_bytes, extension: f.extension
        })))
        setResult(res)
      } else {
        // Sem arquivos locais: busca no banco do servidor
        const res = await api.search(q.trim())
        setResult(res)
      }
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <PageHeader
        title="Busca Inteligente"
        subtitle="Descreva o que você procura em linguagem natural — a IA encontra nos seus arquivos."
      />

      {localFiles.length === 0 && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.8)' }}>
          <FolderOpen size={14} />
          Vá para <strong className="text-white mx-1">Início</strong> e selecione uma pasta primeiro para buscar nos seus arquivos locais.
        </div>
      )}

      <div className="relative mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,245,212,0.5)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder='Ex: "vídeo do cachorro branco" ou "nota fiscal de dezembro"'
              className="w-full rounded-2xl pl-10 pr-4 py-4 text-sm text-white placeholder-slate-600 transition-all"
              style={{ background: 'rgba(10,15,25,0.9)', border: '1px solid rgba(0,245,212,0.2)' }}
            />
          </div>
          <button onClick={() => search()} disabled={loading || !query.trim()}
            className="px-5 rounded-2xl text-sm font-medium transition-all disabled:opacity-40 flex items-center gap-2"
            style={{ background: 'rgba(0,245,212,0.12)', border: '1px solid rgba(0,245,212,0.3)', color: '#00f5d4' }}>
            {loading ? <span className="animate-pulse">...</span> : <><Sparkles size={13} /> Buscar</>}
          </button>
        </div>

        {!result && !loading && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => { setQuery(s); search(s) }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(15,22,35,0.8)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.6)' }}>
                <ArrowRight size={9} /> {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card glow>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} style={{ color: '#00f5d4' }} />
                <span className="text-xs font-semibold" style={{ color: '#00f5d4' }}>Interpretação da IA</span>
              </div>
              <p className="text-sm" style={{ color: 'rgba(226,232,240,0.8)' }}>{result.explanation}</p>
            </Card>

            {result.results?.length === 0
              ? <EmptyState icon={SearchIcon} message="Nenhum arquivo encontrado para essa busca." />
              : (
                <div>
                  <p className="text-xs mb-3" style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {result.results?.length} arquivo(s) encontrado(s)
                  </p>
                  <div className="space-y-2">
                    {result.results?.map((f, i) => (
                      <motion.div key={i}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 rounded-2xl px-5 py-4 card-hover"
                        style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
                        <span className="text-2xl shrink-0">{EXT_ICON[f.extension] || '📁'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{f.name}</p>
                          <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(148,163,184,0.4)' }}>{f.path}</p>
                        </div>
                        <span className="text-xs shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }}>{fmt(f.size_bytes)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            }
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && (
        <EmptyState icon={SearchIcon} message="Digite o que você procura acima e pressione Enter." />
      )}
    </div>
  )
}
