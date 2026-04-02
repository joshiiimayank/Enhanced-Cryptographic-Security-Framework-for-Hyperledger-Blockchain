import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, CheckCircle, AlertTriangle, Copy, ChevronDown, ChevronRight, Search, RefreshCw } from 'lucide-react'
import { getFullLedger, verifyChainIntegrity, FABRIC_NETWORK } from '../utils/hyperledger'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function BlockRow({ block, index, total }) {
  const [expanded, setExpanded] = useState(false)
  const copy = val => { navigator.clipboard.writeText(val); toast.success('Copied!') }
  const isLast = index === total - 1

  return (
    <div style={{ display:'flex', gap:0 }}>
      {/* Timeline */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginRight:14, flexShrink:0 }}>
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay: index * 0.05, type:'spring' }}
          style={{
            width:32, height:32, borderRadius:'50%', flexShrink:0,
            background: block.validationCode === 'VALID' ? 'var(--blue-soft)' : 'var(--red-soft)',
            border: `2px solid ${block.validationCode === 'VALID' ? 'var(--blue)' : 'var(--red)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, fontFamily:'var(--font-mono)',
            color: block.validationCode === 'VALID' ? 'var(--blue)' : 'var(--red)',
          }}>
          {block.blockNumber}
        </motion.div>
        {!isLast && (
          <div style={{ width:2, flex:1, minHeight:16, marginTop:3,
            background:'linear-gradient(to bottom, var(--blue-mid), var(--border))' }} />
        )}
      </div>

      {/* Block card */}
      <motion.div initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay: index * 0.05 }}
        className="card" style={{ flex:1, marginBottom:12, padding:'14px 18px', cursor:'pointer' }}
        onClick={() => setExpanded(!expanded)}>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontWeight:600, fontSize:14 }}>{block.payload?.fileName || block.payload?.assetId}</span>
              <span className={`badge ${block.validationCode === 'VALID' ? 'badge-green' : 'badge-red'}`}>
                {block.validationCode}
              </span>
              <span className="badge badge-blue">{block.functionName}</span>
            </div>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>{block.txId?.slice(0,28)}…</span>
              <span style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>
                {format(new Date(block.timestamp), 'dd MMM yyyy · HH:mm:ss')}
              </span>
            </div>
          </div>
          <span className="hash-chip" style={{ maxWidth:140 }}>{block.blockHash?.slice(0, 16)}…</span>
          <div style={{ color:'var(--ink-4)', flexShrink:0 }}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              style={{ overflow:'hidden' }}>
              <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                  {[
                    { label:'Block Hash',         value: block.blockHash },
                    { label:'Previous Hash',       value: block.prevHash },
                    { label:'Transaction ID',      value: block.txId },
                    { label:'Channel',             value: block.channelId },
                    { label:'Chaincode',           value: block.chaincodeId },
                    { label:'Function',            value: block.functionName },
                    { label:'Uploader / Creator',  value: block.creator },
                    { label:'File Size',           value: block.payload?.fileSize ? `${block.payload.fileSize.toLocaleString()} bytes` : '—' },
                    { label:'Data Hash (SHA-256)', value: block.payload?.dataHash,    full: true },
                    { label:'Ed25519 Signature',   value: block.payload?.signature,   full: true },
                    { label:'Public Key',          value: block.payload?.publicKey,   full: true },
                  ].filter(f => f.value).map(({ label, value, full }) => (
                    <div key={label} style={{
                      gridColumn: full ? '1/-1' : 'auto',
                      padding:'10px 12px', borderRadius:8,
                      background:'var(--bg-subtle)', border:'1px solid var(--border)',
                    }}>
                      <div className="section-label" style={{ marginBottom:4 }}>{label}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <code style={{ fontSize:10.5, fontFamily:'var(--font-mono)', color:'var(--blue)',
                          flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', wordBreak:'break-all' }}>
                          {value}
                        </code>
                        <button onClick={e => { e.stopPropagation(); copy(value) }}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-4)', flexShrink:0, padding:2 }}>
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Endorsements */}
                {block.endorsements?.length > 0 && (
                  <div>
                    <div className="section-label" style={{ marginBottom:8 }}>Endorsements ({block.endorsements.length})</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {block.endorsements.map(e => (
                        <div key={e.endorser} style={{ padding:'7px 12px', borderRadius:8,
                          background:'var(--green-soft)', border:'1px solid var(--green-mid)' }}>
                          <div style={{ fontSize:11, fontWeight:600, color:'var(--green)', fontFamily:'var(--font-mono)' }}>
                            {e.endorser}
                          </div>
                          <div style={{ fontSize:10, color:'var(--ink-3)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                            {e.mspId} · {e.signature?.slice(0,16)}…
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default function LedgerPage() {
  const [ledger, setLedger]         = useState([])
  const [integrity, setIntegrity]   = useState({ valid: true, checkedBlocks: 0 })
  const [search, setSearch]         = useState('')

  const refresh = () => {
    const l = getFullLedger()
    setLedger([...l].reverse())
    setIntegrity(verifyChainIntegrity())
  }
  useEffect(() => { refresh() }, [])

  const filtered = ledger.filter(b =>
    (b.payload?.fileName || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.txId || '').toLowerCase().includes(search.toLowerCase()) ||
    String(b.blockNumber).includes(search)
  )

  return (
    <div style={{ padding:'32px 36px', maxWidth:900 }}>
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="section-label" style={{ marginBottom:6 }}>Immutable Record</div>
          <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.5px', marginBottom:4 }}>Fabric Ledger</h1>
          <p style={{ fontSize:13, color:'var(--ink-2)' }}>
            Channel: <code style={{ fontFamily:'var(--font-mono)', color:'var(--blue)' }}>{FABRIC_NETWORK.channel}</code>
            &nbsp;·&nbsp; Chaincode: <code style={{ fontFamily:'var(--font-mono)', color:'var(--blue)' }}>{FABRIC_NETWORK.chaincode}</code>
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--ink-4)' }} />
            <input className="input" style={{ paddingLeft:32, width:220 }} placeholder="Search blocks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={refresh} style={{ fontSize:12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </motion.div>

      {/* Integrity banner */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{
        padding:'12px 16px', borderRadius:10, marginBottom:22,
        background: integrity.valid ? 'var(--green-soft)' : 'var(--red-soft)',
        border: `1px solid ${integrity.valid ? 'var(--green-mid)' : 'var(--red-mid)'}`,
        display:'flex', alignItems:'center', gap:10,
        color: integrity.valid ? 'var(--green)' : 'var(--red)', fontSize:13,
      }}>
        {integrity.valid
          ? <><CheckCircle size={15} /> Chain integrity verified — {integrity.checkedBlocks} blocks, all hashes consistent</>
          : <><AlertTriangle size={15} /> Hash chain broken at block {integrity.brokenAt} — data may be tampered</>
        }
      </motion.div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Total Blocks',      value: ledger.length },
          { label:'Endorsements',      value: ledger.reduce((a,b) => a + (b.endorsements?.length||0), 0) },
          { label:'Valid Txs',         value: ledger.filter(b => b.validationCode === 'VALID').length },
          { label:'Orderer Consensus', value: 'etcdraft' },
        ].map(({ label, value }, i) => (
          <div key={label} className="card" style={{ padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'var(--ink)', letterSpacing:'-0.5px' }}>{value}</div>
            <div style={{ fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)', marginTop:3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Block timeline */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:'center', color:'var(--ink-4)', fontSize:13 }}>
          {search ? 'No blocks match your search' : 'No blocks yet — submit a document to begin the chain'}
        </div>
      ) : (
        <div>
          {filtered.map((block, i) => (
            <BlockRow key={block.txId} block={block} index={i} total={filtered.length} />
          ))}
        </div>
      )}
    </div>
  )
}
