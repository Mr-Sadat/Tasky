import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ThemeService, THEME_PRESETS, ThemePreset } from '../../services/theme.service';
import {
  UserProfile,
  ProfileSetupPayload,
  AvatarCustomization,
  AvatarBaseType,
  ThemeColor,
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

        <!-- STEP 1: Name & Schedule -->
        @if (currentStep() === 1) {
          <div class="space-y-5 animate-fade-in">
            <!-- Name Field -->
            <div>
              <label for="userNameInput" class="block text-xs font-bold text-slate-300 mb-2">
                نام یا لقب شما چیه؟ <span class="text-purple-400">*</span>
              </label>
              <div class="relative">
                <input
                  id="userNameInput"
                  type="text"
                  [(ngModel)]="name"
                  placeholder="مثلاً: سارا، علی، کاپیتان"
                  maxlength="40"
                  class="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-100 text-sm placeholder:text-slate-500 outline-none transition"
                />
                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">👤</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1.5">تَسکی شما رو با این نام صدا می‌زنه.</p>
            </div>

            <!-- Wake & Sleep Times -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-4">
              <span class="block text-xs font-bold text-purple-300">
                ⏰ ساعت خواب و بیداری روزمره:
              </span>

              <div class="grid grid-cols-2 gap-3">
                <!-- Wake Time -->
                <div>
                  <label for="wakeTimeInput" class="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    🌅 بیداری صبح:
                  </label>
                  <input
                    id="wakeTimeInput"
                    type="time"
                    [(ngModel)]="wakeTime"
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>

                <!-- Sleep Time -->
                <div>
                  <label for="sleepTimeInput" class="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    🌙 خواب شب:
                  </label>
                  <input
                    id="sleepTimeInput"
                    type="time"
                    [(ngModel)]="sleepTime"
                    class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>
              </div>

              <div class="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-start gap-2">
                <span class="text-purple-400 mt-0.5">💡</span>
                <span>هوش مصنوعی یادآورها و تسک‌های روز شما را فقط در بازه بیداری برنامه‌ریزی می‌کند تا استراحت شما مختل نشود.</span>
              </div>
            </div>
          </div>
        }

        <!-- STEP 2: Lifestyle Questionnaire -->
        @if (currentStep() === 2) {
          <div class="space-y-5 animate-fade-in max-h-[60vh] overflow-y-auto px-1 py-1">
            <!-- Question 1: Main Goal -->
            <div>
              <span class="block text-xs font-bold text-slate-200 mb-2">
                ۱. هدف اصلی شما در این روزها چیه؟
              </span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        <!-- STEP 3: Layered Avatar Studio -->
        @if (currentStep() === 3) {
          <div class="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto px-1">
            <!-- Live Preview -->
            <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <span class="text-[11px] font-semibold text-purple-300 mb-1.5 block">
                پیش‌نمایش دستیار هوشمند شما:
              </span>
              <app-avatar-card
                [customization]="avatarConfig"
                state="happy"
                [voiceReply]="'سلام ' + (name.trim() || 'دوست من') + '! من آماده‌ام مغز روزمره‌ات رو بسازم!'"
              ></app-avatar-card>
            </div>

            <!-- Character Base -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-2">۱. انتخاب کاراکتر:</span>
              <div class="grid grid-cols-4 gap-2">
                @for (base of baseTypes; track base.id) {
                  <button
                    type="button"
                    (click)="avatarConfig.baseType = base.id; applyThemePreview()"
                    class="p-2 rounded-2xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="avatarConfig.baseType === base.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                  >
                    <span class="text-2xl mb-1">{{ base.icon }}</span>
                    <span class="text-[11px] font-medium">{{ base.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Color Preset -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-2">۲. رنگ تم و اتمسفر:</span>
              <div class="grid grid-cols-5 gap-2">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    (click)="avatarConfig.themeColor = preset.id; applyThemePreview()"
                    class="p-2 rounded-2xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="avatarConfig.themeColor === preset.id
                      ? 'border-white bg-slate-800 shadow-md ring-2 ring-purple-400/40'
                      : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800'"
                  >
                    <span 
                      class="w-6 h-6 rounded-full mb-1 flex items-center justify-center text-xs text-white shadow-inner"
                      [style.background]="'linear-gradient(135deg, ' + preset.primaryHex + ', ' + preset.secondaryHex + ')'"
                    >
                      @if (avatarConfig.themeColor === preset.id) { ✓ }
                    </span>
                    <span class="text-[10px] font-medium text-slate-300 truncate w-full text-center">{{ preset.name }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Accessories -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-2">۳. اکسسوری بامزه:</span>
              <div class="grid grid-cols-5 gap-1.5">
                @for (acc of accessories; track acc.id) {
                  <button
                    type="button"
                    (click)="avatarConfig.accessory = acc.id"
                    class="p-2 rounded-2xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="avatarConfig.accessory === acc.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                  >
                    <span class="text-xl mb-1">{{ acc.icon }}</span>
                    <span class="text-[10px] font-medium truncate w-full text-center">{{ acc.label }}</span>
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

        @if (errorMessage()) {
          <div class="mt-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs text-center">
            {{ errorMessage() }}
          </div>
        }
      </div>

      <!-- Cool Dynamic Loading Overlay: "Generating your custom AI brain 🧠✨" -->
      @if (isSubmitting()) {
        <div class="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in" dir="rtl">
          <!-- Animated Brain Visual -->
          <div class="relative w-32 h-32 mb-6 flex items-center justify-center">
            <!-- Pulsing Rings -->
            <div class="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" style="animation-duration: 2.5s;"></div>
            <div class="absolute inset-2 rounded-full border border-indigo-500/40 animate-pulse"></div>
            <div class="absolute inset-4 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-600/30 blur-md"></div>
            
            <!-- Neon Brain Icon -->
            <div class="relative text-5xl animate-bounce" style="animation-duration: 1.8s;">
              🧠
            </div>

            <!-- Orbiting Sparkles -->
            <div class="absolute -top-1 -right-1 text-xl animate-spin" style="animation-duration: 6s;">
              ✨
            </div>
            <div class="absolute -bottom-1 -left-1 text-lg animate-spin" style="animation-duration: 4s; animation-direction: reverse;">
              ⚡
            </div>
          </div>

          <!-- Dynamic Text -->
          <h3 class="text-lg font-black bg-gradient-to-r from-purple-200 via-indigo-200 to-pink-200 bg-clip-text text-transparent mb-2">
            در حال تحلیل سبک زندگی و ساخت مغز هوش مصنوعی اختصاصی شما... 🧠✨
          </h3>
          <p class="text-xs text-slate-300 max-w-sm leading-relaxed mb-4">
            تَسکی در حال یادگیری بازه خواب و بیداری ({{ wakeTime }} تا {{ sleepTime }})، اهداف، لحن صمیمی و تدوین قوانین زمان‌بندی اختصاصی برای {{ name }} عزیز است.
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

  // Step 3 State
  avatarConfig: AvatarCustomization = {
    baseType: 'robot',
    themeColor: 'purple',
    accessory: 'none',
  };

  readonly presets: ThemePreset[] = THEME_PRESETS;

  readonly baseTypes: { id: AvatarBaseType; label: string; icon: string }[] = [
    { id: 'robot', label: 'ربات', icon: '🤖' },
    { id: 'kitty', label: 'پیشی', icon: '🐱' },
    { id: 'bear', label: 'خرسی', icon: '🐻' },
    { id: 'alien', label: 'فضایی', icon: '👾' },
  ];

  readonly accessories: { id: AvatarAccessory; label: string; icon: string }[] = [
    { id: 'none', label: 'ساده', icon: '✨' },
    { id: 'glasses', label: 'عینک', icon: '👓' },
    { id: 'party_hat', label: 'کلاه جشن', icon: '🥳' },
    { id: 'headset', label: 'هدفون', icon: '🎧' },
    { id: 'wizard_star', label: 'ستاره', icon: '⭐' },
  ];

  readonly goalOptions: LifestyleQuestionOption[] = [
    {
      id: 'productivity',
      label: 'افزایش تمرکز و بهره‌وری',
      description: 'پیشبرد منظم کارهای سنگین و تسک‌های کاری',
      icon: '🚀',
    },
    {
      id: 'work_life_balance',
      label: 'تعادل کار و زندگی',
      description: 'کاهش فرسودگی، استراحت کافی و آرامش',
      icon: '⚖️',
    },
    {
      id: 'health_fitness',
      label: 'سلامتی، ورزش و تحرک',
      description: 'استمرار تمرین، آب نوشیدن و نظم روزانه',
      icon: '🏃',
    },
    {
      id: 'learning_study',
      label: 'یادگیری و مطالعه منظم',
      description: 'کتاب‌خوانی و تقویت مهارت‌های جدید',
      icon: '📚',
    },
  ];

  readonly stressOptions: LifestyleQuestionOption[] = [
    { id: 'light', label: 'آرام و سبک', description: '', icon: '🍃' },
    { id: 'balanced', label: 'متوسط و منظم', description: '', icon: '⚡' },
    { id: 'high_intensity', label: 'فشرده و پرفشار', description: '', icon: '🔥' },
  ];

  readonly toneOptions: LifestyleQuestionOption[] = [
    {
      id: 'friendly',
      label: 'دوست صمیمی',
      description: 'پرانرژی، مهربان و مشوق',
      icon: '🥰',
    },
    {
      id: 'strict_coach',
      label: 'مربی جدی',
      description: 'دقیق، منظم و نتیجه‌گرا',
      icon: '🎯',
    },
    {
      id: 'calm_guide',
      label: 'راهنمای آرامش‌بخش',
      description: 'صبور، بدون استرس و ملایم',
      icon: '🧘',
    },
  ];

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'به تَسکی خوش اومدی! 👋';
      case 2:
        return 'پرسشنامه سبک زندگی 📝';
      case 3:
        return 'طراحی آواتار و استایل شخصی 🎨';
      default:
        return 'راه‌اندازی اختصاصی';
    }
  }

  getStepSubtitle(): string {
    switch (this.currentStep()) {
      case 1:
        return 'ابتدا نام و ساعات روتین بیداری و خوابت رو وارد کن تا برنامه متناسب با زمانت چیده بشه.';
      case 2:
        return 'با پاسخ به این ۳ پرسش کوتاه، هوش مصنوعی دقیقاً رفتار و لحن دستیارت رو مطابق روحیه تو تنظیم می‌کنه.';
      case 3:
        return 'کاراکتر، رنگ تم و اکسسوری دلخواه همراهت رو انتخاب کن!';
      default:
        return '';
    }
  }

  nextStep(): void {
    if (this.currentStep() === 1 && !this.name.trim()) {
      this.errorMessage.set('لطفاً نام خود را وارد کنید.');
      return;
    }
    this.errorMessage.set(null);
    if (this.currentStep() < 3) {
      this.currentStep.update((s) => s + 1);
    }
  }

  previousStep(): void {
    this.errorMessage.set(null);
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  applyThemePreview(): void {
    this.themeService.updateCustomization(this.avatarConfig);
  }

  submitWizard(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const goalLabel = this.goalOptions.find((g) => g.id === this.selectedGoal)?.label || 'بهره‌وری';
    const stressLabel = this.stressOptions.find((s) => s.id === this.selectedStress)?.label || 'متعادل';
    const toneLabel = this.toneOptions.find((t) => t.id === this.selectedTone)?.label || 'دوست صمیمی و پرانرژی';

    const payload: ProfileSetupPayload = {
      name: this.name.trim() || 'دوست من',
      wake_time: this.wakeTime || '07:00',
      sleep_time: this.sleepTime || '23:00',
      avatar_config: this.avatarConfig,
      lifestyle_answers: {
        mainGoal: goalLabel,
        stressLevel: stressLabel,
        aiTone: toneLabel,
      },
    };

    this.apiService.setupProfile(payload).subscribe({
      next: (profile) => {
        // Save to localStorage
        try {
          localStorage.setItem('tasky_user_profile', JSON.stringify(profile));
        } catch (e) {
          console.warn('Could not cache profile in localStorage:', e);
        }

        // Apply theme to ThemeService
        this.themeService.updateCustomization(profile.avatar_config);

        // Keep the cool brain screen visible for a brief moment for aesthetic satisfaction
        setTimeout(() => {
          this.isSubmitting.set(false);
          this.completed.emit(profile);
        }, 1200);
      },
      error: (err) => {
        console.error('Wizard setup failed:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set('خطا در برقراری ارتباط با سرور برای تولید مغز هوش مصنوعی.');
      },
    });
  }
}
