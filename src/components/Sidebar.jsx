import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Upload, FolderOpen, Layers, Key, LogOut, Cpu, Wifi } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGoogleDrive } from '../hooks/useGoogleDrive'
import { getNetworkHealth } from '../utils/hyperledger'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload',    icon: Upload,          label: 'Encrypt & Submit' },
  { path: '/files',     icon: FolderOpen,      label: 'Vault Files' },
  { path: '/ledger',    icon: Layers,          label: 'Fabric Ledger' },
  { path: '/keys',      icon: Key,             label: 'Crypto Keys' },
]

export default function Sidebar() {
  const { pathname }             = useLocation()
  const { session, clearSession } = useAuth()
  const { signOut }              = useGoogleDrive()
  const health                   = getNetworkHealth()

  const handleLogout = () => { signOut(); clearSession() }

  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{
        width: 248, minHeight: '100vh',
        background: '#fff', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'var(--blue)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', letterSpacing: '-0.3px' }}>An Enchanced Cryptographic Security Framework For HB</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Hyperledger Fabric v2.5</div>
          </div>
        </div>

        {/* Network status pill */}
        <div style={{
          background: health.status === 'healthy' ? 'var(--green-soft)' : 'var(--amber-soft)',
          border: `1px solid ${health.status === 'healthy' ? 'var(--green-mid)' : 'var(--amber-mid)'}`,
          borderRadius: 8, padding: '7px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: health.status === 'healthy' ? 'var(--green)' : 'var(--amber)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: health.status === 'healthy' ? 'var(--green)' : 'var(--amber)' }}>
              {health.status === 'healthy' ? 'Network Healthy' : 'Degraded'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {health.connected}/{health.peers.length} peers · Block #{health.blockHeight}
            </div>
          </div>
          <Wifi size={12} color={health.status === 'healthy' ? 'var(--green)' : 'var(--amber)'} style={{ marginLeft: 'auto' }} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px' }}>
        <div className="section-label" style={{ padding: '0 8px', marginBottom: 6 }}>Menu</div>
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = pathname === path
          return (
            <Link
              key={path} to={path}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, marginBottom: 1,
                textDecoration: 'none',
                color: active ? 'var(--blue)' : 'var(--ink-2)',
                background: active ? 'var(--blue-soft)' : 'transparent',
                fontWeight: active ? 600 : 400, fontSize: 13.5,
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {active && (
                <motion.div layoutId="nav-dot"
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)' }} />
              )}
            </Link>
          )
        })}

        {/* Fabric peers */}
        <div className="section-label" style={{ padding: '0 8px', marginTop: 20, marginBottom: 8 }}>Fabric Peers</div>
        {health.peers.map(peer => (
          <div key={peer.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 6,
            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)',
          }}>
            <div className="dot" style={{
              background: peer.status === 'connected' ? 'var(--green)' : 'var(--amber)',
              width: 6, height: 6,
            }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peer.id}</span>
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 4,
              background: peer.status === 'connected' ? 'var(--green-soft)' : 'var(--amber-soft)',
              color: peer.status === 'connected' ? 'var(--green)' : 'var(--amber)',
            }}>
              {peer.status}
            </span>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        {session?.user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 10px', marginBottom: 8,
            background: 'var(--bg-subtle)', borderRadius: 8,
          }}>
            {session.user.picture
              ? <img src={session.user.picture} style={{ width: 28, height: 28, borderRadius: '50%' }} alt="" />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {session.user.name?.[0]}
                </div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.user.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{ width: '100%', fontSize: 12, justifyContent: 'flex-start', padding: '8px 10px' }}
        >
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </motion.aside>
  )
}
