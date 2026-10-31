import { Injectable, signal } from '@angular/core';

const STORAGE_MUTED_KEY = 'tasky_tts_muted';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  readonly isMuted = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly isSupported = signal<boolean>(true);

  private availableVoices: SpeechSynthesisVoice[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private readonly ttsEndpoint = 'http://localhost:8000/api/tts/';

  constructor() {
    this.initTts();
  }

  private initTts(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_MUTED_KEY);
        // Default to unmuted (false)
        this.isMuted.set(stored === 'true');
      } catch {
        this.isMuted.set(false);
      }

      if ('speechSynthesis' in window) {
        this.loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
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
   * Priority:
   * 1. Backend Natural Persian TTS (AvalAI tts-1 / nova voice)
   * 2. Browser native SpeechSynthesis fallback
   */
  speak(text: string): void {
    if (this.isMuted() || !text || !text.trim()) {
      return;
    }

    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    if (!cleanText) return;

    this.stop();

    try {
      // 1. Try Backend High-Quality Persian Neural TTS
      const url = `${this.ttsEndpoint}?text=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isSpeaking.set(true);
      };

      audio.onended = () => {
        this.isSpeaking.set(false);
        this.currentAudio = null;
      };

      audio.onerror = (e) => {
        console.warn('Backend Persian TTS not available or offline, falling back to browser speech:', e);
        this.currentAudio = null;
        this.fallbackBrowserSpeech(cleanText);
      };

      audio.play().catch((err) => {
        console.warn('Audio play failed or autoplay blocked, falling back to browser speech:', err);
        this.currentAudio = null;
        this.fallbackBrowserSpeech(cleanText);
      });
    } catch (err) {
      console.warn('TTS streaming initialization error:', err);
      this.fallbackBrowserSpeech(cleanText);
    }
  }

  private fallbackBrowserSpeech(cleanText: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || this.isMuted()) {
      this.isSpeaking.set(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (this.availableVoices.length === 0) {
        this.loadVoices();
      }

      const persianVoice = this.availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('fa') ||
          v.lang.toLowerCase().includes('ir') ||
          v.name.toLowerCase().includes('persian') ||
          v.name.toLowerCase().includes('farsi')
      );

      if (persianVoice) {
        utterance.voice = persianVoice;
        utterance.lang = persianVoice.lang;
      } else {
        utterance.lang = 'fa-IR';
      }

      utterance.rate = 0.95;
      utterance.pitch = 1.1;

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

  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.isSpeaking.set(false);
  }
}
