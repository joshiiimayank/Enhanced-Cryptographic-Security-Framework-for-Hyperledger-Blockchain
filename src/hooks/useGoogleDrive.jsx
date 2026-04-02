/**
 * Google Drive integration — Context + Hook
 * Single shared instance so the OAuth token is available on every page.
 */
import { useState, useEffect, useCallback, useContext, createContext } from 'react'
import { GOOGLE_CONFIG } from '../config/google'

const GAPI_SCRIPT = 'https://apis.google.com/js/api.js'
const GIS_SCRIPT  = 'https://accounts.google.com/gsi/client'

const DriveContext = createContext(null)

export function GoogleDriveProvider({ children }) {
  const [gapiReady, setGapiReady] = useState(false)
  const [gisReady,  setGisReady]  = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user,       setUser]       = useState(null)
  const [tokenClient, setTokenClient] = useState(null)
  const [error, setError] = useState(null)

  // ── Load GAPI ──────────────────────────────────────────────────
  useEffect(() => {
    const initGapi = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
          })
          setGapiReady(true)
        } catch (e) {
          setError('Failed to init Google API: ' + e.message)
        }
      })
    }

    if (document.querySelector(`script[src="${GAPI_SCRIPT}"]`)) {
      if (window.gapi) initGapi()
      return
    }
    const script = document.createElement('script')
    script.src   = GAPI_SCRIPT
    script.async = true
    script.defer = true
    script.onload = initGapi
    document.head.appendChild(script)
  }, [])

  // ── Load GIS ───────────────────────────────────────────────────
  useEffect(() => {
    const initGis = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        scope: GOOGLE_CONFIG.SCOPES,
        callback: (resp) => {
          if (resp.error) { setError('OAuth error: ' + resp.error); return }
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          })
            .then(r => r.json())
            .then(info => {
              setUser({ name: info.name, email: info.email, picture: info.picture, token: resp.access_token })
              setIsSignedIn(true)
            })
            .catch(e => setError('Failed to fetch user info: ' + e.message))
        },
      })
      setTokenClient(client)
      setGisReady(true)
    }

    if (document.querySelector(`script[src="${GIS_SCRIPT}"]`)) {
      if (window.google?.accounts) initGis()
      return
    }
    const script = document.createElement('script')
    script.src   = GIS_SCRIPT
    script.async = true
    script.defer = true
    script.onload = initGis
    document.head.appendChild(script)
  }, [])

  // ── Sign in / out ──────────────────────────────────────────────
  const signIn = useCallback(() => {
    if (!gapiReady || !gisReady || !tokenClient) {
      setError('Google APIs not ready yet. Please wait a moment and try again.')
      return
    }
    const existingToken = window.gapi.client.getToken()
    tokenClient.requestAccessToken({ prompt: existingToken ? '' : 'consent' })
  }, [gapiReady, gisReady, tokenClient])

  const signOut = useCallback(() => {
    const token = window.gapi.client.getToken()
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token)
      window.gapi.client.setToken('')
    }
    setIsSignedIn(false)
    setUser(null)
  }, [])

  // ── Get access token safely ────────────────────────────────────
  const getToken = useCallback(() => {
    const gapiToken = window.gapi?.client?.getToken()
    if (gapiToken?.access_token) return gapiToken.access_token
    if (user?.token) return user.token
    throw new Error('Not authenticated with Google Drive. Please connect Drive first.')
  }, [user])

  // ── Ensure ChainVault folder ───────────────────────────────────
  const ensureFolder = useCallback(async () => {
    const resp = await window.gapi.client.drive.files.list({
      q: `name='${GOOGLE_CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    })
    if (resp.result.files.length > 0) return resp.result.files[0].id

    const folder = await window.gapi.client.drive.files.create({
      resource: { name: GOOGLE_CONFIG.FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    })
    return folder.result.id
  }, [])

  // ── Upload encrypted file ──────────────────────────────────────
  const uploadFile = useCallback(async (encryptedData, metadata) => {
    if (!isSignedIn) throw new Error('Not signed in to Google Drive. Please connect your account first.')

    const accessToken = getToken()
    const folderId    = await ensureFolder()
    const blob        = new Blob([JSON.stringify(encryptedData)], { type: 'application/json' })
    const fileName    = `${metadata.fileId}.chainvault`

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify({
      name: fileName,
      parents: [folderId],
      description: JSON.stringify({
        originalName: metadata.fileName,
        fileId:       metadata.fileId,
        dataHash:     metadata.dataHash,
        signature:    metadata.signature,
        timestamp:    metadata.timestamp,
        uploader:     metadata.uploader,
      }),
    })], { type: 'application/json' }))
    form.append('file', blob)

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    )

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      throw new Error(`Drive upload failed (${response.status}): ${errText}`)
    }
    return response.json()
  }, [isSignedIn, getToken, ensureFolder])

  // ── List files ─────────────────────────────────────────────────
  const listFiles = useCallback(async () => {
    if (!isSignedIn) throw new Error('Not signed in to Google Drive.')
    const folderId = await ensureFolder()
    const resp = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime, description)',
      orderBy: 'createdTime desc',
    })
    return resp.result.files.map(f => {
      let meta = {}
      try { meta = JSON.parse(f.description || '{}') } catch {}
      return { ...f, meta }
    })
  }, [isSignedIn, ensureFolder])

  // ── Download ───────────────────────────────────────────────────
  const downloadFile = useCallback(async (fileId) => {
    if (!isSignedIn) throw new Error('Not signed in to Google Drive.')
    const accessToken = getToken()
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!response.ok) throw new Error('Drive download failed: ' + response.statusText)
    return response.json()
  }, [isSignedIn, getToken])

  // ── Delete ─────────────────────────────────────────────────────
  const deleteFile = useCallback(async (fileId) => {
    if (!isSignedIn) throw new Error('Not signed in to Google Drive.')
    await window.gapi.client.drive.files.delete({ fileId })
  }, [isSignedIn])

  return (
    <DriveContext.Provider value={{
      isReady: gapiReady && gisReady,
      isSignedIn, user, error,
      signIn, signOut,
      uploadFile, listFiles, downloadFile, deleteFile,
    }}>
      {children}
    </DriveContext.Provider>
  )
}

export function useGoogleDrive() {
  const ctx = useContext(DriveContext)
  if (!ctx) throw new Error('useGoogleDrive must be used inside <GoogleDriveProvider>')
  return ctx
}