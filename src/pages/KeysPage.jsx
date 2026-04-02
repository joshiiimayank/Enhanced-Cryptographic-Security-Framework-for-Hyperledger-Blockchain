import { useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Eye, EyeOff, Copy, RefreshCw, Shield, AlertTriangle, Download, Lock, Fingerprint } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { generateAESKey, generateEdDSAKeyPair } from '../utils/crypto'
import toast from 'react-hot-toast'

function KeyField({ label, value, tag, visible, onToggle }) {
  const copy = () => { navigator.clipboard.writeText(value); toast.success('Copied!') }
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
        <span className="section-label">{label}</span>
        {tag && <span className="badge badge-blue" style={{ fontSize:9.5 }}>{tag}</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8,
        background:'var(--bg-subtle)', borderRadius:8, border:'1px solid var(--border)', padding:'10px 14px' }}>
        <code style={{ flex:1, fontSize:11.5, fontFamily:'var(--font-mono)', color:'var(--blue)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.5 }}>
          {visible ? value : '•'.repeat(Math.min(52, value?.length || 0))}
        </code>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)', padding:3 }} onClick={onToggle}>
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)', padding:3 }} onClick={copy}>
          <Copy size={13} />
        </button>
      </div>
    </div>
  )
}

export default function KeysPage() {
  const { session, initSession } = useAuth()
  const [visible, setVisible]   = useState({ aes: false, pub: false, priv: false })
  const toggle = k => setVisible(v => ({ ...v, [k]: !v[k] }))
  const [rotating, setRotating] = useState(false)
  const keys = session?.keys

  const exportKeys = () => {
    const data = JSON.stringify({
      aesKey:          keys?.aesKey,
      eddsaPublicKey:  keys?.eddsaKeyPair?.publicKey,
      eddsaSecretKey:  keys?.eddsaKeyPair?.secretKey,
      exportedAt:      new Date().toISOString(),
      user:            session?.user?.email,
    }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `chainvault_keys_${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url); toast.success('Keys exported — store securely!')
  }

  const rotateKeys = () => {
    if (!confirm('Rotate keys? Files encrypted with old keys cannot be decrypted without restoring them.')) return
    setRotating(true)
    setTimeout(() => {
      initSession({ ...session.user, forceNew: true })
      setRotating(false)
      toast.success('Keys rotated successfully')
    }, 800)
  }

  return (
    <div style={{ padding:'32px 36px', maxWidth:760 }}>
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:28 }}>
        <div className="section-label" style={{ marginBottom:6 }}>Cryptographic Identity</div>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.5px', marginBottom:4 }}>Key Management</h1>
        <p style={{ color:'var(--ink-2)', fontSize:13 }}>
          Your AES-256 encryption key and Ed25519 signing keypair. Keep these secret.
        </p>
      </motion.div>

      {/* Warning banner */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.1 }}
        style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:24,
          background:'var(--amber-soft)', border:'1px solid var(--amber-mid)' }}>
        <AlertTriangle size={16} color="var(--amber)" style={{ marginTop:1, flexShrink:0 }} />
        <p style={{ fontSize:12.5, color:'var(--amber)', lineHeight:1.6 }}>
          <strong>Security notice:</strong> Your private key is stored in localStorage and only readable on this device.
          Export and back up your keys — if lost, previously encrypted files cannot be recovered.
        </p>
      </motion.div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        {/* AES key */}
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
          className="card" style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'var(--blue-soft)', border:'1px solid var(--blue-mid)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Lock size={16} color="var(--blue)" />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>AES-256 Key</div>
              <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>CBC mode · PKCS#7 padding</div>
            </div>
          </div>
          <KeyField label="Symmetric Key (Base64)" tag="256-bit" value={keys?.aesKey || ''} visible={visible.aes} onToggle={() => toggle('aes')} />
          <div style={{ display:'flex', gap:4, marginTop:6 }}>
            <span className="badge badge-blue">AES-256-CBC</span>
            <span className="badge badge-neutral">256 bits</span>
          </div>
        </motion.div>

        {/* EdDSA key pair */}
        <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.20 }}
          className="card" style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'var(--violet-soft)', border:'1px solid #C5BAF0',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Fingerprint size={16} color="var(--violet)" />
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>Ed25519 Keypair</div>
              <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>Edwards-curve DSA</div>
            </div>
          </div>
          <KeyField label="Public Key" tag="Verifiable" value={keys?.eddsaKeyPair?.publicKey || ''} visible={visible.pub} onToggle={() => toggle('pub')} />
          <KeyField label="Private Key" tag="Secret" value={keys?.eddsaKeyPair?.secretKey || ''} visible={visible.priv} onToggle={() => toggle('priv')} />
          <div style={{ display:'flex', gap:4, marginTop:6 }}>
            <span className="badge badge-violet">Ed25519</span>
            <span className="badge badge-neutral">EdDSA</span>
          </div>
        </motion.div>
      </div>

      {/* Key info table */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
        className="card" style={{ padding:'20px 22px', marginBottom:20 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Cryptographic Specifications</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <tbody>
            {[
              ['Algorithm',        'AES-256-CBC',              'Ed25519 (EdDSA)'],
              ['Key Size',         '256 bits',                 '256-bit curve'],
              ['Purpose',          'File encryption',          'Digital signature'],
              ['Standard',         'NIST FIPS 197',            'RFC 8037'],
              ['Padding',          'PKCS#7',                   'Deterministic'],
              ['Curve',            'N/A',                      'Curve25519'],
            ].map(([label, aes, eddsa], i) => (
              <tr key={label} style={{ borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, color:'var(--ink-3)', fontFamily:'var(--font-mono)', width:150 }}>{label}</td>
                <td style={{ padding:'9px 12px', fontSize:12, color:'var(--blue)', fontFamily:'var(--font-mono)' }}>{aes}</td>
                <td style={{ padding:'9px 12px', fontSize:12, color:'var(--violet)', fontFamily:'var(--font-mono)' }}>{eddsa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.30 }}
        style={{ display:'flex', gap:12 }}>
        <button className="btn btn-primary" onClick={exportKeys} style={{ flex:1 }}>
          <Download size={15} /> Export Keys
        </button>
        <button className="btn btn-secondary" onClick={rotateKeys} disabled={rotating} style={{ flex:1 }}>
          <motion.div animate={{ rotate: rotating ? 360 : 0 }} transition={{ duration:0.8, ease:'easeInOut' }}>
            <RefreshCw size={15} />
          </motion.div>
          {rotating ? 'Rotating…' : 'Rotate Keys'}
        </button>
      </motion.div>
    </div>
  )
}
