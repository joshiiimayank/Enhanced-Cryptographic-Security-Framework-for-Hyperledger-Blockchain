import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Component } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { GoogleDriveProvider } from './hooks/useGoogleDrive'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import FilesPage from './pages/FilesPage'
import LedgerPage from './pages/LedgerPage'
import KeysPage from './pages/KeysPage'
import { FABRIC_NETWORK } from './utils/hyperledger'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column', gap:16, padding:40, background:'var(--bg)', fontFamily:'var(--font-mono)' }}>
        <div style={{ fontSize:36 }}>⚠️</div>
        <h2 style={{ color:'var(--red)', fontSize:18 }}>Runtime Error</h2>
        <pre style={{ background:'var(--bg-subtle)', border:'1px solid var(--border)', padding:20, borderRadius:10,
          fontSize:11, maxWidth:700, color:'var(--red)', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {this.state.error?.message}{'\n\n'}{this.state.error?.stack}
        </pre>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload App</button>
      </div>
    )
    return this.props.children
  }
}

// Ticker content — repeated to fill width
const TICKER_TEXT = `⬡ ${FABRIC_NETWORK.channel}  ·  Chaincode: ${FABRIC_NETWORK.chaincode}  ·  MSP: ${FABRIC_NETWORK.mspId}  ·  Consensus: etcdraft  ·  Policy: AND(Org1MSP, Org2MSP)  ·  TLS: enabled  ·  `
const TICKER = TICKER_TEXT.repeat(6)

function FabricTicker() {
  return (
    <div className="fabric-ticker" style={{ borderBottom:'1px solid rgba(255,255,255,0.12)' }}>
      <div className="ticker-inner">{TICKER}{TICKER}</div>
    </div>
  )
}

function ProtectedLayout({ children }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return (
    <div style={{ display:'flex', minHeight:'100vh', flexDirection:'column' }}>
      <FabricTicker />
      <div style={{ display:'flex', flex:1 }}>
        <Sidebar />
        <main style={{ marginLeft:248, flex:1, minHeight:'calc(100vh - 28px)', background:'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { session } = useAuth()
  return (
    <Routes>
      <Route path="/login"     element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/upload"    element={<ProtectedLayout><UploadPage /></ProtectedLayout>} />
      <Route path="/files"     element={<ProtectedLayout><FilesPage /></ProtectedLayout>} />
      <Route path="/ledger"    element={<ProtectedLayout><LedgerPage /></ProtectedLayout>} />
      <Route path="/keys"      element={<ProtectedLayout><KeysPage /></ProtectedLayout>} />
      <Route path="*"          element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <GoogleDriveProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="bottom-right"
              toastOptions={{ style: {
                background:'#fff', color:'var(--ink)',
                border:'1px solid var(--border)', fontFamily:'var(--font)',
                fontSize:13, boxShadow:'var(--shadow)',
              }}} />
          </BrowserRouter>
        </AuthProvider>
      </GoogleDriveProvider>
    </ErrorBoundary>
  )
}
