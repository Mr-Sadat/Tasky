import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskPriority, TaskIcon, JalaliDateTab } from '../../models/task.model';
import { getTodayIso, toPersianDigits } from '../../utils/jalali';

@Component({
  selector: 'app-task-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3.5 pb-36">
      <!-- Section Header -->
      <div class="flex items-center justify-between px-1 gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-slate-100">{{ getHeaderTitle() }}</span>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
            {{ toPersianDigits(tasks.length) }} تسک
          </span>
          <span class="text-xs text-slate-400">
            ({{ toPersianDigits(completedCount()) }} انجام شده)
          </span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Panic Button (Emergency Reschedule) -->
          @if (uncompletedCount() > 0 && (selectedDate === 'today' || selectedDate === 'all')) {
            <button
              type="button"
              (click)="triggerPanic.emit()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-950/60 interactive-spring cursor-pointer border border-rose-400/40 select-none transition animate-pulse"
              title="بازتنظیم هوشمند تسک‌های باقی‌مانده"
            >
              <span>🚨</span>
              <span>روز من به هم ریخت!</span>
            </button>
          }

          <!-- Share Today's Recap / Story Button -->
          <button
            type="button"
            (click)="openStoryRecap.emit()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#DB2777] text-white text-xs font-bold shadow-md shadow-purple-950/50 interactive-spring cursor-pointer border border-purple-400/30 select-none transition"
            title="کارنامه روزانه"
          >
            <span>📜</span>
            <span>کارنامه روز من</span>
          </button>
        </div>
      </div>

      <!-- Horizontal Persian Jalali Date Bar -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
        @for (tab of dateTabs; track tab.dateValue) {
          <button
            type="button"
            (click)="selectDate(tab.dateValue)"
            class="shrink-0 flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl border text-xs transition-all duration-200 cursor-pointer min-w-[70px]"
            [ngClass]="selectedDate === tab.dateValue
              ? 'bg-gradient-to-r from-[#7C3AED] to-[#DB2777] text-white border-transparent font-bold shadow-md'
              : 'bg-[#1A1D2B] border-white/[0.08] text-slate-300 hover:border-purple-500/30 hover:bg-white/5'"
          >
            <span class="font-bold">{{ tab.label }}</span>
            @if (tab.subLabel) {
              <span class="text-[10px] opacity-75 mt-0.5">{{ toPersianDigits(tab.subLabel) }}</span>
            }
          </button>
        }
      </div>

      <!-- Empty State -->
      @if (tasks.length === 0) {
        <div class="text-center py-12 px-4 rounded-2xl bg-[#1A1D2B]/60 border border-dashed border-white/10 backdrop-blur-xl">
          <div class="text-4xl mb-3 select-none">🗓️</div>
          <h3 class="text-sm font-bold text-slate-200 mb-1">هنوز برنامه‌ای برای این تاریخ نداری!</h3>
          <p class="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            دکمه میکروفون پایین رو لمس کن و کارهایی که می‌خوای انجام بدی رو بگو تا تَسکی هوشمندانه زمان‌بندی کنه.
          </p>
        </div>
      }

      <!-- Timeline Decluttered Task Cards -->
      <div class="space-y-3">
        @for (task of tasks; track task.id) {
          @let isActive = isTaskActive(task);
          <div
            class="group relative overflow-visible rounded-2xl border transition-all duration-300 p-3.5 backdrop-blur-md flex flex-col justify-between"
            [ngClass]="[
              task.is_completed 
                ? 'bg-[#1A1D2B]/50 border-white/[0.04] opacity-55' 
                : isActive
                  ? 'ring-1 ring-purple-500/80 shadow-lg shadow-purple-900/30 bg-[#1A1D2B] border-purple-500/40'
                  : 'bg-[#1A1D2B] border-white/[0.08] hover:border-purple-500/30'
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <!-- Right: Checkbox + Category Emoji + Main Details -->
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <!-- Checkbox -->
                <button
                  type="button"
                  (click)="toggleCompletion(task)"
                  class="shrink-0 mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer"
                  [ngClass]="task.is_completed 
                    ? 'bg-purple-600 border-purple-500 text-white shadow-sm' 
                    : 'border-slate-500 hover:border-purple-400 bg-slate-900/50'"
                  title="تغییر وضعیت تسک"
                  aria-label="تغییر وضعیت تسک"
                >
                  @if (task.is_completed) {
                    <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-3" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  }
                </button>

                <!-- Category Emoji Box -->
                <div class="shrink-0 w-9 h-9 rounded-xl bg-slate-900/70 border border-white/[0.06] flex items-center justify-center text-base select-none">
                  {{ getCategoryEmoji(task.icon) }}
                </div>

                <!-- Title & Metadata -->
                <div class="min-w-0 flex-1">
                  <h4 
                    class="text-sm font-medium leading-relaxed break-words transition-colors"
                    [class.text-slate-400]="task.is_completed"
                    [class.line-through]="task.is_completed"
                    [class.text-white]="!task.is_completed"
                  >
                    {{ task.title }}
                  </h4>

                  <!-- Clean Metadata Row: Time, Priority, Date -->
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <!-- Scheduled Time & Duration Badge in Persian -->
                    <span class="inline-flex items-center gap-1 text-xs text-purple-300 font-medium px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/30">
                      <span>{{ formatTime(task.scheduled_time) }}</span>
                      <span class="text-purple-400/50">•</span>
                      <span>{{ toPersianDigits(task.duration_minutes) }} دقیقه</span>
                    </span>

                    <!-- Subtle Priority Indicator -->
                    <span 
                      class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      [ngClass]="getPriorityBadgeClass(task.priority)"
                    >
                      {{ getPriorityLabel(task.priority) }}
                    </span>

                    <!-- Date Badge if not today -->
                    @if (shouldShowDateBadge(task)) {
                      <span class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <span>📅</span>
                        <span>{{ toPersianDigits(task.jalali_display || task.jalali_date || task.date) }}</span>
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Left: Focus Pomodoro Button + 3-Dots Action Menu -->
              <div class="flex items-center gap-1.5 shrink-0">
                @if (!task.is_completed) {
                  <!-- Focus Pomodoro Button -->
                  <button
                    type="button"
                    (click)="onStartFocus(task)"
                    class="px-2.5 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7C3AED] to-[#DB2777] text-white shadow-sm hover:opacity-95 transition cursor-pointer flex items-center gap-1 select-none"
                    title="شروع تمرکز عمیق (پومودورو)"
                  >
                    <span class="text-xs">⏱️</span>
                    <span>تمرکز</span>
                  </button>
                }

                <!-- 3-Dots Menu Trigger -->
                <div class="relative">
                  <button
                    type="button"
                    (click)="toggleMenu(task.id, $event)"
                    class="w-8 h-8 rounded-xl bg-slate-800/50 hover:bg-slate-700/70 border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center text-sm cursor-pointer transition select-none"
                    title="عملیات بیشتر"
                    aria-label="عملیات تسک"
                  >
                    •••
                  </button>

                  <!-- Floating Popover Action Menu -->
                  @if (openMenuTaskId() === task.id) {
                    <div 
                      class="absolute left-0 top-10 z-40 w-44 rounded-2xl bg-[#1A1D2B] border border-white/[0.12] shadow-2xl backdrop-blur-2xl p-1.5 space-y-1 text-right animate-fade-in"
                      (click)="$event.stopPropagation()"
                    >
                      @if (!task.is_completed) {
                        <button
                          type="button"
                          (click)="onAddMinutes(task, 15); closeMenu()"
                          class="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition"
                        >
                          <span>تمدید ۱۵ دقیقه</span>
                          <span class="text-[10px] font-mono text-purple-400">+۱۵د</span>
                        </button>

                        <button
                          type="button"
                          (click)="onAddMinutes(task, 30); closeMenu()"
                          class="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition"
                        >
                          <span>تمدید ۳۰ دقیقه</span>
                          <span class="text-[10px] font-mono text-purple-400">+۳۰د</span>
                        </button>

                        <button
                          type="button"
                          (click)="onMoveToTomorrow(task); closeMenu()"
                          class="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition"
                        >
                          <span>انتقال به فردا</span>
                          <span class="text-xs">⏭️</span>
                        </button>

                        <button
                          type="button"
                          (click)="onBreakdown(task); closeMenu()"
                          class="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/5 text-xs text-purple-300 flex items-center justify-between cursor-pointer transition"
                        >
                          <span>خرد کردن تسک</span>
                          <span class="text-xs">🧩</span>
                        </button>

                        <div class="h-px bg-white/5 my-1"></div>
                      }

                      <button
                        type="button"
                        (click)="onDelete(task); closeMenu()"
                        class="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-950/40 text-xs text-rose-300 flex items-center justify-between cursor-pointer transition"
                      >
                        <span>حذف تسک</span>
                        <span class="text-xs">🗑️</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Notification Text Preview -->
            @if (task.notification_text) {
              <div class="mt-2 pt-2 border-t border-white/[0.05]">
                <p class="text-xs text-slate-300 leading-relaxed flex items-start gap-1.5">
                  <span class="text-amber-400/90 select-none shrink-0 mt-0.5">🔔</span>
                  <span>{{ task.notification_text }}</span>
                </p>
              </div>
            }

            <!-- Active Task Progress Bar -->
            @if (isActive) {
              <div class="mt-2.5 pt-2 border-t border-purple-500/20">
                <div class="flex items-center justify-between text-[10px] text-purple-300 mb-1">
                  <span>پیشرفت زمان تسک:</span>
                  <span class="font-mono font-bold">{{ toPersianDigits(getActiveTaskProgress(task)) }}٪</span>
                </div>
                <div class="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-purple-500/30">
                  <div 
                    class="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                    [style.width.%]="getActiveTaskProgress(task)"
                  ></div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class TaskTimelineComponent implements OnInit, OnDestroy {
  readonly toPersianDigits = toPersianDigits;
  readonly openMenuTaskId = signal<string | number | null>(null);

  @Input() tasks: Task[] = [];
  @Input() selectedDate: string = 'today';
  @Input() dateTabs: JalaliDateTab[] = [];
  @Input() breakingDownTaskId: string | number | null = null;

  @Output() dateSelected = new EventEmitter<string>();
  @Output() toggleTask = new EventEmitter<{ task: Task; isCompleted: boolean }>();
  @Output() rescheduleTask = new EventEmitter<{ task: Task; minutesToAdd?: number; toTomorrow?: boolean }>();
  @Output() openStoryRecap = new EventEmitter<void>();
  @Output() deleteTask = new EventEmitter<Task>();
  @Output() triggerPanic = new EventEmitter<void>();
  @Output() breakdownTask = new EventEmitter<Task>();
  @Output() openCalendar = new EventEmitter<void>();
  @Output() startFocus = new EventEmitter<Task>();

  private clockTimer: any;
  readonly nowMinutes = signal<number>(this.calculateNowMinutes());

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuTaskId.set(null);
  }

  toggleMenu(taskId: string | number, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuTaskId.update(id => id === taskId ? null : taskId);
  }

  closeMenu(): void {
    this.openMenuTaskId.set(null);
  }

  ngOnInit(): void {
    this.clockTimer = setInterval(() => {
      this.nowMinutes.set(this.calculateNowMinutes());
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  private calculateNowMinutes(): number {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  selectDate(dateValue: string): void {
    this.dateSelected.emit(dateValue);
  }

  getHeaderTitle(): string {
    if (this.selectedDate === 'all') {
      return 'همه برنامه‌ها';
    }
    const tab = this.dateTabs.find(t => t.dateValue === this.selectedDate);
    if (tab) {
      return `برنامه ${tab.label}${tab.subLabel ? ' (' + toPersianDigits(tab.subLabel) + ')' : ''}`;
    }
    return 'برنامه روزانه';
  }

  shouldShowDateBadge(task: Task): boolean {
    if (this.selectedDate === 'all') return true;
    if (!task.date) return false;
    const todayIso = getTodayIso();
    return task.date !== todayIso;
  }

  completedCount(): number {
    return this.tasks.filter(t => t.is_completed).length;
  }

  uncompletedCount(): number {
    return this.tasks.filter(t => !t.is_completed).length;
  }

  toggleCompletion(task: Task): void {
    this.toggleTask.emit({ task, isCompleted: !task.is_completed });
  }

  onAddMinutes(task: Task, minutes: number): void {
    this.rescheduleTask.emit({ task, minutesToAdd: minutes });
  }

  onMoveToTomorrow(task: Task): void {
    this.rescheduleTask.emit({ task, toTomorrow: true });
  }

  onDelete(task: Task): void {
    this.deleteTask.emit(task);
  }

  onStartFocus(task: Task): void {
    this.startFocus.emit(task);
  }

  onBreakdown(task: Task): void {
    this.breakdownTask.emit(task);
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return toPersianDigits(timeStr);
    return toPersianDigits(`${parts[0]}:${parts[1]}`);
  }

  isTaskActive(task: Task): boolean {
    if (task.is_completed || !task.scheduled_time) return false;
    const todayIso = getTodayIso();
    if (task.date && task.date !== todayIso) return false;

    const parts = task.scheduled_time.split(':');
    if (parts.length < 2) return false;

    const start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const end = start + (task.duration_minutes || 30);
    const current = this.nowMinutes();

    return current >= start && current < end;
  }

  getActiveTaskProgress(task: Task): number {
    if (!this.isTaskActive(task)) return 0;
    const parts = task.scheduled_time.split(':');
    const start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const dur = task.duration_minutes || 30;
    const current = this.nowMinutes();
    const elapsed = current - start;
    const pct = Math.round((elapsed / dur) * 100);
    return Math.max(0, Math.min(100, pct));
  }

  getCategoryEmoji(icon: TaskIcon): string {
    switch (icon) {
      case 'briefcase': return '💼';
      case 'book': return '📚';
      case 'dumbbell': return '🏋️';
      case 'heart': return '❤️';
      case 'cart': return '🛒';
      case 'star': return '⭐';
      case 'coffee': return '☕';
      case 'moon': return '🌙';
      case 'sun': return '☀️';
      default: return '📌';
    }
  }

  getPriorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case 'high': return 'فوری';
      case 'medium': return 'متوسط';
      case 'low': return 'معمولی';
      default: return 'عادی';
    }
  }

  getPriorityBadgeClass(priority: TaskPriority): string {
    switch (priority) {
      case 'high':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'medium':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'low':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  }
}
