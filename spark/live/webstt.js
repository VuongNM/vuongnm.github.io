/* webstt.js - on-device Vietnamese speech-to-text in the browser (ES module).
 *
 *   import { createStt } from './webstt.js'
 *   const stt = await createStt({ baseUrl, onProgress })   // downloads ~34 MB once, then cached
 *   stt.onPartial = (text) => ...                           // live transcript while the button is held
 *   await stt.start()                                       // call from a user gesture (pointerdown)
 *   const final = await stt.stop()                          // call on pointerup
 *
 * Same model as the Spark desktop app (Zipformer-vi-30M, int8, offline transducer) run through the
 * official sherpa-onnx WebAssembly build inside a Web Worker. Nothing leaves the browser.
 */

const HF = 'https://huggingface.co/csukuangfj2/sherpa-onnx-zipformer-vi-30M-int8-2026-02-09/resolve/main/'

export const VI_MODEL = {
  kind: 'transducer',
  baseUrl: HF,
  files: [
    { key: 'encoder', name: 'encoder.int8.onnx', size: 27699063, sha256: '8ef5286dd427eb108055c2ddc1982aa31e544706072d5ea228729292dacade68' },
    { key: 'decoder', name: 'decoder.onnx', size: 5165084, sha256: 'cf2aa385b82c9d5d40cd29c3188af52d0249b3b78f0d4b7eb84ad502d50c7e7f' },
    { key: 'joiner', name: 'joiner.int8.onnx', size: 1033417, sha256: '7311d2e17b810ecea515d79c71cc4668af8759256a06fa01d27047772320c821' },
    { key: 'tokens', name: 'tokens.txt', size: 23238, sha256: 'ca8171f8bbd516c050b627582f2125c8f5f1f6ed967ab41b0fa9aae2cf61b492' },
  ],
}

const RATE = 16000

/** Sentence-case the model's ALL-CAPS, unpunctuated output ("CHIỀU NAY ..." -> "Chiều nay ..."). */
export function basicClean(text) {
  const t = text.toLocaleLowerCase('vi').trim()
  return t ? t[0].toLocaleUpperCase('vi') + t.slice(1) : ''
}

/** Streaming windowed-sinc resampler (any input rate -> 16 kHz). Used only when the AudioContext could not run at 16 kHz. */
export class Resampler {
  constructor(inRate, outRate = RATE, halfTaps = 16) {
    this.step = inRate / outRate
    this.half = halfTaps
    this.cut = Math.min(1, outRate / inRate) * 0.94 // low-pass just under the new Nyquist
    this.buf = new Float32Array(0)
    this.pos = 0 // position (in input samples) of the next output sample, relative to buf[0]
  }
  process(input) {
    const b = new Float32Array(this.buf.length + input.length)
    b.set(this.buf); b.set(input, this.buf.length)
    const out = []
    const H = this.half
    let pos = this.pos
    while (pos + H < b.length) {
      const c = Math.floor(pos)
      let acc = 0
      for (let k = c - H + 1; k <= c + H; k++) {
        if (k < 0) continue
        const x = pos - k
        const a = Math.PI * x * this.cut
        const sinc = x === 0 ? this.cut : Math.sin(a) / (Math.PI * x)
        const win = 0.5 + 0.5 * Math.cos((Math.PI * x) / H) // Hann
        acc += b[k] * sinc * win
      }
      out.push(acc)
      pos += this.step
    }
    const keepFrom = Math.max(0, Math.floor(pos) - H)
    this.buf = b.slice(keepFrom)
    this.pos = pos - keepFrom
    return Float32Array.from(out)
  }
}

const WORKLET_SRC = `
class WebSttCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.n = 0
    this.buf = new Float32Array(Math.max(128, Math.round(sampleRate * 0.032)))
    this.port.onmessage = (e) => { if (e.data && e.data.flush) { this.flush(); this.port.postMessage({ flushed: true }) } }
  }
  flush() {
    if (!this.n) return
    const out = this.buf.slice(0, this.n)
    this.port.postMessage(out, [out.buffer])
    this.n = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i]
      if (this.n === this.buf.length) this.flush()
    }
    return true
  }
}
registerProcessor('webstt-capture', WebSttCapture)
`

/**
 * @param {object} o
 * @param {string}  [o.baseUrl]      folder that holds the model files (default: HuggingFace; self-host to avoid a third party)
 * @param {object}  [o.model]        override VI_MODEL (file list with sizes + sha256)
 * @param {string}  [o.runtimeUrl]   folder that holds vendor/sherpa-onnx-wasm-web.{js,wasm} + sherpa-onnx-asr.js (default: ./vendor/)
 * @param {string}  [o.workerUrl]    default: ./webstt-worker.js next to this file
 * @param {(p:{phase:string,pct:number,loaded:number,total:number,file?:string,cached?:boolean})=>void} [o.onProgress]
 * @param {'greedy_search'|'modified_beam_search'} [o.decoding]  Spark desktop uses modified_beam_search with 8 paths
 * @param {number}  [o.windowSec=12] audio re-decoded for the live transcript (same as Spark)
 * @param {number}  [o.intervalMs=300]
 * @param {number}  [o.maxUtteranceSec=30]
 * @param {number}  [o.micKeepAliveMs=10000] keep the mic open this long after release so the next press is instant
 * @param {number}  [o.preRollMs=200] audio from just before the press that is kept
 * @param {boolean} [o.forceNativeRate=false] test hook: do not ask for a 16 kHz AudioContext, resample ourselves
 */
export async function createStt(o = {}) {
  const model = o.model || VI_MODEL
  const modelBase = new URL(o.baseUrl || model.baseUrl, location.href).href.replace(/\/?$/, '/')
  const runtime = new URL(o.runtimeUrl || './vendor/', import.meta.url).href.replace(/\/?$/, '/')
  const windowSec = o.windowSec ?? 12
  const intervalMs = o.intervalMs ?? 300
  const maxUttSamples = Math.round((o.maxUtteranceSec ?? 30) * RATE)
  const keepAliveMs = o.micKeepAliveMs ?? 10000
  const preRoll = Math.round(((o.preRollMs ?? 200) / 1000) * RATE)
  const totalBytes = model.files.reduce((a, f) => a + f.size, 0)

  const worker = new Worker(o.workerUrl || new URL('./webstt-worker.js', import.meta.url))
  const pending = new Map()
  let seq = 0
  let ready
  let initInfo = null

  const stt = {
    onPartial: null, // (text) => void
    onLevel: null, // (rms 0..1) => void
    onState: null, // ('idle'|'starting'|'listening'|'finalizing'|'limit') => void
    state: 'idle',
    info: null, // {timings, heapBytes, fromCache, version}
    lastDecodeMs: 0,
    lastWindowSec: 0,
  }
  const setState = (s) => { stt.state = s; stt.onState?.(s) }

  const call = (msg, transfer) => new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    worker.postMessage({ ...msg, id }, transfer || [])
  })

  const initDone = new Promise((resolve, reject) => { ready = { resolve, reject } })
  worker.onmessage = (e) => {
    const m = e.data
    if (m.type === 'progress') {
      if (m.phase === 'download') o.onProgress?.({ phase: 'download', loaded: m.loaded, total: totalBytes, pct: Math.min(100, (100 * m.loaded) / totalBytes), file: m.file, cached: m.cached })
      else o.onProgress?.({ phase: m.phase, loaded: totalBytes, total: totalBytes, pct: 100 })
    } else if (m.type === 'ready') {
      initInfo = { timings: m.timings, heapBytes: m.heapBytes, fromCache: m.fromCache, version: m.version }
      ready.resolve()
    } else if (m.type === 'result') {
      pending.get(m.id)?.resolve(m); pending.delete(m.id)
    } else if (m.type === 'error') {
      if (m.id && pending.has(m.id)) { pending.get(m.id).reject(new Error(m.message)); pending.delete(m.id) } else ready.reject(new Error(m.message))
    }
  }
  worker.onerror = (e) => ready.reject(new Error(e.message || 'worker failed to start'))

  worker.postMessage({
    type: 'init',
    cfg: {
      glueUrl: runtime + 'sherpa-onnx-wasm-web.js',
      asrUrl: runtime + 'sherpa-onnx-asr.js',
      wasmUrl: runtime + 'sherpa-onnx-wasm-web.wasm',
      modelBase,
      files: model.files,
      kind: model.kind,
      decoding: o.decoding || 'greedy_search',
      maxActivePaths: o.maxActivePaths || 4,
      cache: o.cache !== false,
      cacheName: 'webstt-models-v1',
      verify: o.verify !== false,
      hotwords: o.hotwords || null, // e.g. ['COMMIT', 'DEPLOY'] in the capitals the model writes; needs bpeVocabUrl
      bpeVocabUrl: o.bpeVocabUrl ? new URL(o.bpeVocabUrl, location.href).href : null,
      hotwordsScore: o.hotwordsScore || 2,
      debug: !!o.debug,
    },
  })
  await initDone
  stt.info = initInfo

  /** Decode a finished buffer (Float32, any sample rate). Resolves {text, ms, audioSec}. */
  stt.transcribe = async (samples, sampleRate = RATE) => {
    const s = sampleRate === RATE ? samples : new Resampler(sampleRate).process(samples)
    const r = await call({ type: 'transcribe', samples: s })
    return { text: r.text, ms: r.ms, audioSec: r.audioSec }
  }

  // ---- microphone capture ------------------------------------------------------------------
  let ctx = null, mediaStream = null, srcNode = null, sink = null, capNode = null, spNode = null
  let resampler = null
  let micReady = null // Promise while opening, or resolved when open
  let recording = false
  let preBuf = new Float32Array(0)
  let sent = 0 // 16 kHz samples sent to the worker in this utterance
  let flushWaiter = null
  let keepTimer = null
  let loopTimer = null
  let busy = false
  let lastDecodedAt = 0
  let lastText = ''
  let startToken = 0
  let finalizing = null // Promise while stop() is still decoding the last utterance

  function onChunk(raw) {
    const chunk = resampler ? resampler.process(raw) : raw
    if (!chunk.length) return
    if (stt.onLevel) {
      let s = 0
      for (let i = 0; i < chunk.length; i++) s += chunk[i] * chunk[i]
      stt.onLevel(Math.sqrt(s / chunk.length))
    }
    if (!recording) { // idle but warm: keep only a short pre-roll
      const joined = new Float32Array(preBuf.length + chunk.length)
      joined.set(preBuf); joined.set(chunk, preBuf.length)
      preBuf = joined.length > preRoll ? joined.slice(joined.length - preRoll) : joined
      return
    }
    let c = chunk
    if (sent + c.length > maxUttSamples) {
      c = c.subarray(0, Math.max(0, maxUttSamples - sent))
      if (stt.state !== 'limit') setState('limit')
    }
    if (c.length) {
      const copy = c.slice() // chunk may alias a worklet buffer
      sent += copy.length
      worker.postMessage({ type: 'audio', samples: copy }, [copy.buffer])
    }
  }

  async function openMic() {
    // Create the context synchronously: Safari only allows it inside the user gesture.
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!ctx || ctx.state === 'closed') {
      try { ctx = o.forceNativeRate ? new Ctx() : new Ctx({ sampleRate: RATE, latencyHint: 'interactive' }) } catch { ctx = new Ctx() }
    }
    const resumed = ctx.resume()
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true } })
    await resumed
    resampler = ctx.sampleRate === RATE ? null : new Resampler(ctx.sampleRate)
    stt.captureRate = ctx.sampleRate // 16000 when the browser resamples for us
    srcNode = ctx.createMediaStreamSource(mediaStream)
    sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination)
    if (ctx.audioWorklet) {
      const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }))
      try { await ctx.audioWorklet.addModule(url) } finally { URL.revokeObjectURL(url) }
      capNode = new AudioWorkletNode(ctx, 'webstt-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] })
      capNode.port.onmessage = (e) => {
        if (e.data && e.data.flushed) { flushWaiter?.(); flushWaiter = null; return }
        onChunk(e.data)
      }
      srcNode.connect(capNode); capNode.connect(sink)
    } else { // ScriptProcessor fallback (very old Safari)
      spNode = ctx.createScriptProcessor(2048, 1, 1)
      spNode.onaudioprocess = (ev) => onChunk(ev.inputBuffer.getChannelData(0).slice())
      srcNode.connect(spNode); spNode.connect(sink)
    }
  }

  function closeMic() {
    clearTimeout(keepTimer); keepTimer = null
    try { capNode?.disconnect(); spNode?.disconnect(); srcNode?.disconnect(); sink?.disconnect() } catch { /* ignore */ }
    mediaStream?.getTracks().forEach((t) => t.stop())
    ctx?.close().catch(() => {})
    ctx = mediaStream = srcNode = sink = capNode = spNode = resampler = null
    micReady = null; preBuf = new Float32Array(0)
  }

  function tick() {
    if (busy || !recording || stt.state === 'finalizing') return
    if (sent < 0.3 * RATE || sent === lastDecodedAt) return
    busy = true; lastDecodedAt = sent
    call({ type: 'partial', windowSec }).then((r) => {
      stt.lastDecodeMs = r.ms; stt.lastWindowSec = r.audioSec
      if (recording && r.text !== lastText) { lastText = r.text; stt.onPartial?.(r.text) }
    }).catch(() => {}).finally(() => { busy = false })
  }

  /** Begin listening. Call from a user gesture. Resolves once the microphone is delivering audio. */
  stt.start = async () => {
    if (stt.state === 'listening' || stt.state === 'starting' || stt.state === 'limit') return
    if (finalizing) await finalizing // a quick second press must not clear the previous utterance
    const token = ++startToken
    setState('starting')
    clearTimeout(keepTimer); keepTimer = null
    try {
      if (!micReady) micReady = openMic().catch((e) => { micReady = null; closeMic(); throw e })
      await micReady
    } catch (e) { setState('idle'); throw e }
    if (token !== startToken) { keepTimer = setTimeout(closeMic, keepAliveMs); return } // released before the mic was ready
    worker.postMessage({ type: 'begin' })
    sent = 0; lastDecodedAt = 0; lastText = ''
    recording = true
    if (preBuf.length) { const p = preBuf.slice(); preBuf = new Float32Array(0); sent += p.length; worker.postMessage({ type: 'audio', samples: p }, [p.buffer]) }
    clearInterval(loopTimer); loopTimer = setInterval(tick, intervalMs)
    setState('listening')
  }

  /** Stop listening and return the final transcript of the whole utterance. */
  stt.stop = () => (finalizing = stopInner().finally(() => { finalizing = null }))
  async function stopInner() {
    startToken++ // cancels a start() that is still waiting for the mic
    if (!recording) { if (stt.state === 'starting') setState('idle'); return '' }
    setState('finalizing')
    clearInterval(loopTimer); loopTimer = null
    // flush what is left in the worklet buffer (<= 32 ms), then stop appending
    if (capNode) await new Promise((res) => { flushWaiter = res; capNode.port.postMessage({ flush: true }); setTimeout(res, 150) })
    recording = false
    let text = ''
    if (sent >= 0.1 * RATE) {
      const r = await call({ type: 'final' })
      stt.lastDecodeMs = r.ms; stt.lastWindowSec = r.audioSec
      text = r.text
    }
    lastText = ''
    setState('idle')
    keepTimer = setTimeout(closeMic, keepAliveMs)
    return text
  }

  /** Open the microphone ahead of the first press (call from a click, e.g. the "enable" button) so the first word is not clipped. */
  stt.warmMic = async () => {
    if (!micReady) micReady = openMic().catch((e) => { micReady = null; closeMic(); throw e })
    await micReady
    if (!recording) { clearTimeout(keepTimer); keepTimer = setTimeout(closeMic, keepAliveMs) }
  }
  /** Size of the WebAssembly heap in bytes (it only grows; starts at 512 MiB). */
  stt.heapBytes = async () => (await call({ type: 'stats' })).heapBytes
  stt.releaseMic = closeMic
  stt.dispose = () => { clearInterval(loopTimer); closeMic(); worker.terminate(); pending.clear() }
  return stt
}
