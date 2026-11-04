import { Component, EventEmitter, Input, Output, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { ThemeService } from '../../services/theme.service';
import { Task } from '../../models/task.model';
import { toPersianDigits } from '../../utils/jalali';

export interface DetectedTaskPreview {
  id: string;
  title: string;
  category: string;
  priority?: 'high' | 'medium' | 'low';
  timeLabel: string;
  icon: 'check' | 'calendar';
}

@Component({
  selector: 'app-voice-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- FULL SCREEN AI VOICE CAPTURE / LISTENING MODAL -->
    @if (isModalOpen()) {
      <div 
        class="fixed inset-0 z-50 bg-[#0F111A]/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 text-slate-100 overflow-y-auto select-none animate-fade-in"
        dir="rtl"
      >
        <!-- Modal Inner Centered Container -->
        <div class="w-full max-w-md mx-auto flex-1 flex flex-col justify-between py-2">
          
          <!-- TOP BAR: Close, Pulsing Red Status, More Options -->
          <div class="flex items-center justify-between pb-2 shrink-0">
            <!-- Close Button -->
            <button
              type="button"
              (click)="closeModal()"
              class="w-10 h-10 rounded-full bg-[#1A1D2B] hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-sm shadow-sm"
              title="بستن"
              aria-label="بستن"
            >
              ✕
            </button>

            <!-- Centered Recording Status -->
            <div class="flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-950/40 border border-pink-500/30 shadow-inner">
              <span class="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span class="text-xs font-semibold text-pink-300">
                {{ isPaused() ? 'متوقف شده' : 'در حال گوش دادن...' }}
              </span>
            </div>

            <!-- More Options Button -->
            <button
              type="button"
              (click)="toggleManualInput()"
              class="w-10 h-10 rounded-full bg-[#1A1D2B] hover:bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer text-lg tracking-widest shadow-sm"
              title="ورود دستی یا ویرایش متن"
              aria-label="بیشتر"
            >
              ⋯
            </button>
          </div>

          <!-- CENTRAL 3D VOICE ORB VISUALIZER -->
          <div class="flex flex-col items-center justify-center my-6 relative shrink-0">
            <!-- Concentric Radiating Glow Rings -->
            <div class="relative w-48 h-48 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full border border-purple-500/20 animate-orb-ring-1 pointer-events-none"></div>
              <div class="absolute inset-0 rounded-full border border-purple-500/25 animate-orb-ring-2 pointer-events-none"></div>
              <div class="absolute inset-0 rounded-full border border-pink-500/20 animate-orb-ring-3 pointer-events-none"></div>

              <!-- Ambient Glow -->
              <div class="absolute w-40 h-40 rounded-full bg-purple-600/25 blur-2xl pointer-events-none"></div>

              <!-- 3D Glossy Purple Sphere Orb -->
              <div 
                class="w-36 h-36 rounded-full relative flex items-center justify-center animate-orb shadow-[0_0_40px_rgba(124,58,237,0.45),inset_0_-8px_20px_rgba(0,0,0,0.6),inset_0_8px_16px_rgba(255,255,255,0.4)] cursor-pointer"
                style="background: radial-gradient(circle at 35% 30%, #d8b4fe 0%, #9333ea 40%, #7e22ce 75%, #3b0764 100%);"
                (click)="togglePauseResume()"
                title="کلیک برای توقف یا ادامه گوش دادن"
              >
                <!-- Upper Sheen Reflection -->
                <div class="absolute top-2 left-6 w-14 h-6 rounded-full bg-white/35 blur-[1.5px] rotate-[-20deg] pointer-events-none"></div>

                <!-- Animated Sound Wave Bars inside sphere -->
                <div class="flex items-center justify-center gap-1.5 z-10">
                  <span class="w-1.5 rounded-full bg-white/95" [ngClass]="isPaused() ? 'h-3' : 'animate-eq-1'"></span>
                  <span class="w-1.5 rounded-full bg-white/95" [ngClass]="isPaused() ? 'h-5' : 'animate-eq-2'"></span>
                  <span class="w-1.5 rounded-full bg-white/95" [ngClass]="isPaused() ? 'h-7' : 'animate-eq-3'"></span>
                  <span class="w-1.5 rounded-full bg-white/95" [ngClass]="isPaused() ? 'h-5' : 'animate-eq-4'"></span>
                  <span class="w-1.5 rounded-full bg-white/95" [ngClass]="isPaused() ? 'h-3' : 'animate-eq-5'"></span>
                </div>
              </div>
            </div>

            <!-- Listening Subtitle -->
            <h3 class="text-base font-bold text-white mt-4 tracking-tight">
              {{ isPaused() ? 'گوش دادن متوقف شد' : 'بگو، سراپا گوشم...' }}
            </h3>
            <!-- Stopwatch Timer in Persian Digits -->
            <p class="text-xs font-medium text-slate-400 mt-1 font-mono">
              {{ toPersianDigits(formatSeconds(timerSeconds())) }}
            </p>
          </div>

          <!-- LIVE TRANSCRIPT CARD -->
          <div class="w-full bg-[#1A1D2B] border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl mb-4 relative">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-slate-400">
                متن زنده
              </span>
              <!-- Sound wave pink icon -->
              <div class="flex items-center gap-0.5 text-pink-400">
                <span class="w-1 h-3 rounded-full bg-pink-400 animate-pulse"></span>
                <span class="w-1 h-5 rounded-full bg-pink-400"></span>
                <span class="w-1 h-2 rounded-full bg-pink-400 animate-pulse"></span>
                <span class="w-1 h-4 rounded-full bg-pink-400"></span>
              </div>
            </div>

            @if (showTextEdit()) {
              <textarea
                [(ngModel)]="customTranscript"
                (ngModelChange)="onTranscriptChange($event)"
                rows="2"
                class="w-full bg-slate-950/70 border border-purple-500/40 rounded-xl p-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400 leading-relaxed"
                placeholder="متن را بنویسید یا ویرایش کنید..."
              ></textarea>
            } @else {
              <p class="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
                «یادم بنداز به 
                <span class="bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded-md font-medium border border-purple-500/30 mx-1">
                  {{ detectedTasks()[0]?.title ? detectedTasks()[0].title : 'سارا زنگ بزنم' }}
                </span>
                درباره رونمایی، بعدش برای 
                <span class="bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded-md font-medium border border-purple-500/30 mx-1">
                  {{ detectedTasks()[1]?.timeLabel ? detectedTasks()[1].timeLabel : 'فردا ساعت ۱۵' }}
                </span>
                یه جلسه تنظیم کن.»
              </p>
            }
          </div>

          <!-- AI TASK PREVIEW SECTION -->
          <div class="w-full space-y-2 mb-4">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-1.5 text-purple-300 text-xs font-bold tracking-tight">
                <span class="text-purple-400">✦</span>
                <span>پیش‌نمایش تسک‌های هوش مصنوعی</span>
              </div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30">
                {{ toPersianDigits(detectedTasks().length) }} تسک تشخیص داده شد
              </span>
            </div>

            <!-- List of Detected Tasks -->
            @for (task of detectedTasks(); track task.id) {
              <div class="flex items-center justify-between p-3 rounded-2xl bg-[#1A1D2B] border border-white/[0.08] hover:border-purple-500/30 transition shadow-sm">
                <div class="flex items-center gap-3 min-w-0">
                  <!-- Task Type Icon Box -->
                  <div class="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                    @if (task.icon === 'check') {
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    }
                  </div>

                  <!-- Task Info & Tags -->
                  <div class="min-w-0">
                    <h4 class="text-xs sm:text-sm font-semibold text-white truncate">{{ task.title }}</h4>
                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {{ task.category }}
                      </span>
                      @if (task.priority === 'high') {
                        <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-950/70 text-rose-300 border border-rose-500/30">
                          فوری
                        </span>
                      }
                      <span class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-950/50 text-purple-300">
                        {{ toPersianDigits(task.timeLabel) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Delete Task Button -->
                <button
                  type="button"
                  (click)="removeTask(task.id)"
                  class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center justify-center transition cursor-pointer shrink-0"
                  title="حذف تسک"
                >
                  ✕
                </button>
              </div>
            }
          </div>

          <!-- BOTTOM ACTION BAR: Pause / Resume + Create Tasks Button -->
          <div class="flex items-center gap-3 pt-2 shrink-0">
            <!-- Pause / Resume Button -->
            <button
              type="button"
              (click)="togglePauseResume()"
              class="w-13 h-13 rounded-2xl bg-[#1A1D2B] hover:bg-slate-800 border border-white/[0.08] text-slate-200 flex items-center justify-center transition cursor-pointer text-lg shadow-md active:scale-95 shrink-0"
              [title]="isPaused() ? 'ادامه گوش دادن' : 'مکث'"
            >
              @if (isPaused()) {
                <span class="text-emerald-400 text-xl">▶</span>
              } @else {
                <span class="text-slate-300 font-bold">⏸</span>
              }
            </button>

            <!-- Gradient Pill Button: Create Tasks -->
            <button
              type="button"
              (click)="confirmAndCreateTasks()"
              class="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#DB2777] hover:opacity-95 active:scale-98 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition interactive-spring"
            >
              <span>{{ detectedTasks().length > 0 ? 'ثبت ' + toPersianDigits(detectedTasks().length) + ' تسک ✨' : 'ثبت تسک‌ها ✨' }}</span>
            </button>
          </div>

        </div>
      </div>
    }
  `
})
export class VoiceInputComponent implements OnDestroy {
  readonly toPersianDigits = toPersianDigits;
  readonly recorder = inject(AudioRecorderService);
  readonly themeService = inject(ThemeService);

  @Input() isLoading: boolean = false;
  @Output() submitAudio = new EventEmitter<Blob>();
  @Output() submitText = new EventEmitter<string>();
  @Output() recordingStateChange = new EventEmitter<boolean>();
  @Output() tasksCreated = new EventEmitter<any[]>();

  readonly isModalOpen = signal<boolean>(false);
  readonly isPaused = signal<boolean>(false);
  readonly timerSeconds = signal<number>(8);
  readonly showTextEdit = signal<boolean>(false);

  private timerInterval: any = null;

  customTranscript: string = 'یادم بنداز به سارا زنگ بزنم درباره رونمایی، بعدش برای فردا ساعت ۱۵ یه جلسه تنظیم کن.';

  readonly detectedTasks = signal<DetectedTaskPreview[]>([
    {
      id: 'dt-1',
      title: 'تماس با سارا درباره رونمایی',
      category: 'کاری',
      priority: 'high',
      timeLabel: 'امروز',
      icon: 'check',
    },
    {
      id: 'dt-2',
      title: 'جلسه درباره رونمایی',
      category: 'کاری',
      timeLabel: 'فردا - ۱۵:۰۰',
      icon: 'calendar',
    },
  ]);

  ngOnDestroy(): void {
    this.stopTimer();
  }

  formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  async openModal(): Promise<void> {
    this.isModalOpen.set(true);
    this.isPaused.set(false);
    this.timerSeconds.set(0);
    this.startTimer();
    this.recordingStateChange.emit(true);

    try {
      await this.recorder.startRecording();
    } catch (e) {
      console.warn('Microphone start error (handled with interactive fallback):', e);
    }
  }

  closeModal(): void {
    this.stopTimer();
    if (this.recorder.isRecording()) {
      this.recorder.cancelRecording();
    }
    this.isModalOpen.set(false);
    this.recordingStateChange.emit(false);
  }

  togglePauseResume(): void {
    if (this.isPaused()) {
      this.isPaused.set(false);
      this.startTimer();
    } else {
      this.isPaused.set(true);
      this.stopTimer();
    }
  }

  toggleManualInput(): void {
    this.showTextEdit.update(v => !v);
  }

  onTranscriptChange(val: string): void {
    if (val.includes('سارا')) {
      // Keep existing structure
    }
  }

  removeTask(id: string): void {
    this.detectedTasks.update(list => list.filter(t => t.id !== id));
  }

  async confirmAndCreateTasks(): Promise<void> {
    this.stopTimer();
    try {
      if (this.recorder.isRecording()) {
        const result = await this.recorder.stopRecording();
        if (result.blob) {
          this.submitAudio.emit(result.blob);
        }
      }
    } catch (e) {
      console.warn('Audio recorder stop error:', e);
    }

    // Emit confirmed tasks
    const tasksToCreate = this.detectedTasks();
    this.tasksCreated.emit(tasksToCreate);

    // Emit combined text for tasky planner
    const textPlan = tasksToCreate.map(t => t.title + ' ' + t.timeLabel).join(' و ');
    if (textPlan) {
      this.submitText.emit(textPlan);
    }

    this.isModalOpen.set(false);
    this.recordingStateChange.emit(false);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timerSeconds.update(s => s + 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
