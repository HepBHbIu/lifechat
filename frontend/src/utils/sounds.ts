// Sound effects for chat
const sounds: Record<string, AudioBuffer | null> = {};
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function generateTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3): AudioBuffer {
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * frequency * t) * volume * Math.exp(-t * 3);
  }
  return buffer;
}

function generatePop(): AudioBuffer {
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = (Math.sin(2 * Math.PI * 800 * t * (1 - t * 5)) * 0.4) * Math.exp(-t * 25);
  }
  return buffer;
}

function generateWhoosh(): AudioBuffer {
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.3);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const freq = 200 + t * 1000;
    data[i] = (Math.sin(2 * Math.PI * freq * t) * 0.15 + (Math.random() * 2 - 1) * 0.05) * Math.exp(-t * 8);
  }
  return buffer;
}

function generateMessageIn(): AudioBuffer {
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const f1 = 600 * Math.exp(-t * 8);
    const f2 = 900 * Math.exp(-t * 10);
    data[i] = (Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t) * 0.5) * 0.25 * Math.exp(-t * 6);
  }
  return buffer;
}

function generateMessageOut(): AudioBuffer {
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.15);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * (500 + t * 400) * t) * 0.3 * Math.exp(-t * 15);
  }
  return buffer;
}

function playBuffer(buffer: AudioBuffer) {
  try {
    const ctx = getCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch {}
}

export const SoundEffects = {
  messageIn: () => {
    if (!sounds.messageIn) sounds.messageIn = generateMessageIn();
    playBuffer(sounds.messageIn);
  },
  messageOut: () => {
    if (!sounds.messageOut) sounds.messageOut = generateMessageOut();
    playBuffer(sounds.messageOut);
  },
  pop: () => {
    if (!sounds.pop) sounds.pop = generatePop();
    playBuffer(sounds.pop);
  },
  whoosh: () => {
    if (!sounds.whoosh) sounds.whoosh = generateWhoosh();
    playBuffer(sounds.whoosh);
  },
  reaction: () => {
    if (!sounds.reaction) sounds.reaction = generateTone(1200, 0.1, 'sine', 0.2);
    playBuffer(sounds.reaction);
  },
  error: () => {
    if (!sounds.error) sounds.error = generateTone(200, 0.3, 'square', 0.15);
    playBuffer(sounds.error);
  },
  typing: () => {
    if (!sounds.typing) {
      const ctx = getCtx();
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * 0.04);
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.05 * Math.exp(-i / length * 5);
      }
      sounds.typing = buffer;
    }
    playBuffer(sounds.typing);
  },
};
