import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskPriority, TaskIcon, JalaliDateTab } from '../../models/task.model';

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
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
            {{ tasks.length }} کار
          </span>
          <span class="text-xs text-slate-400">
            ({{ completedCount() }} انجام شده)
          </span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Panic Button (Emergency Reschedule) -->
          @if (uncompletedCount() > 0 && (selectedDate === 'today' || selectedDate === 'all')) {
            <button
              type="button"
              (click)="triggerPanic.emit()"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:brightness-110 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-950/60 interactive-spring cursor-pointer border border-rose-400/40 select-none transition animate-pulse"
              title="برنامه‌ام به هم ریخته یا عقب افتادم! بازتنظیم هوشمند تسک‌های باقی‌مانده (🚨)"
            >
              <span>🚨</span>
              <span>روز من به هم ریخت!</span>
            </button>
          }

          <!-- Share Today's Recap / Story Button -->
          <button
            type="button"
            (click)="openStoryRecap.emit()"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-purple-950/50 interactive-spring cursor-pointer border border-purple-400/30 select-none transition"
            title="مشاهده و دریافت تصویر کارنامه روز برای استوری اینستاگرام / تلگرام (✨)"
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
              ? 'bg-gradient-to-b from-purple-600 to-indigo-600 text-white border-purple-400/50 shadow-md shadow-purple-900/30 font-bold scale-[1.02]'
              : 'bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-300 hover:border-purple-500/40 hover:bg-white/5'"
          >
            <span class="text-[11px] font-semibold">{{ tab.label }}</span>
            @if (tab.subLabel) {
              <span class="text-[10px] opacity-80 mt-0.5">{{ tab.subLabel }}</span>
            }
          </button>
        }
          <!-- Full Monthly Calendar Button -->
        <button
          type="button"
          (click)="openCalendar.emit()"
          class="shrink-0 flex flex-col items-center justify-center px-3.5 py-2 rounded-2xl border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 hover:text-white text-xs transition cursor-pointer min-w-[75px]"
          title="مشاهده تقویم کامل ماهانه و ثبت مناسبت‌ها"
        >
          <span class="text-xs">🗓️</span>
          <span class="text-[10px] font-bold mt-0.5">تقویم ماه</span>
        </button>
      </div>

      <!-- Empty State -->
      @if (tasks.length === 0) {
        <div class="text-center py-12 px-4 rounded-3xl bg-slate-900/40 border border-dashed border-white/15 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          <div class="text-5xl mb-3 select-none">🗓️</div>
          <h3 class="text-sm font-bold text-slate-200 mb-1">هنوز برنامه‌ای برای این تاریخ نداری!</h3>
          <p class="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            دکمه میکروفون پایین رو بزن و کارهایی که می‌خوای انجام بدی رو بگو تا تَسکی هوشمندانه زمان‌بندی کنه.
          </p>
        </div>
      }

      <!-- Timeline Task Cards with Proportional Time-Blocking -->
      <div class="space-y-3">
        @for (task of tasks; track task.id) {
          @let isActive = isTaskActive(task);
          <div
            class="group relative overflow-hidden rounded-2xl border transition-all duration-300 p-3.5 backdrop-blur-md flex flex-col justify-between"
            [ngClass]="[
              getCardMinHeightClass(task.duration_minutes),
              task.is_completed 
                ? 'bg-slate-900/60 border-slate-800/80 opacity-60 scale-[0.99]' 
                : isActive
                  ? 'ring-2 ring-purple-400/90 shadow-xl shadow-purple-900/40 bg-gradient-to-r from-purple-950/80 via-slate-850 to-indigo-950/80 border-purple-500/50 scale-[1.01]'
                  : 'bg-slate-900/65 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-slate-900/85 shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_1px_rgba(255,255,255,0.08)] interactive-spring'
            ]"
          >
            <!-- Vertical decorative time accent line -->
            <div 
              class="absolute top-0 right-0 bottom-0 w-1.5 rounded-r-2xl transition-all duration-300"
              [ngClass]="isActive ? 'bg-gradient-to-b from-purple-400 to-emerald-400 animate-pulse' : getPriorityLineColor(task.priority)"
            ></div>

            <div>
              <div class="flex items-start gap-3">
                <!-- Checkbox with bounce interaction -->
                <button
                  type="button"
                  (click)="toggleCompletion(task)"
                  class="shrink-0 mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 active:scale-90 focus:outline-none focus:ring-2 focus:ring-purple-400/40 cursor-pointer"
                  [ngClass]="task.is_completed 
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30' 
                    : 'border-slate-500 hover:border-purple-400 hover:scale-105 bg-slate-900/50'"
                  [title]="task.is_completed ? 'علامت به عنوان انجام‌نشده' : 'علامت به عنوان انجام‌شده'"
                  aria-label="تغییر وضعیت تسک"
                >
                  @if (task.is_completed) {
                    <svg class="w-4 h-4 fill-none stroke-current stroke-3" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  }
                </button>

                <!-- Category Icon Container with Active Animation -->
                <div 
                  class="shrink-0 w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-lg shadow-inner select-none transition-transform duration-200 group-hover:scale-105"
                  [class.animate-bounce]="isActive"
                  [style.animation-duration]="'2.5s'"
                >
                  {{ getCategoryEmoji(task.icon) }}
                </div>

                <!-- Main Details -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2.5 mb-1">
                    <!-- Title -->
                    <h4 
                      class="text-sm font-semibold leading-relaxed break-words transition-colors duration-300 flex-1 min-w-0"
                      [class.text-slate-400]="task.is_completed"
                      [class.line-through]="task.is_completed"
                      [class.text-white]="!task.is_completed && isActive"
                      [class.text-slate-100]="!task.is_completed && !isActive"
                    >
                      {{ task.title }}
                    </h4>

                    <!-- Badges Row: Active Status & Time/Duration -->
                    <div class="shrink-0 flex items-center gap-1.5">
                      @if (isActive) {
                        <!-- Animated In-Progress Pill -->
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shadow-sm shadow-emerald-950/40 animate-pulse">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>در حال انجام</span>
                        </span>
                      }

                      <!-- Time & Duration Badge -->
                      <div class="flex items-center gap-1 text-xs text-purple-300 font-mono bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/40">
                        <span>{{ formatTime(task.scheduled_time) }}</span>
                        <span class="text-purple-400/60">•</span>
                        <span>{{ task.duration_minutes }}د</span>
                      </div>
                    </div>
                  </div>

                  <!-- Notification / Description preview -->
                  @if (task.notification_text) {
                    <div class="mt-1.5 pt-1.5 border-t border-slate-700/30">
                      <p class="text-xs text-slate-300/90 leading-relaxed break-words flex items-start gap-1.5">
                        <span class="text-amber-400/90 select-none shrink-0 mt-0.5">🔔</span>
                        <span class="break-words flex-1 min-w-0">{{ task.notification_text }}</span>
                      </p>
                    </div>
                  }

                  <!-- Active Task Real-Time Progress Bar -->
                  @if (isActive) {
                    <div class="mt-2.5 pt-2 border-t border-purple-500/20">
                      <div class="flex items-center justify-between text-[10px] text-purple-300 mb-1">
                        <span>پیشرفت زمان تسک:</span>
                        <span class="font-mono font-bold">{{ getActiveTaskProgress(task) }}%</span>
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
              </div>
            </div>

            <!-- Footer Row: Date badge, Quick Micro-Actions (+15m, +30m, Tomorrow, Breakdown) & Delete -->
            <div class="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-700/40 flex-wrap">
              <!-- Left side: Jalali date or priority badge -->
              <div class="flex items-center gap-1.5">
                @if (shouldShowDateBadge(task)) {
                  <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <span>📅</span>
                    <span>{{ task.jalali_display || task.jalali_date || task.date }}</span>
                  </span>
                }
                <!-- Priority badge -->
                <span 
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  [ngClass]="getPriorityBadgeClass(task.priority)"
                >
                  {{ getPriorityLabel(task.priority) }}
                </span>
              </div>

              <!-- Right side: Quick Reschedule Micro-Actions + Breakdown + Delete -->
              <div class="flex items-center gap-1 flex-wrap">
                @if (!task.is_completed) {
                  <!-- Deep Focus / Pomodoro Button -->
                  <button
                    type="button"
                    (click)="onStartFocus(task)"
                    class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white border border-purple-400/40 shadow-sm shadow-purple-950/50 transition cursor-pointer flex items-center gap-1 interactive-spring"
                    title="شروع حالت تمرکز عمیق (پومودورو) برای این تسک"
                  >
                    <span>⏱️</span>
                    <span>شروع تمرکز</span>
                  </button>
                  <!-- +15m Button -->
                  <button
                    type="button"
                    (click)="onAddMinutes(task, 15)"
                    class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 hover:bg-purple-900/50 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-500/40 transition cursor-pointer"
                    title="موکول کردن ۱۵ دقیقه به جلو"
                  >
                    +۱۵د
                  </button>

                  <!-- +30m Button -->
                  <button
                    type="button"
                    (click)="onAddMinutes(task, 30)"
                    class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 hover:bg-purple-900/50 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-500/40 transition cursor-pointer"
                    title="موکول کردن ۳۰ دقیقه به جلو"
                  >
                    +۳۰د
                  </button>

                  <!-- Reschedule to Tomorrow Button -->
                  <button
                    type="button"
                    (click)="onMoveToTomorrow(task)"
                    class="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900/80 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/40 transition cursor-pointer"
                    title="انتقال تسک به فردا"
                  >
                    فردا ⏭
                  </button>

                  <!-- Breakdown Subtask Button for long tasks (duration >= 60 min) -->
                  @if (task.duration_minutes >= 60) {
                    <button
                      type="button"
                      (click)="onBreakdown(task)"
                      [disabled]="breakingDownTaskId === task.id"
                      class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/70 hover:bg-amber-900/80 text-amber-200 hover:text-white border border-amber-500/40 hover:border-amber-400 transition cursor-pointer flex items-center gap-1 interactive-spring disabled:opacity-50"
                      title="خرد کردن تسک طولانی به گام‌های کوچک و شفاف (🧩)"
                    >
                      @if (breakingDownTaskId === task.id) {
                        <span class="w-2.5 h-2.5 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin"></span>
                      } @else {
                        <span>🧩</span>
                      }
                      <span>خرد کردن تسک</span>
                    </button>
                  }
                }

                <!-- Delete button -->
                <button
                  type="button"
                  (click)="confirmDelete(task)"
                  class="opacity-60 hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                  title="حذف تسک"
                  aria-label="حذف تسک"
                >
                  <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <polyline points="3 6 5 6 21 6" stroke-linecap="round"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TaskTimelineComponent implements OnInit, OnDestroy {
  @Input() tasks: Task[] = [];
  @Input() selectedDate: string = 'today';
  @Input() dateTabs: JalaliDateTab[] = [];
  @Input() breakingDownTaskId: number | null = null;
  
  @Output() dateSelected = new EventEmitter<string>();
  @Output() toggleTask = new EventEmitter<{ task: Task; isCompleted: boolean }>();
  @Output() deleteTask = new EventEmitter<Task>();
  @Output() rescheduleTask = new EventEmitter<{ task: Task; minutesToAdd?: number; toTomorrow?: boolean }>();
  @Output() openStoryRecap = new EventEmitter<void>();
  @Output() triggerPanic = new EventEmitter<void>();
  @Output() openCalendar = new EventEmitter<void>();
  @Output() breakdownTask = new EventEmitter<Task>();
  @Output() startFocus = new EventEmitter<Task>();

  private clockTimer: any = null;
  readonly nowMinutes = signal<number>(this.calculateNowMinutes());

  ngOnInit(): void {
    this.clockTimer = setInterval(() => {
      this.nowMinutes.set(this.calculateNowMinutes());
    }, 15000); // Check every 15 seconds
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
      return `برنامه ${tab.label}${tab.subLabel ? ' (' + tab.subLabel + ')' : ''}`;
    }
    return 'برنامه روزانه';
  }

  shouldShowDateBadge(task: Task): boolean {
    if (this.selectedDate === 'all') return true;
    if (!task.date) return false;
    const todayIso = new Date().toISOString().split('T')[0];
    return task.date !== todayIso;
  }

  completedCount(): number {
    return this.tasks.filter(t => t.is_completed).length;
  }

  uncompletedCount(): number {
    return this.tasks.filter(t => !t.is_completed).length;
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
    if (parts.length < 2) return timeStr;
    return `${parts[0]}:${parts[1]}`;
  }

  isTaskActive(task: Task): boolean {
    if (task.is_completed || !task.scheduled_time) return false;
    const todayIso = new Date().toISOString().split('T')[0];
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

  getCardMinHeightClass(durationMinutes?: number): string {
    const d = durationMinutes || 30;
    if (d <= 30) return 'min-h-[74px]';
    if (d <= 60) return 'min-h-[96px]';
    if (d <= 90) return 'min-h-[118px]';
    return 'min-h-[136px]';
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
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'low':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  }

  getPriorityLineColor(priority: TaskPriority): string {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-sky-500';
      default: return 'bg-purple-500';
    }
  }

  toggleCompletion(task: Task): void {
    this.toggleTask.emit({
      task,
      isCompleted: !task.is_completed
    });
  }

  onAddMinutes(task: Task, minutes: number): void {
    this.rescheduleTask.emit({
      task,
      minutesToAdd: minutes
    });
  }

  onMoveToTomorrow(task: Task): void {
    this.rescheduleTask.emit({
      task,
      toTomorrow: true
    });
  }

  confirmDelete(task: Task): void {
    this.deleteTask.emit(task);
  }
}
