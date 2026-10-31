import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarCustomization, AvatarBaseType, ThemeColor, AvatarAccessory } from '../../models/task.model';
import { ThemeService, THEME_PRESETS, ThemePreset } from '../../services/theme.service';
import { AvatarCardComponent } from '../avatar-card/avatar-card.component';

@Component({
  selector: 'app-avatar-studio-modal',
  standalone: true,
  imports: [CommonModule, AvatarCardComponent],
  template: `
    <!-- Modal Backdrop -->
    <div 
      class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      (click)="onBackdropClick($event)"
    >
      <!-- Modal Card -->
      <div 
        class="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎨</span>
            <h3 class="text-base font-bold text-slate-100">استودیو طراحی تَسکی</h3>
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

        <!-- Scrollable Studio Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-5">
          <!-- Live Preview Card -->
          <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span class="text-[11px] font-semibold text-slate-400 mb-2 block">پیش‌نمایش زنده:</span>
            <app-avatar-card
              [customization]="tempCustomization"
              state="happy"
              voiceReply="چطور شدم؟ این تیپ جدید حسابی بهم میاد!"
            ></app-avatar-card>
          </div>

          <!-- 1. Avatar Base Type -->
          <div>
            <label class="text-xs font-bold text-slate-300 block mb-2.5">
              ۱. انتخاب کاراکتر پایه:
            </label>
            <div class="grid grid-cols-4 gap-2">
              @for (base of baseTypes; track base.id) {
                <button
                  type="button"
                  (click)="setBaseType(base.id)"
                  class="flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer interactive-spring"
                  [ngClass]="tempCustomization.baseType === base.id
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-900/30'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                >
                  <span class="text-2xl mb-1">{{ base.icon }}</span>
                  <span class="text-[11px] font-medium">{{ base.label }}</span>
                </button>
              }
            </div>
          </div>

          <!-- 2. Accent Color Theme -->
          <div>
            <label class="text-xs font-bold text-slate-300 block mb-2.5">
              ۲. رنگ تم و نورپردازی:
            </label>
            <div class="grid grid-cols-5 gap-2">
              @for (preset of presets; track preset.id) {
                <button
                  type="button"
                  (click)="setThemeColor(preset.id)"
                  class="flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer interactive-spring relative overflow-hidden"
                  [ngClass]="tempCustomization.themeColor === preset.id
                    ? 'border-white bg-slate-800 shadow-lg scale-105 ring-2 ring-purple-400/50'
                    : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800'"
                  [title]="preset.name"
                >
                  <span 
                    class="w-6 h-6 rounded-full shadow-inner mb-1 flex items-center justify-center text-xs text-white"
                    [style.background]="'linear-gradient(135deg, ' + preset.primaryHex + ', ' + preset.secondaryHex + ')'"
                  >
                    @if (tempCustomization.themeColor === preset.id) {
                      ✓
                    }
                  </span>
                  <span class="text-[10px] font-medium text-slate-300 truncate w-full text-center">
                    {{ preset.name }}
                  </span>
                </button>
              }
            </div>
          </div>

          <!-- 3. Accessories -->
          <div>
            <label class="text-xs font-bold text-slate-300 block mb-2.5">
              ۳. اکسسوری و آیتم جذاب:
            </label>
            <div class="grid grid-cols-5 gap-1.5">
              @for (acc of accessories; track acc.id) {
                <button
                  type="button"
                  (click)="setAccessory(acc.id)"
                  class="flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition-all cursor-pointer interactive-spring"
                  [ngClass]="tempCustomization.accessory === acc.id
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-900/30'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
                >
                  <span class="text-xl mb-1">{{ acc.icon }}</span>
                  <span class="text-[10px] font-medium truncate w-full text-center">{{ acc.label }}</span>
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2.5">
          <button 
            type="button"
            (click)="closeModal()" 
            class="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            انصراف
          </button>
          <button 
            type="button"
            (click)="saveChanges()" 
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/50 interactive-spring cursor-pointer flex items-center gap-1.5"
          >
            <span>ذخیره تغییرات</span>
            <span>✨</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class AvatarStudioModalComponent {
  private readonly themeService = inject(ThemeService);

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AvatarCustomization>();

  tempCustomization: AvatarCustomization = {
    ...this.themeService.customization(),
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

  setBaseType(type: AvatarBaseType): void {
    this.tempCustomization = { ...this.tempCustomization, baseType: type };
  }

  setThemeColor(color: ThemeColor): void {
    this.tempCustomization = { ...this.tempCustomization, themeColor: color };
  }

  setAccessory(accessory: AvatarAccessory): void {
    this.tempCustomization = { ...this.tempCustomization, accessory };
  }

  saveChanges(): void {
    this.themeService.updateCustomization(this.tempCustomization);
    this.saved.emit(this.tempCustomization);
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(e: MouseEvent): void {
    this.closeModal();
  }
}
