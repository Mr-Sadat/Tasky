import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AvatarCustomization,
  FaceShape,
  HairStyle,
  EyeShape,
  EyebrowStyle,
  MouthExpression,
  OutfitStyle,
  AvatarAccessory,
} from '../../models/task.model';
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
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';

type StudioTab = 'face' | 'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessories';

@Component({
  selector: 'app-avatar-studio-modal',
  standalone: true,
  imports: [CommonModule, DynamicAvatarComponent],
  template: `
    <!-- Modal Backdrop -->
    <div 
      class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      (click)="onBackdropClick($event)"
      dir="rtl"
    >
      <!-- Modal Container -->
      <div 
        class="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-lg shadow-md shadow-pink-900/30">
              🎨
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>استودیو طراحی آواتار</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">سبک اینستاگرام</span>
              </h3>
              <p class="text-[11px] text-slate-400">صورت، مو، چشم، لباس و اخلاق چهره اختصاصی‌ت رو بساز</p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closeModal()" 
            class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="بستن استودیو"
          >
            ✕
          </button>
        </div>

        <!-- HERO LIVE PREVIEW CANVAS -->
        <div class="p-3 sm:p-4 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 shrink-0">
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-indigo-950/60 border border-purple-500/20 p-3 flex items-center gap-4">
            <!-- Glowing Avatar Circle -->
            <div class="relative shrink-0 w-24 h-24 sm:w-26 sm:h-26 rounded-2xl bg-slate-950/70 border border-purple-500/30 flex items-center justify-center shadow-xl shadow-purple-950/50 overflow-hidden">
              <div class="absolute inset-0 bg-radial from-purple-500/20 to-transparent pointer-events-none"></div>
              <app-dynamic-avatar
                [customization]="tempCustomization"
                state="happy"
                [size]="100"
              ></app-dynamic-avatar>
            </div>

            <!-- Speech Bubble & Quick Tools -->
            <div class="flex-1 min-w-0">
              <div class="bg-slate-800/90 border border-slate-700/70 rounded-xl rounded-tr-none p-2.5 shadow-inner mb-2.5">
                <p class="text-xs font-medium text-slate-200 leading-snug">
                  {{ reactionText }}
                </p>
              </div>

              <!-- Action buttons: Randomize & Reset -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="randomizeAvatar()"
                  class="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 transition cursor-pointer interactive-spring"
                  title="تولید تصادفی استایل جدید"
                >
                  <span>🎲</span>
                  <span>پیشنهاد تصادفی</span>
                </button>

                <button
                  type="button"
                  (click)="resetAvatar()"
                  class="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="بازنشانی به حالت قبل"
                >
                  <span>🔄</span>
                  <span>بازنشانی</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORY NAVIGATION TABS (Horizontal Scrollable) -->
        <div class="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800/80 bg-slate-900/95 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            (click)="activeTab = 'face'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0"
            [ngClass]="activeTab === 'face'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
          >
            <span>👤</span>
            <span>پوست و صورت</span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'hair'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0"
            [ngClass]="activeTab === 'hair'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
          >
            <span>💇‍♀️</span>
            <span>مدل و رنگ مو</span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'eyes'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0"
            [ngClass]="activeTab === 'eyes'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
          >
            <span>👁️</span>
            <span>چشم و ابرو</span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'mouth'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0"
            [ngClass]="activeTab === 'mouth'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
          >
            <span>👄</span>
            <span>لب و اخلاق چهره</span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'outfit'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0"
            [ngClass]="activeTab === 'outfit'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
          >
            <span>👕</span>
            <span>لباس و استایل</span>
          </button>

          <button
            type="button"
            (click)="activeTab = 'accessories'"
            class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0"
            [ngClass]="activeTab === 'accessories'
              ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
          >
            <span>👓</span>
            <span>اکسسوری</span>
          </button>
        </div>

        <!-- SCROLLABLE TAB CONTENT -->
        <div class="flex-1 overflow-y-auto p-4 space-y-5">
          
          <!-- TAB 1: FACE & SKIN -->
          @if (activeTab === 'face') {
            <div class="space-y-4 animate-fade-in">
              <!-- Skin Tone Swatches -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  رنگ پوست:
                </label>
                <div class="grid grid-cols-6 gap-2">
                  @for (skin of skinTones; track skin.id) {
                    <button
                      type="button"
                      (click)="setSkinTone(skin.id)"
                      class="flex flex-col items-center gap-1 p-2 rounded-2xl border transition interactive-spring cursor-pointer"
                      [ngClass]="tempCustomization.skinTone === skin.id
                        ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'"
                      [title]="skin.name"
                    >
                      <span 
                        class="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-slate-900"
                        [style.background-color]="skin.hex"
                      >
                        @if (tempCustomization.skinTone === skin.id) {
                          ✓
                        }
                      </span>
                      <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ skin.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Face Shapes -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  فرم صورت و چانه:
                </label>
                <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
                  @for (shape of faceShapes; track shape.id) {
                    <button
                      type="button"
                      (click)="setFaceShape(shape.id)"
                      class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                      [ngClass]="tempCustomization.faceShape === shape.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                    >
                      <span class="text-2xl shrink-0">{{ shape.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white">{{ shape.label }}</div>
                        <div class="text-[10px] text-slate-400 truncate">{{ shape.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: HAIR & HAIR COLOR -->
          @if (activeTab === 'hair') {
            <div class="space-y-4 animate-fade-in">
              <!-- Hair Color Swatches -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  رنگ مو:
                </label>
                <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  @for (col of hairColors; track col.id) {
                    <button
                      type="button"
                      (click)="setHairColor(col.id)"
                      class="flex flex-col items-center gap-1 p-2 rounded-2xl border transition interactive-spring cursor-pointer"
                      [ngClass]="tempCustomization.hairColor === col.id
                        ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'"
                      [title]="col.name"
                    >
                      <span 
                        class="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-white"
                        [style.background-color]="col.hex"
                      >
                        @if (tempCustomization.hairColor === col.id) {
                          ✓
                        }
                      </span>
                      <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ col.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Hair Styles -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  مدل مو:
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  @for (h of hairStyles; track h.id) {
                    <button
                      type="button"
                      (click)="setHairStyle(h.id)"
                      class="p-2.5 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 interactive-spring"
                      [ngClass]="tempCustomization.hairStyle === h.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                    >
                      <span class="text-xl shrink-0">{{ h.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white">{{ h.label }}</div>
                        <div class="text-[9px] text-slate-400 truncate">{{ h.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 3: EYES & EYEBROWS -->
          @if (activeTab === 'eyes') {
            <div class="space-y-4 animate-fade-in">
              <!-- Eye Color Swatches -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  رنگ چشم:
                </label>
                <div class="grid grid-cols-5 gap-2">
                  @for (ec of eyeColors; track ec.id) {
                    <button
                      type="button"
                      (click)="setEyeColor(ec.id)"
                      class="flex flex-col items-center gap-1 p-2 rounded-2xl border transition interactive-spring cursor-pointer"
                      [ngClass]="tempCustomization.eyeColor === ec.id
                        ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'"
                      [title]="ec.name"
                    >
                      <span 
                        class="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-white"
                        [style.background-color]="ec.hex"
                      >
                        @if (tempCustomization.eyeColor === ec.id) {
                          ✓
                        }
                      </span>
                      <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ ec.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Eye Shapes -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  فرم چشم‌ها:
                </label>
                <div class="grid grid-cols-2 gap-2">
                  @for (eye of eyeShapes; track eye.id) {
                    <button
                      type="button"
                      (click)="setEyeShape(eye.id)"
                      class="p-2.5 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 interactive-spring"
                      [ngClass]="tempCustomization.eyeShape === eye.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                    >
                      <span class="text-xl shrink-0">{{ eye.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white">{{ eye.label }}</div>
                        <div class="text-[9px] text-slate-400 truncate">{{ eye.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Eyebrows -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  فرم ابروها:
                </label>
                <div class="grid grid-cols-2 gap-2">
                  @for (brow of eyebrows; track brow.id) {
                    <button
                      type="button"
                      (click)="setEyebrows(brow.id)"
                      class="p-2.5 rounded-2xl border text-right transition cursor-pointer flex items-center gap-2.5 interactive-spring"
                      [ngClass]="tempCustomization.eyebrows === brow.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                    >
                      <span class="text-xl shrink-0">{{ brow.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white">{{ brow.label }}</div>
                        <div class="text-[9px] text-slate-400 truncate">{{ brow.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 4: MOUTH, LIP & MOOD -->
          @if (activeTab === 'mouth') {
            <div class="space-y-4 animate-fade-in">
              <!-- Lip Color Swatches -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  رنگ لب:
                </label>
                <div class="grid grid-cols-5 gap-2">
                  @for (lip of lipColors; track lip.id) {
                    <button
                      type="button"
                      (click)="setLipColor(lip.id)"
                      class="flex flex-col items-center gap-1 p-2 rounded-2xl border transition interactive-spring cursor-pointer"
                      [ngClass]="tempCustomization.lipColor === lip.id
                        ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'"
                      [title]="lip.name"
                    >
                      <span 
                        class="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-white"
                        [style.background-color]="lip.hex"
                      >
                        @if (tempCustomization.lipColor === lip.id) {
                          ✓
                        }
                      </span>
                      <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ lip.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Mouth & Facial Expression -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  حس، اخلاق چهره و لبخند:
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (m of mouthExpressions; track m.id) {
                    <button
                      type="button"
                      (click)="setMouthExpression(m.id)"
                      class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                      [ngClass]="tempCustomization.mouthExpression === m.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                    >
                      <span class="text-2xl shrink-0">{{ m.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white">{{ m.label }}</div>
                        <div class="text-[10px] text-slate-400 truncate">{{ m.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 5: OUTFIT & CLOTHES -->
          @if (activeTab === 'outfit') {
            <div class="space-y-4 animate-fade-in">
              <!-- Outfit Color Swatches -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  رنگ لباس:
                </label>
                <div class="grid grid-cols-6 gap-2">
                  @for (oc of outfitColors; track oc.id) {
                    <button
                      type="button"
                      (click)="setOutfitColor(oc.id)"
                      class="flex flex-col items-center gap-1 p-2 rounded-2xl border transition interactive-spring cursor-pointer"
                      [ngClass]="tempCustomization.outfitColor === oc.id
                        ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'"
                      [title]="oc.name"
                    >
                      <span 
                        class="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-xs font-bold text-white"
                        [style.background-color]="oc.hex"
                      >
                        @if (tempCustomization.outfitColor === oc.id) {
                          ✓
                        }
                      </span>
                      <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ oc.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Outfit Styles -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-2">
                  مدل و استایل پوشش:
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  @for (outfit of outfitStyles; track outfit.id) {
                    <button
                      type="button"
                      (click)="setOutfitStyle(outfit.id)"
                      class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                      [ngClass]="tempCustomization.outfitStyle === outfit.id
                        ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                    >
                      <span class="text-2xl shrink-0">{{ outfit.icon }}</span>
                      <div class="min-w-0">
                        <div class="text-xs font-bold text-white">{{ outfit.label }}</div>
                        <div class="text-[10px] text-slate-400 truncate">{{ outfit.subLabel }}</div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 6: ACCESSORIES -->
          @if (activeTab === 'accessories') {
            <div class="space-y-4 animate-fade-in">
              <label class="block text-xs font-bold text-slate-300 mb-2">
                عینک، هدفون و اکسسوری‌ها:
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (acc of accessories; track acc.id) {
                  <button
                    type="button"
                    (click)="setAccessory(acc.id)"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="tempCustomization.accessory === acc.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                  >
                    <span class="text-2xl shrink-0">{{ acc.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold text-white">{{ acc.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ acc.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>
          }

        </div>

        <!-- MODAL FOOTER -->
        <div class="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            (click)="closeModal()"
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="button"
            (click)="saveChanges()"
            class="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <span>✓</span>
            <span>ذخیره آواتار من</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AvatarStudioModalComponent implements OnInit {
  private readonly themeService = inject(ThemeService);

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AvatarCustomization>();

  activeTab: StudioTab = 'face';
  tempCustomization: AvatarCustomization = { ...DEFAULT_AVATAR_CUSTOMIZATION };
  reactionText: string = 'سلام سارا جان! بیا با هم چهره، مو و استایل قشنگت رو طراحی کنیم!';

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

  ngOnInit(): void {
    this.tempCustomization = sanitizeAvatarConfig(this.themeService.customization());
  }

  setSkinTone(id: string): void {
    this.tempCustomization = { ...this.tempCustomization, skinTone: id };
    this.reactionText = 'این رنگ پوست خیلی طبیعی و قشنگه! ✨';
  }

  setFaceShape(id: FaceShape): void {
    this.tempCustomization = { ...this.tempCustomization, faceShape: id };
    this.reactionText = 'فرم صورتت خیلی بهت میاد!';
  }

  setHairStyle(id: HairStyle): void {
    this.tempCustomization = { ...this.tempCustomization, hairStyle: id };
    this.reactionText = 'وای عجب مدل موی شیکی شد! 😍';
  }

  setHairColor(id: string): void {
    this.tempCustomization = { ...this.tempCustomization, hairColor: id };
    this.reactionText = 'رنگ موهات فوق‌العاده شد!';
  }

  setEyeShape(id: EyeShape): void {
    this.tempCustomization = { ...this.tempCustomization, eyeShape: id };
    this.reactionText = 'نگاهت چقدر جذاب و مهربون شد!';
  }

  setEyeColor(id: string): void {
    this.tempCustomization = { ...this.tempCustomization, eyeColor: id };
    this.reactionText = 'رنگ چشمات می‌درخشه! ✨';
  }

  setEyebrows(id: EyebrowStyle): void {
    this.tempCustomization = { ...this.tempCustomization, eyebrows: id };
    this.reactionText = 'ابروهات کاملاً هماهنگ و مرتب شدن!';
  }

  setMouthExpression(id: MouthExpression): void {
    this.tempCustomization = { ...this.tempCustomization, mouthExpression: id };
    this.reactionText = 'این لبخند و انرژی مثبت رو دوست دارم!';
  }

  setLipColor(id: string): void {
    this.tempCustomization = { ...this.tempCustomization, lipColor: id };
    this.reactionText = 'رنگ لبت خیلی باطراوته!';
  }

  setOutfitStyle(id: OutfitStyle): void {
    this.tempCustomization = { ...this.tempCustomization, outfitStyle: id };
    this.reactionText = 'تیپ و استایلت حسابی شیک و امروزی شد!';
  }

  setOutfitColor(id: string): void {
    this.tempCustomization = { ...this.tempCustomization, outfitColor: id };
    this.reactionText = 'این رنگ لباس با سلیقه بی‌نظیرته!';
  }

  setAccessory(id: AvatarAccessory): void {
    this.tempCustomization = { ...this.tempCustomization, accessory: id };
    this.reactionText = id === 'none' ? 'ساده و شیک!' : 'این اکسسوری استایلت رو کامل کرد! 🕶️';
  }

  randomizeAvatar(): void {
    this.tempCustomization = this.themeService.getRandomAvatar();
    this.reactionText = 'یک استایل تصادفی خاص برات ساختم! چطوره؟ 🎲';
  }

  resetAvatar(): void {
    this.tempCustomization = sanitizeAvatarConfig(this.themeService.customization());
    this.reactionText = 'به حالت قبلی بازگشتیم!';
  }

  saveChanges(): void {
    this.themeService.saveCustomization(this.tempCustomization);
    this.saved.emit(this.tempCustomization);
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
