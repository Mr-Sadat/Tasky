import { Injectable, signal } from '@angular/core';

export interface RecordedAudioResult {
  blob: Blob;
  durationSeconds: number;
  transcript?: string;
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
  readonly isSafari = signal<boolean>(
    typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  );

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
   * Also starts Persian Web Speech Recognition if supported.
   */
  async startRecording(): Promise<void> {
    this.recordingError.set(null);
    this.audioChunks = [];
    this.durationSeconds.set(0);
    this.recognizedText.set('');

    if (!this.isSupported()) {
      this.recordingError.set('ضبط صدا در مرورگر شما پشتیبانی نمی‌شود.');
      throw new Error('MediaRecorder not supported');
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
        // Fallback for Safari / iOS mobile where complex constraints can throw OverconstrainedError
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Pick best supported MIME type (Safari prefers mp4/aac, Chrome prefers webm)
      let mimeType = '';
      if (typeof (window as any).MediaRecorder?.isTypeSupported === 'function') {
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg'
        ];
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

      this.mediaRecorder.start(250);
      this.isRecording.set(true);

      // Start Web Speech Recognition if available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.lang = 'fa-IR';
          // Safari does NOT support continuous recognition and aborts
          this.recognition.continuous = !this.isSafari();
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

      // Start elapsed timer
      this.timerInterval = setInterval(() => {
        this.durationSeconds.update((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting audio recorder:', err);
      this.recordingError.set('دسترسی به میکروفون داده نشد یا خطایی رخ داد.');
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
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
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
    let ext = 'webm';
    if (audioBlob.type.includes('mp4')) ext = 'mp4';
    else if (audioBlob.type.includes('wav')) ext = 'wav';
    else if (audioBlob.type.includes('aac')) ext = 'm4a';

    const formData = new FormData();
    formData.append('file', audioBlob, `voice.${ext}`);
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
      throw new Error(`Whisper transcription error status: ${res.status}`);
    }

    const data = await res.json();
    return (data.text || '').trim();
  }
}
