import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ApiService, CURRENT_SCHEMA_VERSION } from '../../services/api.service';
import { TtsService } from '../../services/tts.service';
import {
  ThemeService,
  DEFAULT_AVATAR_CUSTOMIZATION,
  sanitizeAvatarConfig,
} from '../../services/theme.service';
import {
  UserProfile,
  AvatarCustomization,
  SpecialOccasion,
} from '../../models/task.model';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';
import { JalaliDatePickerModalComponent } from '../jalali-date-picker/jalali-date-picker-modal.component';
import { AvatarEditorComponent } from '../avatar-editor/avatar-editor.component';

type ProfileTab = 'general' | 'occasions' | 'catchphrases' | 'guidelines' | 'avatar' | 'settings';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicAvatarComponent, JalaliDatePickerModalComponent, AvatarEditorComponent],
  template: `
    <dialog
      #profileDialog
      class="fixed inset-0 z-50 p-4 m-auto rounded-2xl bg-[#1A1D2B] backdrop-blur-2xl border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden outline-none animate-fade-in"
      [attr.closedby]="'any'"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profileModalTitle"
      (cancel)="onDialogCancel($event)"
      (click)="onDialogClick($event)"
      dir="rtl"
    >
      <!-- Dialog Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600/80 to-indigo-600/80 border border-white/20 flex items-center justify-center text-lg shadow-lg shadow-purple-900/40">
            👤
          </div>
          <div>
            <h3 id="profileModalTitle" class="text-base font-bold text-white tracking-tight">پروفایل، تنظیمات و آواتار</h3>
            <p class="text-[11px] text-slate-400">شخصی‌سازی سبک زندگی، مناسبت‌ها، پشتیبان‌گیری، حریم خصوصی و ظاهر</p>
          </div>
        </div>

        <button
          type="button"
          (click)="closeModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="بستن پنجره پروفایل"
        >
          ✕
        </button>
      </div>

      <!-- Tab Navigation with Horizontal Scroll (Hidden Scrollbar) -->
      <div class="flex items-center gap-1.5 my-3 p-1.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/10 shrink-0 overflow-x-auto flex-nowrap scrollbar-none no-scrollbar scroll-smooth touch-pan-x select-none">
        <button
          type="button"
          (click)="activeTab.set('general')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
          [ngClass]="activeTab() === 'general'
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>👤</span>
          <span>مشخصات و زمان</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('occasions')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
          [ngClass]="activeTab() === 'occasions'
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>🎉</span>
          <span>مناسبت‌ها</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('catchphrases')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
          [ngClass]="activeTab() === 'catchphrases'
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>💬</span>
          <span>تکیه‌کلام</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('guidelines')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
          [ngClass]="activeTab() === 'guidelines'
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>🧠</span>
          <span>راهنما و ریتم</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('avatar')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
          [ngClass]="activeTab() === 'avatar'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>🎨</span>
          <span>طراحی آواتار</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('settings')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
          [ngClass]="activeTab() === 'settings'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/40'
            : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>⚙️</span>
          <span>پشتیبان‌گیری و تنظیمات</span>
        </button>
      </div>

      <!-- Scrollable Tab Content -->
      <div class="flex-1 overflow-y-auto px-1 py-1 space-y-4">
        
        <!-- TAB 1: General Info & Schedule -->
        @if (activeTab() === 'general') {
          <div class="space-y-4 animate-fade-in">
            <!-- Name Input -->
            <div class="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
              <label for="profileName" class="block text-xs font-bold text-slate-300 mb-1.5">
                نام یا لقب شما:
              </label>
              <input
                id="profileName"
                type="text"
                [(ngModel)]="editName"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
              />
            </div>

            <!-- Schedule: Wake & Sleep -->
            <div class="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3">
              <span class="block text-xs font-bold text-purple-300">
                ⏰ بازه فعالیت و روتین شبانه‌روز:
              </span>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="profileWakeTime" class="block text-[11px] font-semibold text-slate-400 mb-1">
                    🌅 ساعت بیداری:
                  </label>
                  <input
                    id="profileWakeTime"
                    type="time"
                    [(ngModel)]="editWakeTime"
                    class="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>

                <div>
                  <label for="profileSleepTime" class="block text-[11px] font-semibold text-slate-400 mb-1">
                    🌙 ساعت خواب:
                  </label>
                  <input
                    id="profileSleepTime"
                    type="time"
                    [(ngModel)]="editSleepTime"
                    class="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>
              </div>

              <p class="text-[11px] text-slate-300 leading-relaxed bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/20">
                💡 <strong class="text-purple-200">نکته ریتم زیستی:</strong> الگوریتم برنامه‌ریزی هوشمند تَسکی مانع زمان‌بندی تسک‌ها در ساعات خواب شما می‌شود.
              </p>
            </div>
          </div>
        }

        <!-- TAB 2: SPECIAL OCCASIONS -->
        @if (activeTab() === 'occasions') {
          <div class="space-y-4 animate-fade-in">
            <div class="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/20">
              <p class="text-xs text-purple-200 leading-relaxed">
                🎉 تاریخ‌های مهم زندگی‌تان (تولد، سالگرد، سررسیدها) را ثبت کنید. تسکی در <strong>روز قبل</strong> و <strong>خود روز مناسبت</strong> به عنوان یادآور روزانه به شما نمایش می‌دهد.
              </p>
            </div>

            <!-- Add new occasion card -->
            <div class="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2.5">
              <span class="text-xs font-bold text-white block">➕ افزودن مناسبت جدید:</span>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  [(ngModel)]="newOccasionTitle"
                  placeholder="عنوان (مثلاً: تولد همسرم، سالگرد عقد)"
                  class="sm:col-span-6 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
                />
                <div class="sm:col-span-4 flex items-center gap-1">
                  <input
                    type="text"
                    [(ngModel)]="newOccasionDate"
                    placeholder="تاریخ شمسی (مثلاً: 08-15)"
                    class="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs text-center font-mono outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    (click)="isDatePickerOpen = true"
                    class="p-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white transition cursor-pointer text-xs shrink-0"
                    title="انتخاب از تقویم شمسی 📅"
                  >
                    📅
                  </button>
                </div>
                <button
                  type="button"
                  (click)="addOccasion()"
                  [disabled]="!newOccasionTitle.trim() || !newOccasionDate.trim()"
                  class="sm:col-span-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-purple-900/40"
                >
                  ثبت
                </button>
              </div>
            </div>

            <!-- Occasions List -->
            <div class="space-y-2">
              <span class="text-xs font-bold text-slate-300 block">مناسبت‌های ثبت‌شده شما ({{ editOccasions.length }} مورد):</span>
              @if (editOccasions.length === 0) {
                <div class="p-6 text-center text-xs text-slate-400 rounded-2xl bg-white/5 border border-white/5">
                  هنوز هیچ مناسبتی ثبت نکرده‌اید.
                </div>
              } @else {
                <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  @for (occ of editOccasions; track occ.id) {
                    <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs">
                      <div class="flex items-center gap-2">
                        <span class="text-base">{{ occ.icon || '🎁' }}</span>
                        <div>
                          <div class="font-bold text-white">{{ occ.title }}</div>
                          <div class="text-[10px] text-purple-300 font-mono">{{ occ.date }}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="removeOccasion(occ.id)"
                        class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="حذف مناسبت"
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

        <!-- TAB 3: User Catchphrases -->
        @if (activeTab() === 'catchphrases') {
          <div class="space-y-4 animate-fade-in">
            <div class="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/20">
              <p class="text-xs text-purple-200 leading-relaxed">
                🗣️ تکیه‌کلام‌های روزمره شما: در پیام‌های انگیزشی و صحبت‌های روزانه دستیار از این عبارات استفاده خواهد شد.
              </p>
            </div>

            <!-- Add custom catchphrase -->
            <div class="flex gap-2">
              <input
                type="text"
                [(ngModel)]="newCatchphrase"
                (keydown.enter)="addCatchphrase()"
                placeholder="تکیه‌کلام جدید (مثلاً: دمت گرم، پرانرژی...)"
                class="flex-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
              />
              <button
                type="button"
                (click)="addCatchphrase()"
                [disabled]="!newCatchphrase.trim()"
                class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
              >
                + افزودن
              </button>
            </div>

            <!-- Active Catchphrases -->
            <div>
              <span class="text-xs font-bold text-slate-300 block mb-2">تکیه‌کلام‌های فعال:</span>
              <div class="flex flex-wrap gap-1.5">
                @for (phrase of editCatchphrases; track phrase) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-200 text-xs font-medium">
                    <span>{{ phrase }}</span>
                    <button
                      type="button"
                      (click)="removeCatchphrase(phrase)"
                      class="text-purple-300 hover:text-white transition cursor-pointer text-xs"
                    >✕</button>
                  </span>
                }
              </div>
            </div>

            <!-- Preset Suggestions -->
            <div class="pt-2 border-t border-white/10">
              <span class="text-xs font-bold text-slate-400 block mb-2">💡 پیشنهادات آماده:</span>
              <div class="flex flex-wrap gap-1.5">
                @for (preset of presetCatchphrases; track preset) {
                  <button
                    type="button"
                    (click)="addPresetCatchphrase(preset)"
                    [disabled]="editCatchphrases.includes(preset)"
                    class="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-purple-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  >
                    + {{ preset }}
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- TAB 4: AI Persona & Guidelines -->
        @if (activeTab() === 'guidelines') {
          <div class="space-y-3 animate-fade-in">
            <div class="flex items-center justify-between">
              <label for="profileGuidelines" class="block text-xs font-bold text-slate-300">
                راهنما و ریتم رفتار دستیار شما:
              </label>

              <button
                type="button"
                (click)="regenerateGuidelines()"
                [disabled]="isRegenerating()"
                class="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/70 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <span>✨</span>
                <span>{{ isRegenerating() ? 'در حال بازنویسی...' : 'بازنویسی قوانین' }}</span>
              </button>
            </div>

            <textarea
              id="profileGuidelines"
              [(ngModel)]="editGuidelines"
              rows="8"
              class="w-full p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-white text-xs leading-relaxed focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-none font-mono"
              placeholder="قوانین ریتم شبانه‌روز، سبک کار و شیوه برنامه‌ریزی..."
            ></textarea>
          </div>
        }

        <!-- TAB 5: AVATAR CREATOR (SHARED COMPONENT) -->
        @if (activeTab() === 'avatar') {
          <div class="space-y-4 animate-fade-in">
            <!-- Live Preview Hero Card -->
            <div class="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-950/80 to-indigo-950/60 border border-purple-500/30 flex items-center gap-4">
              <div class="w-20 h-20 rounded-2xl bg-slate-950/80 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
                <app-dynamic-avatar
                  [customization]="editAvatarConfig"
                  state="happy"
                  [size]="84"
                ></app-dynamic-avatar>
              </div>

              <div class="flex-1 min-w-0">
                <span class="text-xs font-bold text-white block mb-0.5">
                  چهره اختصاصی شما
                </span>
                <p class="text-[11px] text-purple-200/80 leading-snug mb-2">
                  اجزای صورت، مو، چشم و استایل لباس را طبق سلیقه‌تان تغییر دهید.
                </p>

                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    (click)="randomizeAvatar()"
                    class="text-[11px] font-bold px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 transition cursor-pointer flex items-center gap-1 interactive-spring"
                  >
                    <span>🎲</span>
                    <span>پیشنهاد تصادفی</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- SHARED AVATAR EDITOR -->
            <app-avatar-editor
              [customization]="editAvatarConfig"
              (customizationChange)="onAvatarChange($event)"
            ></app-avatar-editor>
          </div>
        }

        <!-- TAB 6: SETTINGS, BACKUP & PRIVACY -->
        @if (activeTab() === 'settings') {
          <div class="space-y-4 animate-fade-in">
            <!-- 1. DATA BACKUP & RESTORE -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-base">💾</span>
                <div>
                  <h4 class="text-xs font-bold text-white">پشتیبان‌گیری و بازیابی داده‌ها (Local-First)</h4>
                  <p class="text-[10px] text-slate-400">تمام تسک‌ها، پروفایل و تنظیمات در مرورگر شما ذخیره شده‌اند (نسخه ۲)</p>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  (click)="downloadBackup()"
                  class="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>دریافت نسخه پشتیبان (JSON)</span>
                </button>

                <label
                  class="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>📤</span>
                  <span>بازیابی فایل پشتیبان</span>
                  <input
                    type="file"
                    accept=".json"
                    class="hidden"
                    (change)="onImportFileSelected($event)"
                  />
                </label>
              </div>

              @if (backupMessage) {
                <div
                  class="p-2.5 rounded-xl text-xs font-medium"
                  [ngClass]="backupSuccess ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'"
                >
                  {{ backupMessage }}
                </div>
              }
            </div>

            <!-- 2. PRIVACY & TTS SETTINGS -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-base">🔒</span>
                <div>
                  <h4 class="text-xs font-bold text-white">حریم خصوصی و سنتز گفتار (TTS)</h4>
                  <p class="text-[10px] text-slate-400">نحوه خوانش صوتی پیام‌های آواتار</p>
                </div>
              </div>

              <label class="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  [(ngModel)]="useLocalTtsOnly"
                  (change)="onTtsPrivacyToggle()"
                  class="mt-0.5 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-white/20"
                />
                <div class="text-xs leading-relaxed">
                  <span class="font-bold text-slate-200">صرفاً استفاده از صدای محلی مرورگر (عدم ارسال متن به سرور صوتی)</span>
                  <p class="text-[10px] text-slate-400 mt-0.5">
                    در حالت پیش‌فرض برای دستیابی به تلفظ طبیعی و باکیفیت فارسی، متن پاسخ‌های کوتاه آواتار به سرویس AvalAI ارسال می‌شود. با فعال‌سازی این گزینه، پردازش کاملاً داخل دستگاه باقی می‌ماند.
                  </p>
                </div>
              </label>
            </div>

            <!-- 3. BYOK EXTERNAL LLM CONFIGURATION -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-base">🔑</span>
                <div>
                  <h4 class="text-xs font-bold text-white">اتصال به مدل زبانی دلخواه (BYOK)</h4>
                  <p class="text-[10px] text-slate-400">اتصال اختیاری به سرور یا کلید OpenAI/پروکسی خودتان</p>
                </div>
              </div>

              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  [(ngModel)]="useCustomLlm"
                  class="rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-white/20"
                />
                <span class="text-xs font-bold text-slate-200">فعال‌سازی هوش مصنوعی خارجی</span>
              </label>

              @if (useCustomLlm) {
                <div class="space-y-2.5 pt-1 animate-fade-in">
                  <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-1">Base URL (پیش‌فرض OpenAI):</label>
                    <input
                      type="text"
                      [(ngModel)]="customLlmBaseUrl"
                      placeholder="https://api.openai.com/v1"
                      dir="ltr"
                      class="w-full px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs font-mono outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-1">API Key:</label>
                    <input
                      type="password"
                      [(ngModel)]="customLlmApiKey"
                      placeholder="sk-..."
                      dir="ltr"
                      class="w-full px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs font-mono outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-1">نام مدل (Model):</label>
                    <input
                      type="text"
                      [(ngModel)]="customLlmModel"
                      placeholder="gpt-4o-mini"
                      dir="ltr"
                      class="w-full px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs font-mono outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Dialog Footer -->
      <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-2.5 shrink-0">
        <button
          type="button"
          (click)="closeModal()"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
        >
          انصراف
        </button>

        <button
          type="button"
          (click)="saveProfile()"
          [disabled]="isSaving()"
          class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>✓</span>
          <span>{{ isSaving() ? 'در حال ذخیره...' : 'ذخیره تنظیمات' }}</span>
        </button>
      </div>

      <!-- Jalali Date Picker Sub-Modal -->
      @if (isDatePickerOpen) {
        <app-jalali-date-picker-modal
          [initialDateStr]="newOccasionDate"
          (dateSelected)="onDatePicked($event)"
          (close)="isDatePickerOpen = false"
        ></app-jalali-date-picker-modal>
      }
    </dialog>
  `,
  styles: [`
    dialog::backdrop {
      background: rgba(2, 6, 23, 0.85);
      backdrop-filter: blur(12px);
    }
  `],
})
export class ProfileModalComponent implements OnInit, OnDestroy {
  @ViewChild('profileDialog') dialogRef?: ElementRef<HTMLDialogElement>;

  @Input() profile: UserProfile | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<UserProfile>();

  private readonly apiService = inject(ApiService);
  private readonly themeService = inject(ThemeService);
  private readonly ttsService = inject(TtsService);

  readonly activeTab = signal<ProfileTab>('general');
  readonly isSaving = signal<boolean>(false);
  readonly isRegenerating = signal<boolean>(false);

  editName: string = '';
  editWakeTime: string = '07:00';
  editSleepTime: string = '23:00';
  editGuidelines: string = '';
  editAvatarConfig: AvatarCustomization = { ...DEFAULT_AVATAR_CUSTOMIZATION };

  // Occasions state
  isDatePickerOpen: boolean = false;
  editOccasions: SpecialOccasion[] = [];
  newOccasionTitle: string = '';
  newOccasionDate: string = '';

  // Catchphrases state
  editCatchphrases: string[] = [];
  newCatchphrase: string = '';
  readonly presetCatchphrases: string[] = [
    'دمت گرم',
    'بزن بریم',
    'حرکت کنیم',
    'عالیجناب',
    'ماشالله',
    'ایول',
    'گل کاشتی',
    'سلطان',
    'خداقوت',
    'فوق‌العاده‌ای',
  ];

  // Settings & Privacy & BYOK
  useLocalTtsOnly: boolean = false;
  useCustomLlm: boolean = false;
  customLlmBaseUrl: string = 'https://api.openai.com/v1';
  customLlmApiKey: string = '';
  customLlmModel: string = 'gpt-4o-mini';

  // Backup status
  backupMessage: string = '';
  backupSuccess: boolean = false;

  private readonly avatarAutoSaveSubject = new Subject<AvatarCustomization>();
  private avatarAutoSaveSub?: Subscription;

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.closeModal();
  }

  ngOnInit(): void {
    if (this.profile) {
      this.editName = this.profile.name || '';
      this.editWakeTime = this.profile.wake_time || '07:00';
      this.editSleepTime = this.profile.sleep_time || '23:00';
      this.editGuidelines = this.profile.ai_guidelines || '';
      this.editAvatarConfig = sanitizeAvatarConfig(this.profile.avatar_config || this.themeService.customization());
      this.editCatchphrases = Array.isArray(this.profile.catchphrases) ? [...this.profile.catchphrases] : ['دمت گرم', 'بزن بریم'];
      this.editOccasions = Array.isArray(this.profile.occasions) ? [...this.profile.occasions] : [];
      this.useLocalTtsOnly = this.profile.use_local_tts_only ?? this.ttsService.isLocalOnly();
      this.useCustomLlm = !!this.profile.use_custom_llm;
      this.customLlmBaseUrl = this.profile.custom_llm_base_url || 'https://api.openai.com/v1';
      this.customLlmApiKey = this.profile.custom_llm_api_key || '';
      this.customLlmModel = this.profile.custom_llm_model || 'gpt-4o-mini';
    } else {
      this.editAvatarConfig = sanitizeAvatarConfig(this.themeService.customization());
      this.editCatchphrases = ['دمت گرم', 'بزن بریم'];
      this.editOccasions = [];
      this.useLocalTtsOnly = this.ttsService.isLocalOnly();
    }

    // Debounced automatic backend synchronization for avatar edits
    this.avatarAutoSaveSub = this.avatarAutoSaveSubject.pipe(
      debounceTime(350),
      switchMap((config) => this.apiService.updateProfile({ avatar_config: config }))
    ).subscribe({
      next: () => {},
      error: (err) => console.warn('Auto-save profile avatar failed:', err),
    });
  }

  ngOnDestroy(): void {
    this.avatarAutoSaveSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  onAvatarChange(updated: AvatarCustomization): void {
    this.editAvatarConfig = updated;
    this.themeService.saveCustomization(updated);
    this.avatarAutoSaveSubject.next(updated);
  }

  randomizeAvatar(): void {
    this.editAvatarConfig = this.themeService.getRandomAvatar();
    this.themeService.saveCustomization(this.editAvatarConfig);
    this.avatarAutoSaveSubject.next(this.editAvatarConfig);
  }

  onTtsPrivacyToggle(): void {
    this.ttsService.setLocalOnly(this.useLocalTtsOnly);
  }

  downloadBackup(): void {
    this.apiService.downloadBackupFile();
    this.backupSuccess = true;
    this.backupMessage = 'فایل پشتیبان با موفقیت دانلود شد!';
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const res = this.apiService.importBackup(content);
      this.backupSuccess = res.success;
      this.backupMessage = res.message;
      if (res.success) {
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  onDatePicked(dateStr: string): void {
    this.newOccasionDate = dateStr;
    this.isDatePickerOpen = false;
  }

  addOccasion(): void {
    const title = this.newOccasionTitle.trim();
    const date = this.newOccasionDate.trim();
    if (!title || !date) return;

    const newOcc: SpecialOccasion = {
      id: 'occ_' + Date.now(),
      title,
      date,
      type: 'personal',
      icon: '🎁',
      description: 'مناسبت شخصی ثبت‌شده توسط کاربر',
    };

    this.editOccasions.push(newOcc);
    this.newOccasionTitle = '';
    this.newOccasionDate = '';
  }

  removeOccasion(id: string): void {
    this.editOccasions = this.editOccasions.filter((o) => o.id !== id);
  }

  addCatchphrase(): void {
    const phrase = this.newCatchphrase.trim();
    if (phrase && !this.editCatchphrases.includes(phrase)) {
      this.editCatchphrases.push(phrase);
    }
    this.newCatchphrase = '';
  }

  addPresetCatchphrase(phrase: string): void {
    if (phrase && !this.editCatchphrases.includes(phrase)) {
      this.editCatchphrases.push(phrase);
    }
  }

  removeCatchphrase(phrase: string): void {
    this.editCatchphrases = this.editCatchphrases.filter((p) => p !== phrase);
  }

  saveProfile(): void {
    this.isSaving.set(true);

    const changes: Partial<UserProfile> = {
      name: this.editName.trim() || 'کاربر',
      wake_time: this.editWakeTime,
      sleep_time: this.editSleepTime,
      ai_guidelines: this.editGuidelines,
      avatar_config: this.editAvatarConfig,
      catchphrases: this.editCatchphrases,
      occasions: this.editOccasions,
      use_local_tts_only: this.useLocalTtsOnly,
      use_custom_llm: this.useCustomLlm,
      custom_llm_base_url: this.customLlmBaseUrl.trim(),
      custom_llm_api_key: this.customLlmApiKey.trim(),
      custom_llm_model: this.customLlmModel.trim(),
    };

    // Save to ThemeService and localStorage
    this.themeService.saveCustomization(this.editAvatarConfig);
    this.ttsService.setLocalOnly(this.useLocalTtsOnly);

    this.apiService.updateProfile(changes).subscribe({
      next: (updatedProfile) => {
        this.apiService.syncOccasions();
        this.isSaving.set(false);
        this.saved.emit(updatedProfile);
        this.closeModal();
      },
      error: (err) => {
        console.error('Error saving profile:', err);
        this.isSaving.set(false);
        this.closeModal();
      },
    });
  }

  regenerateGuidelines(): void {
    this.isRegenerating.set(true);
    const mockLifestyle = this.profile?.psychology_profile || {
      mainGoal: 'بهره‌وری و رشد فردی',
      stressLevel: 'متعادل',
      aiTone: 'دوست صمیمی و پرانرژی',
    };

    this.apiService
      .generateAiGuidelines(this.editWakeTime, this.editSleepTime, mockLifestyle)
      .subscribe({
        next: (guidelines) => {
          this.isRegenerating.set(false);
          if (guidelines) {
            this.editGuidelines = guidelines;
          }
        },
        error: (err) => {
          console.error('Error regenerating AI guidelines:', err);
          this.isRegenerating.set(false);
        },
      });
  }

  closeModal(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && dialog.open) {
      dialog.close();
    }
    this.close.emit();
  }

  onDialogCancel(event: Event): void {
    event.preventDefault();
    this.closeModal();
  }

  onDialogClick(event: MouseEvent): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && event.target === dialog) {
      this.closeModal();
    }
  }
}
