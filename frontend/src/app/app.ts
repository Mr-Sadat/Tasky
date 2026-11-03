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
import { PanicModalComponent } from './components/panic-modal/panic-modal.component';
import { FocusModalComponent } from './components/focus-modal/focus-modal.component';

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
    PanicModalComponent,
    FocusModalComponent,
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
  readonly isPanicModalOpen = signal<boolean>(false);
  readonly isPanicProcessing = signal<boolean>(false);
  readonly breakingDownTaskId = signal<number | null>(null);
  readonly focusingTask = signal<Task | null>(null);
  readonly isBriefingLoading = signal<boolean>(false);
  readonly isCheckingProfile = signal<boolean>(true);

  /**
   * Computed: count of uncompleted tasks for today
   */
  readonly uncompletedCount = computed(() => {
    return this.tasks().filter((t) => !t.is_completed).length;
  });

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
    this.checkProfileAndInitialize();
  }

  /**
   * Check if user profile already exists.
   * If not, display the onboarding wizard.
   * If exists, load profile settings and guidelines.
   */
  private checkProfileAndInitialize(): void {
    this.apiService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile.set(profile);
        this.isCheckingProfile.set(false);
        this.isWizardActive.set(false);

        // Apply saved avatar configuration from profile
        if (profile.avatar_config) {
          this.themeService.updateCustomization(profile.avatar_config);
        }

        this.loadTasks();
      },
      error: (err) => {
        console.info('No user profile found, starting onboarding wizard:', err?.status);
        this.isCheckingProfile.set(false);
        this.isWizardActive.set(true);
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

  openPanicModal(): void {
    this.isPanicModalOpen.set(true);
  }

  closePanicModal(): void {
    this.isPanicModalOpen.set(false);
  }

  playDailyBriefing(): void {
    if (this.isBriefingLoading()) return;
    this.isBriefingLoading.set(true);

    this.apiService.getMorningBriefing().subscribe({
      next: (briefing) => {
        this.isBriefingLoading.set(false);
        this.avatarVoiceReply.set(briefing.briefing_text);
        this.avatarState.set('happy');

        if (this.userProfile()) {
          this.userProfile.update((p) => p ? { ...p, xp: briefing.xp, streak_days: briefing.streak_days } : p);
        }

        this.ttsService.speak(briefing.audio_script || briefing.briefing_text);
        this.showToast('خلاصه صوتی روز در حال پخش است 🎙️✨');
      },
      error: (err) => {
        this.isBriefingLoading.set(false);
        console.warn('Failed to fetch morning briefing:', err);
        this.showToast('خطا در دریافت خلاصه صوتی روز ⚠️');
      }
    });
  }

  openFocusModal(task: Task): void {
    this.focusingTask.set(task);
  }

  closeFocusModal(): void {
    this.focusingTask.set(null);
  }

  onFocusTaskCompleted(completedTask: Task): void {
    this.tasks.update((list) =>
      list.map((t) => (t.id === completedTask.id ? { ...t, is_completed: true } : t))
    );
    this.userProfile.update((p) => p ? { ...p, xp: (p.xp || 0) + 15 } : p);
    this.showToast(`تسک «${completedTask.title}» با تمرکز عمیق انجام شد! +۱۵ XP 🎯⚡`);
  }

  onPanicConfirmed(reason: string): void {
    this.isPanicProcessing.set(true);
    this.errorMessage.set(null);

    const targetDate = this.selectedDate() === 'all' ? undefined : this.selectedDate();
    this.apiService.panicReschedule(reason, undefined, targetDate).subscribe({
      next: (res) => {
        this.isPanicProcessing.set(false);
        this.isPanicModalOpen.set(false);

        // Update timeline tasks
        this.tasks.set(res.tasks);
        this.notifications.scheduleTaskNotifications(res.tasks);

        // Update avatar reaction & speech
        if (res.avatar_reaction) {
          this.avatarState.set('supportive');
          this.avatarVoiceReply.set(res.avatar_reaction.voice_reply);
          this.ttsService.speak(res.avatar_reaction.voice_reply);
        }

        const deferredNote = res.deferred_count > 0 ? ` (${res.deferred_count} تسک به فردا منتقل شد)` : '';
        this.showToast(`برنامه امروز با آرامش بازتنظیم شد! ✨${deferredNote}`);
      },
      error: (err) => {
        console.error('Panic reschedule failed:', err);
        this.isPanicProcessing.set(false);
        this.showToast('خطا در بازتنظیم برنامه. لطفاً دوباره تلاش کنید.');
      }
    });
  }

  onBreakdownTask(task: Task): void {
    this.breakingDownTaskId.set(task.id);
    this.errorMessage.set(null);

    this.apiService.breakdownTask(task.id).subscribe({
      next: (res) => {
        this.breakingDownTaskId.set(null);

        // Update timeline tasks
        this.tasks.set(res.tasks);
        this.notifications.scheduleTaskNotifications(res.tasks);

        // Update avatar reaction & speech
        if (res.avatar_reaction) {
          this.avatarState.set('excited');
          this.avatarVoiceReply.set(res.avatar_reaction.voice_reply);
          this.ttsService.speak(res.avatar_reaction.voice_reply);
        }

        this.showToast(`تسک «${task.title}» با موفقیت به گام‌های کوچک و شفاف خرد شد! 🧩✨`);
      },
      error: (err) => {
        console.error('Task breakdown failed:', err);
        this.breakingDownTaskId.set(null);
        this.showToast('خطا در خرد کردن تسک. لطفاً دوباره تلاش کنید.');
      }
    });
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
      const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      this.formattedTodayDate.set(formatter.format(today));
    } catch (e) {
      console.warn('Persian Intl formatter failed, using fallback:', e);
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
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowMonthDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        day: 'numeric',
        month: 'short',
      }).format(tomorrow);
      tabs.push({
        label: 'فردا',
        subLabel: tomorrowMonthDay,
        dateValue: tomorrow.toISOString().split('T')[0],
      });

      // 3. Next 3 upcoming days
      for (let i = 2; i <= 4; i++) {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + i);
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

    const targetDate = this.selectedDate() === 'all' ? undefined : this.selectedDate();
    this.apiService.voiceToPlan(audioBlob, undefined, targetDate).subscribe({
      next: (res: VoiceToPlanResponse) => {
        this.handlePlanResponse(res);
      },
      error: (err) => {
        console.error('Failed to process voice note:', err);
        this.isLoading.set(false);
        this.avatarState.set('idle');
        this.errorMessage.set('پردازش صوت با خطا مواجه شد. لطفاً دوباره تلاش کنید.');
      }
    });
  }

  onTextSubmitted(text: string): void {
    this.isLoading.set(true);
    this.avatarState.set('thinking');
    this.errorMessage.set(null);

    const targetDate = this.selectedDate() === 'all' ? undefined : this.selectedDate();
    this.apiService.voiceToPlan(null, text, targetDate).subscribe({
      next: (res: VoiceToPlanResponse) => {
        this.handlePlanResponse(res);
      },
      error: (err) => {
        console.error('Failed to process text plan:', err);
        this.isLoading.set(false);
        this.avatarState.set('idle');
        this.errorMessage.set('ثبت برنامه متنی با خطا مواجه شد. لطفاً اتصال سرور را بررسی کنید.');
      }
    });
  }

  private handlePlanResponse(res: VoiceToPlanResponse): void {
    this.isLoading.set(false);

    // 1. Update transcribed note bubble
    if (res.raw_transcribed_text) {
      this.transcribedText.set(res.raw_transcribed_text);
    }

    // 2. Update avatar mood & voice reply
    if (res.avatar_reaction) {
      this.avatarState.set(res.avatar_reaction.mood);
      this.avatarVoiceReply.set(res.avatar_reaction.voice_reply);

      // Speak avatar reply using TTS
      this.ttsService.speak(res.avatar_reaction.voice_reply);
    } else {
      this.avatarState.set('happy');
    }

    // 3. Add new tasks and reschedule notifications
    if (res.tasks && res.tasks.length > 0) {
      this.loadTasks();
      this.showToast('برنامه روزانه با موفقیت تنظیم شد ✨');
    } else {
      this.loadTasks();
    }
  }

  onToggleTask(event: { task: Task; isCompleted: boolean }): void {
    // Optimistic UI update
    this.tasks.update((current) =>
      current.map((t) => (t.id === event.task.id ? { ...t, is_completed: event.isCompleted } : t))
    );

    this.apiService.toggleTaskCompletion(event.task.id, event.isCompleted).subscribe({
      next: (updated) => {
        if (updated.is_completed) {
          this.avatarState.set('happy');
          this.avatarVoiceReply.set('آفرین! یک قدم به اهداف امروزت نزدیک‌تر شدی 🎉');
          this.ttsService.speak('آفرین! یک قدم به اهداف امروزت نزدیک‌تر شدی');
          this.userProfile.update((p) => p ? { ...p, xp: (p.xp || 0) + 15 } : p);
          this.showToast(`+۱۵ امتیاز XP برای تکمیل «${event.task.title}» دریافت کردی! ⚡`);
        } else {
          this.userProfile.update((p) => p ? { ...p, xp: Math.max(0, (p.xp || 0) - 15) } : p);
        }
      },
      error: (err) => {
        console.error('Failed to toggle task:', err);
        // Rollback
        this.loadTasks();
        this.errorMessage.set('خطا در به‌روزرسانی وضعیت تسک.');
      }
    });
  }

  onRescheduleTask(event: { task: Task; minutesToAdd?: number; toTomorrow?: boolean }): void {
    const { task, minutesToAdd, toTomorrow } = event;

    if (minutesToAdd) {
      const parts = task.scheduled_time.split(':');
      if (parts.length < 2) return;
      let totalMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + minutesToAdd;
      totalMin = totalMin % (24 * 60);
      const newH = String(Math.floor(totalMin / 60)).padStart(2, '0');
      const newM = String(totalMin % 60).padStart(2, '0');
      const newTime = `${newH}:${newM}`;

      // Optimistic update
      this.tasks.update((current) =>
        current.map((t) => (t.id === task.id ? { ...t, scheduled_time: newTime } : t))
      );

      this.apiService.updateTask(task.id, { scheduled_time: newTime }).subscribe({
        next: () => {
          this.showToast(`تسک "${task.title}" به ساعت ${newTime} موکول شد ⏰`);
          this.loadTasks();
        },
        error: (err) => {
          console.error('Failed to reschedule task:', err);
          this.loadTasks();
          this.errorMessage.set('خطا در تغییر زمان تسک.');
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
