import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  ThemeService,
  SKIN_TONE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  OUTFIT_STYLE_OPTIONS,
  ACCESSORY_OPTIONS,
  DEFAULT_AVATAR_CUSTOMIZATION,
  sanitizeAvatarConfig,
} from '../../services/theme.service';
import {
  UserProfile,
  ProfileSetupPayload,
  AvatarCustomization,
  SpecialOccasion
} from '../../models/task.model';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';
import { JalaliDatePickerModalComponent } from '../jalali-date-picker/jalali-date-picker-modal.component';

export interface PsychQuestion {
  id: string;
  field: string;
  title: string;
  subtitle: string;
  options: { id: string; label: string; desc: string; icon: string }[];
}

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicAvatarComponent, JalaliDatePickerModalComponent],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-4 selection:bg-purple-600 selection:text-white relative overflow-hidden" dir="rtl">
      <!-- Ambient Glow Orbs -->
      <div class="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-purple-600/20 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none"></div>

      <!-- Main Wizard Container (Glassmorphism) -->
      <div class="w-full max-w-xl bg-slate-900/80 border border-white/15 rounded-3xl shadow-2xl backdrop-blur-2xl p-5 sm:p-7 flex flex-col relative z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] animate-fade-in max-h-[92vh] overflow-hidden">
        
        <!-- Header & Stepper -->
        <header class="mb-4 text-center shrink-0">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-2 shadow-inner">
            <span>✨</span>
            <span>راه‌اندازی اختصاصی تَسکی</span>
            <span class="text-[10px] text-purple-400">گام {{ currentStep() }} از ۵</span>
          </div>

          <h2 class="text-lg sm:text-xl font-black tracking-tight text-white mb-1">
            {{ getStepTitle() }}
          </h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {{ getStepSubtitle() }}
          </p>

          <!-- Stepper Progress Bar -->
          <div class="mt-3 flex items-center justify-center gap-1.5">
            @for (step of [1, 2, 3, 4, 5]; track step) {
              <div 
                class="h-1.5 rounded-full transition-all duration-300"
                [ngClass]="{
                  'w-10 bg-gradient-to-r from-purple-500 to-indigo-500 shadow-sm shadow-purple-500/50': currentStep() === step,
                  'w-6 bg-purple-600/60': currentStep() > step,
                  'w-4 bg-slate-800': currentStep() < step
                }"
              ></div>
            }
          </div>
        </header>

        <!-- Error Message Banner -->
        @if (errorMessage()) {
          <div class="mb-3 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-bounce">
            <span>⚠️</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- SCROLLABLE STEP CONTENT -->
        <div class="flex-1 overflow-y-auto px-1 py-1 space-y-4 pr-2">

          <!-- ======================================================== -->
          <!-- STEP 1: Basic Identity & Circadian Clock                 -->
          <!-- ======================================================== -->
          @if (currentStep() === 1) {
            <div class="space-y-4 animate-fade-in">
              <!-- Name Input -->
              <div>
                <label for="userName" class="block text-xs font-bold text-slate-200 mb-1.5">
                  نام یا لقبی که دوست داری صدات کنم:
                </label>
                <input
                  id="userName"
                  type="text"
                  [(ngModel)]="name"
                  placeholder="مثلاً: سارا، احمد، رفیق..."
                  class="w-full px-4 py-2.5 rounded-2xl bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 backdrop-blur-md transition"
                />
              </div>

              <!-- Wake & Sleep Time Pickers -->
              <div class="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3 backdrop-blur-md">
                <span class="block text-xs font-bold text-purple-300">
                  ⏰ ساعات بیداری و خواب شما در طول شبانه‌روز:
                </span>
                <p class="text-[11px] text-slate-400">
                  تَسکی هیچ برنامه‌ای خارج از این ساعات تنظیم نمی‌کنه تا خواب آرامی داشته باشی.
                </p>

                <div class="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label for="wakeTime" class="block text-[11px] font-semibold text-slate-300 mb-1">
                      🌅 بیداری صبح:
                    </label>
                    <input
                      id="wakeTime"
                      type="time"
                      [(ngModel)]="wakeTime"
                      class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label for="sleepTime" class="block text-[11px] font-semibold text-slate-300 mb-1">
                      🌙 خواب شب:
                    </label>
                    <input
                      id="sleepTime"
                      type="time"
                      [(ngModel)]="sleepTime"
                      class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- ======================================================== -->
          <!-- STEP 2: 10-Question Psychological & Productivity Test     -->
          <!-- ======================================================== -->
          @if (currentStep() === 2) {
            <div class="space-y-4 animate-fade-in">
              <div class="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
                🧠 <strong>تست روانشناسی ۱۰ مرحله‌ای:</strong> پاسخ به این سوالات به هوش مصنوعی اجازه میده سبک زندگی، ریتم انرژی و انگیزه‌ات رو دقیق بشناسه.
              </div>

              @for (q of psychQuestions; track q.id; let idx = $index) {
                <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2.5 backdrop-blur-md">
                  <div>
                    <span class="text-xs font-bold text-white flex items-center gap-1.5">
                      <span class="w-5 h-5 rounded-full bg-purple-600/40 text-purple-300 text-[10px] flex items-center justify-center font-mono">
                        {{ idx + 1 }}
                      </span>
                      <span>{{ q.title }}</span>
                    </span>
                    <p class="text-[10px] text-slate-400 mt-0.5">{{ q.subtitle }}</p>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    @for (opt of q.options; track opt.id) {
                      <button
                        type="button"
                        (click)="answers[q.field] = opt.id"
                        class="p-2.5 rounded-xl border text-right transition cursor-pointer interactive-spring flex flex-col justify-between min-h-[75px]"
                        [ngClass]="answers[q.field] === opt.id
                          ? 'bg-purple-600/30 border-purple-400 text-white shadow-md shadow-purple-950/50 ring-1 ring-purple-400'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                      >
                        <div class="flex items-center gap-1.5 mb-1">
                          <span class="text-base">{{ opt.icon }}</span>
                          <span class="text-xs font-bold">{{ opt.label }}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 leading-snug">{{ opt.desc }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- ======================================================== -->
          <!-- STEP 3: Personal Milestones & Special Occasions          -->
          <!-- ======================================================== -->
          @if (currentStep() === 3) {
            <div class="space-y-4 animate-fade-in">
              <div class="p-3 rounded-2xl bg-pink-950/40 border border-pink-500/30 text-xs text-pink-200">
                🎂 <strong>مناسبت‌های مهم زندگی شما:</strong> تاریخ‌هایی مثل سالگرد ازدواج، تولد عزیزان و اهداف شخصی‌تون رو ثبت کنید تا در روز خودش و روز قبلش بهتون یادآوری کنیم!
              </div>

              <!-- Form to Add Occasion -->
              <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3 backdrop-blur-md">
                <span class="block text-xs font-bold text-slate-200">افزودن مناسبت جدید:</span>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div class="sm:col-span-2">
                    <input
                      type="text"
                      [(ngModel)]="newOccasionTitle"
                      placeholder="عنوان مناسبت (مثلاً: تولد همسرم، سالگرد عقد...)"
                      class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <div class="flex items-center gap-1">
                      <input
                        type="text"
                        [(ngModel)]="newOccasionDate"
                        placeholder="تاریخ شمسی (مثلاً: 08-15)"
                        class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs text-center outline-none focus:border-pink-500 font-mono"
                      />
                      <button
                        type="button"
                        (click)="isDatePickerOpen = true"
                        class="shrink-0 p-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-200 transition cursor-pointer text-xs"
                        title="انتخاب از تقویم شمسی 📅"
                      >
                        📅
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400">فرمت تاریخ: روز-ماه شمسی (مثلاً ۲۵ اردیبهشت = 02-25)</span>
                  <button
                    type="button"
                    (click)="addOccasion()"
                    [disabled]="!newOccasionTitle.trim()"
                    class="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer interactive-spring flex items-center gap-1 shadow-md shadow-pink-900/40"
                  >
                    <span>+</span>
                    <span>افزودن تاریخ</span>
                  </button>
                </div>
              </div>

              <!-- List of Added Occasions -->
              <div class="space-y-2">
                <span class="block text-xs font-bold text-slate-300">مناسبت‌های ثبت‌شده شما ({{ personalOccasions.length }} مورد):</span>
                @if (personalOccasions.length === 0) {
                  <p class="text-xs text-slate-500 py-3 text-center">هنوز مناسبتی ثبت نکردی. می‌تونی الان یا بعداً از پروفایل اضافه کنی.</p>
                } @else {
                  <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    @for (occ of personalOccasions; track occ.id) {
                      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                        <div class="flex items-center gap-2">
                          <span>{{ occ.icon || '🎉' }}</span>
                          <span class="font-bold text-slate-200">{{ occ.title }}</span>
                          <span class="px-2 py-0.5 rounded-md bg-pink-950 text-pink-300 font-mono text-[10px] border border-pink-500/30">
                            {{ occ.date }}
                          </span>
                        </div>
                        <button
                          type="button"
                          (click)="removeOccasion(occ.id)"
                          class="text-slate-500 hover:text-rose-400 text-sm px-2 cursor-pointer"
                          title="حذف"
                        >
                          ✕
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- ======================================================== -->
          <!-- STEP 4: User Favorite Catchphrases & Slang               -->
          <!-- ======================================================== -->
          @if (currentStep() === 4) {
            <div class="space-y-4 animate-fade-in">
              <div class="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200">
                🗣️ <strong>تیکه کلام‌های محبوب شما:</strong> چند کلمه یا اصطلاحی که زیاد به کار می‌بری رو انتخاب کن یا بنویس، تا هوش مصنوعی در جملات و تشویق‌های روزانه‌اش ازشون استفاده کنه!
              </div>

              <!-- Preset Tags -->
              <div>
                <span class="block text-xs font-bold text-slate-300 mb-2">پیشنهادهای آماده (کلیک کن تا اضافه بشه):</span>
                <div class="flex flex-wrap gap-1.5">
                  @for (tag of presetCatchphrases; track tag) {
                    <button
                      type="button"
                      (click)="toggleCatchphrase(tag)"
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer interactive-spring"
                      [ngClass]="selectedCatchphrases.includes(tag)
                        ? 'bg-amber-600/30 border-amber-400 text-amber-200 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'"
                    >
                      <span>{{ selectedCatchphrases.includes(tag) ? '✓ ' : '+ ' }}</span>
                      <span>{{ tag }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Custom Catchphrase Input -->
              <div class="p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2 backdrop-blur-md">
                <span class="block text-xs font-bold text-slate-300">افزودن تیکه کلام اختصاصی:</span>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="customCatchphrase"
                    (keydown.enter)="addCustomCatchphrase()"
                    placeholder="مثلاً: حرکت کنیم، چاکرم، به امید خدا..."
                    class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    (click)="addCustomCatchphrase()"
                    [disabled]="!customCatchphrase.trim()"
                    class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer interactive-spring"
                  >
                    افزودن
                  </button>
                </div>
              </div>

              <!-- Selected Tags Preview -->
              <div>
                <span class="block text-xs font-bold text-slate-300 mb-1.5">تیکه کلام‌های فعال شما:</span>
                <div class="flex flex-wrap gap-1.5 min-h-[30px]">
                  @for (p of selectedCatchphrases; track p) {
                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                      <span>«{{ p }}»</span>
                      <button (click)="removeCatchphrase(p)" class="text-amber-400 hover:text-white cursor-pointer">✕</button>
                    </span>
                  }
                </div>
              </div>
            </div>
          }

          <!-- ======================================================== -->
          <!-- STEP 5: Live Instagram-Style Avatar Customization        -->
          <!-- ======================================================== -->
          @if (currentStep() === 5) {
            <div class="space-y-4 animate-fade-in">
              <!-- Live Preview Card -->
              <div class="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/50 via-slate-900/80 to-indigo-950/50 border border-white/10 flex items-center gap-4 backdrop-blur-md">
                <div class="w-22 h-22 rounded-2xl bg-slate-950/70 border border-purple-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-purple-950/50">
                  <app-dynamic-avatar
                    [customization]="avatarConfig"
                    state="happy"
                    [size]="92"
                  ></app-dynamic-avatar>
                </div>
                <div class="flex-1 min-w-0 text-right">
                  <div class="inline-flex items-center gap-1 text-[10px] text-purple-300 font-bold mb-1">
                    <span>✨ پیش‌نمایش زنده دستیار شما</span>
                  </div>
                  <p class="text-xs font-medium text-slate-200">
                    سلام {{ name || 'دوست من' }}! هر تغییری بدی فوراً روی ظاهرم اعمال میشه.
                  </p>
                </div>
              </div>

              <!-- Skin Tone Selection -->
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

              <!-- Hair Style Selection -->
              <div>
                <span class="block text-xs font-bold text-slate-300 mb-1.5">۲. مدل مو:</span>
                <div class="grid grid-cols-3 gap-1.5">
                  @for (h of hairStyles; track h.id) {
                    <button
                      type="button"
                      (click)="avatarConfig.hairStyle = h.id"
                      class="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center"
                      [ngClass]="avatarConfig.hairStyle === h.id ? 'bg-purple-600/30 border-purple-500 text-white shadow-md' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'"
                    >
                      <span class="text-lg mb-0.5">{{ h.icon }}</span>
                      <span class="text-[10px] font-bold truncate w-full">{{ h.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Outfit Style Selection -->
              <div>
                <span class="block text-xs font-bold text-slate-300 mb-1.5">۳. استایل لباس:</span>
                <div class="grid grid-cols-3 gap-1.5">
                  @for (outfit of outfitStyles; track outfit.id) {
                    <button
                      type="button"
                      (click)="avatarConfig.outfitStyle = outfit.id"
                      class="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center"
                      [ngClass]="avatarConfig.outfitStyle === outfit.id ? 'bg-purple-600/30 border-purple-500 text-white shadow-md' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'"
                    >
                      <span class="text-xl mb-0.5">{{ outfit.icon }}</span>
                      <span class="text-[10px] font-bold truncate w-full">{{ outfit.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Accessories Selection -->
              <div>
                <span class="block text-xs font-bold text-slate-300 mb-1.5">۴. اکسسوری:</span>
                <div class="grid grid-cols-4 gap-1.5">
                  @for (acc of accessories.slice(0, 4); track acc.id) {
                    <button
                      type="button"
                      (click)="avatarConfig.accessory = acc.id"
                      class="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center"
                      [ngClass]="avatarConfig.accessory === acc.id ? 'bg-purple-600/30 border-purple-500 text-white shadow-md' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'"
                    >
                      <span class="text-xl mb-0.5">{{ acc.icon }}</span>
                      <span class="text-[10px] font-bold truncate w-full">{{ acc.label }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

        </div>

        <!-- NAVIGATION BUTTONS -->
        <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          @if (currentStep() > 1) {
            <button
              type="button"
              (click)="previousStep()"
              class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/80 border border-white/10 transition cursor-pointer"
            >
              ← مرحله قبل
            </button>
          } @else {
            <div></div>
          }

          @if (currentStep() < 5) {
            <button
              type="button"
              (click)="nextStep()"
              [disabled]="currentStep() === 1 && !name.trim()"
              class="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/40 disabled:opacity-50 disabled:cursor-not-allowed interactive-spring cursor-pointer flex items-center gap-1.5"
            >
              <span>گام بعدی</span>
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
        <div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div class="w-20 h-20 mb-4 rounded-3xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-4xl animate-bounce shadow-xl shadow-purple-900/50">
            🧠
          </div>
          <h3 class="text-base font-bold text-purple-200 mb-1">تَسکی در حال تدوین قوانین اختصاصی ذهن شماست...</h3>
          <p class="text-xs text-slate-400 max-w-xs leading-relaxed">
            بر اساس ۱۰ پاسخ روان‌شناسی، ساعات زیستی، مناسبت‌ها و تیکه کلام‌ها، بهترین الگوی برنامه‌ریزی در حال پیکربندی است.
          </p>
        </div>
      }

      <!-- Jalali Date Picker Modal in Wizard -->
      @if (isDatePickerOpen) {
        <app-jalali-date-picker-modal
          [initialDateStr]="newOccasionDate"
          (dateSelected)="newOccasionDate = $event; isDatePickerOpen = false"
          (close)="isDatePickerOpen = false"
        ></app-jalali-date-picker-modal>
      }
    </div>
  `
})
export class WizardComponent {
  private readonly apiService = inject(ApiService);
  private readonly themeService = inject(ThemeService);

  @Output() completed = new EventEmitter<UserProfile>();

  readonly currentStep = signal<number>(1);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  name: string = '';
  wakeTime: string = '07:00';
  sleepTime: string = '23:30';

  // Step 2 Answers: 10 Psychology questions
  answers: { [key: string]: string } = {
    chronotype: 'morning',
    planningStyle: 'structured',
    motivationDriver: 'reward',
    procrastinationStyle: 'breakdown',
    focusSpan: 'pomodoro',
    stressLevel: 'calm',
    workLifeBoundary: 'strict',
    aiTone: 'friendly',
    resilienceStyle: 'panic_defer',
    notificationPreference: 'voice_energetic'
  };

  // Step 3: Personal Occasions
  personalOccasions: SpecialOccasion[] = [
    { id: 'sample_bday', title: 'تولد همسرم / دوستم', date: '08-15', type: 'personal', icon: '🎂' }
  ];
  newOccasionTitle: string = '';
  newOccasionDate: string = '';
  isDatePickerOpen: boolean = false;

  // Step 4: Catchphrases
  readonly presetCatchphrases = [
    'دمت گرم', 'بزن بریم', 'حرکت کنیم', 'عالیجناب', 'پرانرژی باش', 'خدا قوت', 'حله چشم بسته'
  ];
  selectedCatchphrases: string[] = ['دمت گرم', 'بزن بریم', 'حرکت کنیم'];
  customCatchphrase: string = '';

  // Step 5: Avatar Customization
  avatarConfig: AvatarCustomization = { ...DEFAULT_AVATAR_CUSTOMIZATION };

  readonly skinTones = SKIN_TONE_OPTIONS;
  readonly faceShapes = FACE_SHAPE_OPTIONS;
  readonly hairStyles = HAIR_STYLE_OPTIONS;
  readonly outfitStyles = OUTFIT_STYLE_OPTIONS;
  readonly accessories = ACCESSORY_OPTIONS;

  // 10 Detailed Psychological Questions Dataset
  readonly psychQuestions: PsychQuestion[] = [
    {
      id: 'q1',
      field: 'chronotype',
      title: '۱. اوج انرژی و تمرکز فکری شما در چه ساعتی است؟',
      subtitle: 'شناخت ریتم بیولوژیکی (Chronotype) برای چیدمان تسک‌های سنگین',
      options: [
        { id: 'morning', label: 'چکاوک صبحگاهی', desc: 'بیشترین تمرکز از ۶ صبح تا ظهر', icon: '🌅' },
        { id: 'afternoon', label: 'میانه‌روز فعال', desc: 'انرژی اوج از ۱۱ صبح تا عصر', icon: '☀️' },
        { id: 'night', label: 'جغد شب متمرکز', desc: 'سکوت و خلاقیت از ۸ شب تا نیمه‌شب', icon: '🦉' }
      ]
    },
    {
      id: 'q2',
      field: 'planningStyle',
      title: '۲. سبک برنامه‌ریزی ایده‌آل شما چگونه است؟',
      subtitle: 'تعیین تیپ تصمیم‌گیری بر اساس شاخص MBTI (Judging vs Perceiving)',
      options: [
        { id: 'structured', label: 'ساختاریافته دقیق', desc: 'ساعت‌به‌ساعت و منظم', icon: '⏱️' },
        { id: 'flexible', label: 'منعطف و شناور', desc: 'فهرست کارها بدون ساعت خشک', icon: '🌊' },
        { id: 'hybrid', label: 'ترکیبی و اولویت‌دار', desc: 'فقط کارهای مهم ساعت‌دار', icon: '🎯' }
      ]
    },
    {
      id: 'q3',
      field: 'motivationDriver',
      title: '۳. چه چیزی بیشترین انگیزه را برای استارت کار به شما می‌دهد؟',
      subtitle: 'شناسایی سیستم پاداش و محرک‌های دوپامینی در کار',
      options: [
        { id: 'reward', label: 'پاداش و تیک زدن', desc: 'لذت پایان کار و حس پیشرفت', icon: '🏆' },
        { id: 'deadline', label: 'هیجان ددلاین', desc: 'آدرنالین چالش دقیقه نود', icon: '🔥' },
        { id: 'curiosity', label: 'کنجکاوی درونی', desc: 'علاقه به فرآیند و یادگیری', icon: '🧩' }
      ]
    },
    {
      id: 'q4',
      field: 'procrastinationStyle',
      title: '۴. وقتی با یک پروژه یا تسک خیلی بزرگ روبه‌رو می‌شوید چه می‌کنید؟',
      subtitle: 'رفتار در مواجهه با اهمال‌کاری و بار شناختی بالا',
      options: [
        { id: 'breakdown', label: 'خرد کردن فوری', desc: 'تقسیم به گام‌های ریز و شفاف', icon: '🧩' },
        { id: 'dive_in', label: 'شیرجه مستقیم', desc: 'شروع بی‌معطلی بدون وسواس', icon: '🏊' },
        { id: 'procrastinate', label: 'تعویق تا تلنگر', desc: 'نیاز به یادآور و هل دادن ملایم', icon: '⏳' }
      ]
    },
    {
      id: 'q5',
      field: 'focusSpan',
      title: '۵. طول بازه تمرکز عمیق (Deep Work) شما معمولاً چقدر است؟',
      subtitle: 'تنظیم طول تایمرها و حالت تمرکز عمیق',
      options: [
        { id: 'pomodoro', label: 'پومودورو کوتاه', desc: '۲۵ دقیقه کار + ۵ دقیقه استراحت', icon: '🍅' },
        { id: 'deep_block', label: 'بلاک عمیق طولانی', desc: '۶۰ تا ۹۰ دقیقه تمرکز بدون وقفه', icon: '⚡' },
        { id: 'multitask', label: 'تغییر متناوب', desc: 'جابه‌جایی سریع بین کارهای مختلف', icon: '🔀' }
      ]
    },
    {
      id: 'q6',
      field: 'stressLevel',
      title: '۶. زیر فشار حجم کاری زیاد و کارهای عقب‌افتاده چه حسی دارید؟',
      subtitle: 'مدیریت استرس و کنترل هیجانات شناختی',
      options: [
        { id: 'calm', label: 'خونسرد و مسلط', desc: 'اولویت‌بندی منطقی و خونسرد', icon: '🧘' },
        { id: 'action_oriented', label: 'تلاش با سرعت بالا', desc: 'افزایش سرعت برای جبران', icon: '⚡' },
        { id: 'overwhelmed', label: 'سردرگمی و کلافگی', desc: 'نیاز به مرتب‌سازی و خلوت کردن', icon: '🤯' }
      ]
    },
    {
      id: 'q7',
      field: 'workLifeBoundary',
      title: '۷. مرزبندی بین کار و اوقات شخصی زندگی‌تان چگونه است؟',
      subtitle: 'تعیین تعادل پایدار و ساعات خاموشی اعلان‌ها',
      options: [
        { id: 'strict', label: 'مرز سخت‌گیرانه', desc: 'قطع کامل کار در ساعت استراحت', icon: '🛑' },
        { id: 'fluid', label: 'شناور و آمیخته', desc: 'ترکیب آزاد کار و تفریح در روز', icon: '🔄' },
        { id: 'ambitious', label: 'هدف‌محور مداوم', desc: 'همیشه آماده پیگیری ایده‌ها', icon: '💼' }
      ]
    },
    {
      id: 'q8',
      field: 'aiTone',
      title: '۸. ترجیح می‌دهید لحن دستیار هوش مصنوعی شما چطور باشد؟',
      subtitle: 'تنظیم شخصیت، شوخ‌طبعی و نحوه بیان جملات آواتار',
      options: [
        { id: 'friendly', label: 'دوست صمیمی و شاد', desc: 'انرژی مثبت، تشویق و شوخ‌طبعی', icon: '🤗' },
        { id: 'coach', label: 'مربی قاطع و جدی', desc: 'صریح، کوتاه، بدون تعارف', icon: '💼' },
        { id: 'calm', label: 'مشاور صبور و آرام', desc: 'حمایت‌گر، آرامش‌بخش و باوقار', icon: '🧘' }
      ]
    },
    {
      id: 'q9',
      field: 'resilienceStyle',
      title: '۹. اگر اتفاق غیرمنتظره‌ای روزتان را به هم ریخت، چه استراتژی‌ای ترجیح می‌دهید؟',
      subtitle: 'تنظیم عملکرد دکمه اضطراری روز من به هم ریخت (Panic Button)',
      options: [
        { id: 'panic_defer', label: 'انتقال به فردا', desc: 'کارهای کم‌اهمیت فردا بروند', icon: '🍃' },
        { id: 'compress', label: 'فشرده‌سازی زمان', desc: 'تسک‌ها را کوتاه‌تر کن تا برسم', icon: '🚀' },
        { id: 'pause', label: 'استراحت و بازچینی', desc: 'توقف، نفس عمیق و شروع دوباره', icon: '☕' }
      ]
    },
    {
      id: 'q10',
      field: 'notificationPreference',
      title: '۱۰. شیوه ایده‌آل شما برای دریافت یادآوری و اعلان تسک‌ها چیست؟',
      subtitle: 'تنظیم فرکانس و نوع بازخورد صوتی و تصویری',
      options: [
        { id: 'voice_energetic', label: 'یادآوری صوتی زنده', desc: 'حرف زدن آواتار با وویس فارسی', icon: '🎙️' },
        { id: 'subtle_text', label: 'پیام متنی آرام', desc: 'اعلان بدون صدای بلند روی صفحه', icon: '💬' },
        { id: 'only_urgent', label: 'فقط کارهای حیاتی', desc: 'حداقل اعلان، فقط تسک‌های فوری', icon: '⚠️' }
      ]
    }
  ];

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 1: return 'مشخصات اولیه و ریتم خواب';
      case 2: return 'تست روانشناسی ۱۰ مرحله‌ای شخصیت و کار';
      case 3: return 'مناسبت‌ها و تاریخ‌های مهم زندگی شما';
      case 4: return 'تیکه کلام‌ها و عبارات محبوب شما';
      case 5: return 'طراحی آواتار و چهره اختصاصی';
      default: return 'راه‌اندازی اختصاصی';
    }
  }

  getStepSubtitle(): string {
    switch (this.currentStep()) {
      case 1: return 'نام و ساعت خواب و بیداری روزمره‌ات رو وارد کن.';
      case 2: return '۱۰ سوال برای تنظیم هوشمندانه ذهن، انرژی و زمان‌بندی تسک‌ها.';
      case 3: return 'تولدها، سالگردها و رویدادهای مهم که باید روز قبلش هم یادآوری شوند.';
      case 4: return 'اصطلاحات پرکاربرد شما که در جملات آواتار استفاده خواهد شد.';
      case 5: return 'رنگ پوست، مو، لباس و اکسسوری آواتارت رو زنده بساز.';
      default: return '';
    }
  }

  nextStep(): void {
    if (this.currentStep() === 1 && !this.name.trim()) {
      this.errorMessage.set('لطفاً نام یا لقبت رو وارد کن.');
      return;
    }
    this.errorMessage.set(null);
    if (this.currentStep() < 5) {
      this.currentStep.update((s) => s + 1);
    }
  }

  previousStep(): void {
    this.errorMessage.set(null);
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  addOccasion(): void {
    const title = this.newOccasionTitle.trim();
    const date = this.newOccasionDate.trim() || '01-01';
    if (!title) return;

    this.personalOccasions.push({
      id: 'occ_' + Date.now(),
      title,
      date,
      type: 'personal',
      icon: '🎉'
    });

    this.newOccasionTitle = '';
    this.newOccasionDate = '';
  }

  removeOccasion(id: string): void {
    this.personalOccasions = this.personalOccasions.filter((o) => o.id !== id);
  }

  toggleCatchphrase(tag: string): void {
    if (this.selectedCatchphrases.includes(tag)) {
      this.selectedCatchphrases = this.selectedCatchphrases.filter((t) => t !== tag);
    } else {
      this.selectedCatchphrases.push(tag);
    }
  }

  addCustomCatchphrase(): void {
    const phrase = this.customCatchphrase.trim();
    if (phrase && !this.selectedCatchphrases.includes(phrase)) {
      this.selectedCatchphrases.push(phrase);
      this.customCatchphrase = '';
    }
  }

  removeCatchphrase(phrase: string): void {
    this.selectedCatchphrases = this.selectedCatchphrases.filter((p) => p !== phrase);
  }

  submitWizard(): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: ProfileSetupPayload = {
      name: this.name.trim() || 'کاربر',
      wake_time: this.wakeTime,
      sleep_time: this.sleepTime,
      avatar_config: sanitizeAvatarConfig(this.avatarConfig),
      catchphrases: this.selectedCatchphrases,
      occasions: this.personalOccasions,
      lifestyle_answers: this.answers,
    };

    this.apiService.setupProfile(payload).subscribe({
      next: (profile) => {
        this.isSubmitting.set(false);
        this.themeService.saveCustomization(profile.avatar_config);
        this.completed.emit(profile);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set('خطا در ذخیره پروفایل. دوباره تلاش کن.');
      }
    });
  }
}
