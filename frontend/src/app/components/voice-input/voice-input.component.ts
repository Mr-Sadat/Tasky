import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioRecorderService } from '../../services/audio-recorder.service';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      <!-- Recording Active Banner (appears when recording) -->
      @if (recorder.isRecording()) {
        <div class="flex items-center justify-between p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 backdrop-blur-md animate-pulse">
          <div class="flex items-center gap-3">
            <span class="relative flex h-3.5 w-3.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
            <span class="text-sm font-semibold text-rose-200">در حال ضبط صدا...</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-rose-900/90 text-rose-300 border border-rose-700/50">
              {{ formatSeconds(recorder.durationSeconds()) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="cancelRecording()"
              class="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
              title="لغو ضبط"
            >
              انصراف
            </button>
            <button
              type="button"
              (click)="stopAndSubmitRecording()"
              class="px-3.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md shadow-rose-900/50 transition flex items-center gap-1.5"
            >
              <span>اتمام و تحلیل</span>
              <span class="text-sm">✓</span>
            </button>
          </div>
        </div>
      }

      <!-- Main Input Bar -->
      <div class="flex items-center gap-2.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-1.5 shadow-xl backdrop-blur-md focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
        <!-- Prominent Microphone Button -->
        <button
          type="button"
          (click)="toggleRecording()"
          [disabled]="isLoading"
          class="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 interactive-spring focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          [ngClass]="recorder.isRecording() 
            ? 'bg-rose-600 text-white animate-recording shadow-lg shadow-rose-600/50 scale-105' 
            : 'bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-md shadow-purple-900/40 hover:scale-105 active:scale-95 hover:shadow-purple-500/40'"
          [title]="recorder.isRecording() ? 'اتمام ضبط' : 'شروع ضبط صوتی'"
          aria-label="ضبط صدا"
        >
          @if (recorder.isRecording()) {
            <!-- Stop Square Icon -->
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          } @else {
            <!-- Microphone Icon -->
            <svg class="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke-linecap="round"/>
              <line x1="8" y1="23" x2="16" y2="23" stroke-linecap="round"/>
            </svg>
          }
        </button>

        <!-- Fallback Quick-Text Input Box -->
        <input
          type="text"
          [(ngModel)]="inputText"
          (keydown.enter)="submitTextInput()"
          [disabled]="isLoading || recorder.isRecording()"
          placeholder="یا برنامه‌ت رو تایپ کن... (مثلاً: ساعت ۴ برم ورزش)"
          class="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-400 text-sm px-2 focus:outline-none focus:ring-0 disabled:opacity-50"
        />

        <!-- Send Text Button -->
        <button
          type="button"
          (click)="submitTextInput()"
          [disabled]="isLoading || recorder.isRecording() || !inputText.trim()"
          class="shrink-0 p-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white disabled:opacity-30 disabled:hover:bg-purple-600/80 disabled:cursor-not-allowed transition duration-200"
          title="ارسال متن"
          aria-label="ارسال متن"
        >
          <!-- Paper Airplane / Send Icon -->
          <svg class="w-5 h-5 fill-none stroke-current stroke-2 rotate-180" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" stroke-linecap="round" stroke-linejoin="round"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Error Toast if microphone fails -->
      @if (recorder.recordingError()) {
        <div class="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
          <span>⚠️ {{ recorder.recordingError() }}</span>
          <button (click)="clearError()" class="text-amber-400 hover:text-white px-2">✕</button>
        </div>
      }
    </div>
  `
})
export class VoiceInputComponent {
  readonly recorder = inject(AudioRecorderService);

  @Input() isLoading: boolean = false;
  @Output() submitAudio = new EventEmitter<Blob>();
  @Output() submitText = new EventEmitter<string>();
  @Output() recordingStateChange = new EventEmitter<boolean>();

  inputText: string = '';

  formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async toggleRecording(): Promise<void> {
    if (this.recorder.isRecording()) {
      await this.stopAndSubmitRecording();
    } else {
      try {
        await this.recorder.startRecording();
        this.recordingStateChange.emit(true);
      } catch (err) {
        this.recordingStateChange.emit(false);
      }
    }
  }

  async stopAndSubmitRecording(): Promise<void> {
    try {
      const result = await this.recorder.stopRecording();
      this.recordingStateChange.emit(false);
      if (result.transcript && result.transcript.trim()) {
        this.submitText.emit(result.transcript.trim());
      } else if (result.blob && result.blob.size > 0) {
        this.submitAudio.emit(result.blob);
      }
    } catch (err) {
      this.recordingStateChange.emit(false);
    }
  }

  cancelRecording(): void {
    this.recorder.cancelRecording();
    this.recordingStateChange.emit(false);
  }

  clearError(): void {
    this.recorder.recordingError.set(null);
  }

  submitTextInput(): void {
    const trimmed = this.inputText.trim();
    if (trimmed && !this.isLoading) {
      this.submitText.emit(trimmed);
      this.inputText = '';
    }
  }
}
