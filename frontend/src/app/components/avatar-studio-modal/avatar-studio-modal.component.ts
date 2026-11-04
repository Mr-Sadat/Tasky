import { Component, EventEmitter, HostListener, OnInit, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AvatarCustomization } from '../../models/task.model';
import {
  ThemeService,
  DEFAULT_AVATAR_CUSTOMIZATION,
  sanitizeAvatarConfig,
} from '../../services/theme.service';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';
import { AvatarEditorComponent } from '../avatar-editor/avatar-editor.component';

@Component({
  selector: 'app-avatar-studio-modal',
  standalone: true,
  imports: [CommonModule, DynamicAvatarComponent, AvatarEditorComponent],
  template: `
    <!-- Modal Backdrop -->
    <div 
      class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      (click)="onBackdropClick($event)"
      dir="rtl"
    >
      <!-- Modal Container -->
      <div 
        class="w-full max-w-lg rounded-3xl bg-slate-900/80 border border-white/15 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col max-h-[92vh] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studioModalTitle"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-lg shadow-md shadow-pink-900/30">
              🎨
            </div>
            <div>
              <h3 id="studioModalTitle" class="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>استودیو طراحی آواتار</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">سبک مدرن</span>
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

              <!-- Action buttons: Randomize, Reset -->
              <div class="flex items-center gap-2 flex-wrap">
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

        <!-- REUSABLE AVATAR EDITOR CONTENT (SCROLLABLE) -->
        <div class="flex-1 overflow-y-auto p-4">
          <app-avatar-editor
            [customization]="tempCustomization"
            (customizationChange)="onCustomizationChange($event)"
          ></app-avatar-editor>
        </div>

        <!-- Modal Footer: Auto-Save Status & Action -->
        <div class="p-3.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2 text-xs text-emerald-400 font-semibold select-none">
            <span class="flex h-2.5 w-2.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>تغییرات در لحظه ذخیره می‌شوند</span>
          </div>

          <button
            type="button"
            (click)="closeModal()"
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
          >
            <span>✓</span>
            <span>تایید و بستن</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AvatarStudioModalComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly apiService = inject(ApiService);

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AvatarCustomization>();

  tempCustomization: AvatarCustomization = { ...DEFAULT_AVATAR_CUSTOMIZATION };
  reactionText: string = 'سلام! چهره، مو و استایل مورد علاقه‌ت رو انتخاب کن!';

  private readonly autoSaveSubject = new Subject<AvatarCustomization>();
  private autoSaveSub?: Subscription;

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.closeModal();
  }

  ngOnInit(): void {
    this.tempCustomization = sanitizeAvatarConfig(this.themeService.customization());

    // Debounced automatic persistence
    this.autoSaveSub = this.autoSaveSubject.pipe(
      debounceTime(350),
      switchMap((config) => this.apiService.updateProfile({ avatar_config: config }))
    ).subscribe({
      next: () => {},
      error: (err) => console.warn('Auto-save avatar failed:', err),
    });
  }

  ngOnDestroy(): void {
    this.autoSaveSub?.unsubscribe();
  }

  onCustomizationChange(updated: AvatarCustomization): void {
    this.tempCustomization = updated;
    this.reactionText = 'تغییرات با موفقیت اعمال شد! ✨';
    this.themeService.saveCustomization(updated);
    this.saved.emit(updated);
    this.autoSaveSubject.next(updated);
  }

  randomizeAvatar(): void {
    this.tempCustomization = this.themeService.getRandomAvatar();
    this.reactionText = 'یک استایل تصادفی خاص برات ساختم! چطوره؟ 🎲';
    this.themeService.saveCustomization(this.tempCustomization);
    this.saved.emit(this.tempCustomization);
    this.autoSaveSubject.next(this.tempCustomization);
  }

  resetAvatar(): void {
    this.tempCustomization = sanitizeAvatarConfig(this.themeService.customization());
    this.reactionText = 'به حالت قبلی بازگشتیم!';
    this.themeService.saveCustomization(this.tempCustomization);
    this.saved.emit(this.tempCustomization);
    this.autoSaveSubject.next(this.tempCustomization);
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
