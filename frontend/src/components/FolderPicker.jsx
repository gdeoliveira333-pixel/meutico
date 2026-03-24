import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, HardDrive, Folder, FolderOpen, Usb, ArrowLeft, Check } from 'lucide-react'
import { api } from '../api'

export default function FolderPicker({ anchorRef, onSelect, onClose }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState('')
  const popoverRef              = useRef(null)

  const navigate = async (path = '') => {
    setLoading(true)
    try { setData(await api.browse(path)) }
    finally { setLoading(false) }
  }

  useEffect(() => { navigate('') }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const confirm = (path) => {
    onSelect(path || selected)
    onClose()
  }

  const isRoot = !data?.current

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute z-50"
        style={{
          bottom: '110%',
          left: 0,
          width: 340,
          background: '#0c1220',
          border: '1px solid rgba(0,245,212,0.2)',
          borderRadius: 16,
          boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,245,212,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {!isRoot && (
            <button onClick={() => navigate(data?.parent || '')}
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.15)', color: '#00f5d4' }}>
              <ArrowLeft size={11} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {isRoot
              ? <span className="text-xs font-semibold" style={{ color: '#00f5d4' }}>Meu Computador</span>
              : <span className="text-xs truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{data?.current}</span>
            }
          </div>
          {selected && (
            <button onClick={() => confirm()}
              className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
              style={{ background: 'rgba(0,245,212,0.15)', border: '1px solid rgba(0,245,212,0.3)', color: '#00f5d4' }}>
              <Check size={10} /> OK
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgba(0,245,212,0.15)', borderTopColor: '#00f5d4' }} />
            </div>
          )}

          {!loading && data?.dirs?.map((dir) => {
            const isSel = selected === dir.path
            const isSystemDrive = isRoot && dir.name[0]?.toUpperCase() === 'C'
            const Icon = isRoot
              ? (isSystemDrive ? HardDrive : Usb)
              : (isSel ? FolderOpen : Folder)
            const iconColor = isSel ? '#00f5d4' : isRoot ? (isSystemDrive ? '#60a5fa' : '#00f5d4') : '#fbbf24'

            return (
              <div key={dir.path}
                className="flex items-center gap-3 px-4 py-2.5 transition-all cursor-pointer group"
                style={{
                  background: isSel ? 'rgba(0,245,212,0.07)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
                onClick={() => setSelected(isSel ? '' : dir.path)}
              >
                <Icon size={14} style={{ color: iconColor, shrink: 0 }} />
                <span className="flex-1 text-sm truncate" style={{ color: isSel ? '#fff' : 'rgba(226,232,240,0.75)' }}>
                  {dir.name}
                </span>

                {isSel && (
                  <button onClick={e => { e.stopPropagation(); confirm(dir.path) }}
                    className="shrink-0 text-xs px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(0,245,212,0.15)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.25)' }}>
                    Usar
                  </button>
                )}

                <button
                  onClick={e => { e.stopPropagation(); navigate(dir.path) }}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100"
                  style={{ color: '#94a3b8' }}
                  title="Entrar">
                  <ChevronRight size={12} />
                </button>
              </div>
            )
          })}

          {!loading && data?.dirs?.length === 0 && (
            <div className="text-center py-6 text-xs" style={{ color: 'rgba(148,163,184,0.3)' }}>
              Nenhuma subpasta
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.3)' }}>
            Clique para selecionar · <ChevronRight size={9} style={{ display: 'inline' }} /> para entrar
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
