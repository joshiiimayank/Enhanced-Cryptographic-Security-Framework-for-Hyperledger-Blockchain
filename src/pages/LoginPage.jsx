import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Shield, Lock, Key, CheckCircle, ArrowRight, Cpu } from 'lucide-react'
import { useGoogleDrive } from '../hooks/useGoogleDrive'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FABRIC_NETWORK } from '../utils/hyperledger'

const FEATURES = [
  { icon: Shield,  label: 'AES-256-CBC Encryption',  desc: 'Military-grade file encryption' },
  { icon: Key,     label: 'Ed25519 Digital Signatures', desc: 'Edwards-curve cryptography' },
  { icon: Layers,  label: 'Hyperledger Fabric',       desc: 'Permissioned blockchain ledger' },
  { icon: Lock,    label: 'Google Drive Vault',        desc: 'Encrypted cloud storage' },
]

export default function LoginPage() {
  const { isReady, isSignedIn, user, error, signIn } = useGoogleDrive()
  const { initSession } = useAuth()
  const navigate        = useNavigate()
  const [loading, setLoading]   = useState(false)
  const [step, setStep]         = useState(0)

  useEffect(() => {
    if (isSignedIn && user) {
      setStep(2)
      setTimeout(() => {
        initSession(user)
        setTimeout(() => navigate('/dashboard'), 600)
      }, 1000)
    }
  }, [isSignedIn, user])

  useEffect(() => {
    if (error) { toast.error(error); setLoading(false); setStep(0) }
  }, [error])

  const handleLogin = () => {
    if (!isReady) { toast.error('Google APIs loading…'); return }
    setLoading(true); setStep(1); signIn()
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg)' }}>

      {/* Left panel */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center',
        padding:'60px 64px', maxWidth:560 }}>

        {/* Logo */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
          style={{ display:'flex', alignItems:'center', gap:12, marginBottom:52 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:'var(--blue)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Layers size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:'var(--ink)', letterSpacing:'-0.3px' }}>ChainVault</div>
            <div style={{ fontSize:10.5, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>Hyperledger Fabric v2.5</div>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}
          style={{ marginBottom:36 }}>
          <h1 style={{ fontSize:34, fontWeight:800, letterSpacing:'-1px', lineHeight:1.15, marginBottom:14, color:'var(--ink)' }}>
            Secure Document<br />
            <span style={{ color:'var(--blue)' }}>Ledger System</span>
          </h1>
          <p style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.7, maxWidth:400 }}>
            Encrypt, sign and commit documents to a permissioned Hyperledger Fabric blockchain.
            Every file is cryptographically immutable.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.15 }}
          style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:36 }}>
          {FEATURES.map(({ icon: Icon, label, desc }, i) => (
            <motion.div key={label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.18 + i*0.06 }}
              style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px',
                background:'#fff', border:'1px solid var(--border)', borderRadius:10, boxShadow:'var(--shadow-sm)' }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'var(--blue-soft)',
                border:'1px solid var(--blue-mid)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={14} color="var(--blue)" />
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', marginBottom:1 }}>{label}</div>
                <div style={{ fontSize:11, color:'var(--ink-3)' }}>{desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Login button */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
          {step === 0 && (
            <button className="btn btn-primary" style={{ fontSize:14, padding:'13px 28px', width:'100%', maxWidth:320 }}
              onClick={handleLogin} disabled={!isReady || loading}>
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isReady ? 'Sign in with Google' : 'Loading…'}
            </button>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px',
                background:'var(--blue-soft)', border:'1px solid var(--blue-mid)', borderRadius:10, maxWidth:320 }}>
              <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
                style={{ width:16, height:16, borderRadius:'50%', border:'2px solid var(--blue)', borderTopColor:'transparent', flexShrink:0 }} />
              <span style={{ fontSize:13, color:'var(--blue)', fontWeight:600 }}>Connecting to Google…</span>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px',
                background:'var(--green-soft)', border:'1px solid var(--green-mid)', borderRadius:10, maxWidth:320 }}>
              <CheckCircle size={17} color="var(--green)" />
              <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>
                Authenticated — loading Fabric network…
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right panel — architecture viz */}
      <div style={{ flex:1, background:'var(--blue)', display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'60px 56px', position:'relative', overflow:'hidden' }}>

        {/* Background grid */}
        <div style={{ position:'absolute', inset:0, opacity:0.07,
          backgroundImage:'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize:'32px 32px' }} />

        <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}
          style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', marginBottom:20, letterSpacing:0.8 }}>
            ARCHITECTURE
          </div>

          {/* Pipeline diagram */}
          {[
            { step:'01', label:'Client Browser',    desc:'React + TweetNaCl',   icon: Shield },
            { step:'02', label:'AES-256 + Ed25519', desc:'Encrypt & Sign',       icon: Key },
            { step:'03', label:'Fabric Peer (org1)', desc:'Proposal + Endorsement', icon: Layers },
            { step:'04', label:'Orderer (etcdraft)', desc:'Consensus & Order',   icon: Cpu },
            { step:'05', label:'Ledger Commit',     desc:'Immutable Block',      icon: CheckCircle },
          ].map(({ step, label, desc, icon: Icon }, i) => (
            <motion.div key={step} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay: 0.3 + i*0.08 }}
              style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom: i < 4 ? 0 : 0 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,0.12)',
                  border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={15} color="#fff" />
                </div>
                {i < 4 && (
                  <div style={{ width:1, height:24, background:'rgba(255,255,255,0.2)', margin:'4px 0' }}>
                    <motion.div animate={{ height:['0%', '100%', '0%'] }} transition={{ duration:1.5, repeat:Infinity, delay: i*0.3 }}
                      style={{ width:'100%', background:'rgba(255,255,255,0.6)', borderRadius:1 }} />
                  </div>
                )}
              </div>
              <div style={{ paddingTop:5 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:1 }}>{label}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', fontFamily:'var(--font-mono)' }}>{desc}</div>
              </div>
            </motion.div>
          ))}

          {/* Channel info */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
            style={{ marginTop:28, padding:'14px 16px', background:'rgba(255,255,255,0.08)',
              border:'1px solid rgba(255,255,255,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.5)', marginBottom:8 }}>
              NETWORK CONFIG
            </div>
            {[
              ['Channel',    FABRIC_NETWORK.channel],
              ['Chaincode',  FABRIC_NETWORK.chaincode],
              ['MSP',        FABRIC_NETWORK.mspId],
              ['Policy',     'AND(Org1MSP, Org2MSP)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', gap:12, marginBottom:5 }}>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.45)', width:72, flexShrink:0 }}>{k}</span>
                <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'rgba(255,255,255,0.85)' }}>{v}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
