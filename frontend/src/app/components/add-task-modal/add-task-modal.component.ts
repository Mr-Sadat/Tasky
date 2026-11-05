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

export interface NewTaskPayload {
  title: string;
  date: string;
  time: string;
  category: TaskCategory;
  priority: TaskPriority;
  durationMinutes: number;
  hasNotification: boolean;
}

@Component({
  selector: 'app-add-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, JalaliDatePickerModalComponent],
  template: `
    <div 
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none"
      dir="rtl"
      (click)="closeModal()"
    >
      <div 
        class="w-full max-w-md rounded-3xl tasky-card border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl flex flex-col gap-4 relative overflow-hidden my-auto animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="addTaskModalTitle"
        (click)="$event.stopPropagation()"
      >
        <!-- Ambient Decorative Glow -->
        <div class="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-purple-600/20 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-pink-600/20 blur-3xl pointer-events-none"></div>

        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white text-lg shadow-md">
              ➕
            </div>
            <div>
              <h3 id="addTaskModalTitle" class="text-sm sm:text-base font-bold tasky-text-main">
                افزودن تسک و برنامه جدید
              </h3>
              <p class="text-[11px] text-slate-400">
                مشخصات، زمان دقیق و دسته‌بندی کار خود را وارد کنید
              </p>
            </div>
          </div>
          <button 
            type="button" 
            (click)="closeModal()" 
            class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>

        <!-- Error feedback -->
        @if (validationError()) {
          <div class="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{{ validationError() }}</span>
          </div>
        }

        <!-- 1. Task Title Input -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main block">
            عنوان یا متن تسک <span class="text-rose-400">*</span>
          </label>
          <input
            type="text"
            [(ngModel)]="title"
            placeholder="مثلاً: جلسه بازبینی طراحی اپلیکیشن یا مطالعه..."
            class="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
            maxlength="150"
            autofocus
          />
        </div>

        <!-- 2. Jalali Date Selection with Calendar Picker -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main flex items-center justify-between">
            <span>تاریخ (تقویم شمسی)</span>
            <button
              type="button"
              (click)="isDatePickerOpen.set(true)"
              class="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>📅 انتخاب از تقویم</span>
            </button>
          </label>

          <!-- Selected Date Display Pill + Quick Buttons -->
          <div class="flex items-center gap-2">
            <div 
              (click)="isDatePickerOpen.set(true)"
              class="flex-1 p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-purple-500/40 flex items-center justify-between text-xs cursor-pointer transition"
              title="کلیک برای باز کردن تقویم شمسی"
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
              class="px-2.5 py-2 rounded-xl text-xs font-bold transition border"
              [ngClass]="isTodaySelected() ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              امروز
            </button>
            <button
              type="button"
              (click)="setQuickDate(1)"
              class="px-2.5 py-2 rounded-xl text-xs font-bold transition border"
              [ngClass]="isTomorrowSelected() ? 'bg-purple-600 border-purple-500 text-white shadow-sm' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'"
            >
              فردا
            </button>
          </div>
        </div>

        <!-- 3. Time & Estimated Duration Row -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Scheduled Time -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold tasky-text-main block">
              ساعت انجام کار
            </label>
            <input
              type="time"
              [(ngModel)]="scheduledTime"
              class="w-full px-3 py-2 rounded-2xl bg-slate-950/60 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition font-mono"
            />
          </div>

          <!-- Duration Selector -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold tasky-text-main block">
              مدت زمان تقریبی
            </label>
            <select
              [(ngModel)]="durationMinutes"
              class="w-full px-3 py-2 rounded-2xl bg-slate-950/60 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition cursor-pointer"
            >
              <option [value]="15" class="bg-slate-900 text-white">۱۵ دقیقه</option>
              <option [value]="30" class="bg-slate-900 text-white">۳۰ دقیقه</option>
              <option [value]="45" class="bg-slate-900 text-white">۴۵ دقیقه</option>
              <option [value]="60" class="bg-slate-900 text-white">۱ ساعت (۶۰د)</option>
              <option [value]="90" class="bg-slate-900 text-white">۱.۵ ساعت (۹۰د)</option>
              <option [value]="120" class="bg-slate-900 text-white">۲ ساعت (۱۲۰د)</option>
            </select>
          </div>
        </div>

        <!-- 4. Category Pills Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main block">
            دسته‌بندی تسک
          </label>
          <div class="grid grid-cols-4 gap-1.5 sm:grid-cols-4">
            @for (cat of categoryOptions; track cat.id) {
              <button
                type="button"
                (click)="selectedCategory = cat.id"
                class="py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition truncate"
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

        <!-- 5. Priority Selection -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold tasky-text-main block">
            اولویت انجام
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
              <span>فوری و مهم</span>
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
              <span>متوسط</span>
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
              <span>عادی</span>
            </button>
          </div>
        </div>

        <!-- 6. Notification Reminder Checkbox -->
        <label class="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:border-purple-500/30 transition select-none">
          <input
            type="checkbox"
            [(ngModel)]="hasNotification"
            class="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-900 border-white/20 cursor-pointer"
          />
          <div class="text-xs">
            <span class="font-bold text-white block">اعلان و یادآوری صوتی</span>
            <span class="text-[10px] text-slate-400">یادآوری قبل از ساعت مقرر ارسال خواهد شد</span>
          </div>
        </label>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between gap-3 pt-2 border-t border-white/10 shrink-0">
          <button
            type="button"
            (click)="closeModal()"
            class="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-bold transition cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            (click)="submitTask()"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>✓</span>
            <span>افزودن به برنامه</span>
          </button>
        </div>

      </div>

      <!-- Nested Jalali Date Picker Modal -->
      @if (isDatePickerOpen()) {
        <app-jalali-date-picker-modal
          [initialDateStr]="selectedIsoDate"
          (dateSelected)="onCalendarDateSelected($event)"
          (close)="isDatePickerOpen.set(false)"
        ></app-jalali-date-picker-modal>
      }

    </div>
  `
})
export class AddTaskModalComponent implements OnInit {
  readonly toPersianDigits = toPersianDigits;
  private readonly translation = inject(TranslationService);

  @Input() initialDateIso: string = getTodayIso();
  @Output() taskCreated = new EventEmitter<NewTaskPayload>();
  @Output() close = new EventEmitter<void>();

  title: string = '';
  selectedIsoDate: string = getTodayIso();
  scheduledTime: string = '10:00';
  durationMinutes: number = 45;
  selectedCategory: TaskCategory = 'work';
  selectedPriority: TaskPriority = 'high';
  hasNotification: boolean = true;

  readonly isDatePickerOpen = signal<boolean>(false);
  readonly validationError = signal<string | null>(null);

  readonly categoryOptions: { id: TaskCategory; label: string; icon: string }[] = [
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
    // Set default time to next hour
    const now = new Date();
    const nextHour = (now.getHours() + 1) % 24;
    this.scheduledTime = `${String(nextHour).padStart(2, '0')}:00`;
  }

  selectedDateDisplay(): string {
    return getJalaliDisplayStr(this.selectedIsoDate);
  }

  selectedDayName(): string {
    return getJalaliDayNameStr(this.selectedIsoDate);
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
      this.validationError.set('لطفاً عنوان یا متن تسک را وارد نمایید.');
      return;
    }
    this.validationError.set(null);

    this.taskCreated.emit({
      title: trimmed,
      date: this.selectedIsoDate,
      time: this.scheduledTime || '10:00',
      category: this.selectedCategory,
      priority: this.selectedPriority,
      durationMinutes: Number(this.durationMinutes) || 45,
      hasNotification: this.hasNotification,
    });
  }
}
