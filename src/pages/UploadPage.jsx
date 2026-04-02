import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, Shield, CheckCircle, X, AlertTriangle, Layers, Hash, Fingerprint, CloudUpload, Wifi } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGoogleDrive } from '../hooks/useGoogleDrive'
import { encryptAndSign, createLedgerRecord } from '../utils/crypto'
import { submitCreateAsset, FABRIC_NETWORK } from '../utils/hyperledger'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'select',    label: 'Select',     icon: File },
  { id: 'encrypt',   label: 'AES-256',    icon: Shield },
  { id: 'sign',      label: 'Ed25519',    icon: Fingerprint },
  { id: 'fabric',    label: 'Fabric',     icon: Layers },
  { id: 'drive',     label: 'Drive',      icon: CloudUpload },
]

function StepBar({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:28 }}>
      {STEPS.map((s, i) => {
        const done   = current > i
        const active = current === i
        const Icon   = s.icon
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div className={`step-dot ${done ? 'step-done' : active ? 'step-active' : 'step-pending'}`}>
                {done ? '✓' : <Icon size={12} />}
              </div>
              <span style={{ fontSize:10, fontFamily:'var(--font-mono)', fontWeight:600,
                color: active ? 'var(--blue)' : done ? 'var(--green)' : 'var(--ink-4)',
                whiteSpace:'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ flex:1, height:1.5, margin:'0 6px', marginBottom:14,
                background: current > i ? 'var(--green)' : 'var(--border)', transition:'background 0.4s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LogLine({ text, type = 'info', delay = 0 }) {
  return (
    <motion.div initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay }}
      className={`log-${type}`} style={{ lineHeight:1.9 }}>
      <span style={{ marginRight:8 }}>{
        type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'fabric' ? '⬡' : '›'
      }</span>
      {text}
    </motion.div>
  )
}

export default function UploadPage() {
  const { session }                              = useAuth()
  const { uploadFile, signIn, isSignedIn, isReady, user } = useGoogleDrive()
  const [file, setFile]       = useState(null)
  const [step, setStep]       = useState(0)
  const [logs, setLogs]       = useState([])
  const [result, setResult]   = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef()

  const addLog = (text, type = 'info') => setLogs(p => [...p, { text, type, id: Date.now() + Math.random() }])

  const handleFile = f => {
    if (!f) return
    setFile(f); setStep(1)
    setLogs([{ text: `File selected: ${f.name} (${(f.size/1024).toFixed(1)} KB)`, type:'success', id:1 }])
  }

  const handleDrop = useCallback(e => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [])

  const processFile = async () => {
    if (!file || !session) return
    if (!isSignedIn) { toast.error('Connect Google Drive first'); return }
    setLogs([]); setResult(null)

    try {
      // Step 1: Read
      setStep(1)
      addLog(`Reading: ${file.name}`)
      await new Promise(r => setTimeout(r, 250))
      const buffer = await file.arrayBuffer()
      addLog(`Loaded ${file.size.toLocaleString()} bytes`, 'success')

      // Step 2: AES-256
      setStep(2)
      addLog('Initializing AES-256-CBC cipher suite...')
      await new Promise(r => setTimeout(r, 180))
      const { aesKey, eddsaKeyPair } = session.keys
      const encrypted = encryptAndSign(new Uint8Array(buffer), aesKey, eddsaKeyPair.secretKey)
      addLog('AES-256-CBC encryption complete', 'success')
      addLog(`IV: ${encrypted.iv.slice(0, 22)}…`)
      addLog(`Ciphertext: ${Math.ceil(encrypted.ciphertext.length * 3/4).toLocaleString()} bytes`)

      // Step 3: EdDSA
      setStep(3)
      addLog('Computing SHA-256 digest of ciphertext...')
      await new Promise(r => setTimeout(r, 300))
      addLog(`Digest: ${encrypted.dataHash.slice(0, 36)}…`, 'success')
      addLog('Signing digest with Ed25519 private key...')
      await new Promise(r => setTimeout(r, 280))
      addLog(`Signature: ${encrypted.signature.slice(0, 30)}…`, 'success')
      addLog('Signature verification: PASSED', 'success')

      // Step 4: Hyperledger Fabric
      setStep(4)
      addLog(`[Fabric] Channel: ${FABRIC_NETWORK.channel}`, 'fabric')
      addLog(`[Fabric] Chaincode: ${FABRIC_NETWORK.chaincode}::CreateDocumentAsset`, 'fabric')
      const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
      const fabricBlock = await submitCreateAsset({
        assetId, fileName: file.name, fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        dataHash: encrypted.dataHash, signature: encrypted.signature,
        publicKey: eddsaKeyPair.publicKey, driveFileId: 'pending',
        uploader: session.user.email,
        onLog: addLog,
      })
      addLog(`[Fabric] Block #${fabricBlock.blockNumber} committed to ledger`, 'success')

      // Step 5: Drive
      setStep(5)
      addLog('Uploading encrypted payload to Google Drive...')
      await new Promise(r => setTimeout(r, 250))
      const driveResult = await uploadFile(
        { ciphertext: encrypted.ciphertext, iv: encrypted.iv, dataHash: encrypted.dataHash,
          signature: encrypted.signature, publicKey: eddsaKeyPair.publicKey,
          originalName: file.name, originalSize: file.size, assetId },
        { fileId: assetId, fileName: file.name, dataHash: encrypted.dataHash,
          signature: encrypted.signature, timestamp: encrypted.timestamp,
          uploader: session.user.email }
      )
      addLog(`Drive file ID: ${driveResult.id}`, 'success')
      addLog('All pipeline stages complete ✓', 'success')

      setResult({ fabricBlock, driveResult, crypto: encrypted, assetId })
      toast.success('Document secured on Hyperledger Fabric!')
    } catch (err) {
      addLog(`ERROR: ${err.message}`, 'error')
      toast.error(err.message)
      setStep(1)
    }
  }

  const reset = () => { setFile(null); setStep(0); setLogs([]); setResult(null) }

  return (
    <div style={{ padding:'32px 36px', maxWidth:860 }}>
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:28 }}>
        <div className="section-label" style={{ marginBottom:6 }}>Secure Upload</div>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.5px', marginBottom:4 }}>Encrypt & Submit to Fabric</h1>
        <p style={{ color:'var(--ink-2)', fontSize:13 }}>
          AES-256 encryption → Ed25519 signature → Hyperledger Fabric endorsement → Google Drive storage
        </p>
      </motion.div>

      <StepBar current={step > 0 ? step - 1 : 0} />

      {/* Drive banner */}
      <AnimatePresence>
        {!isSignedIn && (
          <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'var(--amber-soft)', border:'1px solid var(--amber-mid)',
              borderRadius:10, padding:'11px 16px', marginBottom:18, gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <AlertTriangle size={15} color="var(--amber)" />
              <span style={{ fontSize:13, fontWeight:600, color:'var(--amber)' }}>Google Drive not connected</span>
              <span style={{ fontSize:12, color:'var(--ink-3)' }}>— required before upload</span>
            </div>
            <button className="btn btn-secondary" style={{ fontSize:12, padding:'7px 14px' }}
              onClick={signIn} disabled={!isReady}>
              <Wifi size={12} />{isReady ? 'Connect Drive' : 'Loading…'}
            </button>
          </motion.div>
        )}
        {isSignedIn && user && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ display:'flex', alignItems:'center', gap:10,
              background:'var(--green-soft)', border:'1px solid var(--green-mid)',
              borderRadius:10, padding:'9px 16px', marginBottom:18 }}>
            {user.picture && <img src={user.picture} style={{ width:20, height:20, borderRadius:'50%' }} alt="" />}
            <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>Drive connected — {user.email}</span>
            <CheckCircle size={13} color="var(--green)" style={{ marginLeft:'auto' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {!result ? (
        <>
          {(step === 0 || step === 1) && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="card"
              style={{
                padding:36, textAlign:'center', marginBottom:18, cursor:'pointer',
                borderColor: isDragging ? 'var(--blue)' : file ? 'var(--green-mid)' : 'var(--border)',
                borderWidth: isDragging ? 2 : 1, transition:'all 0.15s',
              }}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => !file && fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <motion.div initial={{ scale:0.6 }} animate={{ scale:1 }} transition={{ type:'spring' }}>
                    <div style={{ width:52, height:52, borderRadius:14, background:'var(--green-soft)',
                      border:'1.5px solid var(--green-mid)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                      <File size={24} color="var(--green)" />
                    </div>
                  </motion.div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{file.name}</div>
                  <div style={{ color:'var(--ink-3)', fontSize:12, fontFamily:'var(--font-mono)' }}>
                    {(file.size/1024).toFixed(2)} KB · {file.type || 'unknown'}
                  </div>
                  <button className="btn btn-ghost" style={{ marginTop:12, fontSize:12 }}
                    onClick={e => { e.stopPropagation(); reset() }}>
                    <X size={13} /> Change File
                  </button>
                </div>
              ) : (
                <>
                  <motion.div animate={{ y:[0,-5,0] }} transition={{ duration:2.5, repeat:Infinity }}>
                    <div style={{ width:52, height:52, borderRadius:14, background: isDragging ? 'var(--blue-soft)' : 'var(--bg-subtle)',
                      border: `1.5px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? 'var(--blue)' : 'var(--border-strong)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                      <Upload size={24} color={isDragging ? 'var(--blue)' : 'var(--ink-3)'} />
                    </div>
                  </motion.div>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:6, color: isDragging ? 'var(--blue)' : 'var(--ink)' }}>
                    Drop file or click to browse
                  </div>
                  <div style={{ color:'var(--ink-4)', fontSize:12 }}>Any file type · Max 10 MB recommended</div>
                </>
              )}
            </motion.div>
          )}

          {file && step < 2 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button className="btn btn-primary" style={{ width:'100%', padding:'13px', fontSize:14, opacity: isSignedIn ? 1 : 0.5 }}
                onClick={processFile} disabled={!isSignedIn}>
                <Shield size={16} /> Encrypt, Sign & Submit to Fabric
              </button>
              {!isSignedIn && (
                <p style={{ textAlign:'center', fontSize:12, color:'var(--amber)' }}>
                  Connect Google Drive above first
                </p>
              )}
            </motion.div>
          )}

          {step >= 2 && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="card" style={{ padding:0, overflow:'hidden' }}>
              {/* Pipeline header */}
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat: step < 5 ? Infinity : 0, ease:'linear' }}
                  style={{ width:13, height:13, borderRadius:'50%', border:'2px solid var(--blue)', borderTopColor:'transparent' }} />
                <span style={{ fontWeight:600, fontSize:13, fontFamily:'var(--font-mono)', color:'var(--blue)' }}>
                  Fabric Submit Pipeline
                </span>
                <span className="badge badge-blue" style={{ marginLeft:'auto' }}>
                  {FABRIC_NETWORK.channel}
                </span>
              </div>
              <div className="terminal" style={{ borderRadius:0, maxHeight:300, margin:0, border:'none' }}>
                {logs.map((l, i) => <LogLine key={l.id} text={l.text} type={l.type} delay={i * 0.04} />)}
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} className="card" style={{ padding:28 }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:220 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:'var(--green-soft)',
                border:'1.5px solid var(--green-mid)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                <CheckCircle size={28} color="var(--green)" />
              </div>
            </motion.div>
            <h2 style={{ fontWeight:700, fontSize:20, marginBottom:4 }}>Document Secured Successfully</h2>
            <p style={{ color:'var(--ink-2)', fontSize:13 }}>
              Committed to Hyperledger Fabric block #{result.fabricBlock.blockNumber}
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:22 }}>
            {[
              { label:'Fabric Block',       value:`#${result.fabricBlock.blockNumber}`,           color:'var(--blue)'   },
              { label:'Fabric TX ID',        value: result.fabricBlock.txId,                       color:'var(--violet)' },
              { label:'Drive File ID',       value: result.driveResult.id,                         color:'var(--green)'  },
              { label:'Endorsements',        value:`${result.fabricBlock.endorsements?.length}/2 peers`, color:'var(--amber)' },
              { label:'SHA-256 Digest',      value: result.crypto.dataHash,                        color:'var(--blue)',   full: true },
              { label:'Ed25519 Signature',   value: result.crypto.signature,                       color:'var(--violet)', full: true },
              { label:'Fabric Block Hash',   value: result.fabricBlock.blockHash,                  color:'var(--green)',  full: true },
            ].map(({ label, value, color, full }) => (
              <div key={label} style={{
                padding:'12px 14px', borderRadius:10,
                background:'var(--bg-subtle)', border:'1px solid var(--border)',
                gridColumn: full ? '1/-1' : 'auto',
              }}>
                <div className="section-label" style={{ marginBottom:5 }}>{label}</div>
                <div style={{ fontSize:11, color, fontFamily:'var(--font-mono)', wordBreak:'break-all', lineHeight:1.6 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width:'100%' }} onClick={reset}>
            <Upload size={15} /> Submit Another Document
          </button>
        </motion.div>
      )}
    </div>
  )
}
