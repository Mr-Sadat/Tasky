import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Task,
  VoiceToPlanResponse,
  UserProfile,
  ProfileSetupPayload,
  MorningBriefingResponse,
  TaskPriority,
  TaskCategory,
  TaskIcon,
  AvatarMood,
  SpecialOccasion
} from '../models/task.model';
import {
  getTodayIso,
  getJalaliDateStr,
  getJalaliDisplayStr,
  getJalaliDayNameStr,
  gregorianToJalali
} from '../utils/jalali';
import { findOccasionsForTimeline } from '../utils/occasions';

export interface PanicRescheduleResponse {
  avatar_reaction: {
    mood: string;
    voice_reply: string;
  };
  tasks: Task[];
  deferred_tasks: Task[];
  rescheduled_count: number;
  deferred_count: number;
}

export interface TaskBreakdownResponse {
  message: string;
  avatar_reaction: {
    mood: string;
    voice_reply: string;
  };
  subtasks: Task[];
  tasks: Task[];
}

const STORAGE_KEYS = {
  TASKS: 'tasky_tasks',
  PROFILE: 'tasky_user_profile',
  INITIALIZED: 'tasky_initialized_v2',
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() {
    this.initializeDefaultData();
  }

  // ==========================================
  // Storage Helpers
  // ==========================================

  getStoredTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not read tasks from localStorage', e);
    }
    return [];
  }

  private saveStoredTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Could not save tasks to localStorage', e);
    }
  }

  getStoredProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not read profile from localStorage', e);
    }
    return null;
  }

  private saveStoredProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Could not save profile to localStorage', e);
    }
  }

  private getRandomCatchphrase(profile?: UserProfile | null): string {
    const list = profile?.catchphrases?.filter((p) => p && p.trim()) || [];
    if (list.length > 0) {
      return list[Math.floor(Math.random() * list.length)];
    }
    const defaults = ['بزن بریم', 'دمت گرم', 'عالیجناب', 'حرکت کنیم', 'پرانرژی باش'];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  private initializeDefaultData(): void {
    const isInit = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      const todayIso = getTodayIso();

      // Seed initial tasks if empty
      const existing = this.getStoredTasks();
      if (existing.length === 0) {
        const defaultTasks: Task[] = [
          {
            id: 1,
            title: 'کلاس فیزیک در دانشگاه',
            scheduled_time: '10:00',
            duration_minutes: 60,
            priority: 'high',
            category: 'study',
            icon: 'book',
            notification_text: 'وقت کلاس فیزیک در دانشگاه رسیده!',
            is_completed: false,
            date: todayIso,
            jalali_date: getJalaliDateStr(todayIso),
            jalali_display: getJalaliDisplayStr(todayIso),
            jalali_day_name: getJalaliDayNameStr(todayIso),
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            title: 'کدنویسی و توسعه فرانت‌اند تسکی',
            scheduled_time: '15:00',
            duration_minutes: 90,
            priority: 'high',
            category: 'work',
            icon: 'briefcase',
            notification_text: 'وقت کدنویسی و توسعه فرانت‌اند رسیده!',
            is_completed: false,
            date: todayIso,
            jalali_date: getJalaliDateStr(todayIso),
            jalali_display: getJalaliDisplayStr(todayIso),
            jalali_day_name: getJalaliDayNameStr(todayIso),
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            title: 'ورزش و تمرین هوازی',
            scheduled_time: '18:30',
            duration_minutes: 45,
            priority: 'medium',
            category: 'fitness',
            icon: 'dumbbell',
            notification_text: 'وقت ورزش و تمرین هوازی رسیده!',
            is_completed: false,
            date: todayIso,
            jalali_date: getJalaliDateStr(todayIso),
            jalali_display: getJalaliDisplayStr(todayIso),
            jalali_day_name: getJalaliDayNameStr(todayIso),
            created_at: new Date().toISOString(),
          }
        ];
        this.saveStoredTasks(defaultTasks);
      }

      // Default user profile
      if (!this.getStoredProfile()) {
        const defaultProfile: UserProfile = {
          name: 'سارا',
          wake_time: '07:00',
          sleep_time: '23:30',
          xp: 45,
          streak_days: 2,
          catchphrases: ['دمت گرم', 'بزن بریم', 'حرکت کنیم'],
          occasions: [
            { id: 'sample_bday', title: 'تولد بهترین دوستم', date: '08-15', type: 'personal', icon: '🎂' }
          ],
          ai_guidelines: '۱. برنامه‌ریزی واقع‌بینانه با فاصله‌های استراحت کوتاه.\n۲. اولویت‌بندی کارهای متمرکز در ساعات اوج انرژی صبحگاهی.\n۳. لحن مثبت، پرانرژی و استفاده از تیکه کلام‌های کاربر.',
          avatar_config: {
            faceShape: 'oval',
            skinTone: '#ffd1b3',
            hairStyle: 'medium_wavy',
            hairColor: '#4a2c2a',
            eyeShape: 'round_doe',
            eyeColor: '#5c3a21',
            eyebrows: 'natural_full',
            mouthExpression: 'gentle_smile',
            lipColor: '#e07a7a',
            outfitStyle: 'hoodie',
            outfitColor: '#8b5cf6',
            accessory: 'glasses',
            themeColor: 'purple'
          }
        };
        this.saveStoredProfile(defaultProfile);
      }

      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  }

  // ==========================================
  // Task Management (CRUD) + Occasions Sync
  // ==========================================

  getTasks(date?: string): Observable<Task[]> {
    const allTasks = this.getStoredTasks();
    const todayIso = getTodayIso();
    const targetDate = (date && date !== 'today' && date !== 'all') ? date : todayIso;

    // Normalize any legacy tasks with date: 'today' to actual todayIso
    let needsSave = false;
    for (const t of allTasks) {
      if (t.date === 'today' || !t.date) {
        t.date = todayIso;
        t.jalali_date = getJalaliDateStr(todayIso);
        t.jalali_display = getJalaliDisplayStr(todayIso);
        t.jalali_day_name = getJalaliDayNameStr(todayIso);
        needsSave = true;
      }
    }
    if (needsSave) {
      this.saveStoredTasks(allTasks);
    }

    // Check and inject any today or tomorrow occasions into tasks
    this.syncOccasionsIntoTasks(targetDate, allTasks);

    let filtered: Task[];
    if (date === 'all') {
      filtered = allTasks;
    } else if (date && date !== 'today') {
      filtered = allTasks.filter((t) => t.date === date);
    } else {
      // Default to today
      filtered = allTasks.filter((t) => t.date === todayIso || t.date === 'today' || !t.date);
    }

    filtered.sort((a, b) => (a.scheduled_time || '12:00').localeCompare(b.scheduled_time || '12:00'));
    return of(filtered).pipe(delay(50));
  }

  /**
   * Checks for today's and tomorrow's occasions (both official and user personal),
   * and auto-creates high-priority reminder tasks if they don't already exist.
   */
  syncOccasions(targetDateIso?: string): void {
    const today = targetDateIso || getTodayIso();
    const tasks = this.getStoredTasks();
    this.syncOccasionsIntoTasks(today, tasks);
  }

  private syncOccasionsIntoTasks(targetDateIso: string, tasks: Task[]): void {
    const profile = this.getStoredProfile();
    const { todayOccasions, tomorrowOccasions } = findOccasionsForTimeline(targetDateIso, profile?.occasions);

    let hasNew = false;

    // 1. Inject today's occasions
    for (const occ of todayOccasions) {
      const title = `🎉 امروز: «${occ.title}»`;
      const exists = tasks.some((t) => t.date === targetDateIso && (t.title.includes(occ.title) || t.title === title));
      if (!exists) {
        tasks.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          title: title,
          scheduled_time: '08:30',
          duration_minutes: 30,
          priority: 'high',
          category: 'personal',
          icon: 'star',
          notification_text: `امروز مناسبت «${occ.title}» است! شادباش و تبریک فراموش نشه ✨`,
          is_completed: false,
          date: targetDateIso,
          jalali_date: getJalaliDateStr(targetDateIso),
          jalali_display: getJalaliDisplayStr(targetDateIso),
          jalali_day_name: getJalaliDayNameStr(targetDateIso),
          created_at: new Date().toISOString(),
        });
        hasNew = true;
      }
    }

    // 2. Inject tomorrow's advance reminder occasions (e.g. at 19:00 today)
    for (const occ of tomorrowOccasions) {
      const title = `🎁 یادآوری: فردا «${occ.title}» است!`;
      const exists = tasks.some((t) => t.date === targetDateIso && (t.title.includes(occ.title) || t.title === title));
      if (!exists) {
        tasks.push({
          id: Date.now() + Math.floor(Math.random() * 1000) + 1,
          title: title,
          scheduled_time: '19:00',
          duration_minutes: 30,
          priority: 'high',
          category: 'personal',
          icon: 'star',
          notification_text: `فردا مناسبت «${occ.title}» است! برای هدیه و تبریک آماده باش.`,
          is_completed: false,
          date: targetDateIso,
          jalali_date: getJalaliDateStr(targetDateIso),
          jalali_display: getJalaliDisplayStr(targetDateIso),
          jalali_day_name: getJalaliDayNameStr(targetDateIso),
          created_at: new Date().toISOString(),
        });
        hasNew = true;
      }
    }

    if (hasNew) {
      this.saveStoredTasks(tasks);
    }
  }

  toggleTaskCompletion(id: number, isCompleted: boolean): Observable<Task> {
    const tasks = this.getStoredTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      return throwError(() => new Error('تسک یافت نشد'));
    }

    const wasCompleted = tasks[index].is_completed;
    tasks[index] = { ...tasks[index], is_completed: isCompleted };
    this.saveStoredTasks(tasks);

    // Update Profile XP & Streak
    const profile = this.getStoredProfile();
    if (profile) {
      if (!wasCompleted && isCompleted) {
        profile.xp = (profile.xp || 0) + 15;

        // Check if all today's high priority tasks are finished
        const todayIso = getTodayIso();
        const todayTasks = tasks.filter((t) => t.date === todayIso);
        const highPriorityTasks = todayTasks.filter((t) => t.priority === 'high');
        if (highPriorityTasks.length > 0 && highPriorityTasks.every((t) => t.is_completed)) {
          profile.streak_days = (profile.streak_days || 0) + 1;
        }
      } else if (wasCompleted && !isCompleted) {
        profile.xp = Math.max(0, (profile.xp || 0) - 15);
      }
      this.saveStoredProfile(profile);
    }

    return of(tasks[index]).pipe(delay(50));
  }

  updateTask(id: number, changes: Partial<Task>): Observable<Task> {
    const tasks = this.getStoredTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      return throwError(() => new Error('تسک یافت نشد'));
    }

    tasks[index] = { ...tasks[index], ...changes };
    if (changes.date) {
      tasks[index].jalali_date = getJalaliDateStr(changes.date);
      tasks[index].jalali_display = getJalaliDisplayStr(changes.date);
      tasks[index].jalali_day_name = getJalaliDayNameStr(changes.date);
    }
    this.saveStoredTasks(tasks);
    return of(tasks[index]).pipe(delay(50));
  }

  deleteTask(id: number): Observable<void> {
    const tasks = this.getStoredTasks().filter((t) => t.id !== id);
    this.saveStoredTasks(tasks);
    return of(undefined).pipe(delay(50));
  }

  // ==========================================

  createTask(taskData: Partial<Task>): Observable<Task> {
    const tasks = this.getStoredTasks();
    const targetDate = (taskData.date && taskData.date !== 'today') ? taskData.date : getTodayIso();
    const newTask: Task = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: taskData.title?.trim() || 'کار جدید',
      scheduled_time: taskData.scheduled_time || '10:00',
      duration_minutes: taskData.duration_minutes || 30,
      priority: taskData.priority || 'medium',
      category: taskData.category || 'personal',
      icon: taskData.icon || 'star',
      notification_text: taskData.notification_text || `زمان انجام ${taskData.title || 'کار'} رسیده است ✨`,
      is_completed: false,
      date: targetDate,
      jalali_date: getJalaliDateStr(targetDate),
      jalali_display: getJalaliDisplayStr(targetDate),
      jalali_day_name: getJalaliDayNameStr(targetDate),
      created_at: new Date().toISOString(),
    };
    tasks.push(newTask);
    this.saveStoredTasks(tasks);
    return of(newTask).pipe(delay(50));
  }

  addOccasion(occasion: SpecialOccasion): Observable<UserProfile> {
    const profile = this.getStoredProfile() || {
      name: 'کاربر',
      wake_time: '07:00',
      sleep_time: '23:00',
      avatar_config: {
        faceShape: 'oval',
        skinTone: '#f6d2b5',
        hairStyle: 'medium_wavy',
        hairColor: '#18181b',
        eyeShape: 'almond',
        eyeColor: '#292524',
        eyebrows: 'arched',
        mouthExpression: 'gentle_smile',
        lipColor: '#fb7185',
        outfitStyle: 'hoodie',
        outfitColor: '#8b5cf6',
        accessory: 'glasses',
        themeColor: 'purple',
      },
      ai_guidelines: '',
    };
    const existing = Array.isArray(profile.occasions) ? profile.occasions : [];
    profile.occasions = [...existing, occasion];
    this.saveStoredProfile(profile);
    this.syncOccasions();
    return of(profile).pipe(delay(50));
  }

  deleteOccasion(occasionId: string): Observable<UserProfile | null> {
    const profile = this.getStoredProfile();
    if (profile && Array.isArray(profile.occasions)) {
      profile.occasions = profile.occasions.filter((o) => o.id !== occasionId);
      this.saveStoredProfile(profile);
    }
    return of(profile).pipe(delay(50));
  }

  // Client-Side AI Voice-To-Plan Engine
  // ==========================================

  voiceToPlan(audioBlob?: Blob | null, text?: string, date?: string): Observable<VoiceToPlanResponse> {
    let targetDate = (date && date !== 'today' && date !== 'all') ? date : getTodayIso();
    const rawText = (text && text.trim()) ? text.trim() : (audioBlob ? 'یادداشت صوتی جدید برای برنامه' : 'برنامه جدید');

    // Intelligent relative Persian day resolution
    const textLower = rawText.toLowerCase();
    if (textLower.includes('پس‌فردا') || textLower.includes('پس فردا')) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      targetDate = d.toISOString().split('T')[0];
    } else if (textLower.includes('فردا')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      targetDate = d.toISOString().split('T')[0];
    }

    const profile = this.getStoredProfile();
    const catchphrase = this.getRandomCatchphrase(profile);

    // Parse Persian NLP from text
    const parsed = this.parsePersianTaskText(rawText);
    const tasks = this.getStoredTasks();

    // Check if this is a reschedule / modification request
    const isReschedule = this.detectRescheduleIntent(rawText);
    let avatarMood: AvatarMood = 'happy';
    let voiceReply = '';

    if (isReschedule) {
      // Find matching existing task to reschedule
      const existingMatch = this.findMatchingTask(tasks, parsed.title, rawText, targetDate);
      if (existingMatch) {
        existingMatch.scheduled_time = parsed.time;
        if (parsed.duration) existingMatch.duration_minutes = parsed.duration;
        avatarMood = 'supportive';
        voiceReply = `${catchphrase}! تسک «${existingMatch.title}» جابه‌جا شد و برای ساعت ${parsed.time} تنظیم گردید! ✨`;
        this.saveStoredTasks(tasks);

        return of({
          voice_log_id: Date.now(),
          raw_transcribed_text: rawText,
          avatar_reaction: { mood: avatarMood, voice_reply: voiceReply },
          tasks: [existingMatch]
        }).pipe(delay(150));
      }
    }

    // Normal Task Creation
    const newTask: Task = {
      id: Date.now(),
      title: parsed.title,
      scheduled_time: parsed.time,
      duration_minutes: parsed.duration,
      priority: parsed.priority,
      category: parsed.category,
      icon: parsed.icon,
      notification_text: `وقت انجام ${parsed.title} رسیده!`,
      is_completed: false,
      date: targetDate,
      jalali_date: getJalaliDateStr(targetDate),
      jalali_display: getJalaliDisplayStr(targetDate),
      jalali_day_name: getJalaliDayNameStr(targetDate),
      created_at: new Date().toISOString(),
    };

    tasks.push(newTask);
    this.saveStoredTasks(tasks);

    avatarMood = 'excited';
    voiceReply = `${catchphrase}! تسک «${newTask.title}» برای ساعت ${newTask.scheduled_time} آماده‌ست. بیا با هم بترکونیم! 🎯✨`;

    return of({
      voice_log_id: Date.now(),
      raw_transcribed_text: rawText,
      avatar_reaction: { mood: avatarMood, voice_reply: voiceReply },
      tasks: [newTask]
    }).pipe(delay(150));
  }

  // ==========================================
  // Emergency Panic Reschedule
  // ==========================================

  panicReschedule(reason?: string, currentTime?: string, date?: string): Observable<PanicRescheduleResponse> {
    const targetDate = date || getTodayIso();
    const tasks = this.getStoredTasks();
    const todayTasks = tasks.filter((t) => t.date === targetDate);
    const uncompleted = todayTasks.filter((t) => !t.is_completed);

    const profile = this.getStoredProfile();
    const catchphrase = this.getRandomCatchphrase(profile);

    // Compute start time in minutes
    let startMinutes = 15 * 60; // 15:00 default
    if (currentTime && currentTime.includes(':')) {
      const [h, m] = currentTime.split(':').map((v) => parseInt(v, 10));
      startMinutes = (h || 0) * 60 + (m || 0) + 15; // 15 min buffer
    } else {
      const now = new Date();
      startMinutes = now.getHours() * 60 + now.getMinutes() + 15;
    }

    const rescheduledTasks: Task[] = [];
    const deferredTasks: Task[] = [];

    let currentCursor = startMinutes;
    const maxDayMinutes = 23 * 60; // 23:00

    uncompleted.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().split('T')[0];

    for (const task of uncompleted) {
      // Compress duration by 25% (minimum 15 mins)
      const compressedDur = Math.max(15, Math.round(task.duration_minutes * 0.75));

      if (currentCursor + compressedDur <= maxDayMinutes && task.priority !== 'low') {
        const hh = Math.floor(currentCursor / 60);
        const mm = currentCursor % 60;
        task.scheduled_time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        task.duration_minutes = compressedDur;
        rescheduledTasks.push(task);
        currentCursor += compressedDur + 10;
      } else {
        // Defer to tomorrow
        task.date = tomorrowIso;
        task.jalali_date = getJalaliDateStr(tomorrowIso);
        task.jalali_display = getJalaliDisplayStr(tomorrowIso);
        task.jalali_day_name = getJalaliDayNameStr(tomorrowIso);
        task.scheduled_time = '10:30';
        deferredTasks.push(task);
      }
    }

    this.saveStoredTasks(tasks);

    const refreshedToday = tasks.filter((t) => t.date === targetDate);
    refreshedToday.sort((a, b) => (a.scheduled_time || '12:00').localeCompare(b.scheduled_time || '12:00'));

    return of({
      avatar_reaction: {
        mood: 'supportive',
        voice_reply: `${catchphrase}! اصلاً نگران نباش! برنامه‌ت با آرامش بازتنظیم شد. ${deferredTasks.length > 0 ? `${deferredTasks.length} کار کم‌اولویت رو به فردا منتقل کردم تا بتونی با تمرکز نفس بکشی!` : 'تسک‌ها رو مجدد چیدم تا راحت برسی.'} بیا با هم ادامه بدیم! 🤍✨`
      },
      tasks: refreshedToday,
      deferred_tasks: deferredTasks,
      rescheduled_count: rescheduledTasks.length,
      deferred_count: deferredTasks.length,
    }).pipe(delay(150));
  }

  // ==========================================
  // Task Breakdown (Micro-Steps)
  // ==========================================

  breakdownTask(taskId: number): Observable<TaskBreakdownResponse> {
    const tasks = this.getStoredTasks();
    const taskIndex = tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      return throwError(() => new Error('تسک یافت نشد'));
    }

    const profile = this.getStoredProfile();
    const catchphrase = this.getRandomCatchphrase(profile);

    const task = tasks[taskIndex];
    const totalDuration = task.duration_minutes || 60;
    const step1Dur = Math.max(15, Math.round(totalDuration * 0.25));
    const step2Dur = Math.max(20, Math.round(totalDuration * 0.50));
    const step3Dur = Math.max(15, totalDuration - step1Dur - step2Dur);

    const [h, m] = (task.scheduled_time || '10:00').split(':').map((v) => parseInt(v, 10));
    let startMin = (h || 10) * 60 + (m || 0);

    const formatTime = (mins: number) => {
      const hh = Math.floor(mins / 60) % 24;
      const mm = mins % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    const subtask1: Task = {
      id: Date.now() + 1,
      title: `مرحله ۱: آماده‌سازی و شروع ${task.title}`,
      scheduled_time: formatTime(startMin),
      duration_minutes: step1Dur,
      priority: task.priority,
      category: task.category,
      icon: task.icon,
      notification_text: `آماده‌سازی ${task.title} را شروع کنید!`,
      is_completed: false,
      date: task.date,
      jalali_date: task.jalali_date,
      jalali_display: task.jalali_display,
      jalali_day_name: task.jalali_day_name,
      created_at: new Date().toISOString(),
    };

    const subtask2: Task = {
      id: Date.now() + 2,
      title: `مرحله ۲: تمرکز عمیق روی ${task.title}`,
      scheduled_time: formatTime(startMin + step1Dur + 5),
      duration_minutes: step2Dur,
      priority: task.priority,
      category: task.category,
      icon: task.icon,
      notification_text: `مرحله اصلی ${task.title} شروع شد!`,
      is_completed: false,
      date: task.date,
      jalali_date: task.jalali_date,
      jalali_display: task.jalali_display,
      jalali_day_name: task.jalali_day_name,
      created_at: new Date().toISOString(),
    };

    const subtask3: Task = {
      id: Date.now() + 3,
      title: `مرحله ۳: جمع‌بندی و مرور ${task.title}`,
      scheduled_time: formatTime(startMin + step1Dur + step2Dur + 10),
      duration_minutes: step3Dur,
      priority: task.priority,
      category: task.category,
      icon: task.icon,
      notification_text: `جمع‌بندی ${task.title} را به پایان برسانید!`,
      is_completed: false,
      date: task.date,
      jalali_date: task.jalali_date,
      jalali_display: task.jalali_display,
      jalali_day_name: task.jalali_day_name,
      created_at: new Date().toISOString(),
    };

    const subtasks = [subtask1, subtask2, subtask3];

    tasks.splice(taskIndex, 1, ...subtasks);
    this.saveStoredTasks(tasks);

    const refreshedTasks = tasks.filter((t) => t.date === task.date);
    refreshedTasks.sort((a, b) => (a.scheduled_time || '12:00').localeCompare(b.scheduled_time || '12:00'));

    return of({
      message: 'تسک با موفقیت به گام‌های کوچک و شفاف خرد شد',
      avatar_reaction: {
        mood: 'excited',
        voice_reply: `${catchphrase}! تسک بزرگ «${task.title}» رو به ۳ گام ساده و راحت تقسیم کردم تا پرانرژی بری جلو! 🧩✨`
      },
      subtasks,
      tasks: refreshedTasks
    }).pipe(delay(150));
  }

  // ==========================================
  // Profile & Morning Briefing
  // ==========================================

  getProfile(): Observable<UserProfile> {
    const profile = this.getStoredProfile();
    if (!profile) {
      return throwError(() => new Error('پروفیلی ثبت نشده است.'));
    }
    return of(profile).pipe(delay(50));
  }

  setupProfile(payload: ProfileSetupPayload): Observable<UserProfile> {
    const answers = payload.lifestyle_answers || {};
    const guidelines = [
      `۱. برنامه‌ریزی متناسب با ریتم بدنی (${answers.chronotype || 'صبحگاهی'}) بین ساعت ${payload.wake_time || '07:00'} تا ${payload.sleep_time || '23:00'}.`,
      `۲. سبک کارکرد: ${answers.planningStyle || 'ساختاریافته'} با فواصل تمرکز ${answers.focusSpan || 'پومودورو'}.`,
      `۳. لحن رفتار: ${answers.aiTone || 'دوستانه و حامی'} همراه با بهره‌گیری از تیکه کلام‌ها.`,
      `۴. مدیریت استرس و انعطاف: ${answers.resilienceStyle || 'منعطف و آرامش‌بخش'}.`
    ].join('\n');

    const profile: UserProfile = {
      name: payload.name || 'کاربر',
      wake_time: payload.wake_time || '07:00',
      sleep_time: payload.sleep_time || '23:00',
      avatar_config: payload.avatar_config,
      ai_guidelines: guidelines,
      catchphrases: payload.catchphrases || ['دمت گرم', 'بزن بریم', 'حرکت کنیم'],
      occasions: payload.occasions || [],
      psychology_profile: answers,
      xp: 0,
      streak_days: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.saveStoredProfile(profile);
    return of(profile).pipe(delay(100));
  }

  updateProfile(changes: Partial<UserProfile>): Observable<UserProfile> {
    let profile = this.getStoredProfile();
    if (!profile) {
      profile = {
        name: 'کاربر',
        wake_time: '07:00',
        sleep_time: '23:00',
        ai_guidelines: '',
        avatar_config: {} as any
      };
    }

    const updated: UserProfile = { ...profile, ...changes, updated_at: new Date().toISOString() };
    this.saveStoredProfile(updated);
    return of(updated).pipe(delay(50));
  }

  getMorningBriefing(): Observable<MorningBriefingResponse> {
    const profile = this.getStoredProfile();
    const userName = profile?.name || 'دوست من';
    const xp = profile?.xp || 0;
    const streak = profile?.streak_days || 0;
    const catchphrase = this.getRandomCatchphrase(profile);

    const todayIso = getTodayIso();
    const tasks = this.getStoredTasks().filter((t) => t.date === todayIso);
    const uncompleted = tasks.filter((t) => !t.is_completed);

    let topTask = 'کارهای مهم روزانه';
    const highPrio = uncompleted.find((t) => t.priority === 'high');
    if (highPrio) {
      topTask = highPrio.title;
    } else if (uncompleted.length > 0) {
      topTask = uncompleted[0].title;
    }

    const count = tasks.length;
    let briefingText = '';
    if (count === 0) {
      briefingText = `${catchphrase} ${userName} عزیز! ☀️ هنوز برنامه‌ای برای امروزت ثبت نکردی. هر کاری تو ذهنته رو بهم بگو تا بهترین زمان‌بندی رو برات بچینم!`;
    } else {
      briefingText = `صبح بخیر ${userName} جان، ${catchphrase}! ☀️ امروز ${count} برنامه قشنگ داری که مهم‌ترینش «${topTask}» هست. با آرامش و قدرت شروع کن، مطمئنم امروز هم می‌درخشی! ✨`;
    }

    return of({
      briefing_text: briefingText,
      audio_script: briefingText,
      tasks_count: count,
      top_task: topTask,
      user_name: userName,
      xp: xp,
      streak_days: streak
    }).pipe(delay(100));
  }

  // ==========================================
  // Persian Heuristics & Helpers
  // ==========================================

  private normalizePersianDigits(str: string): string {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧۸۹';
    let res = str;
    for (let i = 0; i < 10; i++) {
      res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
      res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
    }
    return res;
  }

  private parsePersianTaskText(rawText: string): {
    title: string;
    time: string;
    duration: number;
    priority: TaskPriority;
    category: TaskCategory;
    icon: TaskIcon;
  } {
    const normalized = this.normalizePersianDigits(rawText);
    const textLower = normalized.toLowerCase();

    // 1. Time Extraction
    let scheduledTime = '12:00';
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isNight = /عصر|بعدازظهر|شب|غروب|شام/.test(textLower);
    const isHalf = /نیم/.test(textLower);

    const timeRegex = /(?:ساعت\s*)?(\d{1,2})[:](\d{1,2})/;
    const mColon = textLower.match(timeRegex);
    if (mColon) {
      let h = parseInt(mColon[1], 10);
      const m = parseInt(mColon[2], 10);
      if (isNight && h >= 1 && h <= 11) h += 12;
      scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, m)).padStart(2, '0')}`;
    } else {
      const singleHourRegex = /(?:ساعت\s*)(\d{1,2})\b/;
      const mSingle = textLower.match(singleHourRegex);
      if (mSingle) {
        let h = parseInt(mSingle[1], 10);
        if (isNight && h >= 1 && h <= 11) h += 12;
        const m = isHalf ? 30 : 0;
        scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      } else {
        const words: { [k: string]: number } = {
          یک: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6,
          هفت: 7, هشت: 8, نه: 9, ده: 10, یازده: 11, دوازده: 12,
          شانزده: 16, هفده: 17, هجده: 18, بیست: 20
        };
        for (const [w, val] of Object.entries(words)) {
          if (new RegExp(`(?:ساعت\\s*)?${w}`).test(textLower)) {
            let h = val;
            if (isNight && h >= 1 && h <= 11) h += 12;
            const m = isHalf ? 30 : 0;
            scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            break;
          }
        }
      }
    }

    if (scheduledTime === '12:00' && !textLower.includes('۱۲') && !textLower.includes('دوازده')) {
      scheduledTime = defaultTime;
    }

    // 2. Duration Extraction
    let duration = 45;
    if (/یک\s*ساعت/.test(textLower)) duration = 60;
    else if (/دو\s*ساعت/.test(textLower)) duration = 120;
    else if (/نیم\s*ساعت/.test(textLower)) duration = 30;
    else if (/(\d+)\s*دقیقه/.test(textLower)) {
      const matchDur = textLower.match(/(\d+)\s*دقیقه/);
      if (matchDur) duration = parseInt(matchDur[1], 10) || 45;
    }

    // 3. Priority Extraction
    let priority: TaskPriority = 'medium';
    if (/مهم|ضروری|فوری|حیاتی|امتحان|حتما|حتماً/.test(textLower)) {
      priority = 'high';
    } else if (/فرصت شد|هر وقت|کم اهمیت|آزاد/.test(textLower)) {
      priority = 'low';
    }

    // 4. Category & Icon
    let category: TaskCategory = 'personal';
    let icon: TaskIcon = 'star';

    if (/درس|دانشگاه|امتحان|کتاب|کلاس|فیزیک|ریاضی|مطالعه|مشق|جزوه/.test(textLower)) {
      category = 'study';
      icon = 'book';
    } else if (/کار|جلسه|پروژه|کدنویسی|توسعه|دفتر|ارائه|برنامه‌نویسی/.test(textLower)) {
      category = 'work';
      icon = 'briefcase';
    } else if (/ورزش|باشگاه|تمرین|دویدن|پیاده‌روی|شنا|فوتبال|استخر/.test(textLower)) {
      category = 'fitness';
      icon = 'dumbbell';
    } else if (/دکتر|پزشک|بیمارستان|دارو|آزمایش|دندانپزشکی/.test(textLower)) {
      category = 'health';
      icon = 'heart';
    } else if (/خرید|فروشگاه|سوپرمارکت|بازار/.test(textLower)) {
      category = 'shopping';
      icon = 'cart';
    } else if (/استراحت|قهوه|کافه|خواب|چرت/.test(textLower)) {
      category = 'rest';
      icon = 'coffee';
    }

    // 5. Clean Title
    let title = normalized
      .replace(/ساعت\s*\d{1,2}(?::\d{1,2})?/g, '')
      .replace(/ساعت\s*(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|یازده|دوازده)/g, '')
      .replace(/بعدازظهر|صبح|شب|عصر|غروب|نیم|دقیقه|\bبه مدت\b/g, '')
      .replace(/میخوام|می‌خوام|باید|برم|دارم|انجام بدم|ست کن|بذار|تنظیم کن/g, '')
      .trim();

    if (!title || title.length < 3) {
      title = rawText.slice(0, 40).trim();
    }

    return {
      title,
      time: scheduledTime,
      duration,
      priority,
      category,
      icon,
    };
  }

  private detectRescheduleIntent(text: string): boolean {
    const keywords = [
      'پشیمون', 'پشیمان', 'عوض', 'تغییر', 'بنداز', 'بذار برای',
      'کنسل', 'جابجا', 'جابه‌جا', 'منتقل', 'موکول', 'دیرتر', 'زودتر'
    ];
    return keywords.some((kw) => text.includes(kw));
  }

  private findMatchingTask(tasks: Task[], queryTitle: string, rawText: string, date: string): Task | null {
    const list = tasks.filter((t) => t.date === date);
    if (list.length === 0) return null;

    for (const t of list) {
      if (queryTitle && t.title.includes(queryTitle)) return t;
      if (rawText && rawText.includes(t.title)) return t;
    }

    const keywords = ['فیزیک', 'ورزش', 'کدنویسی', 'کلاس', 'جلسه', 'خرید', 'دانشگاه', 'تمرین'];
    for (const kw of keywords) {
      if (rawText.includes(kw)) {
        const found = list.find((t) => t.title.includes(kw));
        if (found) return found;
      }
    }

    return list.find((t) => !t.is_completed) || list[0] || null;
  }
}
