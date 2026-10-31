import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskPriority, TaskIcon, JalaliDateTab } from '../../models/task.model';

@Component({
  selector: 'app-task-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3.5 pb-36">
      <!-- Section Header -->
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-slate-100">{{ getHeaderTitle() }}</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-slate-700">
            {{ tasks.length }} کار
          </span>
        </div>
        <div class="text-xs text-slate-400">
          {{ completedCount() }} انجام شده
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
              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'"
          >
            <span class="text-[11px] font-semibold">{{ tab.label }}</span>
            @if (tab.subLabel) {
              <span class="text-[10px] opacity-80 mt-0.5">{{ tab.subLabel }}</span>
            }
          </button>
        }
      </div>

      <!-- Empty State -->
      @if (tasks.length === 0) {
        <div class="text-center py-12 px-4 rounded-3xl bg-slate-800/40 border border-dashed border-slate-700/60 backdrop-blur-sm">
          <div class="text-5xl mb-3 select-none">🗓️</div>
          <h3 class="text-sm font-bold text-slate-200 mb-1">هنوز برنامه‌ای برای این تاریخ نداری!</h3>
          <p class="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            دکمه میکروفون پایین رو بزن و کارهایی که می‌خوای انجام بدی رو بگو (مثلاً: «۱۵ آبان باید برم دندونپزشکی») تا تَسکی هوشمندانه زمان‌بندی کنه.
          </p>
        </div>
      }

      <!-- Timeline Task Cards -->
      <div class="space-y-2.5">
        @for (task of tasks; track task.id) {
          <div
            class="group relative overflow-hidden rounded-2xl border transition-all duration-300 p-3.5 backdrop-blur-md"
            [class.task-completed]="task.is_completed"
            [ngClass]="task.is_completed 
              ? 'bg-slate-900/60 border-slate-800/80 opacity-60 scale-[0.99]' 
              : 'bg-slate-800/80 border-slate-700/70 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-950/20 interactive-spring'"
          >
            <!-- Vertical decorative time accent line -->
            <div 
              class="absolute top-0 right-0 bottom-0 w-1 rounded-r-2xl transition-all duration-300"
              [ngClass]="getPriorityLineColor(task.priority)"
            ></div>

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
                  <svg class="w-4 h-4 fill-none stroke-current stroke-3 animate-breathing" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
              </button>

              <!-- Category Icon Container -->
              <div class="shrink-0 w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-lg shadow-inner select-none transition-transform duration-200 group-hover:scale-105">
                {{ getCategoryEmoji(task.icon) }}
              </div>

              <!-- Main Details: Multi-line wrapped title and notification text -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2.5 mb-1.5">
                  <!-- Title: wrapping naturally without ellipsis truncation -->
                  <h4 
                    class="text-sm font-semibold leading-relaxed break-words transition-colors duration-300 task-strike-through flex-1 min-w-0"
                    [class.text-slate-400]="task.is_completed"
                    [class.text-slate-100]="!task.is_completed"
                  >
                    {{ task.title }}
                  </h4>

                  <!-- Time & Duration Badge -->
                  <div class="shrink-0 flex items-center gap-1.5 text-xs text-purple-300 font-mono bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-800/40 mt-0.5">
                    <span>{{ formatTime(task.scheduled_time) }}</span>
                    <span class="text-purple-400/60">•</span>
                    <span>{{ task.duration_minutes }}د</span>
                  </div>
                </div>

                <!-- Notification Preview (wrapping naturally without ellipsis truncation) -->
                @if (task.notification_text) {
                  <div class="mt-2 pt-2 border-t border-slate-700/40">
                    <p class="text-xs text-slate-300/90 leading-relaxed break-words flex items-start gap-1.5" [title]="task.notification_text">
                      <span class="text-amber-400/90 select-none shrink-0 mt-0.5">🔔</span>
                      <span class="break-words flex-1 min-w-0">{{ task.notification_text }}</span>
                    </p>
                  </div>
                }

                <!-- Footer row: Date badge, priority, and delete action -->
                <div class="flex items-center justify-between gap-2 mt-2.5 pt-1.5 border-t border-slate-700/30">
                  <!-- Jalali Date Tag (if not today or viewing all) -->
                  @if (shouldShowDateBadge(task)) {
                    <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <span>📅</span>
                      <span>{{ task.jalali_display || task.jalali_date || task.date }}</span>
                    </span>
                  } @else {
                    <div></div>
                  }

                  <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Priority badge -->
                    <span 
                      class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                      [ngClass]="getPriorityBadgeClass(task.priority)"
                    >
                      {{ getPriorityLabel(task.priority) }}
                    </span>

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
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TaskTimelineComponent {
  @Input() tasks: Task[] = [];
  @Input() selectedDate: string = 'today';
  @Input() dateTabs: JalaliDateTab[] = [];
  @Output() dateSelected = new EventEmitter<string>();
  @Output() toggleTask = new EventEmitter<{ task: Task; isCompleted: boolean }>();
  @Output() deleteTask = new EventEmitter<Task>();

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

  formatTime(timeStr: string): string {
    if (!timeStr) return '';
    // Format "09:00:00" to "09:00"
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  }

  getCategoryEmoji(icon: TaskIcon | string): string {
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
      default: return '⭐';
    }
  }

  getPriorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case 'high': return 'فوری';
      case 'medium': return 'مهم';
      case 'low': return 'عادی';
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

  confirmDelete(task: Task): void {
    this.deleteTask.emit(task);
  }
}
