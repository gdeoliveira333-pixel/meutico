import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { Plus, Trash2, FolderOpen, Shield, FolderSearch } from 'lucide-react'
import { PageHeader, Card, BtnPrimary, EmptyState, Alert } from '../components/UI'
import FolderPicker from '../components/FolderPicker'

export default function Roots() {
  const [roots, setRoots] = useState([])
  const [path, setPath] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [picker, setPicker] = useState(false)

  const load = () => api.getRoots().then(setRoots)
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!path.trim()) return
    setLoading(true); setError(''); setSuccess('')
    try {
      await api.addRoot(path.trim(), label.trim() || undefined)
      setPath(''); setLabel('')
      setSuccess('Pasta adicionada com sucesso.')
      load()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const remove = async (id) => {
    await api.deleteRoot(id)
    load()
  }

  return (
    <>
      <PageHeader
        title="Origens Autorizadas"
        subtitle="O agente só acessa pastas que você adicionar aqui — nunca além disso."
      />

      {/* Info */}
      <div className="flex items-center gap-2 mb-6 text-xs rounded-xl px-4 py-3"
        style={{ background: 'rgba(0,245,212,0.05)', border: '1px solid rgba(0,245,212,0.12)', color: 'rgba(0,245,212,0.7)' }}>
        <Shield size={12} style={{ color: '#00f5d4' }} />
        Pastas de sistema (Windows, Program Files) são bloqueadas automaticamente.
      </div>

      {/* Form */}
      <Card className="mb-6">
        <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: 'rgba(0,245,212,0.7)' }}>
          Adicionar pasta
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 gap-2 min-w-0">
            <input
              value={path}
              onChange={e => setPath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="C:\Users\voce\Documents\minha-pasta"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
              style={{ background: 'rgba(15,22,35,0.8)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}
            />
            <button onClick={async () => {
                try {
                  const res = await api.pickFolder()
                  if (res?.path) setPath(res.path)
                } catch(e) { /* usuário cancelou */ }
              }} title="Selecionar pasta"
              className="shrink-0 px-3 rounded-xl transition-all"
              style={{ background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.2)', color: '#00f5d4' }}>
              <FolderSearch size={14} />
            </button>
          </div>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Nome (opcional)"
            className="rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
            style={{ background: 'rgba(15,22,35,0.8)', border: '1px solid rgba(255,255,255,0.08)', width: 160 }}
          />
          <BtnPrimary onClick={add} disabled={loading || !path.trim()} loading={loading}>
            <Plus size={13} /> Adicionar
          </BtnPrimary>
        </div>
        {error   && <div className="mt-3"><Alert type="error">{error}</Alert></div>}
        {success && <div className="mt-3"><Alert type="success">{success}</Alert></div>}
      </Card>

      {/* List */}
      {roots.length === 0
        ? <EmptyState icon={FolderOpen} message="Nenhuma origem cadastrada ainda. Adicione uma pasta acima para começar." />
        : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {roots.map((r, i) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-2xl px-5 py-4 card-hover group"
                  style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.15)' }}>
                      <FolderOpen size={14} style={{ color: '#00f5d4' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{r.label}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>{r.path}</p>
                    </div>
                  </div>
                  <button onClick={() => remove(r.id)}
                    className="shrink-0 ml-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )
      }

      <AnimatePresence>
        {picker && <FolderPicker onSelect={p => setPath(p)} onClose={() => setPicker(false)} />}
      </AnimatePresence>
    </>
  )
}
