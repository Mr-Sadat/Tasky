import { Component, ElementRef, EventEmitter, Input, OnInit, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
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
} from '../../services/theme.service';
import {
  UserProfile,
  AvatarCustomization,
  FaceShape,
  HairStyle,
  EyeShape,
  EyebrowStyle,
  MouthExpression,
  OutfitStyle,
  AvatarAccessory,
  SpecialOccasion,
} from '../../models/task.model';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';
import { JalaliDatePickerModalComponent } from '../jalali-date-picker/jalali-date-picker-modal.component';

type AvatarSubTab = 'face' | 'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessories';
type ProfileTab = 'general' | 'occasions' | 'catchphrases' | 'guidelines' | 'avatar';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicAvatarComponent, JalaliDatePickerModalComponent],
  template: `
    <dialog
      #profileDialog
      class="fixed inset-0 z-50 p-4 m-auto rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] text-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden outline-none animate-fade-in"
      [attr.closedby]="'any'"
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
            <h3 class="text-base font-bold text-white tracking-tight">پروفایل، مناسبت‌ها و آواتار</h3>
            <p class="text-[11px] text-slate-400">شخصی‌سازی سبک زندگی، مناسبت‌های مهم، تکیه‌کلام و ظاهر آواتار</p>
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

      <!-- Tab Navigation with Horizontal Scroll -->
      <div class="flex items-center gap-1.5 my-3 p-1.5 rounded-2xl bg-slate-950/60 backdrop-blur-md border border-white/10 shrink-0 overflow-x-auto flex-nowrap scrollbar-none">
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
          <span>مناسبت‌های من</span>
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
          <span>تکیه‌کلام AI</span>
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
          <span>قوانین هوش مصنوعی</span>
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
                💡 <strong class="text-purple-200">نکته هوشمند:</strong> هوش مصنوعی تَسکی اکیداً مانع برنامه‌ریزی هرگونه تسک در ساعات استراحت و خواب شما می‌شود.
              </p>
            </div>
          </div>
        }

        <!-- TAB 2: SPECIAL OCCASIONS (مناسبت‌های مهم من) -->
        @if (activeTab() === 'occasions') {
          <div class="space-y-4 animate-fade-in">
            <div class="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/20">
              <p class="text-xs text-purple-200 leading-relaxed">
                🎉 تاریخ‌های مهم زندگی‌تان (تولد، سالگرد، سررسیدها) را ثبت کنید. تسکی در <strong>روز قبل</strong> و <strong>خود روز مناسبت</strong> به عنوان نخستین و مهم‌ترین کار روز به شما یادآوری می‌کند!
              </p>
            </div>

            <!-- Add new occasion card -->
            <div class="p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2.5">
              <span class="text-xs font-bold text-white block">➕ افزودن مناسبت جدید:</span>
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  [(ngModel)]="newOccasionTitle"
                  placeholder="عنوان (مثلاً: تولد همسرم، سالگرد ازدواج)"
                  class="sm:col-span-6 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
                />
                <div class="sm:col-span-4 flex items-center gap-1">
                  <input
                    type="text"
                    [(ngModel)]="newOccasionDate"
                    placeholder="تاریخ (مثلاً 08-25)"
                    class="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white text-xs outline-none focus:border-purple-500 text-center font-mono"
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
                <button
                  type="button"
                  (click)="addOccasion()"
                  [disabled]="!newOccasionTitle.trim() || !newOccasionDate.trim()"
                  class="sm:col-span-2 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
                >
                  افزودن
                </button>
              </div>
            </div>

            <!-- Occasion List -->
            <div class="space-y-2">
              <span class="text-xs font-bold text-slate-300 block">مناسبت‌های ثبت‌شده شما ({{ editOccasions.length }} مورد):</span>
              
              @if (editOccasions.length === 0) {
                <div class="text-center py-6 px-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 text-xs">
                  هنوز مناسبتی ثبت نکرده‌اید. می‌توانید با فرم بالا تاریخ‌های مهم را اضافه کنید.
                </div>
              }

              @for (occ of editOccasions; track occ.id) {
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/30 transition">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ occ.icon || '🎁' }}</span>
                    <div>
                      <span class="text-xs font-bold text-white block">{{ occ.title }}</span>
                      <span class="text-[10px] text-purple-300 font-mono">{{ occ.date }}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeOccasion(occ.id)"
                    class="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center text-xs transition cursor-pointer"
                    title="حذف مناسبت"
                  >
                    🗑️
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 3: CATCHPHRASES (تکیه‌کلام‌های هوش مصنوعی) -->
        @if (activeTab() === 'catchphrases') {
          <div class="space-y-4 animate-fade-in">
            <div class="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/20">
              <p class="text-xs text-purple-200 leading-relaxed">
                💬 تکیه‌کلام‌ها و عبارات انگیزشی دلخواهتان را تعیین کنید تا هوش مصنوعی در پیام‌های صبحگاهی، گفتگوها و بازخوردهای تسکی از آن‌ها استفاده کند!
              </p>
            </div>

            <!-- Custom Catchphrase Input -->
            <div class="flex items-center gap-2">
              <input
                type="text"
                [(ngModel)]="newCatchphrase"
                (keydown.enter)="addCatchphrase()"
                placeholder="مثلاً: حرکت کنیم، بنازم، دلاور..."
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
              <span class="text-xs font-bold text-slate-300 block mb-2">تکیه‌کلام‌های فعال شما:</span>
              <div class="flex flex-wrap gap-1.5">
                @for (phrase of editCatchphrases; track phrase) {
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-400/40 text-purple-200 text-xs font-medium">
                    <span>{{ phrase }}</span>
                    <button
                      type="button"
                      (click)="removeCatchphrase(phrase)"
                      class="text-purple-300 hover:text-white transition cursor-pointer text-xs"
                    >✕</button>
                  </span>
                }
                @if (editCatchphrases.length === 0) {
                  <span class="text-xs text-slate-400 italic">هیچ تکیه‌کلامی انتخاب نشده است. از پیشنهادات زیر انتخاب کنید.</span>
                }
              </div>
            </div>

            <!-- Preset Suggestions -->
            <div class="pt-2 border-t border-white/10">
              <span class="text-xs font-bold text-slate-400 block mb-2">💡 پیشنهادات محبوب و صمیمی:</span>
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
                قوانین ۴ گانه هوش مصنوعی اختصاصی شما:
              </label>

              <button
                type="button"
                (click)="regenerateGuidelines()"
                [disabled]="isRegenerating()"
                class="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/70 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <span>✨</span>
                <span>{{ isRegenerating() ? 'در حال بازنویسی...' : 'بازنویسی با AI' }}</span>
              </button>
            </div>

            <textarea
              id="profileGuidelines"
              [(ngModel)]="editGuidelines"
              rows="9"
              class="w-full p-3 rounded-2xl bg-slate-950/80 border border-white/10 text-white text-xs leading-relaxed focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-none font-mono"
              placeholder="قوانین استخراج شده برای لحن، شخصیت و روتین‌های روزانه..."
            ></textarea>
          </div>
        }

        <!-- TAB 5: INSTAGRAM-STYLE AVATAR CREATOR (REAL-TIME REACTIVE) -->
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
                  چهره اختصاصی شما (سبک اینستاگرام)
                </span>
                <p class="text-[11px] text-purple-200/80 leading-snug mb-2">
                  اجزای صورت، مو، چشم و استایل لباس رو طبق سلیقه‌ت تغییر بده!
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

                  <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium select-none">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>تغییر بلادرنگ و فوری</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Subtab Navigation for Avatar Features (Horizontal Scroll) -->
            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 overflow-x-auto flex-nowrap scrollbar-none">
              <button
                type="button"
                (click)="avatarSubTab = 'face'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                [ngClass]="avatarSubTab === 'face' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👤 صورت و پوست
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'hair'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                [ngClass]="avatarSubTab === 'hair' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                💇‍♀️ مو و رنگ
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'eyes'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                [ngClass]="avatarSubTab === 'eyes' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👁️ چشم و ابرو
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'mouth'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                [ngClass]="avatarSubTab === 'mouth' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👄 لب و اخلاق
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'outfit'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                [ngClass]="avatarSubTab === 'outfit' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👕 استایل و لباس
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'accessories'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                [ngClass]="avatarSubTab === 'accessories' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👓 اکسسوری
              </button>
            </div>

            <!-- SUBTAB 1: FACE & SKIN -->
            @if (avatarSubTab === 'face') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ پوست:</span>
                  <div class="grid grid-cols-6 gap-1.5">
                    @for (skin of skinTones; track skin.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ skinTone: skin.hex })"
                        class="h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
                        [ngClass]="editAvatarConfig.skinTone === skin.hex
                          ? 'border-purple-400 ring-2 ring-purple-500 scale-105'
                          : 'border-white/10 hover:border-white/30'"
                        [style.background-color]="skin.hex"
                        [title]="skin.name"
                      >
                        @if (editAvatarConfig.skinTone === skin.hex) {
                          <span class="text-[10px] text-slate-900 font-bold">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">فرم صورت:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (shape of faceShapes; track shape.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ faceShape: shape.id })"
                        class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                        [ngClass]="editAvatarConfig.faceShape === shape.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                      >
                        <span class="text-xs">{{ shape.label }}</span>
                        @if (editAvatarConfig.faceShape === shape.id) {
                          <span class="text-purple-400 text-xs">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 2: HAIR & COLOR -->
            @if (avatarSubTab === 'hair') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">مدل مو:</span>
                  <div class="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    @for (hair of hairStyles; track hair.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ hairStyle: hair.id })"
                        class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                        [ngClass]="editAvatarConfig.hairStyle === hair.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                      >
                        <span class="text-xs">{{ hair.label }}</span>
                        @if (editAvatarConfig.hairStyle === hair.id) {
                          <span class="text-purple-400 text-xs">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ مو:</span>
                  <div class="grid grid-cols-6 gap-1.5">
                    @for (color of hairColors; track color.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ hairColor: color.hex })"
                        class="h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
                        [ngClass]="editAvatarConfig.hairColor === color.hex
                          ? 'border-purple-400 ring-2 ring-purple-500 scale-105'
                          : 'border-white/10 hover:border-white/30'"
                        [style.background-color]="color.hex"
                        [title]="color.name"
                      >
                        @if (editAvatarConfig.hairColor === color.hex) {
                          <span class="text-[10px] text-white font-bold drop-shadow">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 3: EYES & EYEBROWS -->
            @if (avatarSubTab === 'eyes') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">حالت چشم‌ها:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (eye of eyeShapes; track eye.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ eyeShape: eye.id })"
                        class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                        [ngClass]="editAvatarConfig.eyeShape === eye.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                      >
                        <span class="text-xs">{{ eye.label }}</span>
                        @if (editAvatarConfig.eyeShape === eye.id) {
                          <span class="text-purple-400 text-xs">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ چشم:</span>
                  <div class="grid grid-cols-6 gap-1.5">
                    @for (ec of eyeColors; track ec.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ eyeColor: ec.hex })"
                        class="h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
                        [ngClass]="editAvatarConfig.eyeColor === ec.hex
                          ? 'border-purple-400 ring-2 ring-purple-500 scale-105'
                          : 'border-white/10 hover:border-white/30'"
                        [style.background-color]="ec.hex"
                        [title]="ec.name"
                      >
                        @if (editAvatarConfig.eyeColor === ec.hex) {
                          <span class="text-[10px] text-white font-bold drop-shadow">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">مدل ابروها:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (eb of eyebrows; track eb.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ eyebrows: eb.id })"
                        class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                        [ngClass]="editAvatarConfig.eyebrows === eb.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                      >
                        <span class="text-xs">{{ eb.label }}</span>
                        @if (editAvatarConfig.eyebrows === eb.id) {
                          <span class="text-purple-400 text-xs">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 4: MOUTH & LIPS -->
            @if (avatarSubTab === 'mouth') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">فرم لبخند و لب:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (m of mouthExpressions; track m.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ mouthExpression: m.id })"
                        class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                        [ngClass]="editAvatarConfig.mouthExpression === m.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                      >
                        <span class="text-xs">{{ m.label }}</span>
                        @if (editAvatarConfig.mouthExpression === m.id) {
                          <span class="text-purple-400 text-xs">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ لب:</span>
                  <div class="grid grid-cols-5 gap-1.5">
                    @for (lc of lipColors; track lc.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ lipColor: lc.hex })"
                        class="h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
                        [ngClass]="editAvatarConfig.lipColor === lc.hex
                          ? 'border-purple-400 ring-2 ring-purple-500 scale-105'
                          : 'border-white/10 hover:border-white/30'"
                        [style.background-color]="lc.hex"
                        [title]="lc.name"
                      >
                        @if (editAvatarConfig.lipColor === lc.hex) {
                          <span class="text-[10px] text-white font-bold drop-shadow">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 5: OUTFIT & STYLE -->
            @if (avatarSubTab === 'outfit') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">مدل لباس:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (outfit of outfitStyles; track outfit.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ outfitStyle: outfit.id })"
                        class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                        [ngClass]="editAvatarConfig.outfitStyle === outfit.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                      >
                        <span class="text-xs">{{ outfit.label }}</span>
                        @if (editAvatarConfig.outfitStyle === outfit.id) {
                          <span class="text-purple-400 text-xs">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ لباس:</span>
                  <div class="grid grid-cols-6 gap-1.5">
                    @for (oc of outfitColors; track oc.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ outfitColor: oc.hex })"
                        class="h-8 rounded-xl border transition-all flex items-center justify-center cursor-pointer"
                        [ngClass]="editAvatarConfig.outfitColor === oc.hex
                          ? 'border-purple-400 ring-2 ring-purple-500 scale-105'
                          : 'border-white/10 hover:border-white/30'"
                        [style.background-color]="oc.hex"
                        [title]="oc.name"
                      >
                        @if (editAvatarConfig.outfitColor === oc.hex) {
                          <span class="text-[10px] text-white font-bold drop-shadow">✓</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 6: ACCESSORIES -->
            @if (avatarSubTab === 'accessories') {
              <div class="space-y-3 animate-fade-in">
                <span class="block text-xs font-bold text-slate-300 mb-1.5">اکسسوری و عینک:</span>
                <div class="grid grid-cols-2 gap-2">
                  @for (acc of accessories; track acc.id) {
                    <button
                      type="button"
                      (click)="updateAvatarProp({ accessory: acc.id })"
                      class="p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between"
                      [ngClass]="editAvatarConfig.accessory === acc.id
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'"
                    >
                      <span class="text-xs">{{ acc.label }}</span>
                      @if (editAvatarConfig.accessory === acc.id) {
                        <span class="text-purple-400 text-xs">✓</span>
                      }
                    </button>
                  }
                </div>
              </div>
            }

          </div>
        }
      </div>

      <!-- Dialog Footer -->
      <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-2.5 shrink-0">
        @if (activeTab() === 'avatar') {
          <div class="flex items-center gap-2 text-xs text-emerald-400 font-semibold select-none">
            <span class="flex h-2.5 w-2.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>تغییرات در لحظه ذخیره و اعمال شدند</span>
          </div>

          <button
            type="button"
            (click)="closeModal()"
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>✓</span>
            <span>بستن</span>
          </button>
        } @else {
          <div class="flex items-center justify-end gap-2.5 w-full">
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
        }
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

  readonly activeTab = signal<ProfileTab>('general');
  readonly isSaving = signal<boolean>(false);
  readonly isRegenerating = signal<boolean>(false);

  avatarSubTab: AvatarSubTab = 'face';

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

  readonly skinTones = SKIN_TONE_OPTIONS;
  readonly faceShapes = FACE_SHAPE_OPTIONS;
  readonly hairStyles = HAIR_STYLE_OPTIONS;
  readonly hairColors = HAIR_COLOR_OPTIONS;
  readonly eyeShapes = EYE_SHAPE_OPTIONS;
  readonly eyeColors = EYE_COLOR_OPTIONS;
  readonly eyebrows = EYEBROW_OPTIONS;
  readonly mouthExpressions = MOUTH_EXPRESSION_OPTIONS;
  readonly lipColors = LIP_COLOR_OPTIONS;
  readonly outfitStyles = OUTFIT_STYLE_OPTIONS;
  readonly outfitColors = OUTFIT_COLOR_OPTIONS;
  readonly accessories = ACCESSORY_OPTIONS;

  private readonly avatarAutoSaveSubject = new Subject<AvatarCustomization>();
  private avatarAutoSaveSub?: Subscription;

  ngOnInit(): void {
    if (this.profile) {
      this.editName = this.profile.name || '';
      this.editWakeTime = this.profile.wake_time || '07:00';
      this.editSleepTime = this.profile.sleep_time || '23:00';
      this.editGuidelines = this.profile.ai_guidelines || '';
      this.editAvatarConfig = sanitizeAvatarConfig(this.profile.avatar_config || this.themeService.customization());
      this.editCatchphrases = Array.isArray(this.profile.catchphrases) ? [...this.profile.catchphrases] : ['دمت گرم', 'بزن بریم'];
      this.editOccasions = Array.isArray(this.profile.occasions) ? [...this.profile.occasions] : [];
    } else {
      this.editAvatarConfig = sanitizeAvatarConfig(this.themeService.customization());
      this.editCatchphrases = ['دمت گرم', 'بزن بریم'];
      this.editOccasions = [];
    }

    // Debounced automatic backend synchronization for avatar edits
    this.avatarAutoSaveSub = this.avatarAutoSaveSubject.pipe(
      debounceTime(350),
      switchMap((config) => this.apiService.updateProfile({ avatar_config: config }))
    ).subscribe({
      next: () => {},
      error: (err) => console.warn('Auto-save profile avatar to backend failed:', err),
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

  updateAvatarProp(changes: Partial<AvatarCustomization>): void {
    this.editAvatarConfig = { ...this.editAvatarConfig, ...changes };
    this.onAvatarConfigChanged();
  }

  randomizeAvatar(): void {
    this.editAvatarConfig = this.themeService.getRandomAvatar();
    this.onAvatarConfigChanged();
  }

  private onAvatarConfigChanged(): void {
    this.themeService.saveCustomization(this.editAvatarConfig);
    this.avatarAutoSaveSubject.next(this.editAvatarConfig);
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
    };

    // Save to ThemeService and localStorage
    this.themeService.saveCustomization(this.editAvatarConfig);

    this.apiService.updateProfile(changes).subscribe({
      next: (updatedProfile) => {
        // Sync occasions to tasks immediately
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
    const mockLifestyle = {
      mainGoal: 'بهره‌وری و رشد فردی',
      stressLevel: 'متعادل',
      aiTone: 'دوست صمیمی و پرانرژی',
    };

    this.apiService
      .setupProfile({
        name: this.editName.trim() || 'کاربر',
        wake_time: this.editWakeTime,
        sleep_time: this.editSleepTime,
        avatar_config: this.editAvatarConfig,
        lifestyle_answers: mockLifestyle,
        catchphrases: this.editCatchphrases,
        occasions: this.editOccasions,
      })
      .subscribe({
        next: (res) => {
          this.isRegenerating.set(false);
          if (res.ai_guidelines) {
            this.editGuidelines = res.ai_guidelines;
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
