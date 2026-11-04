import { Injectable, signal } from '@angular/core';

const STORAGE_MUTED_KEY = 'tasky_tts_muted';
const STORAGE_TTS_KEY = 'tasky_tts_api_key';
const STORAGE_LOCAL_ONLY_KEY = 'tasky_tts_local_only';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  readonly isMuted = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly isSupported = signal<boolean>(true);
  readonly isLocalOnly = signal<boolean>(false);

  private availableVoices: SpeechSynthesisVoice[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;

  // Primary High-Quality Persian Neural Model (AvalAI OpenAI tts-1 with nova voice)
  private readonly defaultApiKey = 'aa-ygex0aCfxrdMnkLIH1iLDFeAq2jbL5jHcCsR4Xh09klM2Gi3';
  private readonly ttsApiUrl = 'https://api.avalai.ir/v1/audio/speech';
  private readonly ttsModel = 'tts-1';
  private readonly ttsVoice = 'nova';

  constructor() {
    this.initTts();
  }

  private initTts(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_MUTED_KEY);
        this.isMuted.set(stored === 'true');
        const localOnlyStored = localStorage.getItem(STORAGE_LOCAL_ONLY_KEY);
        this.isLocalOnly.set(localOnlyStored === 'true');
      } catch {
        this.isMuted.set(false);
        this.isLocalOnly.set(false);
      }

      if ('speechSynthesis' in window) {
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  setLocalOnly(enabled: boolean): void {
    this.isLocalOnly.set(enabled);
    try {
      localStorage.setItem(STORAGE_LOCAL_ONLY_KEY, String(enabled));
    } catch {}
  }

  private loadVoices(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
  }

  toggleMute(): boolean {
    const next = !this.isMuted();
    this.isMuted.set(next);
    try {
      localStorage.setItem(STORAGE_MUTED_KEY, String(next));
    } catch {}

    if (next) {
      this.stop();
    }
    return next;
  }

  /**
   * Speak the avatar's voice reply out loud using high-quality Persian TTS audio.
   * Uses OpenAI / AvalAI tts-1 Neural Persian Model ('nova' voice) as the primary engine.
   */
  async speak(text: string): Promise<void> {
    if (this.isMuted() || !text || !text.trim()) {
      return;
    }

    // Clean text: strip emojis, markdown symbols, and extra spacing
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*#_`~]/g, '')
      .trim();

    if (!cleanText) return;

    this.stop();

    // If user opts for strict local privacy, bypass external neural TTS completely
    if (this.isLocalOnly()) {
      this.fallbackBrowserSpeech(cleanText);
      return;
    }

    try {
      const apiKey = localStorage.getItem(STORAGE_TTS_KEY) || this.defaultApiKey;

      // 1. Fetch High-Quality Persian Neural Speech from AvalAI
      const response = await fetch(this.ttsApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.ttsModel,
          voice: this.ttsVoice,
          input: cleanText.slice(0, 600)
        })
      });

      if (!response.ok) {
        throw new Error(`TTS server responded with status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentBlobUrl = audioUrl;

      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isSpeaking.set(true);
      };

      audio.onended = () => {
        this.isSpeaking.set(false);
        this.cleanupAudio();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        this.isSpeaking.set(false);
        this.cleanupAudio();
        this.fallbackBrowserSpeech(cleanText);
      };

      await audio.play();
    } catch (err) {
      console.warn('Neural Persian TTS request failed, checking browser speech fallback:', err);
      this.isSpeaking.set(false);
      this.cleanupAudio();
      this.fallbackBrowserSpeech(cleanText);
    }
  }

  private fallbackBrowserSpeech(cleanText: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || this.isMuted()) {
      this.isSpeaking.set(false);
      return;
    }

    try {
      if (this.availableVoices.length === 0) {
        this.loadVoices();
      }

      // ONLY use browser SpeechSynthesis if a genuine Persian/Farsi voice exists
      // Do NOT read Persian using English voices (which sounds like gibberish)
      const persianVoice = this.availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('fa') ||
          v.lang.toLowerCase().includes('ir') ||
          v.name.toLowerCase().includes('persian') ||
          v.name.toLowerCase().includes('farsi')
      );

      if (!persianVoice) {
        console.info('No native Persian voice found in browser SpeechSynthesis. Skipping English fallback.');
        this.isSpeaking.set(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.voice = persianVoice;
      utterance.lang = persianVoice.lang;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      utterance.onstart = () => {
        this.isSpeaking.set(true);
      };

      utterance.onend = () => {
        this.isSpeaking.set(false);
      };

      utterance.onerror = () => {
        this.isSpeaking.set(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking.set(false);
    }
  }

  private cleanupAudio(): void {
    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch {}
      this.currentBlobUrl = null;
    }
    this.currentAudio = null;
  }

  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.cleanupAudio();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.isSpeaking.set(false);
  }
}
