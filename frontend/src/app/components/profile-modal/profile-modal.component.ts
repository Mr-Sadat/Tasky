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
  THEME_PRESETS,
  ThemePreset,
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
} from '../../models/task.model';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';

type AvatarSubTab = 'face' | 'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessories';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicAvatarComponent],
  template: `
    <dialog
      #profileDialog
      class="fixed inset-0 z-50 p-4 m-auto rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-md text-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden outline-none animate-fade-in"
      [attr.closedby]="'any'"
      (cancel)="onDialogCancel($event)"
      (click)="onDialogClick($event)"
      dir="rtl"
    >
      <!-- Dialog Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-lg shadow-md shadow-purple-900/40">
            👤
          </div>
          <div>
            <h3 class="text-base font-bold text-white">پروفایل و آواتار اختصاصی</h3>
            <p class="text-[11px] text-slate-400">تنظیمات شخصی، روتین خواب و طراحی چهره سبک اینستاگرام</p>
          </div>
        </div>

        <button
          type="button"
          (click)="closeModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="بستن پنجره پروفایل"
        >
          ✕
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex items-center gap-2 my-3 p-1 rounded-2xl bg-slate-950/70 border border-slate-800 shrink-0">
        <button
          type="button"
          (click)="activeTab.set('general')"
          class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          [ngClass]="activeTab() === 'general'
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white'"
        >
          <span>👤</span>
          <span>مشخصات و زمان</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('guidelines')"
          class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          [ngClass]="activeTab() === 'guidelines'
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white'"
        >
          <span>🧠</span>
          <span>قوانین هوش مصنوعی</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('avatar')"
          class="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          [ngClass]="activeTab() === 'avatar'
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white'"
        >
          <span>🎨</span>
          <span>طراحی آواتار من</span>
        </button>
      </div>

      <!-- Scrollable Tab Content -->
      <div class="flex-1 overflow-y-auto px-1 py-2 space-y-4">
        
        <!-- TAB 1: General Info & Schedule -->
        @if (activeTab() === 'general') {
          <div class="space-y-4 animate-fade-in">
            <!-- Name Input -->
            <div>
              <label for="profileName" class="block text-xs font-bold text-slate-300 mb-1.5">
                نام یا لقب شما:
              </label>
              <input
                id="profileName"
                type="text"
                [(ngModel)]="editName"
                class="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
              />
            </div>

            <!-- Schedule: Wake & Sleep -->
            <div class="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
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
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
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
                    class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center font-bold focus:border-purple-500 outline-none transition"
                  />
                </div>
              </div>

              <p class="text-[11px] text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                💡 <strong class="text-slate-300">نکته هوشمند:</strong> هوش مصنوعی تَسکی اکیداً مانع برنامه‌ریزی هرگونه تسک در ساعات استراحت و خواب شما می‌شود.
              </p>
            </div>
          </div>
        }

        <!-- TAB 2: AI Persona & Guidelines -->
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
              class="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs leading-relaxed focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-none font-mono"
              placeholder="قوانین استخراج شده برای لحن، شخصیت و روتین‌های روزانه..."
            ></textarea>
          </div>
        }

        <!-- TAB 3: INSTAGRAM-STYLE AVATAR CREATOR (REAL-TIME REACTIVE) -->
        @if (activeTab() === 'avatar') {
          <div class="space-y-4 animate-fade-in">
            <!-- Live Preview Hero Card -->
            <div class="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-950 to-indigo-950/60 border border-purple-500/30 flex items-center gap-4">
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
                    <span>ذخیره خودکار در لحظه</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Subtab Navigation for Avatar Features -->
            <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto scrollbar-none">
              <button
                type="button"
                (click)="avatarSubTab = 'face'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
                [ngClass]="avatarSubTab === 'face' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👤 صورت و پوست
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'hair'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
                [ngClass]="avatarSubTab === 'hair' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                💇‍♀️ مو و رنگ
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'eyes'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
                [ngClass]="avatarSubTab === 'eyes' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👁️ چشم و ابرو
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'mouth'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
                [ngClass]="avatarSubTab === 'mouth' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👄 لب و اخلاق
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'outfit'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
                [ngClass]="avatarSubTab === 'outfit' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'"
              >
                👕 استایل و لباس
              </button>
              <button
                type="button"
                (click)="avatarSubTab = 'accessories'"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer"
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
                        (click)="updateAvatarProp({ skinTone: skin.id })"
                        class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                        [ngClass]="editAvatarConfig.skinTone === skin.id ? 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400' : 'border-slate-800 bg-slate-950/60'"
                      >
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-slate-900 font-bold" [style.background-color]="skin.hex">
                          @if (editAvatarConfig.skinTone === skin.id) { ✓ }
                        </span>
                        <span class="text-[8px] text-slate-300 truncate w-full text-center">{{ skin.name }}</span>
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
                        class="p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 interactive-spring"
                        [ngClass]="editAvatarConfig.faceShape === shape.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                      >
                        <span class="text-xl">{{ shape.icon }}</span>
                        <div class="min-w-0">
                          <div class="text-xs font-bold">{{ shape.label }}</div>
                          <div class="text-[9px] text-slate-400 truncate">{{ shape.subLabel }}</div>
                        </div>
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
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ مو:</span>
                  <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    @for (col of hairColors; track col.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ hairColor: col.id })"
                        class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                        [ngClass]="editAvatarConfig.hairColor === col.id ? 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400' : 'border-slate-800 bg-slate-950/60'"
                      >
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" [style.background-color]="col.hex">
                          @if (editAvatarConfig.hairColor === col.id) { ✓ }
                        </span>
                        <span class="text-[8px] text-slate-300 truncate w-full text-center">{{ col.name }}</span>
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">مدل مو:</span>
                  <div class="grid grid-cols-3 gap-1.5">
                    @for (h of hairStyles; track h.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ hairStyle: h.id })"
                        class="p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center interactive-spring"
                        [ngClass]="editAvatarConfig.hairStyle === h.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                      >
                        <span class="text-xl mb-0.5">{{ h.icon }}</span>
                        <span class="text-[10px] font-bold truncate w-full">{{ h.label }}</span>
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 3: EYES & BROWS -->
            @if (avatarSubTab === 'eyes') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ چشم:</span>
                  <div class="grid grid-cols-5 gap-1.5">
                    @for (ec of eyeColors; track ec.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ eyeColor: ec.id })"
                        class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                        [ngClass]="editAvatarConfig.eyeColor === ec.id ? 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400' : 'border-slate-800 bg-slate-950/60'"
                      >
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" [style.background-color]="ec.hex">
                          @if (editAvatarConfig.eyeColor === ec.id) { ✓ }
                        </span>
                        <span class="text-[8px] text-slate-300 truncate w-full text-center">{{ ec.name }}</span>
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">فرم چشم‌ها:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (eye of eyeShapes; track eye.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ eyeShape: eye.id })"
                        class="p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 interactive-spring"
                        [ngClass]="editAvatarConfig.eyeShape === eye.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                      >
                        <span class="text-xl">{{ eye.icon }}</span>
                        <div class="min-w-0">
                          <div class="text-xs font-bold">{{ eye.label }}</div>
                          <div class="text-[9px] text-slate-400 truncate">{{ eye.subLabel }}</div>
                        </div>
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">فرم ابروها:</span>
                  <div class="grid grid-cols-2 gap-2">
                    @for (brow of eyebrows; track brow.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ eyebrows: brow.id })"
                        class="p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 interactive-spring"
                        [ngClass]="editAvatarConfig.eyebrows === brow.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                      >
                        <span class="text-xl">{{ brow.icon }}</span>
                        <div class="min-w-0">
                          <div class="text-xs font-bold">{{ brow.label }}</div>
                          <div class="text-[9px] text-slate-400 truncate">{{ brow.subLabel }}</div>
                        </div>
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 4: MOUTH & MOOD -->
            @if (avatarSubTab === 'mouth') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ لب:</span>
                  <div class="grid grid-cols-5 gap-1.5">
                    @for (lip of lipColors; track lip.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ lipColor: lip.id })"
                        class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                        [ngClass]="editAvatarConfig.lipColor === lip.id ? 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400' : 'border-slate-800 bg-slate-950/60'"
                      >
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" [style.background-color]="lip.hex">
                          @if (editAvatarConfig.lipColor === lip.id) { ✓ }
                        </span>
                        <span class="text-[8px] text-slate-300 truncate w-full text-center">{{ lip.name }}</span>
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">حس، اخلاق و لبخند:</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    @for (m of mouthExpressions; track m.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ mouthExpression: m.id })"
                        class="p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 interactive-spring"
                        [ngClass]="editAvatarConfig.mouthExpression === m.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                      >
                        <span class="text-xl">{{ m.icon }}</span>
                        <div class="min-w-0">
                          <div class="text-xs font-bold">{{ m.label }}</div>
                          <div class="text-[9px] text-slate-400 truncate">{{ m.subLabel }}</div>
                        </div>
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 5: OUTFIT & CLOTHES -->
            @if (avatarSubTab === 'outfit') {
              <div class="space-y-3 animate-fade-in">
                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ لباس:</span>
                  <div class="grid grid-cols-6 gap-1.5">
                    @for (oc of outfitColors; track oc.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ outfitColor: oc.id })"
                        class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                        [ngClass]="editAvatarConfig.outfitColor === oc.id ? 'border-purple-400 bg-purple-950/40 ring-1 ring-purple-400' : 'border-slate-800 bg-slate-950/60'"
                      >
                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" [style.background-color]="oc.hex">
                          @if (editAvatarConfig.outfitColor === oc.id) { ✓ }
                        </span>
                        <span class="text-[8px] text-slate-300 truncate w-full text-center">{{ oc.name }}</span>
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <span class="block text-xs font-bold text-slate-300 mb-1.5">استایل لباس:</span>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    @for (outfit of outfitStyles; track outfit.id) {
                      <button
                        type="button"
                        (click)="updateAvatarProp({ outfitStyle: outfit.id })"
                        class="p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 interactive-spring"
                        [ngClass]="editAvatarConfig.outfitStyle === outfit.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                      >
                        <span class="text-xl">{{ outfit.icon }}</span>
                        <div class="min-w-0">
                          <div class="text-xs font-bold">{{ outfit.label }}</div>
                          <div class="text-[9px] text-slate-400 truncate">{{ outfit.subLabel }}</div>
                        </div>
                      </button>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- SUBTAB 6: ACCESSORIES -->
            @if (avatarSubTab === 'accessories') {
              <div class="space-y-3 animate-fade-in">
                <span class="block text-xs font-bold text-slate-300 mb-1.5">عینک و اکسسوری:</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (acc of accessories; track acc.id) {
                    <button
                      type="button"
                      (click)="updateAvatarProp({ accessory: acc.id })"
                      class="p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 interactive-spring"
                      [ngClass]="editAvatarConfig.accessory === acc.id ? 'bg-purple-600/25 border-purple-500 text-white' : 'bg-slate-950/70 border-slate-800 text-slate-400'"
                    >
                      <span class="text-xl">{{ acc.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold">{{ acc.label }}</div>
                        <div class="text-[9px] text-slate-400 truncate">{{ acc.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }

          </div>
        }
      </div>

      <!-- Dialog Footer -->
      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
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
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
              <span>{{ isSaving() ? 'در حال ذخیره...' : 'ذخیره مشخصات' }}</span>
            </button>
          </div>
        }
      </div>
    </dialog>
  `,
  styles: [`
    dialog::backdrop {
      background: rgba(2, 6, 23, 0.85);
      backdrop-filter: blur(8px);
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

  readonly activeTab = signal<'general' | 'guidelines' | 'avatar'>('general');
  readonly isSaving = signal<boolean>(false);
  readonly isRegenerating = signal<boolean>(false);

  avatarSubTab: AvatarSubTab = 'face';

  editName: string = '';
  editWakeTime: string = '07:00';
  editSleepTime: string = '23:00';
  editGuidelines: string = '';
  editAvatarConfig: AvatarCustomization = { ...DEFAULT_AVATAR_CUSTOMIZATION };

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
    } else {
      this.editAvatarConfig = sanitizeAvatarConfig(this.themeService.customization());
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

  updateAvatarProp(changes: Partial<AvatarCustomization>): void {
    this.editAvatarConfig = { ...this.editAvatarConfig, ...changes };
    this.onAvatarConfigChanged();
  }

  randomizeAvatar(): void {
    this.editAvatarConfig = this.themeService.getRandomAvatar();
    this.onAvatarConfigChanged();
  }

  private onAvatarConfigChanged(): void {
    // 1. Immediately apply to ThemeService (updates signal, saves to localStorage, applies theme variables)
    this.themeService.saveCustomization(this.editAvatarConfig);
    // 2. Queue debounced backend update
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
    };

    // Save to ThemeService and localStorage
    this.themeService.saveCustomization(this.editAvatarConfig);

    this.apiService.updateProfile(changes).subscribe({
      next: (updatedProfile) => {
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
