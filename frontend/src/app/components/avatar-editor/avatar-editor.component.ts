import { Component, EventEmitter, Input, Output } from '@angular/core';
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
} from '../../services/theme.service';

export type AvatarEditorTab = 'face' | 'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessories';

@Component({
  selector: 'app-avatar-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4" dir="rtl">
      <!-- CATEGORY TABS -->
      <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 overflow-x-auto flex-nowrap scrollbar-none select-none">
        <button
          type="button"
          (click)="activeTab = 'face'"
          class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
          [ngClass]="activeTab === 'face' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>👤</span>
          <span>پوست و صورت</span>
        </button>

        <button
          type="button"
          (click)="activeTab = 'hair'"
          class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
          [ngClass]="activeTab === 'hair' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>💇‍♀️</span>
          <span>مو و رنگ</span>
        </button>

        <button
          type="button"
          (click)="activeTab = 'eyes'"
          class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
          [ngClass]="activeTab === 'eyes' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>👁️</span>
          <span>چشم و ابرو</span>
        </button>

        <button
          type="button"
          (click)="activeTab = 'mouth'"
          class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
          [ngClass]="activeTab === 'mouth' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>👄</span>
          <span>لب و اخلاق</span>
        </button>

        <button
          type="button"
          (click)="activeTab = 'outfit'"
          class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
          [ngClass]="activeTab === 'outfit' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>👕</span>
          <span>استایل لباس</span>
        </button>

        <button
          type="button"
          (click)="activeTab = 'accessories'"
          class="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
          [ngClass]="activeTab === 'accessories' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'"
        >
          <span>👓</span>
          <span>اکسسوری</span>
        </button>
      </div>

      <!-- TAB CONTENT -->
      <div class="space-y-4">
        <!-- 1. FACE & SKIN -->
        @if (activeTab === 'face') {
          <div class="space-y-4 animate-fade-in">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">رنگ پوست:</label>
              <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                @for (skin of skinTones; track skin.id) {
                  <button
                    type="button"
                    (click)="update({ skinTone: skin.id })"
                    class="p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer interactive-spring"
                    [ngClass]="customization.skinTone === skin.id ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'"
                  >
                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs text-slate-900 font-black shadow-md" [style.background-color]="skin.hex">
                      @if (customization.skinTone === skin.id) { ✓ }
                    </span>
                    <span class="text-[10px] text-slate-300 truncate w-full text-center font-medium">{{ skin.name }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">فرم صورت:</label>
              <div class="grid grid-cols-2 gap-2.5">
                @for (shape of faceShapes; track shape.id) {
                  <button
                    type="button"
                    (click)="update({ faceShape: shape.id })"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="customization.faceShape === shape.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl">{{ shape.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ shape.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ shape.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- 2. HAIR & COLOR -->
        @if (activeTab === 'hair') {
          <div class="space-y-4 animate-fade-in">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">رنگ مو:</label>
              <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                @for (col of hairColors; track col.id) {
                  <button
                    type="button"
                    (click)="update({ hairColor: col.id })"
                    class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                    [ngClass]="customization.hairColor === col.id ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'"
                  >
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-md" [style.background-color]="col.hex">
                      @if (customization.hairColor === col.id) { ✓ }
                    </span>
                    <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ col.name }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">مدل مو سبک اینستاگرام:</label>
              <div class="grid grid-cols-3 gap-2">
                @for (h of hairStyles; track h.id) {
                  <button
                    type="button"
                    (click)="update({ hairStyle: h.id })"
                    class="p-2.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 interactive-spring"
                    [ngClass]="customization.hairStyle === h.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl mb-0.5">{{ h.icon }}</span>
                    <span class="text-xs font-bold truncate w-full">{{ h.label }}</span>
                    <span class="text-[9px] text-slate-400 truncate w-full">{{ h.subLabel }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- 3. EYES & BROWS -->
        @if (activeTab === 'eyes') {
          <div class="space-y-4 animate-fade-in">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">رنگ چشم:</label>
              <div class="grid grid-cols-5 gap-2">
                @for (ec of eyeColors; track ec.id) {
                  <button
                    type="button"
                    (click)="update({ eyeColor: ec.id })"
                    class="p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer interactive-spring"
                    [ngClass]="customization.eyeColor === ec.id ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'"
                  >
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-md" [style.background-color]="ec.hex">
                      @if (customization.eyeColor === ec.id) { ✓ }
                    </span>
                    <span class="text-[10px] text-slate-300 truncate w-full text-center">{{ ec.name }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">فرم چشم‌ها:</label>
              <div class="grid grid-cols-2 gap-2.5">
                @for (eye of eyeShapes; track eye.id) {
                  <button
                    type="button"
                    (click)="update({ eyeShape: eye.id })"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="customization.eyeShape === eye.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl">{{ eye.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ eye.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ eye.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">فرم ابروها:</label>
              <div class="grid grid-cols-2 gap-2.5">
                @for (brow of eyebrows; track brow.id) {
                  <button
                    type="button"
                    (click)="update({ eyebrows: brow.id })"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="customization.eyebrows === brow.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl">{{ brow.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ brow.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ brow.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- 4. MOUTH & MOOD -->
        @if (activeTab === 'mouth') {
          <div class="space-y-4 animate-fade-in">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">رنگ لب:</label>
              <div class="grid grid-cols-5 gap-2">
                @for (lip of lipColors; track lip.id) {
                  <button
                    type="button"
                    (click)="update({ lipColor: lip.id })"
                    class="p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition cursor-pointer interactive-spring"
                    [ngClass]="customization.lipColor === lip.id ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'"
                  >
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-md" [style.background-color]="lip.hex">
                      @if (customization.lipColor === lip.id) { ✓ }
                    </span>
                    <span class="text-[10px] text-slate-300 truncate w-full text-center">{{ lip.name }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">حس، اخلاق و لبخند آواتار:</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                @for (m of mouthExpressions; track m.id) {
                  <button
                    type="button"
                    (click)="update({ mouthExpression: m.id })"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="customization.mouthExpression === m.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl">{{ m.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ m.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ m.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- 5. OUTFIT & CLOTHES -->
        @if (activeTab === 'outfit') {
          <div class="space-y-4 animate-fade-in">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">رنگ لباس:</label>
              <div class="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                @for (oc of outfitColors; track oc.id) {
                  <button
                    type="button"
                    (click)="update({ outfitColor: oc.id })"
                    class="p-1.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer interactive-spring"
                    [ngClass]="customization.outfitColor === oc.id ? 'border-purple-400 bg-purple-950/40 ring-2 ring-purple-400/50' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'"
                  >
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-md" [style.background-color]="oc.hex">
                      @if (customization.outfitColor === oc.id) { ✓ }
                    </span>
                    <span class="text-[9px] text-slate-300 truncate w-full text-center">{{ oc.name }}</span>
                  </button>
                }
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">استایل و تیپ لباس:</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                @for (outfit of outfitStyles; track outfit.id) {
                  <button
                    type="button"
                    (click)="update({ outfitStyle: outfit.id })"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="customization.outfitStyle === outfit.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl">{{ outfit.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ outfit.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ outfit.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- 6. ACCESSORIES -->
        @if (activeTab === 'accessories') {
          <div class="space-y-4 animate-fade-in">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-2">عینک و زیورآلات:</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                @for (acc of accessories; track acc.id) {
                  <button
                    type="button"
                    (click)="update({ accessory: acc.id })"
                    class="p-3 rounded-2xl border text-right transition cursor-pointer flex items-center gap-3 interactive-spring"
                    [ngClass]="customization.accessory === acc.id ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40' : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                  >
                    <span class="text-2xl">{{ acc.icon }}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-bold">{{ acc.label }}</div>
                      <div class="text-[10px] text-slate-400 truncate">{{ acc.subLabel }}</div>
                    </div>
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class AvatarEditorComponent {
  @Input({ required: true }) customization!: AvatarCustomization;
  @Output() customizationChange = new EventEmitter<AvatarCustomization>();

  activeTab: AvatarEditorTab = 'face';

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

  update(changes: Partial<AvatarCustomization>): void {
    const updated: AvatarCustomization = {
      ...this.customization,
      ...changes,
    };
    this.customization = updated;
    this.customizationChange.emit(updated);
  }
}
