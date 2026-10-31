import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  ThemeService,
  SKIN_TONE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  EYE_SHAPE_OPTIONS,
  EYE_COLOR_OPTIONS,
  EYEBROW_OPTIONS,
  MOUTH_EXPRESSION_OPTIONS,
  LIP_COLOR_OPTIONS,
  OUTFIT_STYLE_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  ACCESSORY_OPTIONS,
  DEFAULT_AVATAR_CUSTOMIZATION,
  sanitizeAvatarConfig,
  THEME_PRESETS,
  ThemePreset,
} from '../../services/theme.service';
import {
  UserProfile,
  ProfileSetupPayload,
  AvatarCustomization,
  FaceShape,
  HairStyle,
  EyeShape,
  EyebrowStyle,
  MouthExpression,
  OutfitStyle,
  AvatarAccessory,
} from '../../models/task.model';
import { AvatarCardComponent } from '../avatar-card/avatar-card.component';

export interface LifestyleQuestionOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarCardComponent],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-purple-600 selection:text-white relative overflow-hidden" dir="rtl">
      <!-- Ambient Glow Orbs -->
      <div class="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none"></div>

      <!-- Main Wizard Container -->
      <div class="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 flex flex-col relative z-10 animate-fade-in">
        
        <!-- Header & Stepper -->
        <header class="mb-6 text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-3 shadow-inner">
            <span>✨</span>
            <span>راه‌اندازی اختصاصی تَسکی</span>
          </div>

          <h2 class="text-xl sm:text-2xl font-black tracking-tight text-white mb-1.5">
            {{ getStepTitle() }}
          </h2>
          <p class="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {{ getStepSubtitle() }}
          </p>

          <!-- Stepper Progress Bar -->
          <div class="mt-5 flex items-center justify-center gap-2">
            @for (step of [1, 2, 3]; track step) {
              <div 
                class="h-1.5 rounded-full transition-all duration-300"
                [ngClass]="{
                  'w-12 bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm shadow-purple-500/50': currentStep() === step,
                  'w-8 bg-purple-600/60': currentStep() > step,
                  'w-6 bg-slate-800': currentStep() < step
                }"
              ></div>
            }
          </div>
        </header>

        <!-- Error Message Banner -->
        @if (errorMessage()) {
          <div class="mb-4 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-bounce">
            <span>⚠️</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- STEP 1: Basic Identity & Circadian Clock -->
        @if (currentStep() === 1) {
          <div class="space-y-4 animate-fade-in">
            <!-- Name Input -->
            <div>
              <label for="userName" class="block text-xs font-bold text-slate-200 mb-1.5">
                نام یا لقبی که دوست دارید تَسکی شما رو صدا بزنه:
              </label>
              <input
                id="userName"
                type="text"
                [(ngModel)]="name"
                placeholder="مثلاً: سارا، علی، رفیق..."
                class="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                autocomplete="name"
              />
            </div>

            <!-- Circadian Rhythm (Wake & Sleep Time) -->
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div class="flex items-center gap-2 text-xs font-bold text-purple-300">
                <span>⏰</span>
                <span>ساعت زیستی و روتین شبانه‌روز:</span>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="wakeTime" class="block text-[11px] font-semibold text-slate-400 mb-1">
                    🌅 معمولاً چه ساعتی بیدار می‌شید؟
                  </label>
                  <input
                    id="wakeTime"
                    type="time"
                    [(ngModel)]="wakeTime"
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>

                <div>
                  <label for="sleepTime" class="block text-[11px] font-semibold text-slate-400 mb-1">
                    🌙 چه ساعتی می‌خوابید؟
                  </label>
                  <input
                    id="sleepTime"
                    type="time"
                    [(ngModel)]="sleepTime"
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>
              </div>

              <p class="text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                🔒 <strong class="text-slate-300">تعهد تَسکی:</strong> هیچ تسک و برنامه‌ای در ساعات خواب شما زمان‌بندی نخواهد شد تا کیفیت استراحت شما حفظ شود.
              </p>
            </div>
          </div>
        }

        <!-- STEP 2: Lifestyle & Goals Assessment -->
        @if (currentStep() === 2) {
          <div class="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto px-1">
            <!-- Question 1: Main Goal -->
            <div>
              <span class="block text-xs font-bold text-slate-200 mb-2">
                ۱. هدف اصلی شما از برنامه‌ریزی روزانه چیه؟
              </span>
              <div class="grid grid-cols-1 gap-2">
                @for (opt of goalOptions; track opt.id) {
                  <button
                    type="button"
                    (click)="selectedGoal = opt.id"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="selectedGoal === opt.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                  >
                    <span class="text-xl shrink-0">{{ opt.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ opt.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ opt.description }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Question 2: Stress / Pace -->
            <div>
              <span class="block text-xs font-bold text-slate-200 mb-2">
                ۲. ریتم و سطح شلوغی کارهای روزانه‌تون چطوره؟
              </span>
              <div class="grid grid-cols-3 gap-2">
                @for (opt of stressOptions; track opt.id) {
                  <button
                    type="button"
                    (click)="selectedStress = opt.id"
                    class="p-2.5 rounded-2xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="selectedStress === opt.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                  >
                    <span class="text-lg mb-1">{{ opt.icon }}</span>
                    <span class="text-xs font-bold">{{ opt.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Question 3: AI Tone -->
            <div>
              <span class="block text-xs font-bold text-slate-200 mb-2">
                ۳. ترجیح می‌دی هوش مصنوعی چه شخصیتی داشته باشه؟
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                @for (opt of toneOptions; track opt.id) {
                  <button
                    type="button"
                    (click)="selectedTone = opt.id"
                    class="p-2.5 rounded-2xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="selectedTone === opt.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                  >
                    <span class="text-xl mb-1">{{ opt.icon }}</span>
                    <span class="text-xs font-bold">{{ opt.label }}</span>
                    <span class="text-[10px] text-slate-400 mt-0.5 leading-snug">{{ opt.description }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- STEP 3: Instagram-Style Avatar Customization -->
        @if (currentStep() === 3) {
          <div class="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto px-1">
            <!-- Live Preview -->
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[11px] font-semibold text-purple-300">
                  پیش‌نمایش دستیار هوشمند شما (سبک اینستاگرام):
                </span>
                <button
                  type="button"
                  (click)="randomizeAvatar()"
                  class="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-purple-600/30 text-purple-200 hover:bg-purple-600 hover:text-white transition cursor-pointer"
                >
                  🎲 تصادفی
                </button>
              </div>

              <app-avatar-card
                [customization]="avatarConfig"
                state="happy"
                [voiceReply]="'سلام ' + (name.trim() || 'دوست من') + '! من آماده‌ام مغز روزمره‌ات رو بسازم!'"
              ></app-avatar-card>
            </div>

            <!-- Skin Tone -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-1.5">۱. رنگ پوست:</span>
              <div class="grid grid-cols-6 gap-1.5">
                @for (skin of skinTones; track skin.id) {
                  <button
                    type="button"
                    (click)="avatarConfig.skinTone = skin.id"
                    class="p-1 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer"
                    [ngClass]="avatarConfig.skinTone === skin.id ? 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400' : 'border-slate-800 bg-slate-950/60'"
                  >
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-slate-900 font-bold shadow" [style.background-color]="skin.hex">
                      @if (avatarConfig.skinTone === skin.id) { ✓ }
                    </span>
                    <span class="text-[8px] text-slate-300 truncate w-full text-center">{{ skin.name }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Hair Style -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-1.5">۲. مدل مو:</span>
              <div class="grid grid-cols-3 gap-1.5">
                @for (h of hairStyles.slice(0, 6); track h.id) {
                  <button
                    type="button"
                    (click)="avatarConfig.hairStyle = h.id"
                    class="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center"
                    [ngClass]="avatarConfig.hairStyle === h.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                  >
                    <span class="text-lg mb-0.5">{{ h.icon }}</span>
                    <span class="text-[10px] font-bold truncate w-full">{{ h.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Outfit Style -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-1.5">۳. استایل لباس:</span>
              <div class="grid grid-cols-3 gap-1.5">
                @for (outfit of outfitStyles.slice(0, 3); track outfit.id) {
                  <button
                    type="button"
                    (click)="avatarConfig.outfitStyle = outfit.id"
                    class="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center"
                    [ngClass]="avatarConfig.outfitStyle === outfit.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                  >
                    <span class="text-xl mb-0.5">{{ outfit.icon }}</span>
                    <span class="text-[10px] font-bold truncate w-full">{{ outfit.label }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- Navigation Buttons -->
        <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          @if (currentStep() > 1) {
            <button
              type="button"
              (click)="previousStep()"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              ← بازگشت
            </button>
          } @else {
            <div></div>
          }

          @if (currentStep() < 3) {
            <button
              type="button"
              (click)="nextStep()"
              [disabled]="currentStep() === 1 && !name.trim()"
              class="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed interactive-spring cursor-pointer flex items-center gap-1.5"
            >
              <span>مرحله بعد</span>
              <span>→</span>
            </button>
          } @else {
            <button
              type="button"
              (click)="submitWizard()"
              [disabled]="isSubmitting()"
              class="px-6 py-3 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-900/60 disabled:opacity-50 interactive-spring cursor-pointer flex items-center gap-2"
            >
              <span>تکمیل و ساخت مغز هوش مصنوعی</span>
              <span>🧠✨</span>
            </button>
          }
        </div>
      </div>

      <!-- Loading Overlay when generating AI Guidelines -->
      @if (isSubmitting()) {
        <div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div class="relative w-20 h-20 mb-4">
            <div class="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">
              🧠
            </div>
          </div>

          <h3 class="text-base font-bold text-white mb-1">
            در حال ساخت مغز و قوانین هوش مصنوعی...
          </h3>
          <p class="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
            هوش مصنوعی بر اساس سبک زندگی، ساعات خواب و اهداف شما در حال تنظیم لحن و برنامه اختصاصی است.
          </p>

          <!-- Loading Progress Pill -->
          <div class="flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[11px] text-purple-300 shadow-inner">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span>در حال نگارش هوشمند AI Guidelines...</span>
          </div>
        </div>
      }
    </div>
  `,
})
export class WizardComponent {
  private readonly apiService = inject(ApiService);
  private readonly themeService = inject(ThemeService);

  @Output() completed = new EventEmitter<UserProfile>();

  readonly currentStep = signal<number>(1);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Step 1 State
  name: string = '';
  wakeTime: string = '07:00';
  sleepTime: string = '23:00';

  // Step 2 State
  selectedGoal: string = 'productivity';
  selectedStress: string = 'balanced';
  selectedTone: string = 'friendly';

  // Step 3 State: Full Instagram Avatar Customization
  avatarConfig: AvatarCustomization = { ...DEFAULT_AVATAR_CUSTOMIZATION };

  readonly skinTones = SKIN_TONE_OPTIONS;
  readonly faceShapes = FACE_SHAPE_OPTIONS;
  readonly hairStyles = HAIR_STYLE_OPTIONS;
  readonly hairColors = HAIR_COLOR_OPTIONS;
  readonly eyeShapes = EYE_SHAPE_OPTIONS;
  readonly outfitStyles = OUTFIT_STYLE_OPTIONS;

  readonly goalOptions: LifestyleQuestionOption[] = [
    {
      id: 'productivity',
      label: 'افزایش تمرکز و بهره‌وری',
      description: 'پیشبرد منظم کارهای سنگین و تسک‌های کاری',
      icon: '🚀',
    },
    {
      id: 'balance',
      label: 'تعادل کار و زندگی (Work-Life Balance)',
      description: 'پیشگیری از فرسودگی شغلی و ایجاد زمان استراحت',
      icon: '⚖️',
    },
    {
      id: 'mindfulness',
      label: 'کاهش استرس و آرامش ذهن',
      description: 'تمرکز بر خودمراقبتی، ورزش ملایم و حال خوب',
      icon: '🧘',
    },
  ];

  readonly stressOptions: LifestyleQuestionOption[] = [
    { id: 'relaxed', label: 'آرام و سبک', description: '', icon: '🍃' },
    { id: 'balanced', label: 'متعادل و نرمال', description: '', icon: '⚡' },
    { id: 'high', label: 'فشرده و پرفشار', description: '', icon: '🔥' },
  ];

  readonly toneOptions: LifestyleQuestionOption[] = [
    {
      id: 'friendly',
      label: 'دوست صمیمی و پرانرژی',
      description: 'گفتار خودمانی، انگیزاننده و بمب انرژی',
      icon: '🎉',
    },
    {
      id: 'coach',
      label: 'مربی قاطع و باانگیزه',
      description: 'تمرکز جدی بر ددلاین‌ها و تعهد بدون بهانه',
      icon: '🎯',
    },
    {
      id: 'calm',
      label: 'راهنمای آرامش‌بخش و همدل',
      description: 'لحن شمرده، گوش شنوا و کاهش‌دهنده اضطراب',
      icon: '🌱',
    },
  ];

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'شناخت اولیه و روتین خواب';
      case 2: return 'ارزیابی سبک زندگی و اهداف';
      case 3: return 'طراحی آواتار و چهره شما';
      default: return 'راه‌اندازی اختصاصی';
    }
  }

  getStepSubtitle(): string {
    switch (this.currentStep()) {
      case 1: return 'نام و ساعات بیداری و خواب خود را مشخص کنید تا برنامه روزانه‌تان هوشمندانه تنظیم شود.';
      case 2: return 'با چند پرسش کوتاه، هوش مصنوعی لحن و برنامه اختصاصی شما را کشف می‌کند.';
      case 3: return 'چهره، مو، پوست و استایل آواتار اختصاصی خودت رو مثل اینستاگرام بساز!';
      default: return '';
    }
  }

  randomizeAvatar(): void {
    this.avatarConfig = this.themeService.getRandomAvatar();
  }

  nextStep(): void {
    if (this.currentStep() === 1) {
      if (!this.name.trim()) {
        this.errorMessage.set('لطفاً نام یا لقبتون رو وارد کنید.');
        return;
      }
      this.errorMessage.set(null);
      this.currentStep.set(2);
      return;
    }

    if (this.currentStep() === 2) {
      this.currentStep.set(3);
      return;
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  submitWizard(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: ProfileSetupPayload = {
      name: this.name.trim() || 'کاربر',
      wake_time: this.wakeTime,
      sleep_time: this.sleepTime,
      avatar_config: this.avatarConfig,
      lifestyle_answers: {
        mainGoal: this.selectedGoal,
        stressLevel: this.selectedStress,
        aiTone: this.selectedTone,
      },
    };

    // Save avatar configuration to ThemeService
    this.themeService.saveCustomization(this.avatarConfig);

    this.apiService.setupProfile(payload).subscribe({
      next: (profile) => {
        this.isSubmitting.set(false);
        this.completed.emit(profile);
      },
      error: (err) => {
        console.error('Profile setup error:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set('خطا در ذخیره پروفایل. لطفاً مجدداً تلاش کنید.');
      },
    });
  }
}
