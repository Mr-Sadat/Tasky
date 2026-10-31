import { Injectable, signal } from '@angular/core';

export interface RecordedAudioResult {
  blob: Blob;
  durationSeconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timerInterval: any = null;

  readonly isRecording = signal<boolean>(false);
  readonly durationSeconds = signal<number>(0);
  readonly recordingError = signal<string | null>(null);

  /**
   * Check if audio recording is supported in the current browser.
   */
  isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }

  /**
   * Request microphone permission and start recording.
   */
  async startRecording(): Promise<void> {
    this.recordingError.set(null);
    this.audioChunks = [];
    this.durationSeconds.set(0);

    if (!this.isSupported()) {
      this.recordingError.set('ضبط صدا در مرورگر شما پشتیبانی نمی‌شود.');
      throw new Error('MediaRecorder not supported');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Pick best supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Slice chunks every 250ms
      this.isRecording.set(true);

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
   * Stop recording and return the accumulated audio Blob.
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

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const finalDuration = this.durationSeconds();

        this.stopMediaTracks();
        this.isRecording.set(false);
        if (this.timerInterval) clearInterval(this.timerInterval);

        resolve({
          blob: audioBlob,
          durationSeconds: finalDuration
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel ongoing recording and release microphone.
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
    this.stopMediaTracks();
    this.audioChunks = [];
    this.isRecording.set(false);
    this.durationSeconds.set(0);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private stopMediaTracks(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}
