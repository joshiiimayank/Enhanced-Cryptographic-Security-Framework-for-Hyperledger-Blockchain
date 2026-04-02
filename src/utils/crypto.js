import CryptoJS from 'crypto-js'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

const { encodeBase64, decodeBase64 } = naclUtil

/* ============================= */
/* 🔐 AES KEY */
/* ============================= */

export function generateAESKey() {
  const keyBytes = nacl.randomBytes(32)
  return encodeBase64(keyBytes)
}

/* ============================= */
/* 🔁 Uint8Array → WordArray */
/* ============================= */

function uint8ArrayToWordArray(bytes) {
  const words = []
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      ((bytes[i] || 0) << 24) |
      ((bytes[i + 1] || 0) << 16) |
      ((bytes[i + 2] || 0) << 8) |
      ((bytes[i + 3] || 0))
    )
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length)
}

/* ============================= */
/* 🔐 AES ENCRYPT */
/* ============================= */

export function encryptAES(data, keyB64) {
  const key = CryptoJS.enc.Base64.parse(keyB64)
  const iv = CryptoJS.lib.WordArray.random(16)

  let wordArray, originalSize = 0

  if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    originalSize = bytes.length

    // ✅ FIXED conversion
    wordArray = uint8ArrayToWordArray(bytes)

  } else {
    const str = String(data)
    originalSize = new TextEncoder().encode(str).length
    wordArray = CryptoJS.enc.Utf8.parse(str)
  }

  const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })

  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv.toString(CryptoJS.enc.Base64),
    originalSize
  }
}

/* ============================= */
/* 🔓 AES DECRYPT */
/* ============================= */

export function decryptAES(ciphertextB64, ivB64, keyB64) {
  const key = CryptoJS.enc.Base64.parse(keyB64)
  const iv = CryptoJS.enc.Base64.parse(ivB64)
  const ciphertext = CryptoJS.enc.Base64.parse(ciphertextB64)

  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext })

  return CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
}

/* ============================= */
/* 🔐 EDDSA (Ed25519) */
/* ============================= */

export function generateEdDSAKeyPair() {
  const keyPair = nacl.sign.keyPair()
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  }
}

export function signEdDSA(message, secretKeyB64) {
  // ✅ FIX: MUST be Uint8Array
  const msgBytes = new TextEncoder().encode(message)

  const secretKey = decodeBase64(secretKeyB64)
  const signature = nacl.sign.detached(msgBytes, secretKey)

  return encodeBase64(signature)
}

export function verifyEdDSA(message, signatureB64, publicKeyB64) {
  try {
    // ✅ FIX: MUST be Uint8Array
    const msgBytes = new TextEncoder().encode(message)

    const signature = decodeBase64(signatureB64)
    const publicKey = decodeBase64(publicKeyB64)

    return nacl.sign.detached.verify(msgBytes, signature, publicKey)
  } catch {
    return false
  }
}

/* ============================= */
/* 🔐 HASH */
/* ============================= */

export function sha256(data) {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex)
}

export function hashEncryptedData(ciphertext, iv) {
  return sha256(`${ciphertext}:${iv}`)
}

/* ============================= */
/* 🔐 ENCRYPT + SIGN */
/* ============================= */

export function encryptAndSign(data, aesKey, eddsaSecretKey) {
  const { ciphertext, iv, originalSize } = encryptAES(data, aesKey)

  const dataHash = hashEncryptedData(ciphertext, iv)
  const signature = signEdDSA(dataHash, eddsaSecretKey)

  return {
    ciphertext,
    iv,
    originalSize,
    dataHash,
    signature,
    timestamp: new Date().toISOString()
  }
}

/* ============================= */
/* 🔓 VERIFY + DECRYPT */
/* ============================= */

export function verifyAndDecrypt(ciphertext, iv, dataHash, signature, aesKey, eddsaPublicKey) {
  const computedHash = hashEncryptedData(ciphertext, iv)

  if (computedHash !== dataHash) {
    throw new Error('INTEGRITY_FAILURE: Hash mismatch — data may be tampered')
  }

  const valid = verifyEdDSA(dataHash, signature, eddsaPublicKey)

  if (!valid) {
    throw new Error('AUTH_FAILURE: Invalid EdDSA signature')
  }

  return decryptAES(ciphertext, iv, aesKey)
}

/* ============================= */
/* 🔗 BLOCKCHAIN LEDGER */
/* ============================= */

export function getLedger() {
  try {
    return JSON.parse(localStorage.getItem('chainvault_ledger') || '[]')
  } catch {
    return []
  }
}

export function getLedgerTip() {
  const ledger = getLedger()
  return ledger.length > 0 ? ledger[ledger.length - 1].blockHash : '0'.repeat(64)
}

export function createLedgerRecord({
  fileId,
  fileName,
  fileSize,
  dataHash,
  signature,
  eddsaPublicKey,
  driveFileId,
  uploader
}) {
  const prevHash = getLedgerTip()

  const record = {
    blockId: `BLK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    fileId,
    fileName,
    fileSize,
    dataHash,
    signature,
    eddsaPublicKey,
    driveFileId,
    uploader,
    prevHash,
    status: 'COMMITTED',
  }

  record.blockHash = sha256(JSON.stringify({ ...record, blockHash: undefined }))

  const ledger = getLedger()
  ledger.push(record)
  localStorage.setItem('chainvault_ledger', JSON.stringify(ledger))

  return record
}

export function verifyLedgerIntegrity() {
  const ledger = getLedger()

  for (let i = 1; i < ledger.length; i++) {
    if (ledger[i].prevHash !== ledger[i - 1].blockHash) {
      return false
    }
  }

  return true
}

/* ============================= */
/* 🔁 WordArray → Uint8Array */
/* ============================= */

export function wordArrayToUint8Array(wordArray) {
  const words = wordArray.words
  const sigBytes = wordArray.sigBytes
  const uint8 = new Uint8Array(sigBytes)

  for (let i = 0; i < sigBytes; i++) {
    uint8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }

  return uint8
}