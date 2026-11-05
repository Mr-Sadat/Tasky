import { Component, OnInit, ViewChild, inject, signal, computed, effect } from '@angular/core';
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
import { CalendarModalComponent } from './components/calendar-modal/calendar-modal.component';
import { TaskyMascotComponent } from './components/tasky-mascot/tasky-mascot.component';
import { getJalaliDisplayStr, getTodayIso, toLocalIsoDate, addDaysToIso, toPersianDigits } from './utils/jalali';

export interface FocusPreviewItem {
  id: string | number;
  title: string;
  category: string;
  impactTag: string;
  workTag: string;
  is_completed: boolean;
  raw?: Task;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    VoiceInputComponent,
    TaskTimelineComponent,
    AvatarStudioModalComponent,
    WizardComponent,
    ProfileModalComponent,
    DailyRecapModalComponent,
    PanicModalComponent,
    FocusModalComponent,
    CalendarModalComponent,
    TaskyMascotComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  @ViewChild(VoiceInputComponent) voiceInputComponent?: VoiceInputComponent;

  readonly toPersianDigits = toPersianDigits;

  private readonly apiService = inject(ApiService);
  readonly notifications = inject(NotificationService);
  readonly themeService = inject(ThemeService);
  readonly ttsService = inject(TtsService);

  // Active Tab navigation: 'tasks' (صفحه اصلی) | 'dashboard' (داشبورد هوشمند با effect) | 'profile' (پروفایل و تنظیمات)
  readonly activeNavTab = signal<'tasks' | 'dashboard' | 'profile'>('tasks');
  readonly showAllTimeline = signal<boolean>(true);

  // App Atmosphere & Settings (دارک نئون، غروب سایبری، تم روشن)
  readonly appAtmosphere = signal<'dark_neon' | 'cyber_sunset' | 'light'>('dark_neon');
  readonly profileInterests = signal<string[]>(['coding', 'creative']);
  readonly aiPersonality = signal<string>('رفیق پرانرژی');
  readonly voiceNudgesEnabled = signal<boolean>(true);
  readonly isVoiceDraftPlaying = signal<boolean>(false);
  readonly voiceDraftsCount = signal<number>(2);
  readonly voiceMemosStat = signal<number>(47);

  // PWA Install Tutorial States
  readonly isPwaTutorialOpen = signal<boolean>(false);
  readonly pwaTutorialPlatform = signal<'ios' | 'android'>('ios');
  readonly canInstallPwa = signal<boolean>(false);
  private deferredPrompt: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedAtmosphere = localStorage.getItem('tasky_app_atmosphere') as 'dark_neon' | 'cyber_sunset' | 'light' | null;
      if (savedAtmosphere) {
        this.appAtmosphere.set(savedAtmosphere);
      }
    }

    // Effect 1: Dashboard Analytics & State Synchronization via Angular effect()
    effect(() => {
      const all = this.tasks();
      const completed = all.filter(t => t.is_completed).length;
      const total = all.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const streak = this.streakDays();
      const atmosphere = this.appAtmosphere();

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('tasky_dashboard_analytics', JSON.stringify({
            completed,
            total,
            completionRate: rate,
            streak,
            atmosphere,
            updatedAt: Date.now()
          }));
        } catch (e) {
          console.warn('Dashboard effect sync error:', e);
        }
      }
    });

    // Effect 2: Reactive Theme / Atmosphere DOM Synchronization
    effect(() => {
      const mode = this.appAtmosphere();
      if (typeof document !== 'undefined') {
        const doc = document.documentElement;
        if (mode === 'cyber_sunset') {
          doc.setAttribute('data-theme', 'cyber-sunset');
          doc.classList.add('theme-cyber-sunset');
          doc.classList.remove('theme-light', 'theme-dark-neon');
        } else if (mode === 'light') {
          doc.setAttribute('data-theme', 'light');
          doc.classList.add('theme-light');
          doc.classList.remove('theme-cyber-sunset', 'theme-dark-neon');
        } else {
          doc.setAttribute('data-theme', 'dark-neon');
          doc.classList.add('theme-dark-neon');
          doc.classList.remove('theme-cyber-sunset', 'theme-light');
        }
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('tasky_app_atmosphere', mode);
        } catch (e) {}
      }
    });

    // Effect 3: Reactive Mascot State Based on Task Completion Load
    effect(() => {
      const uncompleted = this.uncompletedCount();
      const total = this.tasks().length;
      if (total > 0 && uncompleted === 0) {
        this.avatarState.set('happy');
      } else if (uncompleted > 3) {
        this.avatarState.set('thinking');
      } else {
        this.avatarState.set('idle');
      }
    });
  }

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
  readonly breakingDownTaskId = signal<string | number | null>(null);
  readonly focusingTask = signal<Task | null>(null);
  readonly isBriefingLoading = signal<boolean>(false);
  readonly isCheckingProfile = signal<boolean>(true);
  readonly isCalendarModalOpen = signal<boolean>(false);

  /**
   * Computed: count of uncompleted tasks for today
   */
  readonly uncompletedCount = computed(() => {
    return this.tasks().filter((t) => !t.is_completed).length;
  });

  /**
   * Computed: percentage of focus completion (default 78% matching design if newly initialized)
   */
  readonly focusProgressPercent = computed(() => {
    const list = this.tasks();
    if (list.length === 0) return 78;
    const completed = list.filter(t => t.is_completed).length;
    return Math.round((completed / list.length) * 100);
  });

  /**
   * SVG Circumference calculation for 34px radius
   */
  readonly strokeDashOffset = computed(() => {
    const circumference = 213.6;
    const p = this.focusProgressPercent();
    return circumference - (circumference * p) / 100;
  });

  /**
   * User level calculated from XP
   */
  readonly userLevel = computed(() => {
    const xp = this.userProfile()?.xp || 240;
    return Math.max(12, Math.floor(xp / 20));
  });

  /**
   * Tasks done count
   */
  readonly tasksDoneStat = computed(() => {
    const count = this.tasks().filter(t => t.is_completed).length;
    return 180 + count;
  });

  /**
   * Streak count (default 12 matching design)
   */
  readonly streakDays = computed(() => {
    return this.userProfile()?.streak_days || 12;
  });

  /**
   * Top 3 focus tasks for Today's rhythm card
   */
  readonly focusTasksPreview = computed<FocusPreviewItem[]>(() => {
    const list = this.tasks();
    if (list.length === 0) {
      return [
        {
          id: 'focus-demo-1',
          title: 'نهایی‌سازی کانسپت و ساختار اصلی اپلیکیشن',
          category: 'خلاقانه · ۴۵ دقیقه',
          impactTag: 'اولویت بالا',
          workTag: 'تمرکز عمیق',
          is_completed: false,
        }
      ];
    }
    return list.slice(0, 3).map(t => ({
      id: t.id,
      title: t.title,
      category: `${t.category === 'work' ? 'کاری' : t.category === 'study' ? 'مطالعه' : 'خلاقانه'} · ${toPersianDigits(t.duration_minutes || 45)} دقیقه`,
      impactTag: t.priority === 'high' ? 'اولویت بالا' : 'عادی',
      workTag: 'تمرکز عمیق',
      is_completed: t.is_completed,
      raw: t
    }));
  });

  onFocusItemClick(item: FocusPreviewItem): void {
    if (item.raw) {
      this.openFocusModal(item.raw);
    } else {
      this.openVoiceCapture();
    }
  }

  /**
   * Computed: identifies the task currently in progress based on real-world time
   */
  readonly activeTask = computed(() => {
    const list = this.tasks();
    const todayIso = getTodayIso();
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
    const todayIso = getTodayIso();
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
    this.initPwaCheck();
  }

  private initPwaCheck(): void {
    if (typeof window === 'undefined') return;

    // Detect mobile platform (iOS vs Android)
    const ua = navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    this.pwaTutorialPlatform.set(isIos ? 'ios' : 'android');

    // Detect standalone install mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    // Catch Chrome/Android install prompt
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstallPwa.set(true);
    });

    // If not standalone and tutorial not dismissed previously, open tutorial after 1.2s
    if (!isStandalone) {
      const dismissed = localStorage.getItem('tasky_pwa_dismissed');
      if (dismissed !== 'true') {
        setTimeout(() => {
          this.isPwaTutorialOpen.set(true);
        }, 1200);
      }
    }
  }

  openPwaTutorial(): void {
    this.isPwaTutorialOpen.set(true);
  }

  dismissPwaTutorial(dontShowAgain: boolean = false): void {
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('tasky_pwa_dismissed', 'true');
    }
    this.isPwaTutorialOpen.set(false);
  }

  async installPwaDirectly(): Promise<void> {
    if (!this.deferredPrompt) {
      this.showToast('مرورگر شما از نصب مستقیم پشتیبانی نمی‌کند، لطفاً از منوی مرورگر استفاده کنید.');
      return;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.showToast('اپلیکیشن با موفقیت نصب شد! 🎉');
      this.isPwaTutorialOpen.set(false);
      localStorage.setItem('tasky_pwa_dismissed', 'true');
    }
    this.deferredPrompt = null;
    this.canInstallPwa.set(false);
  }

  onReorderTasks(reordered: Task[]): void {
    this.tasks.set(reordered);
    this.apiService.updateTasksOrder(reordered).subscribe({
      next: () => {
        this.showToast('ترتیب تسک‌ها با موفقیت تغییر کرد ↕️');
      },
      error: (err) => {
        console.warn('Could not save reordered tasks:', err);
      }
    });
  }

  downloadBackup(): void {
    this.apiService.downloadBackupFile();
    this.showToast('نسخه پشتیبان JSON با موفقیت دریافت شد 📥');
  }

  onRestoreFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const res = this.apiService.importBackup(content);
      if (res.success) {
        this.showToast(res.message);
        this.loadTasks(this.selectedDate());
        this.checkProfileAndInitialize();
      } else {
        this.showToast(`خطا در بازیابی: ${res.message} ⚠️`);
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  openVoiceCapture(): void {
    this.voiceInputComponent?.openModal();
  }

  toggleInterest(tag: string): void {
    this.profileInterests.update(current => {
      if (current.includes(tag)) {
        return current.filter(t => t !== tag);
      } else {
        return [...current, tag];
      }
    });
  }

  setAtmosphere(mode: 'dark_neon' | 'cyber_sunset' | 'light'): void {
    this.appAtmosphere.set(mode);
    if (mode === 'cyber_sunset') {
      this.showToast('اتمسفر به «غروب سایبری» تغییر یافت 🌅');
    } else if (mode === 'light') {
      this.showToast('اتمسفر به «تم روشن (روز شفاف)» تغییر یافت ☀️✨');
    } else {
      this.showToast('اتمسفر به «دارک نئون» بازگشت 🌙✨');
    }
  }

  cycleAIPersonality(): void {
    const modes = [
      'رفیق پرانرژی',
      'مربی حامی و آرام',
      'فرمانده دقیق و هدفمند',
    ];
    const currentIndex = modes.indexOf(this.aiPersonality());
    const next = modes[(currentIndex + 1) % modes.length];
    this.aiPersonality.set(next);
    this.showToast(`شخصیت هوش مصنوعی: ${next} ✦`);
  }

  toggleVoiceNudges(): void {
    this.voiceNudgesEnabled.update(v => !v);
    this.showToast(this.voiceNudgesEnabled() ? 'اعلان‌های صوتی ملایم فعال شدند 〰️' : 'اعلان‌های صوتی غیرفعال شدند');
  }

  toggleVoiceDraftPlayback(): void {
    this.isVoiceDraftPlaying.update(v => !v);
    if (this.isVoiceDraftPlaying()) {
      this.ttsService.speak('پیش‌نویس صوتی: جلسه هماهنگی کمپین رونمایی برای فردا بعدازظهر بررسی و تایید شد.');
      setTimeout(() => this.isVoiceDraftPlaying.set(false), 5000);
    } else {
      this.ttsService.stop();
    }
  }

  toggleShowAllTimeline(): void {
    this.showAllTimeline.update(v => !v);
  }

  onVoiceTasksCreated(detectedList: any[]): void {
    if (!detectedList || detectedList.length === 0) return;

    const todayIso = getTodayIso();
    const newTasks: Task[] = detectedList.map((dt, idx) => ({
      id: Date.now() + idx,
      title: dt.title,
      scheduled_time: idx === 0 ? '11:00' : '15:00',
      duration_minutes: 45,
      priority: dt.priority || 'medium',
      category: 'work',
      icon: dt.icon === 'calendar' ? 'star' : 'briefcase',
      is_completed: false,
      date: todayIso,
      created_at: new Date().toISOString(),
    }));

    this.tasks.update(current => [...newTasks, ...current]);
    this.showToast(`✨ ${newTasks.length} تسک جدید از طریق هوش مصنوعی صوتی ثبت شدند!`);
    this.ttsService.speak(`عالیه! ${newTasks.length} تسک صوتی به ریتم روزت اضافه شد.`);
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

  
  openCalendarModal(): void {
    this.isCalendarModalOpen.set(true);
  }

  closeCalendarModal(): void {
    this.isCalendarModalOpen.set(false);
  }

  onCalendarDateSelected(isoDate: string): void {
    const todayIso = getTodayIso();
    this.selectedDate.set(isoDate === todayIso ? 'today' : isoDate);
    this.loadTasks(this.selectedDate());
    this.isCalendarModalOpen.set(false);
    this.showToast(`تقویم به روز ${getJalaliDisplayStr(isoDate)} منتقل شد 📅`);
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
        dateValue: toLocalIsoDate(tomorrow),
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
        const iso = toLocalIsoDate(nextDate);

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

    const targetDate = (this.selectedDate() === 'all' || this.selectedDate() === 'today') ? undefined : this.selectedDate();
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

    const targetDate = (this.selectedDate() === 'all' || this.selectedDate() === 'today') ? undefined : this.selectedDate();
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
      const createdTask = res.tasks[0];
      const todayIso = getTodayIso();
      if (createdTask.date) {
        this.selectedDate.set(createdTask.date === todayIso ? 'today' : createdTask.date);
      }
      this.loadTasks(this.selectedDate());
      this.showToast('برنامه روزانه با موفقیت تنظیم و ثبت شد ✨');
    } else {
      this.loadTasks(this.selectedDate());
    }
  }

  onToggleTask(event: { task: Task; isCompleted: boolean }): void {
    // Optimistic UI update
    this.tasks.update((current) =>
      current.map((t) => (t.id === event.task.id ? { ...t, is_completed: event.isCompleted } : t))
    );

    this.apiService.toggleTaskCompletion(event.task.id, event.isCompleted).subscribe({
      next: (updated) => {
        const profile = this.apiService.getStoredProfile();
        if (profile) {
          this.userProfile.set(profile);
        }
        if (updated.is_completed) {
          this.avatarState.set('happy');
          this.avatarVoiceReply.set('آفرین! یک قدم به اهداف امروزت نزدیک‌تر شدی 🎉');
          this.ttsService.speak('آفرین! یک قدم به اهداف امروزت نزدیک‌تر شدی');
          this.showToast(`+۱۵ امتیاز XP برای تکمیل «${event.task.title}» دریافت کردی! ⚡`);
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
      const tomorrowIso = addDaysToIso(task.date || getTodayIso(), 1);

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
