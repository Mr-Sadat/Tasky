import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { ThemeService } from '../../services/theme.service';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicAvatarComponent],
  template: `
    <div class="space-y-3">

      <!-- ======================================================== -->
      <!-- FULL GLASSMORPHISM BLURRY LIVE RECORDING & REVIEW MODAL  -->
      <!-- ======================================================== -->
      @if (isModalOpen()) {
        <div 
          class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in select-none"
          dir="rtl"
        >
          <!-- Glassmorphic Modal Card -->
          <div 
            class="w-full max-w-md rounded-3xl bg-slate-900/80 border border-white/15 p-6 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] animate-scale-up"
            (click)="$event.stopPropagation()"
          >
            <!-- Background Glow Orbs -->
            <div class="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-purple-600/20 blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none"></div>

            <!-- Top Close / Cancel Button -->
            <button
              type="button"
              (click)="cancelModal()"
              class="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-xs"
              title="انصراف"
            >
              ✕
            </button>

            <!-- AVATAR IN NOTETAKING & STUDYING POSE -->
            <div class="relative my-2">
              <div 
                class="w-28 h-28 rounded-3xl bg-slate-950/70 border border-purple-500/30 flex items-center justify-center shadow-xl shadow-purple-950/60 relative overflow-hidden"
                [ngClass]="recorder.isRecording() ? 'ring-2 ring-rose-500/50' : 'ring-2 ring-purple-500/40'"
              >
                <!-- Animated Sound Waves Glow when recording -->
                @if (recorder.isRecording()) {
                  <div class="absolute inset-0 rounded-3xl border-2 border-rose-500 animate-ping opacity-40 pointer-events-none"></div>
                }

                <app-dynamic-avatar
                  [customization]="themeService.customization()"
                  [state]="isReviewing() ? 'happy' : 'listening'"
                  costume="study"
                  [size]="105"
                ></app-dynamic-avatar>
              </div>

              <!-- Live Status Pill -->
              <div class="mt-2.5 flex items-center justify-center gap-2">
                @if (recorder.isRecording()) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse">
                    <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>در حال گوش دادن و یادداشت‌برداری... ✍️</span>
                  </span>
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800/90 text-purple-300 border border-purple-500/30">
                    {{ formatSeconds(recorder.durationSeconds()) }}
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <span>✓ یادداشت شد! لطفاً تایید کن</span>
                  </span>
                }
              </div>
            </div>

            <!-- LIVE TRANSCRIPTION SPEECH CARD -->
            <div class="w-full mt-3">
              @if (recorder.isRecording()) {
                <div class="bg-slate-950/60 border border-white/10 rounded-2xl p-4 min-h-[90px] max-h-[140px] overflow-y-auto text-right backdrop-blur-md shadow-inner flex flex-col justify-between">
                  <p class="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                    {{ recorder.recognizedText() || (recorder.isSafari() ? 'در حال ضبط صدا... (در سافاری می‌توانید از دکمه میکروفون کیبورد آیفون نیز استفاده کنید)' : 'در حال شنیدن صدای شما... برنامه‌ت رو بگو (مثلاً: فردا ساعت ۱۰ برم ورزش و بعدش جلسه کاری)') }}
                  </p>
                  <div class="flex items-center justify-end gap-1 text-[10px] text-purple-400 mt-2 font-mono">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                    <span>تایپ هوشمند زنده</span>
                  </div>
                </div>
              } @else {
                <!-- Review State: User can verify and tweak text before finalizing -->
                <div class="space-y-2 text-right">
                  <label class="block text-[11px] font-bold text-purple-300">
                    متن پیاده‌شده از صدای شما (در صورت تمایل ویرایش کن):
                  </label>
                  <textarea
                    [(ngModel)]="reviewText"
                    rows="3"
                    class="w-full bg-slate-950/80 border border-purple-500/40 rounded-2xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 leading-relaxed shadow-inner"
                    placeholder="متن برنامه خود را اینجا بنویسید یا ویرایش کنید..."
                  ></textarea>
                  @if (!reviewText.trim()) {
                    <div class="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                      💡 <strong>راهنما برای سافاری / آیفون:</strong> وب‌کیت سافاری از تبدیل خودکار وب به متن فارسی پشتیبانی نمی‌کند. کافیست در کادر بالا متن را بنویسید یا از <strong>میکروفون کیبورد آیفون (دیکته صوتی فارسی)</strong> استفاده فرمایید.
                    </div>
                  } @else {
                    <p class="text-[10px] text-slate-400">
                      💡 نکته: می‌تونی دکمه تایید رو بزنی یا فقط بگی <span class="text-purple-300 font-bold">«تایید»</span>!
                    </p>
                  }
                </div>
              }
            </div>

            <!-- ACTION BUTTONS -->
            <div class="w-full mt-5 flex items-center justify-between gap-3">
              @if (recorder.isRecording()) {
                <button
                  type="button"
                  (click)="cancelModal()"
                  class="flex-1 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-white/10"
                >
                  انصراف ✕
                </button>
                <button
                  type="button"
                  (click)="stopAndPrepareReview()"
                  class="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-900/50 transition cursor-pointer flex items-center justify-center gap-1.5 interactive-spring"
                >
                  <span>اتمام صحبت</span>
                  <span>⏹️</span>
                </button>
              } @else {
                <button
                  type="button"
                  (click)="restartRecording()"
                  class="flex-1 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-white/10 flex items-center justify-center gap-1"
                >
                  <span>🔄</span>
                  <span>ضبط مجدد</span>
                </button>
                <button
                  type="button"
                  (click)="confirmAndSubmit()"
                  [disabled]="!reviewText.trim()"
                  class="flex-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-extrabold shadow-xl shadow-purple-900/60 disabled:opacity-40 transition cursor-pointer flex items-center justify-center gap-1.5 interactive-spring"
                >
                  <span>تایید و ساخت برنامه</span>
                  <span>✅✨</span>
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ======================================================== -->
      <!-- BOTTOM GLASSMORPHISM QUICK INPUT BAR                     -->
      <!-- ======================================================== -->
      <div class="flex items-center gap-2.5 bg-slate-900/60 border border-white/10 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl focus-within:border-purple-500/60 focus-within:ring-2 focus-within:ring-purple-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all">
        <!-- Prominent Microphone Button (Opens Blurry Dialog) -->
        <button
          type="button"
          (click)="startVoiceRecordingFlow()"
          [disabled]="isLoading"
          class="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 interactive-spring focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-md shadow-purple-900/40 hover:scale-105 active:scale-95 hover:shadow-purple-500/40"
          title="شروع ضبط صوتی هوشمند"
          aria-label="ضبط صدا"
        >
          <!-- Microphone Icon -->
          <svg class="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke-linecap="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Quick-Text Input Box -->
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
          class="shrink-0 p-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white disabled:opacity-30 disabled:hover:bg-purple-600/80 disabled:cursor-not-allowed transition duration-200 cursor-pointer"
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
        <div class="p-2.5 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between backdrop-blur-md">
          <span>⚠️ {{ recorder.recordingError() }}</span>
          <button (click)="clearError()" class="text-amber-400 hover:text-white px-2">✕</button>
        </div>
      }
    </div>
  `
})
export class VoiceInputComponent {
  readonly recorder = inject(AudioRecorderService);
  readonly themeService = inject(ThemeService);

  @Input() isLoading: boolean = false;
  @Output() submitAudio = new EventEmitter<Blob>();
  @Output() submitText = new EventEmitter<string>();
  @Output() recordingStateChange = new EventEmitter<boolean>();

  readonly isModalOpen = signal<boolean>(false);
  readonly isReviewing = signal<boolean>(false);

  inputText: string = '';
  reviewText: string = '';
  private lastRecordedBlob: Blob | null = null;

  formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async startVoiceRecordingFlow(): Promise<void> {
    this.reviewText = '';
    this.lastRecordedBlob = null;
    this.isReviewing.set(false);
    this.isModalOpen.set(true);

    try {
      await this.recorder.startRecording();
      this.recordingStateChange.emit(true);
    } catch (err) {
      this.recordingStateChange.emit(false);
    }
  }

  async stopAndPrepareReview(): Promise<void> {
    try {
      const result = await this.recorder.stopRecording();
      this.recordingStateChange.emit(false);

      this.lastRecordedBlob = result.blob;
      const recognized = (result.transcript || this.recorder.recognizedText() || '').trim();
      this.reviewText = recognized;
      this.isReviewing.set(true);

      // Check for voice confirmation (e.g. if the user concluded by saying "تایید")
      if (/تایید|ثبت|حله/.test(recognized)) {
        // Strip the confirmation word and auto-confirm
        const cleaned = recognized.replace(/تایید|ثبت|حله/g, '').trim();
        if (cleaned.length >= 3) {
          this.reviewText = cleaned;
          setTimeout(() => this.confirmAndSubmit(), 400);
        }
      }
    } catch (err) {
      this.recordingStateChange.emit(false);
    }
  }

  restartRecording(): void {
    this.startVoiceRecordingFlow();
  }

  cancelModal(): void {
    if (this.recorder.isRecording()) {
      this.recorder.cancelRecording();
    }
    this.recordingStateChange.emit(false);
    this.isModalOpen.set(false);
    this.isReviewing.set(false);
    this.reviewText = '';
    this.lastRecordedBlob = null;
  }

  confirmAndSubmit(): void {
    const finalPlan = this.reviewText.trim();
    if (finalPlan) {
      this.submitText.emit(finalPlan);
    } else if (this.lastRecordedBlob) {
      this.submitAudio.emit(this.lastRecordedBlob);
    }
    this.isModalOpen.set(false);
    this.isReviewing.set(false);
    this.reviewText = '';
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
