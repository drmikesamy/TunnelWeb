/**
 * Call media: camera/mic capture, WebCodecs encode/decode, audio playback and
 * speaking detection. The wire format is the same as p2p-tunnel's call.html:
 *
 *   [0 key | 1 delta][f64 timestamp][VP8]   video
 *   [2][u32 sampleRate][int16 PCM]          audio
 *   [3]                                     keyframe request
 *
 * The engine doesn't know about the network. The backend plugs in `setTransport`
 * (outgoing frames) and calls `receive(peerId, bytes)` (incoming frames).
 */

const W = 480;
const H = 360;
const FPS = 24;
const SPEAKING_RMS = 0.02;

type Send = (bytes: Uint8Array<ArrayBuffer>) => void;

interface Peer {
  decoder?: VideoDecoder;
  needKey: boolean;
  canvas?: HTMLCanvasElement;
  lastFrameAt: number;
  playAt: number;
}

class MediaEngine {
  /** Your own camera stream, for the local preview tile. */
  localStream = $state<MediaStream | null>(null);
  /** Peers whose video is currently arriving. */
  remoteVideo = $state<Record<string, boolean>>({});
  /** Set when the browser blocks camera/mic access. */
  error = $state<string | null>(null);

  onSpeaking: ((speaking: boolean) => void) | null = null;

  #send: Send | null = null;
  #audioStream: MediaStream | null = null;
  #ac: AudioContext | null = null;
  #processor: ScriptProcessorNode | null = null;
  #encoder: VideoEncoder | null = null;
  #videoEl: HTMLVideoElement | null = null;
  #videoTimer: ReturnType<typeof setInterval> | null = null;
  #watchdog: ReturnType<typeof setInterval> | null = null;
  #forceKey = true;
  #frameNo = 0;
  #muted = false;
  #speaking = false;
  #lastLoud = 0;
  #peers = new Map<string, Peer>();
  #running = false;

  get supported() {
    return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
  }

  setTransport(send: Send | null) {
    this.#send = send;
  }

  /** Start capturing the mic, plus the camera for video calls. */
  async start(opts: { audio: boolean; video: boolean }) {
    if (this.#running) return;
    this.#running = true;
    this.error = null;
    this.#ac = new AudioContext();
    await this.#ac.resume().catch(() => {});
    if (opts.audio) await this.#startAudio();
    if (opts.video) await this.setCamera(true);
    this.#watchdog = setInterval(() => this.#checkVideo(), 1000);
  }

  stop() {
    this.#running = false;
    this.setCamera(false);
    this.#processor?.disconnect();
    this.#processor = null;
    this.#audioStream?.getTracks().forEach((t) => t.stop());
    this.#audioStream = null;
    this.#ac?.close().catch(() => {});
    this.#ac = null;
    if (this.#watchdog) clearInterval(this.#watchdog);
    for (const peer of this.#peers.values()) if (peer.decoder?.state !== 'closed') peer.decoder?.close();
    this.#peers.clear();
    this.remoteVideo = {};
    this.#setSpeaking(false);
  }

  setMuted(muted: boolean) {
    this.#muted = muted;
    if (muted) this.#setSpeaking(false);
  }

  async setCamera(on: boolean): Promise<void> {
    if (!on) {
      if (this.#videoTimer) clearInterval(this.#videoTimer);
      this.#videoTimer = null;
      if (this.#encoder?.state !== 'closed') this.#encoder?.close();
      this.#encoder = null;
      this.localStream?.getTracks().forEach((t) => t.stop());
      this.localStream = null;
      return;
    }
    if (this.localStream || !navigator.mediaDevices?.getUserMedia) return;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: { width: W, height: H } });
    } catch (e) {
      this.error = `Camera unavailable: ${(e as Error).message}`;
      return;
    }
    if (!this.#running) return this.setCamera(false); // stopped while waiting for permission
    if (this.#send && this.supported) this.#startVideoEncoder();
  }

  /** Ask everyone for a keyframe and send one ourselves (someone new joined). */
  refresh() {
    this.#forceKey = true;
    this.#send?.(new Uint8Array([3]));
  }

  attachCanvas(peerId: string, canvas: HTMLCanvasElement) {
    this.#peer(peerId).canvas = canvas;
    return () => {
      const p = this.#peers.get(peerId);
      if (p?.canvas === canvas) p.canvas = undefined;
    };
  }

  receive(peerId: string, b: Uint8Array) {
    if (!this.#running) return;
    const type = b[0];
    if (type === 3) {
      this.#forceKey = true;
      return;
    }
    const peer = this.#peer(peerId);
    const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (type === 2) return this.#playPcm(peer, view.getUint32(1), b.subarray(5));
    if (type > 1 || !this.supported) return;
    if (peer.needKey && type !== 0) return;
    peer.needKey = false;
    peer.decoder ??= this.#makeDecoder(peerId, peer);
    peer.decoder.decode(new EncodedVideoChunk({ type: type ? 'delta' : 'key', timestamp: view.getFloat64(1), data: b.subarray(9) }));
  }

  // ---- internals -----------------------------------------------------------

  #peer(id: string): Peer {
    let p = this.#peers.get(id);
    if (!p) {
      p = { needKey: true, lastFrameAt: 0, playAt: 0 };
      this.#peers.set(id, p);
      this.#send?.(new Uint8Array([3])); // new peer: ask for a keyframe
    }
    return p;
  }

  #makeDecoder(peerId: string, peer: Peer) {
    const decoder = new VideoDecoder({
      output: (frame) => {
        const ctx = peer.canvas?.getContext('2d');
        if (ctx && peer.canvas) {
          peer.canvas.width = frame.displayWidth;
          peer.canvas.height = frame.displayHeight;
          ctx.drawImage(frame, 0, 0);
        }
        frame.close();
        peer.lastFrameAt = performance.now();
        if (!this.remoteVideo[peerId]) this.remoteVideo[peerId] = true;
      },
      error: () => {
        peer.decoder = undefined;
        peer.needKey = true;
        this.#send?.(new Uint8Array([3]));
      },
    });
    decoder.configure({ codec: 'vp8' });
    return decoder;
  }

  #checkVideo() {
    const now = performance.now();
    for (const [id, p] of this.#peers) {
      if (this.remoteVideo[id] && now - p.lastFrameAt > 1500) this.remoteVideo[id] = false;
    }
  }

  async #startAudio() {
    try {
      this.#audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      this.error = `Microphone unavailable: ${(e as Error).message}`;
      return;
    }
    const ac = this.#ac!;
    const src = ac.createMediaStreamSource(this.#audioStream);
    const proc = ac.createScriptProcessor(2048, 1, 1);
    proc.onaudioprocess = (e) => {
      if (this.#muted) return;
      const d = e.inputBuffer.getChannelData(0);
      let sum = 0;
      const b = new Uint8Array(5 + d.length * 2);
      const v = new DataView(b.buffer);
      b[0] = 2;
      v.setUint32(1, ac.sampleRate);
      for (let i = 0; i < d.length; i++) {
        const s = Math.max(-1, Math.min(1, d[i]));
        sum += s * s;
        v.setInt16(5 + i * 2, s * 32767, true);
      }
      this.#send?.(b);
      this.#detectSpeaking(Math.sqrt(sum / d.length));
    };
    src.connect(proc);
    proc.connect(ac.destination); // output stays silent; needed to keep the node running
    this.#processor = proc;
  }

  #detectSpeaking(rms: number) {
    const now = performance.now();
    if (rms > SPEAKING_RMS) this.#lastLoud = now;
    this.#setSpeaking(now - this.#lastLoud < 400);
  }

  #setSpeaking(speaking: boolean) {
    if (speaking === this.#speaking) return;
    this.#speaking = speaking;
    this.onSpeaking?.(speaking);
  }

  #startVideoEncoder() {
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const b = new Uint8Array(9 + chunk.byteLength);
        b[0] = chunk.type === 'key' ? 0 : 1;
        new DataView(b.buffer).setFloat64(1, chunk.timestamp);
        chunk.copyTo(b.subarray(9));
        this.#send?.(b);
      },
      error: (e) => console.error('VideoEncoder', e),
    });
    encoder.configure({ codec: 'vp8', width: W, height: H, bitrate: 600_000, framerate: FPS });
    this.#encoder = encoder;

    const video = (this.#videoEl ??= Object.assign(document.createElement('video'), { muted: true, playsInline: true }));
    video.srcObject = this.localStream;
    video.play().catch(() => {});
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext('2d')!;
    this.#forceKey = true;
    this.#videoTimer = setInterval(() => {
      if (video.readyState < 2 || encoder.state !== 'configured' || encoder.encodeQueueSize > 2) return;
      ctx.drawImage(video, 0, 0, W, H);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(performance.now() * 1000) });
      encoder.encode(frame, { keyFrame: this.#forceKey || this.#frameNo++ % (FPS * 2) === 0 });
      this.#forceKey = false;
      frame.close();
    }, 1000 / FPS);
  }

  #playPcm(peer: Peer, rate: number, bytes: Uint8Array) {
    const ac = this.#ac;
    if (!ac) return;
    const n = bytes.byteLength / 2;
    const buf = ac.createBuffer(1, n, rate);
    const ch = buf.getChannelData(0);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < n; i++) ch[i] = v.getInt16(i * 2, true) / 32768;
    const s = ac.createBufferSource();
    s.buffer = buf;
    s.connect(ac.destination);
    const now = ac.currentTime;
    if (peer.playAt < now || peer.playAt > now + 0.5) peer.playAt = now + 0.08; // small jitter buffer
    s.start(peer.playAt);
    peer.playAt += buf.duration;
  }
}

export const media = new MediaEngine();
