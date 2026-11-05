/* webstt-worker.js - classic Web Worker. Owns the sherpa-onnx WASM runtime and the recognizer.
 *
 * Runtime: sherpa-onnx 2.0.1 browser build (pub.dev "sherpa_onnx_web" assets), single-threaded,
 * non-shared memory, so no SharedArrayBuffer / COOP / COEP is needed.
 *
 * Protocol (main -> worker):
 *   {type:'init', cfg}                     download + instantiate + create recognizer
 *   {type:'begin'}                         clear the utterance buffer
 *   {type:'audio', samples:Float32Array}   append 16 kHz mono float samples to the utterance
 *   {type:'partial', id, windowSec}        decode the last windowSec seconds of the utterance
 *   {type:'final', id}                     decode the whole utterance
 *   {type:'transcribe', id, samples}       decode an arbitrary 16 kHz buffer (utterance untouched)
 * (worker -> main): progress / ready / result / error
 */
'use strict'

let M = null // Emscripten module
let rec = null // OfflineRecognizer
let dead = false

const RATE = 16000
const MIN_SAMPLES = 0.3 * RATE // the Zipformer encoder needs a few frames; shorter input is padded
let utt = new Float32Array(RATE * 30)
let uttLen = 0

const post = (m, t) => self.postMessage(m, t || [])
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

/** fetch with byte-level progress; returns a Uint8Array of the whole body. */
async function fetchBytes(url, onBytes) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const reader = res.body.getReader()
  const chunks = []
  let n = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    n += value.length
    onBytes(n)
  }
  const out = new Uint8Array(n)
  let o = 0
  for (const c of chunks) { out.set(c, o); o += c.length }
  return out
}

/** Model file: Cache Storage first (keyed by pinned sha256), else network + sha256 check + store. */
async function loadModelFile(cfg, f, report) {
  const url = new URL(f.name, cfg.modelBase).href
  const key = `${url}${url.includes('?') ? '&' : '?'}webstt=${f.sha256 ? f.sha256.slice(0, 16) : f.size}`
  let cache = null
  if (cfg.cache && self.caches) { try { cache = await caches.open(cfg.cacheName) } catch { cache = null } }
  if (cache) {
    const hit = await cache.match(key)
    if (hit) {
      const buf = new Uint8Array(await hit.arrayBuffer())
      if (buf.length === f.size) { report(f.name, buf.length, true); return { bytes: buf, fromCache: true } }
    }
  }
  let bytes
  for (let attempt = 1; ; attempt++) { // HuggingFace's CDN occasionally cancels a stream mid-download
    try { bytes = await fetchBytes(url, (n) => report(f.name, n, false)); break } catch (e) { if (attempt >= 3) throw e; await new Promise((r) => setTimeout(r, 400 * attempt)) }
  }
  if (f.size && bytes.length !== f.size) throw new Error(`${f.name}: got ${bytes.length} bytes, expected ${f.size}`)
  if (cfg.verify && f.sha256) {
    const got = hex(await crypto.subtle.digest('SHA-256', bytes))
    if (got !== f.sha256) throw new Error(`${f.name}: sha256 mismatch (${got.slice(0, 12)}... vs ${f.sha256.slice(0, 12)}...)`)
  }
  if (cache) { try { await cache.put(key, new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } })) } catch { /* quota: fine */ } }
  return { bytes, fromCache: false }
}

/** Streaming compile straight from the network (lets the browser code-cache the module). */
function instantiateWasm(cfg) {
  return async (imports, receive) => {
    let inst
    try {
      inst = await WebAssembly.instantiateStreaming(fetch(cfg.wasmUrl, { credentials: 'omit' }), imports)
    } catch (e) {
      // wrong MIME type or no streaming support: fall back to ArrayBuffer instantiate
      const buf = await (await fetch(cfg.wasmUrl, { credentials: 'omit' })).arrayBuffer()
      inst = await WebAssembly.instantiate(buf, imports)
    }
    receive(inst.instance, inst.module)
  }
}

async function init(cfg) {
  const t0 = performance.now()
  const timings = {}
  const sizes = Object.fromEntries(cfg.files.map((f) => [f.name, 0]))
  let lastPost = 0
  const report = (file, loaded, cached) => {
    sizes[file] = loaded
    const now = performance.now()
    if (now - lastPost < 80 && !cached) return
    lastPost = now
    post({ type: 'progress', phase: 'download', file, loaded: Object.values(sizes).reduce((a, b) => a + b, 0), cached })
  }

  importScripts(cfg.glueUrl, cfg.asrUrl) // defines global SherpaOnnx (factory) + OfflineRecognizer

  // download all model files and compile the wasm in parallel
  const tNet = performance.now()
  const wasmReady = SherpaOnnx({
    instantiateWasm: instantiateWasm(cfg),
    print: () => {},
    printErr: (s) => { if (cfg.debug) console.log('[sherpa]', s) },
  })
  const loaded = await Promise.all(cfg.files.map((f) => loadModelFile(cfg, f, report)))
  timings.modelFetchMs = Math.round(performance.now() - tNet)
  M = await wasmReady
  timings.wasmReadyMs = Math.round(performance.now() - tNet)
  const fromCache = loaded.every((l) => l.fromCache)

  post({ type: 'progress', phase: 'init' })
  const t1 = performance.now()
  M.FS.mkdir('/m')
  const path = {}
  cfg.files.forEach((f, i) => {
    path[f.key] = '/m/' + f.name
    M.FS.writeFile(path[f.key], loaded[i].bytes, { canOwn: true })
  })
  loaded.length = 0

  const modelConfig = { tokens: path.tokens, numThreads: 1, provider: 'cpu', debug: 0 }
  if (cfg.kind === 'moonshine') modelConfig.moonshine = { encoder: path.encoder, mergedDecoder: path.mergedDecoder }
  else modelConfig.transducer = { encoder: path.encoder, decoder: path.decoder, joiner: path.joiner }
  const recCfg = {
    featConfig: { sampleRate: RATE, featureDim: 80 },
    modelConfig,
    decodingMethod: cfg.decoding || 'greedy_search',
    maxActivePaths: cfg.maxActivePaths || 4,
  }
  if (cfg.hotwords && cfg.hotwords.length && cfg.bpeVocabUrl) { // Spark's developer-word boost (needs beam search)
    const vocab = new Uint8Array(await (await fetch(cfg.bpeVocabUrl)).arrayBuffer())
    M.FS.writeFile('/m/bpe.vocab', vocab)
    M.FS.writeFile('/m/hotwords.txt', new TextEncoder().encode(cfg.hotwords.join('\n') + '\n'))
    modelConfig.modelingUnit = 'bpe'
    modelConfig.bpeVocab = '/m/bpe.vocab'
    recCfg.decodingMethod = 'modified_beam_search'
    recCfg.maxActivePaths = Math.max(recCfg.maxActivePaths, 8)
    recCfg.hotwordsFile = '/m/hotwords.txt'
    recCfg.hotwordsScore = cfg.hotwordsScore || 2
  }
  rec = new OfflineRecognizer(recCfg, M)
  timings.createRecognizerMs = Math.round(performance.now() - t1)
  // the model now lives inside onnxruntime; free the JS-side copies
  for (const p of Object.values(path)) { try { M.FS.unlink(p) } catch { /* ignore */ } }

  // warm-up decode (first real decode otherwise pays one-time allocations)
  const tw = performance.now()
  decode(new Float32Array(RATE))
  timings.warmupMs = Math.round(performance.now() - tw)
  timings.totalInitMs = Math.round(performance.now() - t0)
  post({ type: 'ready', timings, fromCache, heapBytes: M.HEAPU8.length, version: tryVersion() })
}

function tryVersion() {
  try { return M.UTF8ToString(M._SherpaOnnxGetVersionStr()) } catch { return '' }
}

function decode(samples) {
  if (dead) throw new Error('recognizer crashed earlier; reload the page')
  let s = samples
  if (s.length < MIN_SAMPLES) { s = new Float32Array(MIN_SAMPLES); s.set(samples) } // zero-pad very short clips
  const t0 = performance.now()
  let text = ''
  const stream = rec.createStream()
  try {
    stream.acceptWaveform(RATE, s)
    rec.decode(stream)
    text = (rec.getResult(stream).text || '').trim()
  } catch (e) {
    dead = true // an abort() inside wasm leaves the module unusable
    throw e
  } finally {
    if (!dead) stream.free()
  }
  return { text, ms: performance.now() - t0 }
}

function append(chunk) {
  if (uttLen + chunk.length > utt.length) {
    const bigger = new Float32Array(Math.max(utt.length * 2, uttLen + chunk.length))
    bigger.set(utt.subarray(0, uttLen))
    utt = bigger
  }
  utt.set(chunk, uttLen)
  uttLen += chunk.length
}

self.onmessage = async (e) => {
  const m = e.data
  try {
    switch (m.type) {
      case 'init': await init(m.cfg); break
      case 'stats': post({ type: 'result', id: m.id, heapBytes: M.HEAPU8.length }); break
      case 'begin': uttLen = 0; break
      case 'audio': append(m.samples); break
      case 'partial': {
        const from = Math.max(0, uttLen - Math.round(m.windowSec * RATE))
        const r = decode(utt.subarray(from, uttLen))
        post({ type: 'result', id: m.id, text: r.text, ms: r.ms, audioSec: (uttLen - from) / RATE })
        break
      }
      case 'final': {
        const r = decode(utt.subarray(0, uttLen))
        post({ type: 'result', id: m.id, text: r.text, ms: r.ms, audioSec: uttLen / RATE })
        break
      }
      case 'transcribe': {
        const r = decode(m.samples)
        post({ type: 'result', id: m.id, text: r.text, ms: r.ms, audioSec: m.samples.length / RATE })
        break
      }
    }
  } catch (err) {
    post({ type: 'error', id: m.id, message: String((err && err.message) || err), fatal: dead || m.type === 'init' })
  }
}
