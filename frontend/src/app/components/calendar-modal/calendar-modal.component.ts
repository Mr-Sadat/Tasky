import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SpecialOccasion, Task, UserProfile } from '../../models/task.model';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  getJalaliMonthLength,
  getJalaliMonthStartWeekday,
  getTodayJalali,
  jalaliToIso,
  getJalaliDisplayStr,
  getJalaliDateStr,
  getJalaliDayNameStr,
} from '../../utils/jalali';
import { getStoredOccasions, findOccasionsForTimeline } from '../../utils/occasions';

interface DayGridItem {
  day: number;
  jalaliDate: string; // e.g. "1403-08-14"
  isoDate: string; // e.g. "2024-11-04"
  monthDayStr: string; // e.g. "08-14"
  isToday: boolean;
  occasions: SpecialOccasion[];
  tasks: Task[];
}

@Component({
  selector: 'app-calendar-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in select-none"
      dir="rtl"
      (click)="closeModal()"
    >
      <!-- Glassmorphic Calendar Container -->
      <div
        class="w-full max-w-xl rounded-3xl bg-slate-900/90 border border-white/15 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl flex flex-col gap-4 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] my-auto max-h-[92vh] overflow-y-auto animate-scale-up"
        (click)="$event.stopPropagation()"
      >
        <!-- Background Ambient Glow -->
        <div class="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-600/20 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none"></div>

        <!-- Top Header: Title & Close -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-white/20 flex items-center justify-center text-lg shadow-lg shadow-purple-900/40">
              🗓️
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white">تقویم جامع شمسی و مناسبت‌ها</h3>
              <p class="text-[11px] text-slate-400">مرور ماهانه، مناسبت‌های ایران و جهان و برنامه‌ریزی هر تاریخ دلخواه</p>
            </div>
          </div>

          <button
            type="button"
            (click)="closeModal()"
            class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer text-xs"
            title="بستن"
          >
            ✕
          </button>
        </div>

        <!-- Month Navigation Bar -->
        <div class="flex items-center justify-between p-2 rounded-2xl bg-slate-950/70 border border-white/10 shrink-0">
          <button
            type="button"
            (click)="nextMonth()"
            class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-purple-200 hover:text-white transition cursor-pointer text-xs font-bold flex items-center gap-1"
          >
            <span>◀</span>
            <span>ماه بعد</span>
          </button>

          <div class="flex items-center gap-2">
            <span class="text-sm sm:text-base font-extrabold text-white">
              {{ currentMonthName() }} {{ currentYear() }}
            </span>
            <button
              type="button"
              (click)="goToToday()"
              class="text-[10px] px-2 py-0.5 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-300 hover:text-white transition cursor-pointer"
            >
              امروز
            </button>
          </div>

          <button
            type="button"
            (click)="prevMonth()"
            class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-purple-200 hover:text-white transition cursor-pointer text-xs font-bold flex items-center gap-1"
          >
            <span>ماه قبل</span>
            <span>▶</span>
          </button>
        </div>

        <!-- 7-Column Days Grid -->
        <div class="space-y-1.5 shrink-0">
          <!-- Weekday Headers -->
          <div class="grid grid-cols-7 gap-1 text-center">
            @for (w of weekdayNames; track $index) {
              <span class="text-[11px] font-bold text-slate-400 py-1">{{ w }}</span>
            }
          </div>

          <!-- Calendar Days Grid -->
          <div class="grid grid-cols-7 gap-1 text-center">
            <!-- Empty offset boxes -->
            @for (empty of emptyOffsets(); track $index) {
              <div class="h-14 sm:h-16 rounded-xl bg-transparent"></div>
            }

            <!-- Day Cards -->
            @for (item of daysGrid(); track item.day) {
              @let isSelected = selectedDay()?.day === item.day;
              <button
                type="button"
                (click)="selectDay(item)"
                class="h-14 sm:h-16 rounded-2xl p-1 flex flex-col justify-between items-center transition relative cursor-pointer interactive-spring overflow-hidden border"
                [ngClass]="isSelected
                  ? 'bg-gradient-to-b from-purple-600 to-indigo-600 border-purple-400 text-white shadow-lg shadow-purple-900/60 scale-105 z-10'
                  : item.isToday
                    ? 'bg-cyan-950/40 border-cyan-400/80 text-cyan-200 hover:bg-cyan-900/40 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300 hover:text-white'"
              >
                <!-- Day Number -->
                <span class="text-xs font-bold" [class.text-white]="isSelected">{{ item.day }}</span>

                <!-- Indicators Container -->
                <div class="flex items-center justify-center gap-0.5 w-full flex-wrap overflow-hidden">
                  <!-- Occasion Indicator -->
                  @if (item.occasions.length > 0) {
                    <span
                      class="text-[10px] leading-none"
                      [title]="item.occasions[0].title"
                    >
                      {{ item.occasions[0].icon || '🎉' }}
                    </span>
                  }

                  <!-- Task Count Indicator -->
                  @if (item.tasks.length > 0) {
                    <span
                      class="text-[9px] px-1 rounded-full font-mono font-bold leading-tight"
                      [ngClass]="isSelected ? 'bg-white/30 text-white' : 'bg-purple-500/20 text-purple-300 border border-purple-400/30'"
                    >
                      {{ item.tasks.length }}
                    </span>
                  }
                </div>
              </button>
            }
          </div>
        </div>

        <!-- ========================================== -->
        <!-- SELECTED DAY DETAIL PANEL                  -->
        <!-- ========================================== -->
        @if (selectedDay(); as day) {
          <div class="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3.5 animate-fade-in shadow-inner">
            <!-- Day Detail Header -->
            <div class="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
              <div class="flex items-center gap-2">
                <span class="text-base font-extrabold text-white">
                  📌 {{ getSelectedDayTitle() }}
                </span>
                @if (day.isToday) {
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                    امروز
                  </span>
                }
              </div>

              <!-- Jump to Timeline Button -->
              <button
                type="button"
                (click)="jumpToTimeline(day.isoDate)"
                class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-900/40 interactive-spring"
              >
                <span>🚀</span>
                <span>برنامه‌ریزی در صفحه اصلی</span>
              </button>
            </div>

            <!-- Occasions Section for this Day -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-purple-200">
                  🎉 مناسبت‌های این تاریخ ({{ day.occasions.length }} مورد):
                </span>
                <button
                  type="button"
                  (click)="isAddingOccasion = !isAddingOccasion"
                  class="text-[11px] font-semibold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>{{ isAddingOccasion ? '✕ انصراف' : '➕ تعریف مناسبت جدید' }}</span>
                </button>
              </div>

              <!-- Quick Occasion Form for THIS day -->
              @if (isAddingOccasion) {
                <div class="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2 animate-fade-in">
                  <span class="text-[11px] text-purple-200 block font-bold">
                    ثبت مناسبت جدید برای {{ day.day }} {{ currentMonthName() }}:
                  </span>
                  <div class="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      [(ngModel)]="newOccasionTitle"
                      placeholder="عنوان (مثلاً: سالگرد ازدواج، تولد دوستم)"
                      class="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs outline-none focus:border-purple-500"
                    />

                    <!-- Icon selector -->
                    <select
                      [(ngModel)]="newOccasionIcon"
                      class="px-2 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="🎂">🎂 تولد</option>
                      <option value="💍">💍 سالگرد</option>
                      <option value="🎁">🎁 هدیه</option>
                      <option value="🎓">🎓 فارغ‌التحصیلی</option>
                      <option value="🌺">🌺 روز خاص</option>
                      <option value="⭐">⭐ یادبود</option>
                    </select>

                    <button
                      type="button"
                      (click)="saveOccasionForSelectedDay()"
                      [disabled]="!newOccasionTitle.trim()"
                      class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                    >
                      ثبت مناسبت
                    </button>
                  </div>
                </div>
              }

              <!-- Occasion List -->
              @if (day.occasions.length === 0) {
                <p class="text-[11px] text-slate-400 italic">هیچ مناسبتی برای این روز ثبت نشده است.</p>
              } @else {
                <div class="space-y-1.5">
                  @for (occ of day.occasions; track occ.id) {
                    <div class="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                      <div class="flex items-center gap-2">
                        <span class="text-base">{{ occ.icon || '🎉' }}</span>
                        <span class="text-xs font-bold text-white">{{ occ.title }}</span>
                        @if (occ.type === 'official') {
                          <span class="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">رسمی</span>
                        } @else {
                          <span class="text-[9px] px-1.5 py-0.2 rounded-md bg-pink-500/20 text-pink-300 border border-pink-400/20">شخصی من</span>
                        }
                      </div>

                      @if (occ.type === 'personal') {
                        <button
                          type="button"
                          (click)="deletePersonalOccasion(occ.id)"
                          class="text-xs text-red-400 hover:text-red-300 cursor-pointer px-1"
                          title="حذف مناسبت شخصی"
                        >
                          🗑️
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Tasks for this Day -->
            <div class="space-y-2 pt-2 border-t border-white/10">
              <span class="text-xs font-bold text-purple-200 block">
                📋 کارهای برنامه‌ریزی‌شده این روز ({{ day.tasks.length }} تسک):
              </span>

              @if (day.tasks.length === 0) {
                <p class="text-[11px] text-slate-400 italic">هنوز تسکی برای این تاریخ ثبت نشده است.</p>
              } @else {
                <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  @for (t of day.tasks; track t.id) {
                    <div class="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span [class.line-through]="t.is_completed" [class.text-slate-400]="t.is_completed" class="font-bold text-white truncate">
                          {{ t.title }}
                        </span>
                        <span class="text-[10px] text-purple-300 font-mono">{{ t.scheduled_time }}</span>
                      </div>
                      <span
                        class="text-[9px] px-1.5 py-0.5 rounded-md"
                        [ngClass]="t.is_completed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'"
                      >
                        {{ t.is_completed ? 'انجام شده' : 'در انتظار' }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class CalendarModalComponent implements OnInit {
  @Input() profile: UserProfile | null = null;
  @Output() dateSelected = new EventEmitter<string>(); // Emits ISO string "YYYY-MM-DD"
  @Output() close = new EventEmitter<void>();

  private readonly apiService = inject(ApiService);

  readonly persianMonths = PERSIAN_MONTHS;
  readonly weekdayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  readonly currentYear = signal<number>(1403);
  readonly currentMonth = signal<number>(8); // 1-12
  readonly emptyOffsets = signal<number[]>([]);
  readonly daysGrid = signal<DayGridItem[]>([]);
  readonly selectedDay = signal<DayGridItem | null>(null);

  isAddingOccasion: boolean = false;
  newOccasionTitle: string = '';
  newOccasionIcon: string = '🎂';

  ngOnInit(): void {
    const [todayY, todayM] = getTodayJalali();
    this.currentYear.set(todayY);
    this.currentMonth.set(todayM);

    this.rebuildMonth();
  }

  currentMonthName(): string {
    return this.persianMonths[this.currentMonth() - 1] || '';
  }

  prevMonth(): void {
    if (this.currentMonth() === 1) {
      this.currentMonth.set(12);
      this.currentYear.update((y) => y - 1);
    } else {
      this.currentMonth.update((m) => m - 1);
    }
    this.rebuildMonth();
  }

  nextMonth(): void {
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.update((y) => y + 1);
    } else {
      this.currentMonth.update((m) => m + 1);
    }
    this.rebuildMonth();
  }

  goToToday(): void {
    const [todayY, todayM] = getTodayJalali();
    this.currentYear.set(todayY);
    this.currentMonth.set(todayM);
    this.rebuildMonth();
  }

  selectDay(item: DayGridItem): void {
    this.selectedDay.set(item);
    this.isAddingOccasion = false;
    this.newOccasionTitle = '';
  }

  getSelectedDayTitle(): string {
    const d = this.selectedDay();
    if (!d) return '';
    return `${d.day} ${this.currentMonthName()} ${this.currentYear()}`;
  }

  rebuildMonth(): void {
    const y = this.currentYear();
    const m = this.currentMonth();
    const len = getJalaliMonthLength(y, m);
    const startW = getJalaliMonthStartWeekday(y, m);
    const [todayY, todayM, todayD] = getTodayJalali();

    const allTasks = this.apiService.getStoredTasks();
    const userProfile = this.apiService.getStoredProfile() || this.profile;
    const allOccasions = getStoredOccasions();
    const userOccasions = Array.isArray(userProfile?.occasions) ? userProfile.occasions : [];

    const items: DayGridItem[] = [];

    for (let day = 1; day <= len; day++) {
      const monthStr = String(m).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const jalaliDate = `${y}-${monthStr}-${dayStr}`;
      const monthDayStr = `${monthStr}-${dayStr}`;
      const isoDate = jalaliToIso(y, m, day);
      const isToday = y === todayY && m === todayM && day === todayD;

      // Filter occasions for this day
      const dayOccasions: SpecialOccasion[] = [];
      // 1. Official/Built-in occasions
      for (const occ of allOccasions) {
        if (occ.date === monthDayStr || occ.date === jalaliDate) {
          dayOccasions.push(occ);
        }
      }
      // 2. Personal occasions
      for (const occ of userOccasions) {
        if (occ.date === monthDayStr || occ.date === jalaliDate || occ.date.endsWith(monthDayStr)) {
          dayOccasions.push(occ);
        }
      }

      // Filter tasks for this day
      const dayTasks = allTasks.filter((t) => t.date === isoDate || t.jalali_date === jalaliDate);

      items.push({
        day,
        jalaliDate,
        isoDate,
        monthDayStr,
        isToday,
        occasions: dayOccasions,
        tasks: dayTasks,
      });
    }

    this.emptyOffsets.set(Array.from({ length: startW }, (_, i) => i));
    this.daysGrid.set(items);

    // Auto-select today or day 1
    const todayItem = items.find((i) => i.isToday);
    this.selectedDay.set(todayItem || items[0] || null);
  }

  saveOccasionForSelectedDay(): void {
    const day = this.selectedDay();
    const title = this.newOccasionTitle.trim();
    if (!day || !title) return;

    const newOcc: SpecialOccasion = {
      id: 'occ_' + Date.now(),
      title,
      date: day.monthDayStr, // Recurring month-day
      type: 'personal',
      icon: this.newOccasionIcon || '🎂',
      description: `مناسبت شخصی ثبت شده برای ${day.day} ${this.currentMonthName()}`,
    };

    this.apiService.addOccasion(newOcc).subscribe({
      next: (updatedProfile) => {
        this.profile = updatedProfile;
        this.newOccasionTitle = '';
        this.isAddingOccasion = false;
        this.rebuildMonth();
      },
      error: (err) => console.error('Failed to add occasion:', err),
    });
  }

  deletePersonalOccasion(occasionId: string): void {
    this.apiService.deleteOccasion(occasionId).subscribe({
      next: (updated) => {
        if (updated) this.profile = updated;
        this.rebuildMonth();
      },
      error: (err) => console.error('Failed to delete occasion:', err),
    });
  }

  jumpToTimeline(isoDate: string): void {
    this.dateSelected.emit(isoDate);
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }
}
