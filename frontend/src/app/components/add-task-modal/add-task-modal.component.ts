import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskCategory, TaskPriority } from '../../models/task.model';
import { JalaliDatePickerModalComponent } from '../jalali-date-picker/jalali-date-picker-modal.component';
import {
  getTodayIso,
  addDaysToIso,
  getJalaliDateStr,
  getJalaliDisplayStr,
  getJalaliDayNameStr,
  toPersianDigits,
} from '../../utils/jalali';
import { TranslationService } from '../../services/translation.service';

export interface CustomCategoryItem {
  id: string;
  label: string;
  icon: string;
}

export interface NewTaskPayload {
  title: string;
  date: string;
  time: string;
  category: TaskCategory | string;
  priority: TaskPriority;
  durationMinutes: number;
  hasNotification: boolean;
}

const STORAGE_CUSTOM_CATEGORIES = 'tasky_custom_categories';

@Component({
  selector: 'app-add-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, JalaliDatePickerModalComponent],
  template: `
    <div 
      class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in select-none"
      [dir]="translation.currentLang() === 'en' ? 'ltr' : 'rtl'"
      (click)="closeModal()"
    >
      <div 
        class="w-full max-w-lg rounded-3xl tasky-card border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl flex flex-col gap-4 relative overflow-hidden my-auto animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addTaskModalTitle"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#DB2777] flex items-center justify-center text-white text-lg shadow-md shrink-0">
              ➕
            </div>
            <div>
              <h3 id="addTaskModalTitle" class="text-sm sm:text-base font-bold tasky-text-main">
                {{ translation.t('modal.add_title') }}
              </h3>
              <p class="text-[11px] text-slate-400">
                {{ translation.t('modal.add_sub') }}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            (click)="closeModal()" 
            class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            [attr.aria-label]="translation.t('modal.cancel')"
          >
            ✕
          </button>
        </div>

        <!-- Validation Error Message -->
        @if (validationError()) {
          <div class="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{{ validationError() }}</span>
          </div>
        }

        <!-- 1. Task Title Input -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main block">
            {{ translation.t('modal.title_label') }} <span class="text-rose-400">*</span>
          </label>
          <input
            type="text"
            [(ngModel)]="title"
            [placeholder]="translation.t('modal.title_placeholder')"
            class="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/50 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            maxlength="150"
            autofocus
          />
        </div>

        <!-- 2. Jalali Date Selection with Calendar Picker -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main flex items-center justify-between">
            <span>{{ translation.t('modal.date_label') }}</span>
            <button
              type="button"
              (click)="isDatePickerOpen.set(true)"
              class="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{{ translation.t('modal.from_calendar') }}</span>
            </button>
          </label>

          <!-- Selected Date Display Pill + Quick Buttons -->
          <div class="flex items-center gap-2">
            <div 
              (click)="isDatePickerOpen.set(true)"
              class="flex-1 p-2.5 rounded-2xl bg-slate-950/50 border border-white/10 hover:border-purple-500/40 flex items-center justify-between text-xs cursor-pointer transition select-none"
              title="Click to open calendar"
            >
              <div class="flex items-center gap-2">
                <span class="text-base">📆</span>
                <span class="font-bold text-white">{{ selectedDateDisplay() }}</span>
              </div>
              <span class="text-[10px] text-slate-400 font-mono">{{ selectedDayName() }}</span>
            </div>

            <!-- Quick Day Buttons -->
            <button
              type="button"
              (click)="setQuickDate(0)"
              class="px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer"
              [ngClass]="isTodaySelected() ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              {{ translation.t('modal.today') }}
            </button>
            <button
              type="button"
              (click)="setQuickDate(1)"
              class="px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer"
              [ngClass]="isTomorrowSelected() ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              {{ translation.t('modal.tomorrow') }}
            </button>
          </div>
        </div>

        <!-- 3. CUSTOM HARMONIOUS TIME PICKER (No native system browser popup!) -->
        <div class="space-y-2 p-3 rounded-2xl bg-slate-950/40 border border-white/10">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold tasky-text-main flex items-center gap-1.5">
              <span>⏰</span>
              <span>{{ translation.t('modal.time_label') }}</span>
            </label>
            <!-- Glowing Active Time Badge -->
            <div class="px-3 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 font-mono text-xs font-bold shadow-sm">
              {{ formattedDisplayTime() }}
            </div>
          </div>

          <!-- Quick Time Presets -->
          <div class="grid grid-cols-4 gap-1.5 pt-0.5">
            <button
              type="button"
              (click)="setTime(9, 0)"
              class="py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center truncate"
              [ngClass]="selectedHour === 9 && selectedMinute === 0 ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'"
            >
              🌅 ۰۹:۰۰
            </button>
            <button
              type="button"
              (click)="setTime(13, 0)"
              class="py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center truncate"
              [ngClass]="selectedHour === 13 && selectedMinute === 0 ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'"
            >
              ☀️ ۱۳:۰۰
            </button>
            <button
              type="button"
              (click)="setTime(17, 0)"
              class="py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center truncate"
              [ngClass]="selectedHour === 17 && selectedMinute === 0 ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'"
            >
              🌤️ ۱۷:۰۰
            </button>
            <button
              type="button"
              (click)="setTime(20, 30)"
              class="py-1 px-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer text-center truncate"
              [ngClass]="selectedHour === 20 && selectedMinute === 30 ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'"
            >
              🌙 ۲۰:۳۰
            </button>
          </div>

          <!-- Hours Selector Row (Horizontal Scroll) -->
          <div class="pt-1">
            <span class="text-[10px] text-slate-400 block mb-1">انتخاب ساعت:</span>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scrollbar-none scroll-smooth">
              @for (h of hoursList; track h) {
                <button
                  type="button"
                  (click)="selectedHour = h"
                  class="w-8 h-8 rounded-xl text-xs font-mono font-bold shrink-0 transition flex items-center justify-center cursor-pointer"
                  [ngClass]="selectedHour === h ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
                >
                  {{ formatDigits(h) }}
                </button>
              }
            </div>
          </div>

          <!-- Minutes Selector Row -->
          <div>
            <span class="text-[10px] text-slate-400 block mb-1">انتخاب دقیقه:</span>
            <div class="grid grid-cols-4 gap-1.5">
              @for (m of minutesList; track m) {
                <button
                  type="button"
                  (click)="selectedMinute = m"
                  class="py-1 rounded-xl text-xs font-mono font-bold transition flex items-center justify-center cursor-pointer"
                  [ngClass]="selectedMinute === m ? 'bg-purple-600 text-white shadow-sm' : 'bg-white/5 text-slate-300 hover:bg-white/10'"
                >
                  :{{ formatDigits(m) }}
                </button>
              }
            </div>
          </div>
        </div>

        <!-- 4. Duration Selector -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main block">
            {{ translation.t('modal.duration_label') }}
          </label>
          <div class="grid grid-cols-6 gap-1.5">
            @for (dur of [15, 30, 45, 60, 90, 120]; track dur) {
              <button
                type="button"
                (click)="durationMinutes = dur"
                class="py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center truncate"
                [ngClass]="durationMinutes === dur ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'"
              >
                {{ formatNumber(dur) }}د
              </button>
            }
          </div>
        </div>

        <!-- 5. Category Selection with Custom Category Creator -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold tasky-text-main block">
              {{ translation.t('modal.category_label') }}
            </label>
            <button
              type="button"
              (click)="isAddingNewCategory.set(!isAddingNewCategory())"
              class="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>{{ isAddingNewCategory() ? '✕ بستن' : '+ دسته جدید' }}</span>
            </button>
          </div>

          <!-- Inline Custom Category Creator -->
          @if (isAddingNewCategory()) {
            <div class="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2 animate-fade-in">
              <span class="text-xs font-bold text-purple-200 block">افزودن دسته‌بندی دلخواه شما:</span>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  [(ngModel)]="newCategoryName"
                  placeholder="نام دسته (مثلاً: پروژه، بازی، نقاشی...)"
                  class="flex-1 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-purple-400"
                  maxlength="30"
                />
                <button
                  type="button"
                  (click)="saveCustomCategory()"
                  class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  افزودن
                </button>
              </div>

              <!-- Emoji selector for new category -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scrollbar-none">
                @for (emoji of availableEmojis; track emoji) {
                  <button
                    type="button"
                    (click)="newCategoryIcon = emoji"
                    class="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition cursor-pointer shrink-0"
                    [ngClass]="newCategoryIcon === emoji ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-white/5 hover:bg-white/10'"
                  >
                    {{ emoji }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Category Pills Grid -->
          <div class="grid grid-cols-4 gap-1.5">
            @for (cat of allCategories(); track cat.id) {
              <button
                type="button"
                (click)="selectedCategory = cat.id"
                class="py-2 px-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition truncate"
                [ngClass]="selectedCategory === cat.id 
                  ? 'bg-purple-950/90 border-purple-500 text-purple-200 shadow-sm' 
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
              >
                <span>{{ cat.icon }}</span>
                <span class="truncate">{{ cat.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- 6. Priority Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main block">
            {{ translation.t('modal.priority_label') }}
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              (click)="selectedPriority = 'high'"
              class="py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              [ngClass]="selectedPriority === 'high' 
                ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-sm' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              <span>🔴</span>
              <span>{{ translation.t('modal.urgent') }}</span>
            </button>
            <button
              type="button"
              (click)="selectedPriority = 'medium'"
              class="py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              [ngClass]="selectedPriority === 'medium' 
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-sm' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              <span>🟡</span>
              <span>{{ translation.t('modal.medium') }}</span>
            </button>
            <button
              type="button"
              (click)="selectedPriority = 'low'"
              class="py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
              [ngClass]="selectedPriority === 'low' 
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-sm' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              <span>🟢</span>
              <span>{{ translation.t('modal.normal') }}</span>
            </button>
          </div>
        </div>

        <!-- 7. Notification Reminder Checkbox -->
        <label class="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:border-purple-500/30 transition select-none">
          <input
            type="checkbox"
            [(ngModel)]="hasNotification"
            class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-white/20 cursor-pointer"
          />
          <div class="text-xs">
            <span class="font-bold text-white block">{{ translation.t('modal.notification_label') }}</span>
            <span class="text-[10px] text-slate-400">{{ translation.t('modal.notification_sub') }}</span>
          </div>
        </label>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between gap-3 pt-2 border-t border-white/10 shrink-0">
          <button
            type="button"
            (click)="closeModal()"
            class="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            {{ translation.t('modal.cancel') }}
          </button>
          <button
            type="button"
            (click)="submitTask()"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>✓</span>
            <span>{{ translation.t('modal.submit') }}</span>
          </button>
        </div>

      </div>

      <!-- Nested Jalali Date Picker Modal with iso format output -->
      @if (isDatePickerOpen()) {
        <app-jalali-date-picker-modal
          [initialDateStr]="selectedIsoDate"
          outputFormat="iso"
          (dateSelected)="onCalendarDateSelected($event)"
          (close)="isDatePickerOpen.set(false)"
        ></app-jalali-date-picker-modal>
      }

    </div>
  `
})
export class AddTaskModalComponent implements OnInit {
  readonly toPersianDigits = toPersianDigits;
  readonly translation = inject(TranslationService);

  @Input() initialDateIso: string = getTodayIso();
  @Output() taskCreated = new EventEmitter<NewTaskPayload>();
  @Output() close = new EventEmitter<void>();

  title: string = '';
  selectedIsoDate: string = getTodayIso();
  selectedHour: number = 10;
  selectedMinute: number = 0;
  durationMinutes: number = 45;
  selectedCategory: TaskCategory | string = 'work';
  selectedPriority: TaskPriority = 'high';
  hasNotification: boolean = true;

  readonly isDatePickerOpen = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);

  // Custom Category Creator Signals
  readonly isAddingNewCategory = signal<boolean>(false);
  newCategoryName: string = '';
  newCategoryIcon: string = '🎯';
  readonly customCategories = signal<CustomCategoryItem[]>([]);

  readonly hoursList: number[] = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
  readonly minutesList: number[] = [0, 15, 30, 45];
  readonly availableEmojis: string[] = ['🎯', '🚀', '💻', '🎨', '📚', '🎵', '🩺', '🍕', '💡', '🚗', '🎮', '✈️', '🌿', '🏋️', '☕'];

  readonly defaultCategories: CustomCategoryItem[] = [
    { id: 'work', label: 'کاری', icon: '💼' },
    { id: 'study', label: 'مطالعه', icon: '📚' },
    { id: 'fitness', label: 'ورزش', icon: '🏃' },
    { id: 'health', label: 'سلامت', icon: '🩺' },
    { id: 'shopping', label: 'خرید', icon: '🛒' },
    { id: 'personal', label: 'شخصی', icon: '🌟' },
    { id: 'rest', label: 'استراحت', icon: '☕' },
  ];

  ngOnInit(): void {
    if (this.initialDateIso) {
      this.selectedIsoDate = this.initialDateIso;
    }
    const now = new Date();
    this.selectedHour = (now.getHours() + 1) % 24;
    this.selectedMinute = 0;

    this.loadCustomCategories();
  }

  loadCustomCategories(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_CATEGORIES);
      if (stored) {
        this.customCategories.set(JSON.parse(stored));
      }
    } catch {}
  }

  saveCustomCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) return;

    const id = 'custom_' + Date.now();
    const item: CustomCategoryItem = {
      id,
      label: name,
      icon: this.newCategoryIcon || '🎯'
    };

    const updated = [...this.customCategories(), item];
    this.customCategories.set(updated);
    try {
      localStorage.setItem(STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));
    } catch {}

    this.selectedCategory = id;
    this.newCategoryName = '';
    this.isAddingNewCategory.set(false);
  }

  allCategories(): CustomCategoryItem[] {
    const lang = this.translation.currentLang();
    const defaults = this.defaultCategories.map(c => ({
      ...c,
      label: this.translation.t(`cat.${c.id}`) || c.label
    }));
    return [...defaults, ...this.customCategories()];
  }

  setTime(hour: number, minute: number): void {
    this.selectedHour = hour;
    this.selectedMinute = minute;
  }

  formattedDisplayTime(): string {
    const h = String(this.selectedHour).padStart(2, '0');
    const m = String(this.selectedMinute).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    return this.translation.currentLang() === 'fa' ? toPersianDigits(timeStr) : timeStr;
  }

  formatDigits(val: number): string {
    const str = String(val).padStart(2, '0');
    return this.translation.currentLang() === 'fa' ? toPersianDigits(str) : str;
  }

  formatNumber(val: number): string {
    return this.translation.currentLang() === 'fa' ? toPersianDigits(val) : String(val);
  }

  selectedDateDisplay(): string {
    return getJalaliDisplayStr(this.selectedIsoDate, this.translation.currentLang());
  }

  selectedDayName(): string {
    return getJalaliDayNameStr(this.selectedIsoDate, this.translation.currentLang());
  }

  isTodaySelected(): boolean {
    return this.selectedIsoDate === getTodayIso();
  }

  isTomorrowSelected(): boolean {
    return this.selectedIsoDate === addDaysToIso(getTodayIso(), 1);
  }

  setQuickDate(offsetDays: number): void {
    this.selectedIsoDate = addDaysToIso(getTodayIso(), offsetDays);
  }

  onCalendarDateSelected(isoDate: string): void {
    this.selectedIsoDate = isoDate;
    this.isDatePickerOpen.set(false);
  }

  closeModal(): void {
    this.close.emit();
  }

  submitTask(): void {
    const trimmed = this.title.trim();
    if (!trimmed) {
      this.validationError.set(
        this.translation.currentLang() === 'en'
          ? 'Please enter task title.'
          : 'لطفاً عنوان یا متن تسک را وارد نمایید.'
      );
      return;
    }
    this.validationError.set(null);

    const timeStr = `${String(this.selectedHour).padStart(2, '0')}:${String(this.selectedMinute).padStart(2, '0')}`;

    this.taskCreated.emit({
      title: trimmed,
      date: this.selectedIsoDate,
      time: timeStr,
      category: this.selectedCategory,
      priority: this.selectedPriority,
      durationMinutes: Number(this.durationMinutes) || 45,
      hasNotification: this.hasNotification,
    });
  }
}
