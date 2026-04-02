/**
 * Hyperledger Fabric Gateway — Browser SDK simulation layer
 *
 * In production this connects to a real Fabric peer via grpc-web proxy
 * (e.g. Envoy or fabric-gateway REST bridge).
 * 
 * Architecture:
 *   Browser → HTTPS → REST API Gateway → Fabric Peer Node → Chaincode
 *
 * The chaincode (DocumentLedger.go) manages:
 *   - Asset creation with SHA-256 hash
 *   - Provenance tracking with digital signatures
 *   - State history via GetHistoryForKey
 *   - Cross-org endorsement policy
 */

import { sha256 } from './crypto'

// ── Network topology (matches docker-compose / cloud deployment) ─────────────
export const FABRIC_NETWORK = {
  channel:   'chainvault-channel',
  chaincode: 'document-ledger',
  mspId:     'ChainVaultMSP',
  org:       'org1.chainvault.example.com',
  peers: [
    { id: 'peer0.org1', host: 'peer0.org1.chainvault.example.com:7051', status: 'connected' },
    { id: 'peer0.org2', host: 'peer0.org2.chainvault.example.com:8051', status: 'connected' },
    { id: 'peer1.org1', host: 'peer1.org1.chainvault.example.com:7151', status: 'syncing'   },
  ],
  orderers: [
    { id: 'orderer0', host: 'orderer.chainvault.example.com:7050', type: 'etcdraft' },
  ],
  endorsementPolicy: 'AND(\'Org1MSP.peer\', \'Org2MSP.peer\')',
  blockHeight: 0,
}

// ── In-browser ledger store ──────────────────────────────────────────────────
function getLedger() {
  try { return JSON.parse(localStorage.getItem('hf_ledger') || '[]') } catch { return [] }
}
function saveLedger(ledger) {
  localStorage.setItem('hf_ledger', JSON.stringify(ledger))
}
export function getBlockHeight() {
  return getLedger().length
}

// ── Transaction envelope builder ─────────────────────────────────────────────
function buildTxEnvelope(fnName, args, creator) {
  const txId = 'tx_' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10)
  return {
    txId,
    channelId: FABRIC_NETWORK.channel,
    chaincodeId: FABRIC_NETWORK.chaincode,
    functionName: fnName,
    args,
    creator,
    timestamp: new Date().toISOString(),
    nonce: Math.random().toString(36).slice(2),
  }
}

// ── Endorsement simulation ────────────────────────────────────────────────────
async function simulateEndorsement(envelope, delayMs = 600) {
  await new Promise(r => setTimeout(r, delayMs))
  const endorsements = FABRIC_NETWORK.peers
    .filter(p => p.status === 'connected')
    .map(peer => ({
      endorser: peer.id,
      mspId:    'Org' + peer.id.charAt(5) + 'MSP',
      signature: sha256(JSON.stringify(envelope) + peer.id).slice(0, 40),
      timestamp: new Date().toISOString(),
    }))
  return endorsements
}

// ── Block creation ────────────────────────────────────────────────────────────
function createBlock(txEnvelope, endorsements, payload) {
  const ledger   = getLedger()
  const prevHash = ledger.length > 0
    ? ledger[ledger.length - 1].blockHash
    : '0'.repeat(64)

  const blockData = {
    ...txEnvelope,
    endorsements,
    payload,
    prevHash,
    blockNumber: ledger.length,
  }
  const blockHash = sha256(JSON.stringify({ ...blockData, blockHash: undefined }))

  const block = {
    blockNumber:   ledger.length,
    blockHash,
    prevHash,
    txId:          txEnvelope.txId,
    channelId:     txEnvelope.channelId,
    chaincodeId:   txEnvelope.chaincodeId,
    functionName:  txEnvelope.functionName,
    endorsements,
    payload,
    creator:       txEnvelope.creator,
    timestamp:     txEnvelope.timestamp,
    status:        'VALID',
    validationCode: 'VALID',
  }

  ledger.push(block)
  saveLedger(ledger)
  return block
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API  (mirrors @hyperledger/fabric-gateway Contract methods)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * contract.submitTransaction('CreateDocumentAsset', ...)
 * Endorses on 2 peers, orders via etcdraft, commits to ledger.
 */
export async function submitCreateAsset({
  assetId, fileName, fileSize, mimeType,
  dataHash, signature, publicKey, driveFileId, uploader,
  onLog,
}) {
  const log = (msg, t = 'fabric') => onLog?.(msg, t)

  log(`[Fabric] Proposing tx to ${FABRIC_NETWORK.chaincode}::CreateDocumentAsset`)
  const envelope = buildTxEnvelope('CreateDocumentAsset', [
    assetId, fileName, String(fileSize), mimeType,
    dataHash, signature, publicKey, driveFileId, uploader,
  ], uploader)

  log(`[Fabric] TxID: ${envelope.txId}`)
  log(`[Fabric] Sending proposal to peer0.org1...`)
  await new Promise(r => setTimeout(r, 350))
  log(`[Fabric] peer0.org1 endorsed ✓`, 'success')

  log(`[Fabric] Sending proposal to peer0.org2...`)
  const endorsements = await simulateEndorsement(envelope, 400)
  log(`[Fabric] peer0.org2 endorsed ✓`, 'success')

  log(`[Fabric] Endorsement policy AND(Org1MSP,Org2MSP) satisfied ✓`, 'success')
  log(`[Fabric] Submitting to orderer (etcdraft)...`)
  await new Promise(r => setTimeout(r, 300))
  log(`[Fabric] Block #${getBlockHeight()} committed to channel '${FABRIC_NETWORK.channel}' ✓`, 'success')

  const block = createBlock(envelope, endorsements, {
    assetId, fileName, fileSize, mimeType,
    dataHash, signature, publicKey, driveFileId, uploader,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  })

  log(`[Fabric] BlockHash: ${block.blockHash.slice(0, 24)}…`, 'info')
  return block
}

/**
 * contract.evaluateTransaction('QueryDocumentAsset', assetId)
 * Read-only query — no endorsement needed.
 */
export async function queryAsset(assetId) {
  const ledger = getLedger()
  return ledger.find(b => b.payload?.assetId === assetId) || null
}

/**
 * contract.evaluateTransaction('GetAllDocuments')
 */
export async function queryAllAssets() {
  return getLedger()
}

/**
 * contract.submitTransaction('RevokeDocument', assetId)
 */
export async function revokeAsset(assetId, revoker, onLog) {
  const log = (msg, t = 'fabric') => onLog?.(msg, t)
  log(`[Fabric] Revoking asset ${assetId}...`)
  const envelope = buildTxEnvelope('RevokeDocument', [assetId, revoker], revoker)
  const endorsements = await simulateEndorsement(envelope, 500)
  log(`[Fabric] Endorsements collected ✓`, 'success')
  const block = createBlock(envelope, endorsements, { assetId, revoker, status: 'REVOKED', revokedAt: new Date().toISOString() })
  log(`[Fabric] Block #${block.blockNumber} committed ✓`, 'success')
  return block
}

/**
 * Verify ledger chain integrity (prevHash linkage)
 */
export function verifyChainIntegrity() {
  const ledger = getLedger()
  if (ledger.length < 2) return { valid: true, checkedBlocks: ledger.length }
  for (let i = 1; i < ledger.length; i++) {
    if (ledger[i].prevHash !== ledger[i - 1].blockHash) {
      return { valid: false, brokenAt: i, blockHash: ledger[i].blockHash }
    }
  }
  return { valid: true, checkedBlocks: ledger.length }
}

/**
 * Get full blockchain for LedgerPage
 */
export function getFullLedger() {
  return getLedger()
}

/**
 * Network health check
 */
export function getNetworkHealth() {
  const ledger = getLedger()
  const connected = FABRIC_NETWORK.peers.filter(p => p.status === 'connected').length
  return {
    status:      connected >= 2 ? 'healthy' : 'degraded',
    peers:       FABRIC_NETWORK.peers,
    orderers:    FABRIC_NETWORK.orderers,
    channel:     FABRIC_NETWORK.channel,
    chaincode:   FABRIC_NETWORK.chaincode,
    blockHeight: ledger.length,
    mspId:       FABRIC_NETWORK.mspId,
    connected,
  }
}
