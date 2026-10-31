import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';
import { NotificationService } from './services/notification.service';
import { ThemeService } from './services/theme.service';
import { TtsService } from './services/tts.service';
import { Task, AvatarState, VoiceToPlanResponse, JalaliDateTab, AvatarCustomization, UserProfile } from './models/task.model';
import { AvatarCardComponent } from './components/avatar-card/avatar-card.component';
import { VoiceInputComponent } from './components/voice-input/voice-input.component';
import { TaskTimelineComponent } from './components/task-timeline/task-timeline.component';
import { AvatarStudioModalComponent } from './components/avatar-studio-modal/avatar-studio-modal.component';
import { WizardComponent } from './components/wizard/wizard.component';
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { DailyRecapModalComponent } from './components/daily-recap-modal/daily-recap-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AvatarCardComponent,
    VoiceInputComponent,
    TaskTimelineComponent,
    AvatarStudioModalComponent,
    WizardComponent,
    ProfileModalComponent,
    DailyRecapModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly apiService = inject(ApiService);
  readonly notifications = inject(NotificationService);
  readonly themeService = inject(ThemeService);
  readonly ttsService = inject(TtsService);

  readonly tasks = signal<Task[]>([]);
  readonly avatarState = signal<AvatarState>('idle');
  readonly avatarVoiceReply = signal<string>('');
  readonly transcribedText = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successToast = signal<string | null>(null);
  readonly formattedTodayDate = signal<string>('');
  readonly selectedDate = signal<string>('today');
  readonly dateTabs = signal<JalaliDateTab[]>([]);

  readonly userProfile = signal<UserProfile | null>(null);
  readonly isWizardActive = signal<boolean>(false);
  readonly isProfileModalOpen = signal<boolean>(false);
  readonly isStoryModalOpen = signal<boolean>(false);
  readonly isCheckingProfile = signal<boolean>(true);

  /**
   * Computed: identifies the task currently in progress based on real-world time
   */
  readonly activeTask = computed(() => {
    const list = this.tasks();
    const todayIso = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return list.find((t) => {
      if (t.is_completed || !t.scheduled_time) return false;
      if (t.date && t.date !== todayIso) return false;

      const parts = t.scheduled_time.split(':');
      if (parts.length < 2) return false;

      const start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      const end = start + (t.duration_minutes || 30);
      return nowMinutes >= start && nowMinutes < end;
    }) || null;
  });

  /**
   * Computed: identifies the next upcoming task today within the next 2 hours
   */
  readonly nextTask = computed(() => {
    const list = this.tasks();
    const todayIso = new Date().toISOString().split('T')[0];
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return list.find((t) => {
      if (t.is_completed || !t.scheduled_time) return false;
      if (t.date && t.date !== todayIso) return false;

      const parts = t.scheduled_time.split(':');
      if (parts.length < 2) return false;

      const start = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return start > nowMinutes && start <= nowMinutes + 120;
    }) || null;
  });

  ngOnInit(): void {
    this.initDateLabel();
    this.generateDateTabs();
    this.checkUserProfile();
  }

  private checkUserProfile(): void {
    let hasLocal = false;
    try {
      const stored = localStorage.getItem('tasky_user_profile');
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && parsed.name) {
          this.userProfile.set(parsed);
          this.themeService.updateCustomization(parsed.avatar_config);
          hasLocal = true;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached profile:', e);
    }

    this.apiService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile.set(profile);
        this.isWizardActive.set(false);
        this.isCheckingProfile.set(false);
        try {
          localStorage.setItem('tasky_user_profile', JSON.stringify(profile));
        } catch (e) {}
        if (profile.avatar_config) {
          this.themeService.updateCustomization(profile.avatar_config);
        }
        this.loadTasks();
      },
      error: () => {
        this.isCheckingProfile.set(false);
        if (!hasLocal) {
          this.isWizardActive.set(true);
        } else {
          this.loadTasks();
        }
      },
    });
  }

  onWizardCompleted(profile: UserProfile): void {
    this.userProfile.set(profile);
    this.isWizardActive.set(false);
    if (profile.avatar_config) {
      this.themeService.updateCustomization(profile.avatar_config);
    }
    this.showToast(`خوش اومدی ${profile.name} عزیز! مغز هوش مصنوعی آماده برنامه‌ریزیه 🧠✨`);
    this.loadTasks();
  }

  openProfileModal(): void {
    this.isProfileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.isProfileModalOpen.set(false);
  }

  openStoryModal(): void {
    this.isStoryModalOpen.set(true);
  }

  closeStoryModal(): void {
    this.isStoryModalOpen.set(false);
  }

  onProfileSaved(updated: UserProfile): void {
    this.userProfile.set(updated);
    if (updated.avatar_config) {
      this.themeService.updateCustomization(updated.avatar_config);
    }
    this.showToast('پروفایل و قوانین هوش مصنوعی به‌روزرسانی شد ✨');
  }

  private initDateLabel(): void {
    try {
      const today = new Date();
      const formatted = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(today);
      this.formattedTodayDate.set(formatted);
    } catch {
      this.formattedTodayDate.set('امروز');
    }
  }

  private generateDateTabs(): void {
    try {
      const tabs: JalaliDateTab[] = [];
      const now = new Date();

      // 1. "امروز"
      const todayMonthDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        day: 'numeric',
        month: 'short',
      }).format(now);

      tabs.push({
        label: 'امروز',
        subLabel: todayMonthDay,
        dateValue: 'today',
        isToday: true,
      });

      // 2. "فردا"
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowMonthDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        day: 'numeric',
        month: 'short',
      }).format(tomorrow);
      const tomorrowIso = tomorrow.toISOString().split('T')[0];

      tabs.push({
        label: 'فردا',
        subLabel: tomorrowMonthDay,
        dateValue: tomorrowIso,
      });

      // 3. Next 5 upcoming days in Jalali calendar
      for (let i = 2; i <= 6; i++) {
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + i);
        const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          weekday: 'short',
        }).format(nextDate);
        const monthDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
          day: 'numeric',
          month: 'short',
        }).format(nextDate);
        const iso = nextDate.toISOString().split('T')[0];

        tabs.push({
          label: weekday,
          subLabel: monthDay,
          dateValue: iso,
        });
      }

      // 4. "همه"
      tabs.push({
        label: 'همه',
        subLabel: 'کل تسک‌ها',
        dateValue: 'all',
      });

      this.dateTabs.set(tabs);
    } catch (e) {
      console.warn('Failed to generate full Jalali tabs, using basic tabs:', e);
      this.dateTabs.set([
        { label: 'امروز', dateValue: 'today', isToday: true },
        { label: 'فردا', dateValue: 'tomorrow' },
        { label: 'همه', dateValue: 'all' },
      ]);
    }
  }

  loadTasks(dateValue: string = this.selectedDate()): void {
    this.errorMessage.set(null);
    const queryParam = dateValue === 'today' ? undefined : dateValue;

    this.apiService.getTasks(queryParam).subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.notifications.scheduleTaskNotifications(data);
      },
      error: (err) => {
        console.error('Failed to load tasks:', err);
        this.errorMessage.set('ارتباط با سرور برقرار نشد. لطفاً از روشن بودن بک‌اند مطمئن شوید.');
      }
    });
  }

  async enableNotifications(): Promise<void> {
    const granted = await this.notifications.requestPermission();
    if (granted) {
      this.notifications.scheduleTaskNotifications(this.tasks());
      this.showToast('اعلان‌های یادآوری فعال شدند 🔔');
    } else {
      this.showToast('مجوز ارسال اعلان توسط مرورگر رد شد.');
    }
  }

  async testNotification(): Promise<void> {
    const res = await this.notifications.testNotification();
    this.showToast(res.message);
  }

  onStudioCustomizationSaved(custom: AvatarCustomization): void {
    this.showToast('آواتار و تم جدید با موفقیت ذخیره شد! ✨');
  }

  onDateSelected(dateValue: string): void {
    this.selectedDate.set(dateValue);
    this.loadTasks(dateValue);
  }

  onAudioSubmitted(audioBlob: Blob): void {
    this.isLoading.set(true);
    this.avatarState.set('thinking');
    this.errorMessage.set(null);

    const targetDate = this.selectedDate() !== 'all' && this.selectedDate() !== 'today' 
      ? this.selectedDate() 
      : undefined;

    this.apiService.voiceToPlan(audioBlob, undefined, targetDate).subscribe({
      next: (res) => this.handleVoiceToPlanSuccess(res),
      error: (err) => this.handleVoiceToPlanError(err),
    });
  }

  onTextSubmitted(text: string): void {
    this.isLoading.set(true);
    this.avatarState.set('thinking');
    this.errorMessage.set(null);

    const targetDate = this.selectedDate() !== 'all' && this.selectedDate() !== 'today' 
      ? this.selectedDate() 
      : undefined;

    this.apiService.voiceToPlan(null, text, targetDate).subscribe({
      next: (res) => this.handleVoiceToPlanSuccess(res),
      error: (err) => this.handleVoiceToPlanError(err),
    });
  }

  private handleVoiceToPlanSuccess(response: VoiceToPlanResponse): void {
    this.isLoading.set(false);
    this.avatarVoiceReply.set(response.avatar_reaction.voice_reply);
    this.avatarState.set(response.avatar_reaction.mood || 'supportive');
    this.transcribedText.set(response.raw_transcribed_text);

    // Feature 3: Voice-Back Audio Feedback
    if (response.avatar_reaction.voice_reply) {
      this.ttsService.speak(response.avatar_reaction.voice_reply);
    }

    // Refresh task list for current view
    this.loadTasks();

    // Check if any task was scheduled for a non-today date
    const todayIso = new Date().toISOString().split('T')[0];
    const nonTodayTask = response.tasks.find((t) => t.date && t.date !== todayIso);

    if (nonTodayTask) {
      const dateLabel = nonTodayTask.jalali_display || nonTodayTask.jalali_date || nonTodayTask.date;
      this.showToast(`تسک برای ${dateLabel} ثبت شد ✨`);
    } else {
      this.showToast('برنامه‌ریزی هوشمند با موفقیت اضافه شد ✨');
    }
  }

  private handleVoiceToPlanError(err: any): void {
    this.isLoading.set(false);
    this.avatarState.set('serious');
    console.error('Voice-to-plan failed:', err);
    this.errorMessage.set('پردازش صوت توسط هوش مصنوعی با مشکل مواجه شد.');
  }

  onToggleTask(event: { task: Task; isCompleted: boolean }): void {
    const { task, isCompleted } = event;
    // Optimistic UI update
    this.tasks.update((current) =>
      current.map((t) => (t.id === task.id ? { ...t, is_completed: isCompleted } : t))
    );

    this.apiService.toggleTaskCompletion(task.id, isCompleted).subscribe({
      next: (updated) => {
        this.tasks.update((current) =>
          current.map((t) => (t.id === updated.id ? updated : t))
        );
        if (isCompleted) {
          this.avatarState.set('happy');
          const reply = `آفرین! تسک "${task.title}" تموم شد! 🎉`;
          this.avatarVoiceReply.set(reply);
          this.ttsService.speak(reply);
        }
      },
      error: (err) => {
        console.error('Failed to toggle task:', err);
        // Rollback
        this.tasks.update((current) =>
          current.map((t) => (t.id === task.id ? { ...t, is_completed: !isCompleted } : t))
        );
        this.errorMessage.set('خطا در به‌روزرسانی وضعیت تسک.');
      }
    });
  }

  /**
   * Feature 1: Micro-Action inline rescheduling (+15m, +30m, Tomorrow)
   */
  onRescheduleTask(event: { task: Task; minutesToAdd?: number; toTomorrow?: boolean }): void {
    const { task, minutesToAdd, toTomorrow } = event;

    if (minutesToAdd) {
      const parts = (task.scheduled_time || '12:00').split(':');
      let hours = parseInt(parts[0], 10);
      let mins = parseInt(parts[1], 10) + minutesToAdd;

      while (mins >= 60) {
        hours = (hours + 1) % 24;
        mins -= 60;
      }

      const newTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

      // Optimistic update
      this.tasks.update((current) =>
        current.map((t) => (t.id === task.id ? { ...t, scheduled_time: newTime } : t))
      );

      this.apiService.updateTask(task.id, { scheduled_time: newTime }).subscribe({
        next: (updated) => {
          this.tasks.update((current) =>
            current.map((t) => (t.id === updated.id ? updated : t))
          );
          this.showToast(`تسک "${task.title}" به ساعت ${newTime} موکول شد ⏰`);
        },
        error: (err) => {
          console.error('Failed to reschedule task time:', err);
          this.loadTasks();
          this.errorMessage.set('خطا در جابه‌جایی ساعت تسک.');
        }
      });
    } else if (toTomorrow) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().split('T')[0];

      // Optimistic update
      this.tasks.update((current) =>
        current.filter((t) => t.id !== task.id)
      );

      this.apiService.updateTask(task.id, { date: tomorrowIso }).subscribe({
        next: () => {
          this.showToast(`تسک "${task.title}" به فردا منتقل شد ⏭`);
          this.loadTasks();
        },
        error: (err) => {
          console.error('Failed to move task to tomorrow:', err);
          this.loadTasks();
          this.errorMessage.set('خطا در انتقال تسک به فردا.');
        }
      });
    }
  }

  onDeleteTask(task: Task): void {
    this.apiService.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks.update((current) => current.filter((t) => t.id !== task.id));
        this.showToast('تسک حذف شد.');
      },
      error: (err) => {
        console.error('Failed to delete task:', err);
        this.errorMessage.set('خطا در حذف تسک.');
      }
    });
  }

  onRecordingStateChanged(isRecording: boolean): void {
    if (isRecording) {
      this.avatarState.set('listening');
    } else if (!this.isLoading()) {
      this.avatarState.set('idle');
    }
  }

  showToast(message: string): void {
    this.successToast.set(message);
    setTimeout(() => {
      this.successToast.set(null);
    }, 3500);
  }

  clearError(): void {
    this.errorMessage.set(null);
  }
}
