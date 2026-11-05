import { Component, EventEmitter, HostListener, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS_SHORT,
  getJalaliMonthLength,
  getJalaliMonthStartWeekday,
  getTodayJalali,
  jalaliToIso,
  gregorianToJalali,
  getJalaliDisplayStr,
} from '../../utils/jalali';

@Component({
  selector: 'app-jalali-date-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in select-none"
      dir="rtl"
      (click)="closeModal()"
    >
      <!-- Glassmorphic Picker Card -->
      <div
        class="w-full max-w-sm rounded-3xl bg-slate-900/90 border border-white/15 p-5 shadow-2xl backdrop-blur-2xl flex flex-col gap-3.5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] animate-scale-up"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="datePickerModalTitle"
      >
        <!-- Ambient Glow -->
        <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-purple-600/20 blur-2xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-pink-600/20 blur-2xl pointer-events-none"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-2 border-b border-white/10">
          <div class="flex items-center gap-2">
            <span class="text-lg">📅</span>
            <div>
              <h4 id="datePickerModalTitle" class="text-xs font-bold text-white">انتخاب تاریخ تقویم شمسی</h4>
              <p class="text-[10px] text-purple-300">{{ selectedDisplay() }}</p>
            </div>
          </div>
          <button
            type="button"
            (click)="closeModal()"
            class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        <!-- Year & Month Selectors -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Year Selector -->
          <div class="p-2 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
            <button
              type="button"
              (click)="changeYear(-1)"
              class="w-6 h-6 rounded-lg bg-white/5 hover:bg-purple-600/30 text-white flex items-center justify-center transition cursor-pointer text-xs"
            >
              -
            </button>
            <span class="text-xs font-bold text-white font-mono">{{ currentYear() }}</span>
            <button
              type="button"
              (click)="changeYear(1)"
              class="w-6 h-6 rounded-lg bg-white/5 hover:bg-purple-600/30 text-white flex items-center justify-center transition cursor-pointer text-xs"
            >
              +
            </button>
          </div>

          <!-- Month Selector -->
          <select
            [(ngModel)]="currentMonth"
            (ngModelChange)="onMonthChange($event)"
            class="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-white text-xs font-bold outline-none focus:border-purple-500 cursor-pointer"
          >
            @for (m of persianMonths; track $index) {
              <option [value]="$index + 1" class="bg-slate-900 text-white">
                {{ m }}
              </option>
            }
          </select>
        </div>

        <!-- Weekday Headers -->
        <div class="grid grid-cols-7 gap-1 text-center border-b border-white/5 pb-1">
          @for (dayName of weekdayNames; track $index) {
            <span class="text-[10px] font-bold text-slate-400">{{ dayName }}</span>
          }
        </div>

        <!-- Days Grid -->
        <div class="grid grid-cols-7 gap-1 text-center">
          <!-- Blank Offset Cells -->
          @for (offset of offsetArray(); track $index) {
            <div class="h-8"></div>
          }

          <!-- Actual Days -->
          @for (d of monthDaysArray(); track d) {
            @let isSelected = selectedDay() === d;
            @let isToday = isDayToday(d);
            <button
              type="button"
              (click)="selectDay(d)"
              class="h-8 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer interactive-spring"
              [ngClass]="isSelected
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-900/50 scale-105'
                : isToday
                  ? 'bg-purple-950/60 border border-purple-400 text-purple-200 hover:bg-purple-900/60'
                  : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-transparent'"
            >
              {{ d }}
            </button>
          }
        </div>

        <!-- Mode / Format Selector -->
        <div class="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
          <div class="flex items-center gap-1.5 text-[11px] text-slate-300">
            <input
              type="checkbox"
              id="includeYear"
              [(ngModel)]="includeYear"
              class="rounded bg-slate-950 border-white/20 text-purple-600 focus:ring-0 cursor-pointer"
            />
            <label for="includeYear" class="cursor-pointer">ثبت با سال کامل</label>
          </div>

          <button
            type="button"
            (click)="setToday()"
            class="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 transition cursor-pointer"
          >
            برو به امروز
          </button>
        </div>

        <!-- Footer Action -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            (click)="closeModal()"
            class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            انصراف
          </button>
          <button
            type="button"
            (click)="confirmSelection()"
            class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-900/40 hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            ✓ تایید تاریخ
          </button>
        </div>
      </div>
    </div>
  `
})
export class JalaliDatePickerModalComponent implements OnInit {
  @Input() initialDateStr: string = '';
  @Input() outputFormat: 'iso' | 'jalali' | 'month-day' = 'iso';
  @Output() dateSelected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  readonly persianMonths = PERSIAN_MONTHS;
  readonly weekdayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  readonly currentYear = signal<number>(1405);
  readonly currentMonth = signal<number>(8); // آبan
  readonly selectedDay = signal<number>(1);
  readonly offsetArray = signal<number[]>([]);
  readonly monthDaysArray = signal<number[]>([]);
  readonly selectedDisplay = signal<string>('');

  includeYear: boolean = true; // Default to full year

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.closeModal();
  }

  ngOnInit(): void {
    const [todayY, todayM, todayD] = getTodayJalali();
    this.currentYear.set(todayY);
    this.currentMonth.set(todayM);
    this.selectedDay.set(todayD);

    if (this.initialDateStr) {
      this.parseInitialDate(this.initialDateStr);
    }

    this.rebuildCalendarGrid();
    this.updateDisplayLabel();
  }

  private parseInitialDate(str: string): void {
    // Check if MM-DD
    const mmDdMatch = str.match(/^(\d{1,2})[-/](\d{1,2})$/);
    if (mmDdMatch) {
      const m = parseInt(mmDdMatch[1], 10);
      const d = parseInt(mmDdMatch[2], 10);
      if (m >= 1 && m <= 12) this.currentMonth.set(m);
      if (d >= 1 && d <= 31) this.selectedDay.set(d);
      this.includeYear = false;
      return;
    }

    // Check if YYYY-MM-DD or YYYY/MM/DD
    const yyyyMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (yyyyMatch) {
      const y = parseInt(yyyyMatch[1], 10);
      const m = parseInt(yyyyMatch[2], 10);
      const d = parseInt(yyyyMatch[3], 10);
      // Jalali year
      if (y >= 1300 && y <= 1500) {
        this.currentYear.set(y);
        this.currentMonth.set(m);
        this.selectedDay.set(d);
        this.includeYear = true;
        return;
      }
      // Gregorian year e.g. 2024-2030
      if (y >= 1900 && y <= 2100) {
        const [jy, jm, jd] = gregorianToJalali(y, m, d);
        this.currentYear.set(jy);
        this.currentMonth.set(jm);
        this.selectedDay.set(jd);
        this.includeYear = true;
        return;
      }
    }
  }

  changeYear(delta: number): void {
    this.currentYear.update((y) => y + delta);
    this.rebuildCalendarGrid();
    this.updateDisplayLabel();
  }

  onMonthChange(newMonth: number): void {
    this.currentMonth.set(Number(newMonth));
    this.rebuildCalendarGrid();
    this.updateDisplayLabel();
  }

  selectDay(d: number): void {
    this.selectedDay.set(d);
    this.updateDisplayLabel();
  }

  setToday(): void {
    const [todayY, todayM, todayD] = getTodayJalali();
    this.currentYear.set(todayY);
    this.currentMonth.set(todayM);
    this.selectedDay.set(todayD);
    this.rebuildCalendarGrid();
    this.updateDisplayLabel();
  }

  isDayToday(d: number): boolean {
    const [todayY, todayM, todayD] = getTodayJalali();
    return this.currentYear() === todayY && this.currentMonth() === todayM && d === todayD;
  }

  private rebuildCalendarGrid(): void {
    const y = this.currentYear();
    const m = this.currentMonth();
    const len = getJalaliMonthLength(y, m);
    const startW = getJalaliMonthStartWeekday(y, m);

    // If selected day exceeds new month length, adjust it
    if (this.selectedDay() > len) {
      this.selectedDay.set(len);
    }

    this.offsetArray.set(Array.from({ length: startW }, (_, i) => i));
    this.monthDaysArray.set(Array.from({ length: len }, (_, i) => i + 1));
  }

  private updateDisplayLabel(): void {
    const y = this.currentYear();
    const m = this.currentMonth();
    const d = this.selectedDay();
    const mName = PERSIAN_MONTHS[m - 1] || '';
    this.selectedDisplay.set(`${d} ${mName} ${y}`);
  }

  confirmSelection(): void {
    const y = this.currentYear();
    const m = this.currentMonth();
    const d = this.selectedDay();

    if (this.outputFormat === 'iso') {
      const iso = jalaliToIso(y, m, d);
      this.dateSelected.emit(iso);
    } else if (this.outputFormat === 'jalali') {
      const formatted = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      this.dateSelected.emit(formatted);
    } else {
      const formatted = this.includeYear
        ? `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      this.dateSelected.emit(formatted);
    }
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }
}
