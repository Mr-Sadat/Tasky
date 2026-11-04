import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskIcon, TaskCategory, AvatarCustomization } from '../../models/task.model';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';
import { DEFAULT_AVATAR_CUSTOMIZATION } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';

interface ConfettiItem {
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const PERSIAN_AFFIRMATIONS = [
  'آفرین به اراده‌ات! این تسک با تمرکز کامل انجام شد 🌟',
  'فوق‌العاده بود! یک گام محکم دیگه به سمت هدف‌هات برداشتی 🚀',
  'خسته نباشی قهرمان! کیفیت تمرکزت بی‌نظیر بود 👏',
  'تبریک! تسک تموم شد. حالا وقت یه نفس عمیق و یک لیوان آبه ☕',
  'تمرکزت مثال‌زدنی بود! به خودت افتخار کن ✨',
  'یک پیروزی دیگه ثبت شد! ریتم فوق‌العاده‌ات رو حفظ کن 🎯',
];

@Component({
  selector: 'app-focus-modal',
  standalone: true,
  imports: [CommonModule, DynamicAvatarComponent],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none"
      dir="rtl"
      (click)="onBackdropClick($event)"
    >
      <!-- Confetti Particles when finished -->
      @if (isCompleted()) {
        <div class="pointer-events-none absolute inset-0 overflow-hidden z-30">
          @for (p of confettiPieces; track $index) {
            <div
              class="absolute rounded-full animate-confetti-fall"
              [style.left.%]="p.left"
              [style.width.px]="p.size"
              [style.height.px]="p.size"
              [style.background-color]="p.color"
              [style.animation-delay.s]="p.delay"
              [style.animation-duration.s]="p.duration"
            ></div>
          }
        </div>
      }

      <!-- Main Focus Card Container -->
      <div
        class="relative w-full max-w-md rounded-2xl bg-[#1A1D2B] backdrop-blur-2xl border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-5 sm:p-6 overflow-hidden flex flex-col justify-between max-h-[92vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focusModalTitle"
      >
        <!-- Ambient Glowing Background Accents -->
        <div
          class="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-transparent blur-3xl pointer-events-none"
        ></div>
        <div
          class="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-gradient-to-tr from-pink-600/20 via-purple-600/20 to-transparent blur-3xl pointer-events-none"
        ></div>

        <!-- Header: Category Icon, Title, and Close Button -->
        <div class="relative z-10 flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-md shadow-indigo-950/50 shrink-0"
            >
              {{ getCategoryEmoji(task.icon) }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/40">
                  {{ getCategoryLabel(task.category) }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono">
                  مدت پیش‌فرض: {{ task.duration_minutes }} دقیقه
                </span>
              </div>
              <h3 id="focusModalTitle" class="text-sm sm:text-base font-extrabold text-white truncate mt-0.5" [title]="task.title">
                {{ task.title }}
              </h3>
            </div>
          </div>

          <button
            type="button"
            (click)="closeModal()"
            class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="بستن پنجره تمرکز"
            title="خروج از حالت تمرکز"
          >
            ✕
          </button>
        </div>

        <!-- Body Section -->
        <div class="relative z-10 py-4 flex flex-col items-center text-center space-y-4">
          <!-- Avatar in Calm Focused State with Breathing Glow Ring -->
          <div class="relative flex items-center justify-center">
            <!-- Pulsing soft glow ring -->
            <div
              class="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-pink-500/20 blur-xl pointer-events-none"
              [class.animate-pulse]="isRunning() && !isCompleted()"
            ></div>

            <div
              class="relative p-2 rounded-full border border-purple-500/30 bg-slate-900/80 shadow-xl backdrop-blur-md transition-transform duration-500"
              [class.scale-105]="isRunning() && !isCompleted()"
            >
              <app-dynamic-avatar
                [customization]="focusedAvatarConfig()"
                [costume]="isCompleted() ? 'default' : 'study'"
                [state]="isCompleted() ? 'happy' : 'serious'"
                [size]="130"
              ></app-dynamic-avatar>

              <!-- Headphone/Focus Indicator Badge -->
              <div
                class="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-xs shadow-md select-none"
                [title]="isCompleted() ? 'تکمیل شد!' : 'در حال تمرکز عمیق'"
              >
                {{ isCompleted() ? '🏆' : '🎧' }}
              </div>
            </div>
          </div>

          <!-- Active Timer Display (When not completed) -->
          @if (!isCompleted()) {
            <div class="relative flex flex-col items-center justify-center w-full">
              <!-- Circular Progress SVG Ring -->
              <div class="relative w-44 h-44 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#818cf8" />
                      <stop offset="50%" stop-color="#a855f7" />
                      <stop offset="100%" stop-color="#ec4899" />
                    </linearGradient>
                  </defs>
                  <!-- Track -->
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="rgba(51, 65, 85, 0.4)"
                    stroke-width="5"
                    fill="transparent"
                  />
                  <!-- Progress Ring -->
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="url(#timerGradient)"
                    stroke-width="5"
                    stroke-linecap="round"
                    fill="transparent"
                    [attr.stroke-dasharray]="circumference"
                    [attr.stroke-dashoffset]="dashOffset()"
                    class="transition-all duration-1000 ease-linear drop-shadow-md"
                  />
                </svg>

                <!-- Centered Countdown Numbers -->
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-3xl sm:text-4xl font-black font-mono tracking-wider text-white drop-shadow-md">
                    {{ formattedRemainingTime() }}
                  </span>
                  <span class="text-[11px] font-semibold mt-1" [ngClass]="isRunning() ? 'text-emerald-300' : 'text-amber-300'">
                    {{ isRunning() ? '● در حال تمرکز' : '❚❚ موقتاً متوقف شد' }}
                  </span>
                </div>
              </div>

              <!-- Ambient Audio Controls -->
              <div class="mt-2 w-full max-w-xs p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div class="flex items-center justify-between text-[11px] text-slate-300 mb-2 font-medium px-1">
                  <span class="flex items-center gap-1">
                    <span>🎶</span>
                    <span>صدای پس‌زمینه (امبینت):</span>
                  </span>
                  <span class="text-[10px] text-purple-300 font-mono">
                    {{ ambientMode() === 'off' ? 'خاموش' : ambientMode() === 'rain' ? 'باران' : ambientMode() === 'whitenoise' ? 'سفید' : 'آلفا' }}
                  </span>
                </div>

                <div class="grid grid-cols-4 gap-1 text-[11px]">
                  <button
                    type="button"
                    (click)="setAmbientMode('off')"
                    class="py-1 px-1 rounded-xl font-bold border transition cursor-pointer select-none"
                    [ngClass]="ambientMode() === 'off'
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'"
                    title="سکوت / بدون صدای امبینت"
                  >
                    🔇 قطع
                  </button>
                  <button
                    type="button"
                    (click)="setAmbientMode('rain')"
                    class="py-1 px-1 rounded-xl font-bold border transition cursor-pointer select-none"
                    [ngClass]="ambientMode() === 'rain'
                      ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'"
                    title="صدای ملایم باران لوفای"
                  >
                    🌧️ باران
                  </button>
                  <button
                    type="button"
                    (click)="setAmbientMode('whitenoise')"
                    class="py-1 px-1 rounded-xl font-bold border transition cursor-pointer select-none"
                    [ngClass]="ambientMode() === 'whitenoise'
                      ? 'bg-teal-600/40 border-teal-400 text-teal-200 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'"
                    title="صدای نویز سفید آرام‌بخش"
                  >
                    🌊 سفید
                  </button>
                  <button
                    type="button"
                    (click)="setAmbientMode('binaural')"
                    class="py-1 px-1 rounded-xl font-bold border transition cursor-pointer select-none"
                    [ngClass]="ambientMode() === 'binaural'
                      ? 'bg-pink-600/40 border-pink-400 text-pink-200 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'"
                    title="فرکانس ۴۳۲ هرتز تمرکز عمیق"
                  >
                    🧘 آلفا
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <!-- Celebration View (When Finished) -->
            <div class="py-2 space-y-3.5 w-full animate-fade-in">
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-md shadow-emerald-950/40 animate-bounce">
                <span>🎉</span>
                <span>تسک با موفقیت تکمیل شد!</span>
              </div>

              <!-- Positive Persian Affirmation Box -->
              <div class="p-4 rounded-2xl bg-gradient-to-br from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/40 shadow-inner">
                <p class="text-xs sm:text-sm font-bold text-purple-200 leading-relaxed">
                  «{{ affirmation() }}»
                </p>
                <div class="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <span>⏱️</span>
                  <span>مدت جلسه تمرکز: {{ Math.round(totalSeconds() / 60) }} دقیقه</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer Control Buttons -->
        <div class="relative z-10 pt-3 border-t border-slate-800">
          @if (!isCompleted()) {
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Start / Pause Toggle -->
              <button
                type="button"
                (click)="togglePlayPause()"
                class="flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer interactive-spring shadow-md"
                [ngClass]="isRunning()
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-200 hover:bg-amber-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-emerald-950/50'"
              >
                @if (isRunning()) {
                  <span>⏸️</span>
                  <span>توقف موقت</span>
                } @else {
                  <span>▶️</span>
                  <span>ادامه تمرکز</span>
                }
              </button>

              <!-- +5 Minutes Button -->
              <button
                type="button"
                (click)="addFiveMinutes()"
                class="py-2.5 px-3 rounded-2xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-purple-500/40 transition flex items-center justify-center gap-1 cursor-pointer interactive-spring"
                title="اضافه کردن ۵ دقیقه به تایمر تمرکز"
              >
                <span>⏳</span>
                <span>+۵ دقیقه</span>
              </button>

              <!-- Finish Task Button -->
              <button
                type="button"
                (click)="finishTaskEarly()"
                class="py-2.5 px-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border border-purple-400/40 shadow-md shadow-purple-950/50 transition flex items-center justify-center gap-1.5 cursor-pointer interactive-spring"
                title="علامت‌گذاری تسک به عنوان انجام‌شده"
              >
                <span>✅</span>
                <span>تکمیل تسک</span>
              </button>
            </div>
          } @else {
            <!-- Back to App Button -->
            <button
              type="button"
              (click)="closeModal()"
              class="w-full py-3 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition cursor-pointer interactive-spring flex items-center justify-center gap-2"
            >
              <span>✨</span>
              <span>بازگشت به برنامه روزانه</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes confetti-fall {
        0% {
          transform: translateY(-20px) rotate(0deg) scale(0.8);
          opacity: 1;
        }
        100% {
          transform: translateY(600px) rotate(720deg) scale(1.1);
          opacity: 0;
        }
      }

      .animate-confetti-fall {
        animation: confetti-fall 3.2s ease-out infinite;
      }
    `,
  ],
})
export class FocusModalComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);

  @Input({ required: true }) task!: Task;
  @Input() avatarCustomization: AvatarCustomization | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() completed = new EventEmitter<Task>();

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.closeModal();
  }

  readonly Math = Math;
  readonly radius = 52;
  readonly circumference = 2 * Math.PI * 52; // ~326.72

  readonly totalSeconds = signal<number>(1500);
  readonly remainingSeconds = signal<number>(1500);
  readonly isRunning = signal<boolean>(true);
  readonly isCompleted = signal<boolean>(false);
  readonly ambientMode = signal<'off' | 'rain' | 'whitenoise' | 'binaural'>('off');
  readonly affirmation = signal<string>(PERSIAN_AFFIRMATIONS[0]);

  private timerInterval: any = null;

  // Web Audio Context & Nodes for Offline Ambient Sound Synthesizer
  private audioCtx: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private toneOscillator: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;

  // Pre-calculated confetti pieces for celebration
  readonly confettiPieces: ConfettiItem[] = Array.from({ length: 28 }).map((_, i) => ({
    left: Math.random() * 96 + 2,
    size: Math.floor(Math.random() * 8) + 6,
    color: ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 6],
    delay: Math.random() * 1.5,
    duration: 2.5 + Math.random() * 1.5,
  }));

  /**
   * Computed: Avatar configured for calm studying/focus with headphones
   */
  readonly focusedAvatarConfig = computed<AvatarCustomization>(() => {
    const base = this.avatarCustomization || DEFAULT_AVATAR_CUSTOMIZATION;
    return {
      ...base,
      accessory: 'headphones',
      mouthExpression: this.isCompleted() ? 'happy_teeth' : 'gentle_smile',
    };
  });

  /**
   * Computed SVG dash offset for circular progress
   */
  readonly dashOffset = computed<number>(() => {
    const total = this.totalSeconds();
    if (total <= 0) return 0;
    const progress = this.remainingSeconds() / total;
    return this.circumference * (1 - Math.max(0, Math.min(1, progress)));
  });

  ngOnInit(): void {
    const duration = Math.max(1, this.task.duration_minutes || 25);
    const secs = duration * 60;
    this.totalSeconds.set(secs);
    this.remainingSeconds.set(secs);

    // Random affirmation
    const randomIdx = Math.floor(Math.random() * PERSIAN_AFFIRMATIONS.length);
    this.affirmation.set(PERSIAN_AFFIRMATIONS[randomIdx]);

    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearCountdown();
    this.stopAmbientAudio();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (e) {}
    }
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.isRunning.set(true);
    this.timerInterval = setInterval(() => {
      const current = this.remainingSeconds();
      if (current <= 1) {
        this.remainingSeconds.set(0);
        this.onCountdownFinished();
      } else {
        this.remainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  togglePlayPause(): void {
    if (this.isRunning()) {
      this.clearCountdown();
      this.isRunning.set(false);
    } else {
      this.startCountdown();
    }
  }

  addFiveMinutes(): void {
    const added = 300;
    this.remainingSeconds.update((s) => s + added);
    this.totalSeconds.update((s) => s + added);
  }

  finishTaskEarly(): void {
    this.onCountdownFinished();
  }

  private onCountdownFinished(): void {
    this.clearCountdown();
    this.isRunning.set(false);
    this.isCompleted.set(true);

    // Stop ambient noise and play celebration chime
    this.stopAmbientAudio();
    this.playCelebrationChime();

    // Mark task as completed in backend
    this.apiService.toggleTaskCompletion(this.task.id, true).subscribe({
      next: (updated) => {
        this.completed.emit(updated);
      },
      error: () => {
        // Emit optimistic completion
        this.completed.emit({ ...this.task, is_completed: true });
      },
    });
  }

  closeModal(): void {
    this.clearCountdown();
    this.stopAmbientAudio();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  formattedRemainingTime(): string {
    const total = Math.max(0, this.remainingSeconds());
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  getCategoryEmoji(icon?: TaskIcon): string {
    const map: Record<string, string> = {
      briefcase: '💼',
      book: '📚',
      dumbbell: '🏋️',
      heart: '❤️',
      cart: '🛒',
      star: '⭐',
      coffee: '☕',
      moon: '🌙',
      sun: '☀️',
    };
    return (icon && map[icon]) ? map[icon] : '📌';
  }

  getCategoryLabel(category?: TaskCategory): string {
    const map: Record<string, string> = {
      work: 'کاری',
      study: 'مطالعه و یادگیری',
      fitness: 'ورزش و تندرستی',
      health: 'سلامت',
      shopping: 'خرید',
      personal: 'شخصی',
      rest: 'استراحت',
    };
    return (category && map[category]) ? map[category] : 'عمومی';
  }

  // ==========================================
  // Web Audio Synthesizer (Ambient & Chime)
  // ==========================================

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setAmbientMode(mode: 'off' | 'rain' | 'whitenoise' | 'binaural'): void {
    this.ambientMode.set(mode);
    this.stopAmbientAudio();

    if (mode === 'off') return;

    try {
      const ctx = this.getAudioContext();

      if (mode === 'rain') {
        // Generate soothing pink/rain noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
          b6 = white * 0.115926;
        }

        this.noiseSource = ctx.createBufferSource();
        this.noiseSource.buffer = buffer;
        this.noiseSource.loop = true;

        this.ambientFilter = ctx.createBiquadFilter();
        this.ambientFilter.type = 'lowpass';
        this.ambientFilter.frequency.value = 800;

        this.ambientGain = ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);

        this.noiseSource.connect(this.ambientFilter);
        this.ambientFilter.connect(this.ambientGain);
        this.ambientGain.connect(ctx.destination);
        this.noiseSource.start();
      } else if (mode === 'whitenoise') {
        // Soft white noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.035;
        }

        this.noiseSource = ctx.createBufferSource();
        this.noiseSource.buffer = buffer;
        this.noiseSource.loop = true;

        this.ambientFilter = ctx.createBiquadFilter();
        this.ambientFilter.type = 'bandpass';
        this.ambientFilter.frequency.value = 1100;
        this.ambientFilter.Q.value = 0.6;

        this.ambientGain = ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.3);

        this.noiseSource.connect(this.ambientFilter);
        this.ambientFilter.connect(this.ambientGain);
        this.ambientGain.connect(ctx.destination);
        this.noiseSource.start();
      } else if (mode === 'binaural') {
        // 432 Hz Calm Alpha Tone
        this.toneOscillator = ctx.createOscillator();
        this.toneOscillator.type = 'sine';
        this.toneOscillator.frequency.value = 432;

        this.ambientGain = ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0.001, ctx.currentTime);
        this.ambientGain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.5);

        this.toneOscillator.connect(this.ambientGain);
        this.ambientGain.connect(ctx.destination);
        this.toneOscillator.start();
      }
    } catch (e) {
      console.warn('Web Audio Ambient playback error:', e);
    }
  }

  private stopAmbientAudio(): void {
    if (this.ambientGain && this.audioCtx) {
      try {
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.1);
      } catch (e) {}
    }
    setTimeout(() => {
      try {
        this.noiseSource?.stop();
        this.noiseSource?.disconnect();
        this.toneOscillator?.stop();
        this.toneOscillator?.disconnect();
      } catch (e) {}
      this.noiseSource = null;
      this.toneOscillator = null;
    }, 120);
  }

  private playCelebrationChime(): void {
    try {
      const ctx = this.getAudioContext();
      // Ascending C Major chord arpeggio: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.13;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.25);
      });
    } catch (e) {
      console.warn('Web Audio chime error:', e);
    }
  }
}
