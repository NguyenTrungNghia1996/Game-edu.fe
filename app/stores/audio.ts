import { defineStore } from 'pinia'
import { gameEventBus } from '~/game/eventBus'
import { appStorage, STORAGE_KEYS } from '~/services/storage'

interface PersistedAudioSettings {
  muted: boolean
  bgmVolume: number
  voiceVolume: number
  sfxVolume: number
  voiceRate: number
  selectedVoiceURI: string
}

export interface VietnameseVoiceOption {
  voiceURI: string
  name: string
  lang: string
}

let sharedAudioCtx: AudioContext | null = null
let activeBgmAudio: HTMLAudioElement | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let speakTimer: ReturnType<typeof setTimeout> | null = null
let voicesListenerBound = false
const failedBgmUrls = new Set<string>()

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!sharedAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
  }
  return sharedAudioCtx
}

function isVietnameseVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = (voice.lang || '').toLowerCase().replace('_', '-')
  const name = (voice.name || '').toLowerCase()
  return (
    lang === 'vi' ||
    lang.startsWith('vi-') ||
    name.includes('vietnam') ||
    name.includes('tiếng việt') ||
    name.includes('hoaimy') ||
    name.includes('namminh')
  )
}

function scoreVietnameseVoice(voice: SpeechSynthesisVoice): number {
  const name = (voice.name || '').toLowerCase()
  const lang = (voice.lang || '').toLowerCase().replace('_', '-')
  let score = 0
  if (lang === 'vi-vn') score += 40
  else if (lang.startsWith('vi')) score += 25

  // Ưu tiên các giọng tiếng Việt tự nhiên (Google, Microsoft Neural, Apple Linh)
  if (name.includes('google')) score += 35
  if (name.includes('natural') || name.includes('neural')) score += 30
  if (name.includes('hoaimy') || name.includes('linh') || name.includes('an')) score += 20
  if (name.includes('microsoft')) score += 15
  if (!voice.localService) score += 5
  return score
}

/**
 * Chuẩn hóa câu tiếng Việt để bộ đọc TTS phát âm tự nhiên cho trẻ nhỏ.
 */
function normalizeVietnameseSpeechText(raw: string): string {
  return raw
    .replace(/\.\.\./g, ' chỗ trống ')
    .replace(/\s+\+\s+/g, ' cộng ')
    .replace(/\s+-\s+/g, ' trừ ')
    .replace(/\s+[x×]\s+/gi, ' nhân ')
    .replace(/\s+:\s+/g, ' chia ')
    .replace(/\s+=\s+/g, ' bằng ')
    .replace(/\s*\/\s*/g, ' hay ')
    .replace(/['"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSortedVietnameseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis
    .getVoices()
    .filter(isVietnameseVoice)
    .sort((a, b) => scoreVietnameseVoice(b) - scoreVietnameseVoice(a))
}

export const useAudioStore = defineStore('audio', {
  state: () => ({
    unlocked: false,
    muted: false,
    bgmVolume: 0.45,
    voiceVolume: 1,
    sfxVolume: 0.8,
    voiceRate: 0.9,
    selectedVoiceURI: '' as string,
    availableVietnameseVoices: [] as VietnameseVoiceOption[],
    currentBgmUrl: '' as string,
    isSpeaking: false,
  }),

  actions: {
    initVoices(): void {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      const syncVoices = () => {
        const viVoices = getSortedVietnameseVoices()
        this.availableVietnameseVoices = viVoices.map((v) => ({
          voiceURI: v.voiceURI,
          name: v.name,
          lang: v.lang,
        }))

        if (
          viVoices.length > 0 &&
          (!this.selectedVoiceURI || !viVoices.some((v) => v.voiceURI === this.selectedVoiceURI))
        ) {
          this.selectedVoiceURI = viVoices[0]!.voiceURI
        }
      }

      syncVoices()

      if (!voicesListenerBound) {
        voicesListenerBound = true
        window.speechSynthesis.addEventListener('voiceschanged', syncVoices)
      }
    },

    async hydrate(): Promise<void> {
      this.initVoices()
      const raw = await appStorage.get(STORAGE_KEYS.AUDIO_SETTINGS)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as Partial<PersistedAudioSettings>
        if (typeof parsed.muted === 'boolean') this.muted = parsed.muted
        if (typeof parsed.bgmVolume === 'number') this.bgmVolume = parsed.bgmVolume
        if (typeof parsed.voiceVolume === 'number') this.voiceVolume = parsed.voiceVolume
        if (typeof parsed.sfxVolume === 'number') this.sfxVolume = parsed.sfxVolume
        if (typeof parsed.voiceRate === 'number') this.voiceRate = parsed.voiceRate
        if (typeof parsed.selectedVoiceURI === 'string' && parsed.selectedVoiceURI) {
          this.selectedVoiceURI = parsed.selectedVoiceURI
        }
      } catch {
        // Ignore malformed cache
      }
      this.initVoices()
    },

    async persist(): Promise<void> {
      const payload: PersistedAudioSettings = {
        muted: this.muted,
        bgmVolume: this.bgmVolume,
        voiceVolume: this.voiceVolume,
        sfxVolume: this.sfxVolume,
        voiceRate: this.voiceRate,
        selectedVoiceURI: this.selectedVoiceURI,
      }
      await appStorage.set(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(payload))
    },

    async unlockAudio(): Promise<void> {
      this.initVoices()
      const ctx = getOrCreateAudioContext()
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {
          // Browser may still restrict if not triggered from user gesture
        }
      }

      // Đánh thức SpeechSynthesis trên iOS Safari / WebView trong tương tác chạm đầu tiên
      if (!this.unlocked && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const silent = new SpeechSynthesisUtterance('')
          silent.lang = 'vi-VN'
          silent.volume = 0
          window.speechSynthesis.speak(silent)
        } catch {
          // Ignore
        }
      }

      this.unlocked = true
    },

    async toggleMute(): Promise<void> {
      this.muted = !this.muted
      if (activeBgmAudio) {
        activeBgmAudio.muted = this.muted
      }
      if (this.muted) {
        this.stopVoice()
      }
      gameEventBus.emit('audio:toggle-mute', { muted: this.muted })
      await this.persist()
    },

    async setBgmVolume(vol: number): Promise<void> {
      this.bgmVolume = Math.max(0, Math.min(1, vol))
      if (activeBgmAudio) {
        activeBgmAudio.volume = this.bgmVolume
      }
      await this.persist()
    },

    async setVoiceVolume(vol: number): Promise<void> {
      this.voiceVolume = Math.max(0, Math.min(1, vol))
      await this.persist()
    },

    async setVoiceRate(rate: number): Promise<void> {
      this.voiceRate = Math.max(0.65, Math.min(1.25, rate))
      await this.persist()
    },

    async setSelectedVoiceURI(voiceURI: string): Promise<void> {
      this.selectedVoiceURI = voiceURI
      await this.persist()
    },

    async setSfxVolume(vol: number): Promise<void> {
      this.sfxVolume = Math.max(0, Math.min(1, vol))
      await this.persist()
    },

    playBgm(url?: string): void {
      if (!url || typeof window === 'undefined' || failedBgmUrls.has(url)) return
      if (this.currentBgmUrl === url && activeBgmAudio && !activeBgmAudio.paused) return

      this.stopBgm()
      this.currentBgmUrl = url
      const audio = new Audio(url)
      audio.loop = true
      audio.volume = this.bgmVolume
      audio.muted = this.muted
      audio.onerror = () => {
        failedBgmUrls.add(url)
        if (activeBgmAudio === audio) {
          this.stopBgm()
        }
      }
      activeBgmAudio = audio
      audio.play().catch(() => {
        // Remote BGM may not exist yet or autoplay was blocked; fail silently
      })
    },

    stopBgm(): void {
      if (activeBgmAudio) {
        activeBgmAudio.pause()
        activeBgmAudio.src = ''
        activeBgmAudio = null
      }
      this.currentBgmUrl = ''
    },

    stopVoice(): void {
      if (speakTimer) {
        clearTimeout(speakTimer)
        speakTimer = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      activeUtterance = null
      this.isSpeaking = false
    },

    /**
     * Đọc văn bản bằng bộ đọc tiếng Việt (Web Speech API - vi-VN).
     */
    async speakVietnamese(rawText: string): Promise<void> {
      if (this.muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return

      const text = normalizeVietnameseSpeechText(rawText)
      if (!text) return

      await this.unlockAudio()
      this.initVoices()
      this.stopVoice()

      // Đợi danh sách giọng đọc tải xong nếu trình duyệt khởi tạo bất đồng bộ
      let viVoices = getSortedVietnameseVoices()
      if (viVoices.length === 0 && window.speechSynthesis.getVoices().length === 0) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 250)
          window.speechSynthesis.addEventListener(
            'voiceschanged',
            () => {
              clearTimeout(timeout)
              resolve()
            },
            { once: true },
          )
        })
        this.initVoices()
        viVoices = getSortedVietnameseVoices()
      }

      const chosenVoice =
        viVoices.find((v) => v.voiceURI === this.selectedVoiceURI) ?? viVoices[0] ?? null

      await new Promise<void>((resolve) => {
        // Trì hoãn nhẹ 35ms sau cancel() để tránh lỗi Chrome nuốt câu đọc mới
        speakTimer = setTimeout(() => {
          speakTimer = null
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = chosenVoice?.lang || 'vi-VN'
          if (chosenVoice) {
            utterance.voice = chosenVoice
          }
          utterance.rate = this.voiceRate
          utterance.pitch = 1.05
          utterance.volume = this.voiceVolume

          activeUtterance = utterance
          this.isSpeaking = true

          const finish = () => {
            if (activeUtterance === utterance) {
              activeUtterance = null
              this.isSpeaking = false
            }
            resolve()
          }

          utterance.onend = finish
          utterance.onerror = finish

          try {
            window.speechSynthesis.resume()
            window.speechSynthesis.speak(utterance)
          } catch {
            finish()
          }
        }, 35)
      })
    },

    /**
     * Phát giọng đọc đề bài / đáp án / gợi ý bằng bộ đọc tiếng Việt.
     */
    async playVoice(_audioUrl?: string, text?: string): Promise<void> {
      if (!text) return
      await this.speakVietnamese(text)
    },

    playSfx(kind: 'click' | 'correct' | 'wrong' | 'hammer' | 'reward'): void {
      if (this.muted) return
      const ctx = getOrCreateAudioContext()
      if (!ctx) return
      if (ctx.state === 'suspended') {
        void ctx.resume()
      }

      const now = ctx.currentTime
      const gainLevel = Math.max(0.05, this.sfxVolume * 0.22)

      const playTone = (
        freq: number,
        startOffset: number,
        duration: number,
        type: OscillatorType = 'sine',
        volume = gainLevel,
      ) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = type
        osc.frequency.setValueAtTime(freq, now + startOffset)
        gain.gain.setValueAtTime(0.0001, now + startOffset)
        gain.gain.exponentialRampToValueAtTime(volume, now + startOffset + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + startOffset)
        osc.stop(now + startOffset + duration + 0.02)
      }

      switch (kind) {
        case 'click':
          playTone(540, 0, 0.08, 'triangle', gainLevel * 0.7)
          break
        case 'correct':
          playTone(523.25, 0, 0.14, 'triangle')
          playTone(659.25, 0.11, 0.14, 'triangle')
          playTone(783.99, 0.22, 0.22, 'triangle')
          playTone(1046.5, 0.34, 0.32, 'sine')
          break
        case 'wrong':
          playTone(320, 0, 0.14, 'sine', gainLevel * 0.75)
          playTone(260, 0.13, 0.2, 'sine', gainLevel * 0.75)
          break
        case 'hammer':
          playTone(180, 0, 0.1, 'square', gainLevel * 0.6)
          playTone(220, 0.18, 0.1, 'square', gainLevel * 0.6)
          playTone(280, 0.36, 0.14, 'triangle', gainLevel * 0.8)
          break
        case 'reward':
          playTone(587.33, 0, 0.12, 'triangle')
          playTone(783.99, 0.1, 0.12, 'triangle')
          playTone(987.77, 0.2, 0.16, 'triangle')
          playTone(1174.66, 0.34, 0.42, 'sine')
          break
      }
    },
  },
})
