import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, Download, Trash2, Shield, CheckCircle, XCircle, RefreshCw, File, Search } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGoogleDrive } from '../hooks/useGoogleDrive'
import { verifyAndDecrypt, wordArrayToUint8Array } from '../utils/crypto'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function VerifyModal({ file, session, onClose, downloadFile }) {
  const [status, setStatus]     = useState('idle')
  const [logs, setLogs]         = useState([])
  const [decrypted, setDecrypted] = useState(null)
  const addLog = (text, type = 'info') => setLogs(p => [...p, { text, type, id: Date.now() + Math.random() }])

  const runVerify = async () => {
    setStatus('verifying'); setLogs([])
    try {
      addLog('Downloading encrypted payload from Google Drive…')
      const data = await downloadFile(file.id)
      addLog('Downloaded successfully', 'success')
      addLog('Recomputing SHA-256 digest…')
      await new Promise(r => setTimeout(r, 300))
      addLog('Verifying Ed25519 digital signature…')
      await new Promise(r => setTimeout(r, 350))
      const { aesKey, eddsaKeyPair } = session.keys
      const result = verifyAndDecrypt(data.ciphertext, data.iv, data.dataHash, data.signature, aesKey, eddsaKeyPair.publicKey)
      addLog('Digest match: VERIFIED', 'success')
      addLog('Signature: VALID', 'success')
      addLog('Decrypting with AES-256-CBC…')
      await new Promise(r => setTimeout(r, 250))
      addLog('Decryption complete', 'success')
      setDecrypted({ wordArray: result, originalName: data.originalName || file.meta?.originalName })
      setStatus('success')
    } catch (err) {
      addLog(`VERIFICATION FAILED: ${err.message}`, 'error')
      setStatus('error')
    }
  }

  const downloadDecrypted = () => {
    if (!decrypted) return
    const bytes = wordArrayToUint8Array(decrypted.wordArray)
    const blob  = new Blob([bytes])
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href = url; a.download = decrypted.originalName || 'decrypted_file'; a.click()
    URL.revokeObjectURL(url); toast.success('File downloaded!')
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(26,25,22,0.5)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <motion.div initial={{ scale:0.93, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.93, y:16 }}
        className="card" style={{ width:'100%', maxWidth:520, padding:26, background:'#fff' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div>
            <h3 style={{ fontWeight:700, fontSize:16, marginBottom:2 }}>Verify & Decrypt</h3>
            <p style={{ color:'var(--ink-3)', fontSize:12, fontFamily:'var(--font-mono)' }}>
              {file.meta?.originalName || file.name}
            </p>
          </div>
          <button className="btn btn-ghost" style={{ padding:'6px 10px', fontSize:13 }} onClick={onClose}>✕</button>
        </div>

        {status === 'idle' && (
          <div style={{ marginBottom:16 }}>
            <p style={{ color:'var(--ink-2)', fontSize:13, marginBottom:14, lineHeight:1.6 }}>
              Downloads the encrypted file, verifies the Ed25519 signature and SHA-256 integrity, then decrypts using your AES-256 key.
            </p>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={runVerify}>
              <Shield size={15} /> Start Verification
            </button>
          </div>
        )}

        {(status === 'verifying' || status === 'success' || status === 'error') && (
          <div className="terminal" style={{ marginBottom:14, maxHeight:200 }}>
            {logs.map((l, i) => (
              <motion.div key={l.id} initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.07 }}
                className={`log-${l.type}`}>
                {l.type === 'success' ? '✓' : l.type === 'error' ? '✗' : '›'} {l.text}
              </motion.div>
            ))}
            {status === 'verifying' && (
              <motion.span animate={{ opacity:[1,0,1] }} transition={{ duration:0.8, repeat:Infinity }}
                className="log-info">_</motion.span>
            )}
          </div>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8, marginBottom:14,
              background:'var(--green-soft)', border:'1px solid var(--green-mid)' }}>
              <CheckCircle size={15} color="var(--green)" />
              <span style={{ fontSize:12.5, color:'var(--green)', fontWeight:600 }}>
                File authentic — signature and integrity verified
              </span>
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={downloadDecrypted}>
              <Download size={14} /> Download Decrypted File
            </button>
          </motion.div>
        )}

        {status === 'error' && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:8,
            background:'var(--red-soft)', border:'1px solid var(--red-mid)' }}>
            <XCircle size={15} color="var(--red)" />
            <span style={{ fontSize:12.5, color:'var(--red)', fontWeight:600 }}>
              Verification failed — file may be tampered or wrong keys
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function FilesPage() {
  const { session }                      = useAuth()
  const { isSignedIn, listFiles, deleteFile, downloadFile } = useGoogleDrive()
  const [files, setFiles]                = useState([])
  const [loading, setLoading]            = useState(false)
  const [selectedFile, setSelectedFile]  = useState(null)
  const [search, setSearch]              = useState('')

  const load = useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    try { setFiles(await listFiles()) }
    catch (e) { toast.error('Failed to load: ' + e.message) }
    finally   { setLoading(false) }
  }, [isSignedIn, listFiles])

  useEffect(() => { load() }, [load])

  const handleDelete = async (fileId, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try { await deleteFile(fileId); toast.success('Deleted'); load() }
    catch (e) { toast.error('Delete failed: ' + e.message) }
  }

  const filtered = files.filter(f =>
    (f.meta?.originalName || f.name).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding:'32px 36px' }}>
      <AnimatePresence>
        {selectedFile && (
          <VerifyModal file={selectedFile} session={session}
            onClose={() => setSelectedFile(null)} downloadFile={downloadFile} />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="section-label" style={{ marginBottom:6 }}>Encrypted Storage</div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.5px', marginBottom:4 }}>Vault Files</h1>
          <p style={{ fontSize:13, color:'var(--ink-2)' }}>{files.length} document{files.length !== 1 ? 's' : ''} in Google Drive vault</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }} />
            <input className="input" style={{ paddingLeft:32, width:220 }} placeholder="Search files…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading} style={{ fontSize:12 }}>
            <motion.div animate={{ rotate: loading ? 360 : 0 }} transition={{ duration:1, repeat: loading ? Infinity : 0, ease:'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
        </div>
      </motion.div>

      {!isSignedIn ? (
        <div className="card" style={{ padding:48, textAlign:'center', color:'var(--ink-4)' }}>
          <FolderOpen size={36} style={{ marginBottom:10, opacity:0.3 }} />
          <p style={{ fontSize:13 }}>Connect Google Drive to view vault files</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--ink-4)' }}>
          <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
            style={{ width:28, height:28, borderRadius:'50%', border:'2px solid var(--blue)', borderTopColor:'transparent', margin:'0 auto 10px' }} />
          <p style={{ fontSize:13 }}>Loading from Drive…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:'center', color:'var(--ink-4)' }}>
          <FolderOpen size={36} style={{ marginBottom:10, opacity:0.3 }} />
          <p style={{ fontSize:13 }}>
            {search ? 'No files match your search' : 'No encrypted files yet — upload your first document'}
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((file, i) => (
            <motion.div key={file.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
              className="card" style={{ padding:'15px 18px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:38, height:38, borderRadius:10, flexShrink:0,
                background:'var(--blue-soft)', border:'1px solid var(--blue-mid)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <File size={17} color="var(--blue)" />
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>
                  {file.meta?.originalName || file.name.replace('.chainvault', '')}
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                  {file.size && (
                    <span style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>
                      {(parseInt(file.size)/1024).toFixed(1)} KB encrypted
                    </span>
                  )}
                  {file.createdTime && (
                    <span style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>
                      {format(new Date(file.createdTime), 'dd MMM yyyy HH:mm')}
                    </span>
                  )}
                  {file.meta?.dataHash && (
                    <span className="hash-chip">{file.meta.dataHash.slice(0, 18)}…</span>
                  )}
                </div>
              </div>

              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <span className="badge badge-blue">AES-256</span>
                <span className="badge badge-violet">Ed25519</span>
                <span className="badge badge-green">Fabric</span>
              </div>

              <div style={{ display:'flex', gap:7 }}>
                <button className="btn btn-secondary" style={{ padding:'7px 12px', fontSize:12 }} onClick={() => setSelectedFile(file)}>
                  <Shield size={13} /> Verify & Decrypt
                </button>
                <button className="btn btn-danger" style={{ padding:'7px 10px' }}
                  onClick={() => handleDelete(file.id, file.meta?.originalName || file.name)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
