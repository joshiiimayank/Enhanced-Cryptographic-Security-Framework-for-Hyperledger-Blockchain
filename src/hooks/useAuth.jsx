import { createContext, useContext, useState, useCallback } from 'react'
import { generateAESKey, generateEdDSAKeyPair } from '../utils/crypto'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const s = localStorage.getItem('chainvault_session')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  const initSession = useCallback((googleUser) => {
    // Generate or restore cryptographic keys per user
    const keyStorageKey = `chainvault_keys_${googleUser.email}`
    let keys = null
    try {
      const stored = localStorage.getItem(keyStorageKey)
      if (stored) keys = JSON.parse(stored)
    } catch {}

    if (!keys) {
      keys = {
        aesKey: generateAESKey(),
        eddsaKeyPair: generateEdDSAKeyPair(),
      }
      localStorage.setItem(keyStorageKey, JSON.stringify(keys))
    }

    const s = { user: googleUser, keys, loginTime: new Date().toISOString() }
    setSession(s)
    localStorage.setItem('chainvault_session', JSON.stringify(s))
    return s
  }, [])

  const clearSession = useCallback(() => {
    setSession(null)
    localStorage.removeItem('chainvault_session')
  }, [])

  return (
    <AuthContext.Provider value={{ session, initSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
