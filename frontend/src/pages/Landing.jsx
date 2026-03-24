import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { HardDrive, Zap, Cloud, Shield, ArrowRight, Play, Film, Upload, Search, CheckCircle } from 'lucide-react'

const FEATURES = [
  {
    icon: HardDrive,
    title: 'Detecta HDs externos',
    desc: 'Plugou o HD, o Meu Tico já lê tudo. Footage, renders, exports — indexado em segundos com hash criptográfico.',
  },
  {
    icon: Zap,
    title: 'IA organiza por você',
    desc: 'Descreva em português o que quer fazer. "Separa os 4K do casamento de março" e está feito.',
  },
  {
    icon: Cloud,
    title: 'Sobe para o Google Drive',
    desc: 'Seleciona as pastas, conecta sua conta Google e o upload acontece em background enquanto você edita.',
  },
  {
    icon: Shield,
    title: 'Nunca perde um arquivo',
    desc: 'Tudo vai para quarentena antes de deletar. Desfaz qualquer ação com 1 clique — sempre.',
  },
  {
    icon: Search,
    title: 'Busca inteligente',
    desc: 'Procure por "vídeo do cachorro branco" e a IA entende. Sem precisar lembrar o nome do arquivo.',
  },
  {
    icon: CheckCircle,
    title: 'Agendamento automático',
    desc: 'Configure varreduras horárias, diárias ou semanais. O Meu Tico trabalha enquanto você dorme.',
  },
]

const STEPS = [
  { n: '01', icon: HardDrive, title: 'Plugue o HD', desc: 'O sistema detecta automaticamente e começa a indexar todo o conteúdo com duplo hash.' },
  { n: '02', icon: Zap,       title: 'IA analisa',  desc: 'Identifica duplicatas, footage sem uso, arquivos pesados e sugere um plano de ação.' },
  { n: '03', icon: Upload,    title: 'Envia para nuvem', desc: 'Com 1 clique, o conteúdo aprovado vai direto para o Google Drive em background.' },
]

const STATS = [
  { value: '2×',  label: 'mais rápido que organizar manualmente' },
  { value: '40%', label: 'de espaço recuperado em média' },
  { value: '0',   label: 'arquivos perdidos com quarentena' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
}

export default function Landing({ onEnter }) {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY     = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#e2e8f0', overflowX: 'hidden' }}>

      {/* ── Animated background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -40, 60, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-20%', left: '-10%',
            width: '70vw', height: '70vw',
            background: 'radial-gradient(ellipse, rgba(0,255,255,0.05) 0%, transparent 65%)',
          }}
        />
        <motion.div
          animate={{ x: [0, -60, 40, 0], y: [0, 60, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '-10%', right: '-10%',
            width: '60vw', height: '60vw',
            background: 'radial-gradient(ellipse, rgba(60,180,160,0.06) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(0,255,255,0.1)',
            border: '1px solid rgba(0,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Film size={14} style={{ color: '#0ff' }} />
          </div>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 15, letterSpacing: '-0.02em' }}>Meu Tico</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>AI File Manager</span>
          <button onClick={onEnter}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{
              background: 'rgba(0,255,255,0.08)',
              border: '1px solid rgba(0,255,255,0.2)',
              color: '#0ff',
            }}>
            Abrir app <ArrowRight size={12} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-28 overflow-hidden" style={{ zIndex: 1 }}>
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-10 text-xs font-medium"
            style={{ background: 'rgba(0,255,255,0.06)', border: '1px solid rgba(0,255,255,0.15)', color: 'rgba(0,255,255,0.8)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#0ff', display: 'inline-block' }} className="animate-pulse" />
            Feito para produtoras e video makers
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 'clamp(3rem, 7vw, 6rem)',
              lineHeight: 1.0,
              letterSpacing: '-0.04em',
              fontWeight: 800,
              marginBottom: '1.5rem',
            }}>
            <span style={{
              background: 'linear-gradient(95deg, #0ff 2.75%, rgba(255,255,255,0) 146.83%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'block',
            }}>
              Seu acervo,
            </span>
            <span style={{ color: '#fff', display: 'block' }}>
              organizado pela IA.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
            style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', maxWidth: 500, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Plugou o HD externo, a IA analisa tudo, elimina duplicatas e sobe seu conteúdo para o Google Drive — sem você mover um dedo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.38 }}
            className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button onClick={onEnter}
              className="flex items-center gap-2 font-semibold px-8 py-3.5 rounded-2xl transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,255,0.18), rgba(0,255,255,0.06))',
                border: '1px solid rgba(0,255,255,0.35)',
                color: '#0ff',
                fontSize: 14,
                boxShadow: '0 0 40px rgba(0,255,255,0.12), inset 0 1px 0 rgba(0,255,255,0.1)',
              }}>
              <Play size={13} fill="currentColor" /> Começar agora — é grátis
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Roda local · Sem cadastro</span>
          </motion.div>

        </motion.div>

        {/* Mock UI */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-24 w-full mx-auto"
          style={{ maxWidth: 820, zIndex: 1 }}>
          <div style={{
            background: 'rgba(8,10,14,0.95)',
            border: '1px solid rgba(0,255,255,0.12)',
            borderRadius: 20,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 60px 120px rgba(0,0,0,0.8), 0 0 80px rgba(0,255,255,0.06)',
            overflow: 'hidden',
          }}>
            {/* Title bar */}
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.4)' }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
              <div className="flex-1 mx-4 h-5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div style={{ width: 60, height: 18, borderRadius: 4, background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.12)' }} />
            </div>
            {/* Stats row */}
            <div className="p-5 grid grid-cols-3 gap-3">
              {[
                { label: 'Duplicatas', value: '23 GB', color: '#fbbf24' },
                { label: 'Indexados',  value: '4.821', color: '#0ff'    },
                { label: 'Na nuvem',   value: '12 GB', color: '#34d399' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
            {/* File list */}
            <div className="px-5 pb-5 space-y-1.5">
              {[
                { name: 'footage_casamento_raw_v1.mp4',       tag: null,        size: '4.2 GB' },
                { name: 'footage_casamento_raw_v1_COPIA.mp4', tag: 'duplicata', size: '4.2 GB' },
                { name: 'export_final_4k_master.mp4',         tag: 'na nuvem',  size: '1.8 GB' },
                { name: 'b-roll_praça_sunset_RAW.mp4',        tag: null,        size: '2.1 GB' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <Film size={11} style={{ color: f.tag === 'duplicata' ? '#fbbf24' : '#0ff', flexShrink: 0 }} />
                  <span className="flex-1 truncate" style={{ fontSize: 12, color: f.tag === 'duplicata' ? 'rgba(251,191,36,0.65)' : 'rgba(255,255,255,0.5)' }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{f.size}</span>
                  {f.tag === 'duplicata' && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', flexShrink: 0 }}>duplicata</span>
                  )}
                  {f.tag === 'na nuvem' && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', flexShrink: 0 }}>✓ drive</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Bottom glow */}
          <div style={{ position: 'absolute', bottom: -60, left: '20%', right: '20%', height: 120, background: 'radial-gradient(ellipse, rgba(0,255,255,0.08), transparent 70%)', pointerEvents: 'none' }} />
          {/* Fade overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to top, #000, transparent)', pointerEvents: 'none', borderRadius: '0 0 20px 20px' }} />
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="relative py-20 px-6" style={{ zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}
          className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {STATS.map((s, i) => (
            <motion.div key={i} variants={fadeUp}>
              <p style={{
                fontSize: 'clamp(3rem, 6vw, 4.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(95deg, #0ff 2.75%, rgba(255,255,255,0) 146.83%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{s.value}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="relative py-28 px-6" style={{ zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center mb-20">
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,255,255,0.5)', marginBottom: 16 }}>
              Como funciona
            </p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1.1 }}>
              3 passos. Pronto.
            </h2>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {STEPS.map((s, i) => (
              <motion.div key={i} variants={fadeUp}
                style={{
                  position: 'relative',
                  background: 'rgba(10,12,18,0.9)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 18,
                  padding: '28px 24px',
                }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 20 }}>{s.n}</p>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(0,255,255,0.07)',
                  border: '1px solid rgba(0,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <s.icon size={18} style={{ color: '#0ff' }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-3 z-10 items-center justify-center"
                    style={{ width: 24, height: 24, transform: 'translateY(-50%)' }}>
                    <ArrowRight size={14} style={{ color: 'rgba(0,255,255,0.18)' }} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-28 px-6" style={{ zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center mb-20">
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,255,255,0.5)', marginBottom: 16 }}>
              Funcionalidades
            </p>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1.1 }}>
              Tudo que uma produtora precisa
            </h2>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                style={{
                  background: 'rgba(10,12,18,0.9)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 16,
                  padding: '22px 20px',
                  transition: 'border-color 0.2s',
                }}
                whileHover={{ borderColor: 'rgba(0,255,255,0.18)', scale: 1.01 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(0,255,255,0.07)',
                  border: '1px solid rgba(0,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <f.icon size={15} style={{ color: '#0ff' }} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', lineHeight: 1.7 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-32 px-6 text-center" style={{ zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {/* Glow behind */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 200,
          background: 'radial-gradient(ellipse, rgba(0,255,255,0.06), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
          <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
            Pronto para organizar<br />
            <span style={{
              background: 'linear-gradient(95deg, #0ff 2.75%, rgba(255,255,255,0) 146.83%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              seu acervo de uma vez?
            </span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', maxWidth: 400, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Roda direto no seu computador. Seus arquivos nunca saem da sua máquina sem sua aprovação.
          </p>
          <button onClick={onEnter}
            className="inline-flex items-center gap-2 font-semibold px-10 py-4 rounded-2xl transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,255,0.16), rgba(0,255,255,0.05))',
              border: '1px solid rgba(0,255,255,0.3)',
              color: '#0ff',
              fontSize: 14,
              boxShadow: '0 0 50px rgba(0,255,255,0.1), inset 0 1px 0 rgba(0,255,255,0.08)',
            }}>
            <Play size={13} fill="currentColor" /> Abrir o Meu Tico
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative py-10 px-6 text-center" style={{ zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film size={12} style={{ color: 'rgba(0,255,255,0.3)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '-0.01em' }}>Meu Tico</span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>AI File Manager · Feito para video makers</p>
      </footer>
    </div>
  )
}
