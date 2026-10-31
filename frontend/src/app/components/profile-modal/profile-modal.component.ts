import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ThemeService, THEME_PRESETS, ThemePreset } from '../../services/theme.service';
import {
  UserProfile,
  AvatarCustomization,
  AvatarBaseType,
  ThemeColor,
  AvatarAccessory,
} from '../../models/task.model';
import { AvatarCardComponent } from '../avatar-card/avatar-card.component';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarCardComponent],
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
            <h3 class="text-base font-bold text-white">پروفایل و مغز هوش مصنوعی</h3>
            <p class="text-[11px] text-slate-400">تنظیمات شخصی، روتین خواب و قوانین اختصاصی AI</p>
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
            ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/40'
            : 'text-slate-400 hover:text-white'"
        >
          <span>🎨</span>
          <span>آواتار و تم</span>
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
                ✨ هوش مصنوعی Tasky تمامی تسک‌های صوتی و متنی شما را منطبق بر این ساعات زمان‌بندی می‌کند و در ساعات خواب شما هیچ برنامه‌ای قرار نمی‌دهد.
              </p>
            </div>
          </div>
        }

        <!-- TAB 2: AI Guidelines Direct Viewer/Editor -->
        @if (activeTab() === 'guidelines') {
          <div class="space-y-3 animate-fade-in">
            <div class="flex items-center justify-between">
              <label for="aiGuidelinesInput" class="text-xs font-bold text-slate-200">
                قوانین هوشمند دستیار (AI Guidelines):
              </label>
              <span class="text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
                قابلیت ویرایش مستقیم
              </span>
            </div>

            <p class="text-[11px] text-slate-400 leading-relaxed">
              این قوانین بر اساس پرسشنامه اولیه شما توسط هوش مصنوعی تولید شده‌اند و در هر برنامه‌ریزی به عنوان دستورالعمل سیستم به کار گرفته می‌شوند. شما می‌توانید آن‌ها را آزادانه ویرایش، اضافه یا حذف کنید.
            </p>

            <textarea
              id="aiGuidelinesInput"
              [(ngModel)]="editGuidelines"
              rows="9"
              class="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono leading-relaxed focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition resize-none selection:bg-purple-600"
              placeholder="قوانین زمان‌بندی و لحن را اینجا بنویسید..."
            ></textarea>
          </div>
        }

        <!-- TAB 3: Layered Avatar & Theme -->
        @if (activeTab() === 'avatar') {
          <div class="space-y-4 animate-fade-in">
            <!-- Live Preview -->
            <div class="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span class="text-[11px] font-semibold text-purple-300 mb-1 block">پیش‌نمایش آواتار:</span>
              <app-avatar-card
                [customization]="editAvatarConfig"
                state="happy"
                voiceReply="تیپ جدیدم چطوره؟"
              ></app-avatar-card>
            </div>

            <!-- Character Base -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-1.5">کاراکتر:</span>
              <div class="grid grid-cols-4 gap-2">
                @for (base of baseTypes; track base.id) {
                  <button
                    type="button"
                    (click)="editAvatarConfig.baseType = base.id; applyPreviewTheme()"
                    class="p-2 rounded-xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="editAvatarConfig.baseType === base.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800'"
                  >
                    <span class="text-xl mb-0.5">{{ base.icon }}</span>
                    <span class="text-[10px] font-medium">{{ base.label }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Color Theme -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-1.5">رنگ تم:</span>
              <div class="grid grid-cols-5 gap-1.5">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    (click)="editAvatarConfig.themeColor = preset.id; applyPreviewTheme()"
                    class="p-1.5 rounded-xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="editAvatarConfig.themeColor === preset.id
                      ? 'border-white bg-slate-800 shadow-md ring-1 ring-purple-400/50'
                      : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800'"
                  >
                    <span 
                      class="w-5 h-5 rounded-full mb-1 flex items-center justify-center text-[10px] text-white shadow-inner"
                      [style.background]="'linear-gradient(135deg, ' + preset.primaryHex + ', ' + preset.secondaryHex + ')'"
                    >
                      @if (editAvatarConfig.themeColor === preset.id) { ✓ }
                    </span>
                    <span class="text-[9px] font-medium text-slate-300 truncate w-full text-center">{{ preset.name }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Accessories -->
            <div>
              <span class="block text-xs font-bold text-slate-300 mb-1.5">اکسسوری:</span>
              <div class="grid grid-cols-5 gap-1.5">
                @for (acc of accessories; track acc.id) {
                  <button
                    type="button"
                    (click)="editAvatarConfig.accessory = acc.id"
                    class="p-1.5 rounded-xl border text-center transition cursor-pointer interactive-spring flex flex-col items-center"
                    [ngClass]="editAvatarConfig.accessory === acc.id
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-900/30'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-800'"
                  >
                    <span class="text-lg mb-0.5">{{ acc.icon }}</span>
                    <span class="text-[9px] font-medium truncate w-full text-center">{{ acc.label }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Dialog Footer -->
      <div class="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
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
          class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/40 disabled:opacity-50 interactive-spring cursor-pointer flex items-center gap-1.5"
        >
          @if (isSaving()) {
            <span class="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
            <span>در حال ذخیره...</span>
          } @else {
            <span>ذخیره تغییرات</span>
            <span>✓</span>
          }
        </button>
      </div>
    </dialog>
  `,
})
export class ProfileModalComponent implements OnInit {
  @ViewChild('profileDialog') dialogRef?: ElementRef<HTMLDialogElement>;

  @Input() profile: UserProfile | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<UserProfile>();

  private readonly apiService = inject(ApiService);
  private readonly themeService = inject(ThemeService);

  readonly activeTab = signal<'general' | 'guidelines' | 'avatar'>('general');
  readonly isSaving = signal<boolean>(false);

  editName: string = '';
  editWakeTime: string = '07:00';
  editSleepTime: string = '23:00';
  editGuidelines: string = '';
  editAvatarConfig: AvatarCustomization = {
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

  ngOnInit(): void {
    if (this.profile) {
      this.editName = this.profile.name || '';
      this.editWakeTime = this.profile.wake_time || '07:00';
      this.editSleepTime = this.profile.sleep_time || '23:00';
      this.editGuidelines = this.profile.ai_guidelines || '';
      if (this.profile.avatar_config) {
        this.editAvatarConfig = { ...this.profile.avatar_config };
      }
    } else {
      this.editAvatarConfig = { ...this.themeService.customization() };
    }
  }

  ngAfterViewInit(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  applyPreviewTheme(): void {
    this.themeService.updateCustomization(this.editAvatarConfig);
  }

  saveProfile(): void {
    this.isSaving.set(true);

    const changes: Partial<UserProfile> = {
      name: this.editName.trim() || 'کاربر',
      wake_time: this.editWakeTime || '07:00',
      sleep_time: this.editSleepTime || '23:00',
      ai_guidelines: this.editGuidelines.trim(),
      avatar_config: this.editAvatarConfig,
    };

    this.apiService.updateProfile(changes).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        // Save to localStorage
        try {
          localStorage.setItem('tasky_user_profile', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to cache profile to localStorage:', e);
        }

        // Apply theme
        this.themeService.updateCustomization(updated.avatar_config);

        this.saved.emit(updated);
        this.closeModal();
      },
      error: (err) => {
        console.error('Failed to update profile:', err);
        this.isSaving.set(false);
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
    this.close.emit();
  }

  onDialogClick(event: MouseEvent): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && event.target === dialog) {
      this.closeModal();
    }
  }
}
