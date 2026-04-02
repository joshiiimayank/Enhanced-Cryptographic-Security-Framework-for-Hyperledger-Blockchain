import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, FileCheck, TrendingUp, AlertTriangle, CheckCircle, Layers, Cpu, Activity, ArrowUpRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getFullLedger, verifyChainIntegrity, getNetworkHealth, FABRIC_NETWORK } from '../utils/hyperledger'
import { format } from 'date-fns'

function StatCard({ label, value, icon: Icon, color, sub, delay, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card" style={{ padding: '20px 22px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: color + '18', border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} color={color} />
        </div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
            <ArrowUpRight size={12} />{trend}
          </div>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-1px', marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{sub}</div>}
    </motion.div>
  )
}

function BlockChainViz({ blocks }) {
  const show = blocks.slice(-5)
  if (!show.length) return (
    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
      Genesis block awaiting — submit a document to begin the chain
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0 8px' }}>
      {show.map((b, i) => (
        <div key={b.blockHash} style={{ display: 'flex', alignItems: 'center' }}>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
            style={{
              width: 88, flexShrink: 0, padding: '10px 12px',
              background: '#fff', border: '1.5px solid var(--blue-mid)',
              borderRadius: 10, cursor: 'default',
            }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--blue)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              BLK #{b.blockNumber}
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.blockHash?.slice(0, 10)}…
            </div>
            <div style={{ fontSize: 8.5, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.payload?.fileName || b.payload?.assetId?.slice(0, 14) || '—'}
            </div>
            <div style={{ marginTop: 4 }}>
              <span className="badge badge-green" style={{ fontSize: 8.5, padding: '1px 5px' }}>VALID</span>
            </div>
          </motion.div>
          {i < show.length - 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ width: 10, height: 1.5, background: 'var(--blue-mid)' }} />
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }}
              />
              <div style={{ width: 10, height: 1.5, background: 'var(--blue-mid)' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PeerStatusRow({ peer }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="dot" style={{ background: peer.status === 'connected' ? 'var(--green)' : 'var(--amber)' }} />
      <span style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{peer.id}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{peer.host}</span>
      <span className={`badge ${peer.status === 'connected' ? 'badge-green' : 'badge-amber'}`}>{peer.status}</span>
    </div>
  )
}

export default function Dashboard() {
  const { session } = useAuth()
  const [ledger, setLedger]     = useState([])
  const [integrity, setIntegrity] = useState({ valid: true, checkedBlocks: 0 })
  const [health, setHealth]     = useState(getNetworkHealth())
  const [time, setTime]         = useState(new Date())

  useEffect(() => {
    const refresh = () => {
      setLedger(getFullLedger())
      setIntegrity(verifyChainIntegrity())
      setHealth(getNetworkHealth())
      setTime(new Date())
    }
    refresh()
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [])

  const totalSize    = ledger.reduce((a, b) => a + (b.payload?.fileSize || 0), 0)
  const formatBytes  = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : b > 1024 ? `${(b/1024).toFixed(1)} KB` : `${b} B`
  const committed    = ledger.filter(b => b.payload?.status === 'ACTIVE').length

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
        style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 28 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 6 }}>Overview</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
            Security Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            Welcome, <strong>{session?.user?.name}</strong> ·{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 12 }}>{FABRIC_NETWORK.channel}</span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-1px' }}>
            {format(time, 'HH:mm:ss')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {format(time, 'dd MMM yyyy')}
          </div>
        </div>
      </motion.div>

      {/* Integrity banner */}
      {!integrity.valid ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'var(--red-soft)', border:'1px solid var(--red-mid)', color:'var(--red)', fontSize:13 }}>
          <AlertTriangle size={16} />
          <strong>Integrity Breach:</strong> Hash chain broken at block {integrity.brokenAt}. Possible tampering detected.
        </motion.div>
      ) : ledger.length > 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, marginBottom:20, background:'var(--green-soft)', border:'1px solid var(--green-mid)', color:'var(--green)', fontSize:13 }}>
          <CheckCircle size={15} />
          Ledger integrity verified — {integrity.checkedBlocks} blocks cryptographically linked on <strong style={{marginLeft:4}}>{FABRIC_NETWORK.channel}</strong>
        </motion.div>
      ) : null}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
        <StatCard label="Documents Secured"    value={ledger.length}                icon={Shield}    color="var(--blue)"   sub="On Fabric ledger"   delay={0.05} trend={ledger.length > 0 ? '+' + ledger.length : null} />
        <StatCard label="Fabric Blocks"        value={ledger.length}                icon={Layers}    color="#5B3FD8"       sub="etcdraft ordered"   delay={0.10} />
        <StatCard label="Data Encrypted"       value={totalSize ? formatBytes(totalSize) : '0 B'} icon={Lock} color="var(--green)" sub="AES-256-CBC" delay={0.15} />
        <StatCard label="Endorsements Passed"  value={committed}                    icon={FileCheck} color="var(--amber)"  sub="Ed25519 verified"   delay={0.20} />
      </div>

      {/* Chain viz + Network side by side */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, marginBottom:16 }}>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.25 }}
          className="card" style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Activity size={15} color="var(--blue)" />
            <span style={{ fontWeight:700, fontSize:14 }}>Live Blockchain Chain</span>
            <span className="badge badge-blue" style={{ marginLeft:'auto' }}>{ledger.length} BLOCKS</span>
          </div>
          <BlockChainViz blocks={ledger} />
        </motion.div>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.30 }}
          className="card" style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Cpu size={15} color="var(--blue)" />
            <span style={{ fontWeight:700, fontSize:14 }}>Network Topology</span>
          </div>
          <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--ink-3)', marginBottom:10 }}>
            MSP: <span style={{ color:'var(--blue)' }}>{health.mspId}</span>
            &nbsp;·&nbsp;Chaincode: <span style={{ color:'var(--blue)' }}>{health.chaincode}</span>
          </div>
          {health.peers.map(p => <PeerStatusRow key={p.id} peer={p} />)}
          <div style={{ marginTop:12, padding:'8px 0', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--ink-3)' }}>
              Orderer: <span style={{ color:'var(--ink-2)' }}>{health.orderers[0]?.id}</span>
            </div>
            <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--ink-4)', marginTop:2 }}>
              Consensus: etcdraft · Policy: AND(Org1,Org2)
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}
        className="card" style={{ padding:'20px 22px' }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Recent Transactions</div>
        {ledger.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 0', color:'var(--ink-4)', fontSize:13 }}>
            No transactions yet — upload your first document to begin
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Block', 'File', 'TX ID', 'Endorsers', 'Time', 'Status'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'6px 10px', fontSize:11, fontWeight:600, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...ledger].reverse().slice(0, 6).map((b, i) => (
                <motion.tr key={b.txId} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                  style={{ borderBottom:'1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <td style={{ padding:'10px 10px', fontSize:12, fontFamily:'var(--font-mono)', color:'var(--blue)', fontWeight:600 }}>#{b.blockNumber}</td>
                  <td style={{ padding:'10px 10px', fontSize:13, fontWeight:500, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.payload?.fileName || '—'}</td>
                  <td style={{ padding:'10px 10px' }}><span className="hash-chip">{b.txId?.slice(0,18)}…</span></td>
                  <td style={{ padding:'10px 10px', fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)' }}>{b.endorsements?.length || 0}/2</td>
                  <td style={{ padding:'10px 10px', fontSize:11, color:'var(--ink-3)', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>
                    {format(new Date(b.timestamp), 'dd MMM HH:mm:ss')}
                  </td>
                  <td style={{ padding:'10px 10px' }}>
                    <span className={`badge ${b.validationCode === 'VALID' ? 'badge-green' : 'badge-red'}`}>{b.validationCode}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
