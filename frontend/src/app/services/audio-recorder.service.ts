import { Injectable, signal } from '@angular/core';

export interface RecordedAudioResult {
  blob: Blob;
  durationSeconds: number;
  transcript?: string;
}

function detectIsSafariOrWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
  const isSafariMac = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('android');
  return isIOS || isSafariMac;
}

@Injectable({
  providedIn: 'root'
})
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timerInterval: any = null;
  private recognition: any = null;

  readonly isRecording = signal<boolean>(false);
  readonly durationSeconds = signal<number>(0);
  readonly recordingError = signal<string | null>(null);
  readonly recognizedText = signal<string>('');
  readonly isSafari = signal<boolean>(detectIsSafariOrWebKit());

  /**
   * Check if audio recording is supported in the current browser.
   */
  isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      typeof (window as any).MediaRecorder !== 'undefined'
    );
  }

  /**
   * Request microphone permission and start recording.
   * On Chrome/Edge, also starts Persian Web Speech Recognition.
   * On Safari/iOS, avoids Web Speech collision and configures MediaRecorder reliably.
   */
  async startRecording(): Promise<void> {
    this.recordingError.set(null);
    this.audioChunks = [];
    this.durationSeconds.set(0);
    this.recognizedText.set('');

    if (!this.isSupported()) {
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        this.recordingError.set('سافاری ضبط صدا را فقط در آدرس‌های امن (HTTPS یا localhost) مجاز می‌داند.');
      } else {
        this.recordingError.set('مرورگر شما از قابلیت ضبط صدا پشتیبانی نمی‌کند.');
      }
      throw new Error('MediaRecorder or getUserMedia not supported');
    }

    try {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch {
        // Fallback for Safari / iOS where advanced audio constraints can throw OverconstrainedError
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Pick best supported MIME type (Safari prefers mp4/aac, Chrome prefers webm)
      let mimeType = '';
      if (typeof (window as any).MediaRecorder?.isTypeSupported === 'function') {
        const candidates = this.isSafari()
          ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
          : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];

        for (const cand of candidates) {
          if (MediaRecorder.isTypeSupported(cand)) {
            mimeType = cand;
            break;
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // In iOS Safari / WebKit, calling start(timeslice) can cause WebKit Bug 209702/215884
      // where ondataavailable doesn't fire or produces corrupted mp4 header atoms.
      // Calling start() without timeslice buffers properly and emits the complete Blob on stop().
      if (this.isSafari()) {
        this.mediaRecorder.start();
      } else {
        try {
          this.mediaRecorder.start(250);
        } catch {
          this.mediaRecorder.start();
        }
      }
      this.isRecording.set(true);

      // On Safari / iOS WebKit, Apple's SpeechRecognition does NOT support Persian (fa-IR)
      // and running it concurrently with getUserMedia causes audio session conflicts that kill the recording stream.
      // We therefore only use Web Speech on non-Safari browsers (Chrome, Edge), and rely on Whisper STT for Safari.
      if (!this.isSafari()) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          try {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'fa-IR';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            let fullTranscript = '';

            this.recognition.onresult = (event: any) => {
              let interim = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                  fullTranscript += event.results[i][0].transcript + ' ';
                } else {
                  interim += event.results[i][0].transcript;
                }
              }
              const current = (fullTranscript + interim).trim();
              this.recognizedText.set(current);
            };

            this.recognition.onerror = (e: any) => {
              console.info('Speech recognition note:', e?.error);
            };

            this.recognition.start();
          } catch (e) {
            console.info('Speech recognition start note:', e);
          }
        }
      }

      // Start elapsed timer
      this.timerInterval = setInterval(() => {
        this.durationSeconds.update((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recorder:', err);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        this.recordingError.set('دسترسی به میکروفون داده نشد. در سافاری روی دکمه aA (تنظیمات سایت) در نوار آدرس بزنید و دسترسی میکروفون را فعال کنید.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        this.recordingError.set('میکروفونی بر روی دستگاه شما پیدا نشد.');
      } else {
        this.recordingError.set('دسترسی به میکروفون با خطا مواجه شد. لطفاً مجوز را بررسی کنید.');
      }
      this.stopMediaTracks();
      this.isRecording.set(false);
      throw err;
    }
  }

  /**
   * Stop recording and return the accumulated audio Blob and transcript.
   */
  stopRecording(): Promise<RecordedAudioResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.stopMediaTracks();
        this.isRecording.set(false);
        if (this.timerInterval) clearInterval(this.timerInterval);
        reject(new Error('Recorder is not active'));
        return;
      }

      if (this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {}
      }

      const elapsed = this.durationSeconds();

      this.mediaRecorder.onstop = () => {
        let mimeType = this.mediaRecorder?.mimeType;
        if (!mimeType) {
          mimeType = this.isSafari() ? 'audio/mp4' : 'audio/webm';
        }
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.stopMediaTracks();
        this.isRecording.set(false);
        if (this.timerInterval) clearInterval(this.timerInterval);

        resolve({
          blob,
          durationSeconds: elapsed,
          transcript: this.recognizedText()
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.stopMediaTracks();
        this.isRecording.set(false);
        if (this.timerInterval) clearInterval(this.timerInterval);
        reject(err);
      }
    });
  }

  /**
   * Cancel the current recording and discard captured data.
   */
  cancelRecording(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.stopMediaTracks();
    this.isRecording.set(false);
    this.audioChunks = [];
    this.durationSeconds.set(0);
    this.recognizedText.set('');
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private stopMediaTracks(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Neural Speech-to-Text transcription using Whisper API (AvalAI / OpenAI).
   * High-accuracy fallback for Safari, iOS, and browsers where Web Speech API does not support Persian.
   */
  async transcribeAudioWithWhisper(audioBlob: Blob): Promise<string> {
    const apiKey = localStorage.getItem('tasky_tts_api_key') || 'aa-ygex0aCfxrdMnkLIH1iLDFeAq2jbL5jHcCsR4Xh09klM2Gi3';
    
    let ext = this.isSafari() ? 'mp4' : 'webm';
    const type = (audioBlob.type || '').toLowerCase();
    if (type.includes('mp4')) ext = 'mp4';
    else if (type.includes('m4a') || type.includes('aac')) ext = 'm4a';
    else if (type.includes('wav')) ext = 'wav';
    else if (type.includes('ogg')) ext = 'ogg';
    else if (type.includes('webm')) ext = 'webm';

    // Ensure blob has a valid type
    const safeType = audioBlob.type || (ext === 'mp4' ? 'audio/mp4' : ext === 'm4a' ? 'audio/aac' : 'audio/webm');
    const finalBlob = audioBlob.type ? audioBlob : new Blob([audioBlob], { type: safeType });

    const formData = new FormData();
    formData.append('file', finalBlob, `voice.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'fa');

    const res = await fetch('https://api.avalai.ir/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Whisper transcription error status: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return (data.text || '').trim();
  }
}
