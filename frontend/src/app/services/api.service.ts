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
  SpecialOccasion,
  TaskyBackupData
} from '../models/task.model';
import {
  getTodayIso,
  getJalaliDateStr,
  getJalaliDisplayStr,
  getJalaliDayNameStr,
  gregorianToJalali,
  toLocalIsoDate,
  parseLocalIsoDate,
  addDaysToIso
} from '../utils/jalali';
import { findOccasionsForTimeline } from '../utils/occasions';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_DISMISSED_OCCASIONS = 'tasky_dismissed_occasions';
const STORAGE_COMPLETED_OCCASIONS = 'tasky_completed_occasions';

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

export const CURRENT_SCHEMA_VERSION = 2;
const STORAGE_SCHEMA_VERSION = 'tasky_schema_version';

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

    // Check and run schema migration if necessary
    const schemaVersionStr = localStorage.getItem(STORAGE_SCHEMA_VERSION);
    const schemaVersion = schemaVersionStr ? parseInt(schemaVersionStr, 10) : 1;
    if (schemaVersion < CURRENT_SCHEMA_VERSION) {
      this.migrateSchema(schemaVersion);
    }
  }

  private migrateSchema(fromVersion: number): void {
    if (fromVersion < 2) {
      const todayIso = getTodayIso();
      const tasks = this.getStoredTasks();
      let changed = false;

      for (const t of tasks) {
        if (t.date === 'today' || !t.date) {
          t.date = todayIso;
          t.jalali_date = getJalaliDateStr(todayIso);
          t.jalali_display = getJalaliDisplayStr(todayIso);
          t.jalali_day_name = getJalaliDayNameStr(todayIso);
          changed = true;
        }
      }

      if (changed) {
        this.saveStoredTasks(tasks);
      }

      const profile = this.getStoredProfile();
      if (profile) {
        if (profile.xp === undefined) profile.xp = 0;
        if (profile.streak_days === undefined) profile.streak_days = 0;
        this.saveStoredProfile(profile);
      }

      localStorage.setItem(STORAGE_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
    }
  }

  // ==========================================
  // Data Backup & Restore (JSON Export / Import)
  // ==========================================

  exportBackup(): TaskyBackupData {
    const profile = this.getStoredProfile();
    const tasks = this.getStoredTasks();
    const dismissed = Array.from(this.getDismissedOccasionIds());
    const completed = Array.from(this.getCompletedOccasionIds());

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      profile,
      tasks,
      dismissedOccasions: dismissed,
      completedOccasions: completed,
    };
  }

  downloadBackupFile(): void {
    const data = this.exportBackup();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasky-backup-${getTodayIso()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importBackup(backupOrJson: string | TaskyBackupData): { success: boolean; message: string; tasksCount: number } {
    try {
      const data: TaskyBackupData = typeof backupOrJson === 'string' ? JSON.parse(backupOrJson) : backupOrJson;
      if (!data || !Array.isArray(data.tasks)) {
        return { success: false, message: 'فایل پشتیبان نامعتبر است (آرایه تسک‌ها یافت نشد).', tasksCount: 0 };
      }

      this.saveStoredTasks(data.tasks);

      if (data.profile) {
        this.saveStoredProfile(data.profile);
      }

      if (Array.isArray(data.dismissedOccasions)) {
        localStorage.setItem(STORAGE_DISMISSED_OCCASIONS, JSON.stringify(data.dismissedOccasions));
      }
      if (Array.isArray(data.completedOccasions)) {
        localStorage.setItem(STORAGE_COMPLETED_OCCASIONS, JSON.stringify(data.completedOccasions));
      }

      localStorage.setItem(STORAGE_SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));

      return {
        success: true,
        message: `نسخه پشتیبان با موفقیت بازیابی شد (${data.tasks.length} تسک).`,
        tasksCount: data.tasks.length,
      };
    } catch (err: any) {
      return { success: false, message: `خطا در بازخوانی فایل: ${err.message || 'فایل خراب است'}`, tasksCount: 0 };
    }
  }

  // ==========================================
  // Optional BYOK External LLM Proxy Integration
  // ==========================================

  async callCustomLlm(prompt: string, systemInstruction?: string): Promise<string | null> {
    const profile = this.getStoredProfile();
    if (!profile?.use_custom_llm || !profile?.custom_llm_api_key?.trim()) {
      return null;
    }

    const baseUrl = (profile.custom_llm_base_url?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = profile.custom_llm_model?.trim() || 'gpt-4o-mini';

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.custom_llm_api_key.trim()}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: systemInstruction || 'شما دستیار برنامه‌ریزی هوشمند Tasky هستید. پاسخ‌های خود را کوتاه، صمیمی، راست‌چین و به زبان فارسی بنویسید.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (!res.ok) {
        console.warn('Custom LLM proxy returned error:', res.status);
        return null;
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      return content || null;
    } catch (e) {
      console.warn('Failed to call custom LLM proxy:', e);
      return null;
    }
  }

  // ==========================================
  // Task Management (CRUD) + Occasions Sync
  // ==========================================

  private getDismissedOccasionIds(): Set<string> {
    try {
      const data = localStorage.getItem(STORAGE_DISMISSED_OCCASIONS);
      return new Set(data ? JSON.parse(data) : []);
    } catch {
      return new Set();
    }
  }

  private saveDismissedOccasionId(id: string): void {
    const set = this.getDismissedOccasionIds();
    set.add(id);
    localStorage.setItem(STORAGE_DISMISSED_OCCASIONS, JSON.stringify(Array.from(set)));
  }

  private getCompletedOccasionIds(): Set<string> {
    try {
      const data = localStorage.getItem(STORAGE_COMPLETED_OCCASIONS);
      return new Set(data ? JSON.parse(data) : []);
    } catch {
      return new Set();
    }
  }

  private setOccasionCompleted(id: string, isCompleted: boolean): void {
    const set = this.getCompletedOccasionIds();
    if (isCompleted) {
      set.add(id);
    } else {
      set.delete(id);
    }
    localStorage.setItem(STORAGE_COMPLETED_OCCASIONS, JSON.stringify(Array.from(set)));
  }

  /**
   * Generates occasion reminder tasks for a given date on the fly (computed for display).
   * These tasks are NEVER persisted into stored tasks (localStorage).
   */
  private buildOccasionTasksForDate(targetDateIso: string): Task[] {
    const profile = this.getStoredProfile();
    const { todayOccasions, tomorrowOccasions } = findOccasionsForTimeline(targetDateIso, profile?.occasions);
    const dismissed = this.getDismissedOccasionIds();
    const completed = this.getCompletedOccasionIds();
    const result: Task[] = [];

    for (const occ of todayOccasions) {
      const id = `occ_today_${targetDateIso}_${occ.id || occ.title}`;
      if (dismissed.has(id)) continue;
      result.push({
        id,
        title: `🎉 امروز: «${occ.title}»`,
        scheduled_time: '08:30',
        duration_minutes: 30,
        priority: 'high',
        category: 'personal',
        icon: 'star',
        notification_text: `امروز مناسبت «${occ.title}» است! شادباش و تبریک فراموش نشه ✨`,
        is_completed: completed.has(id),
        date: targetDateIso,
        jalali_date: getJalaliDateStr(targetDateIso),
        jalali_display: getJalaliDisplayStr(targetDateIso),
        jalali_day_name: getJalaliDayNameStr(targetDateIso),
        created_at: targetDateIso,
      });
    }

    for (const occ of tomorrowOccasions) {
      const id = `occ_tomorrow_${targetDateIso}_${occ.id || occ.title}`;
      if (dismissed.has(id)) continue;
      result.push({
        id,
        title: `🎁 یادآوری: فردا «${occ.title}» است!`,
        scheduled_time: '19:00',
        duration_minutes: 30,
        priority: 'high',
        category: 'personal',
        icon: 'star',
        notification_text: `فردا مناسبت «${occ.title}» است! برای هدیه و تبریک آماده باش.`,
        is_completed: completed.has(id),
        date: targetDateIso,
        jalali_date: getJalaliDateStr(targetDateIso),
        jalali_display: getJalaliDisplayStr(targetDateIso),
        jalali_day_name: getJalaliDayNameStr(targetDateIso),
        created_at: targetDateIso,
      });
    }

    return result;
  }

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
    // Clean up any previously stored occasion tasks to avoid duplication
    const cleanTasks = allTasks.filter((t) => !t.title.startsWith('🎉 امروز:') && !t.title.startsWith('🎁 یادآوری:'));
    if (cleanTasks.length !== allTasks.length) {
      needsSave = true;
      allTasks.length = 0;
      allTasks.push(...cleanTasks);
    }
    if (needsSave) {
      this.saveStoredTasks(allTasks);
    }

    let filtered: Task[];
    if (date === 'all') {
      const todayOccasions = this.buildOccasionTasksForDate(todayIso);
      filtered = [...allTasks, ...todayOccasions];
    } else if (date && date !== 'today') {
      const userTasks = allTasks.filter((t) => t.date === date);
      const occasions = this.buildOccasionTasksForDate(date);
      filtered = [...userTasks, ...occasions];
    } else {
      // Default to today
      const userTasks = allTasks.filter((t) => t.date === todayIso || t.date === 'today' || !t.date);
      const occasions = this.buildOccasionTasksForDate(todayIso);
      filtered = [...userTasks, ...occasions];
    }

    filtered.sort((a, b) => (a.scheduled_time || '12:00').localeCompare(b.scheduled_time || '12:00'));
    return of(filtered).pipe(delay(50));
  }

  /**
   * Compatibility method - occasions are now computed dynamically at display time.
   */
  syncOccasions(targetDateIso?: string): void {
    // No-op: Occasions are computed dynamically at view time to prevent unwanted persistence and zombie tasks.
  }

  toggleTaskCompletion(id: string | number, isCompleted: boolean): Observable<Task> {
    const idStr = String(id);
    const todayIso = getTodayIso();
    let updatedTask: Task | null = null;
    let wasCompleted = false;

    if (idStr.startsWith('occ_')) {
      const completedSet = this.getCompletedOccasionIds();
      wasCompleted = completedSet.has(idStr);
      this.setOccasionCompleted(idStr, isCompleted);
      const parts = idStr.split('_');
      const occDate = parts[2] || todayIso;
      const occasions = this.buildOccasionTasksForDate(occDate);
      updatedTask = occasions.find((t) => String(t.id) === idStr) || {
        id,
        title: 'مناسبت',
        scheduled_time: '08:30',
        duration_minutes: 30,
        priority: 'high',
        category: 'personal',
        icon: 'star',
        is_completed: isCompleted,
        date: occDate,
      };
    } else {
      const tasks = this.getStoredTasks();
      const index = tasks.findIndex((t) => String(t.id) === idStr);
      if (index === -1) {
        return throwError(() => new Error('تسک یافت نشد'));
      }
      wasCompleted = tasks[index].is_completed;
      tasks[index] = { ...tasks[index], is_completed: isCompleted };
      this.saveStoredTasks(tasks);
      updatedTask = tasks[index];
    }

    // Update Profile XP & Streak
    const profile = this.getStoredProfile();
    if (profile) {
      if (!wasCompleted && isCompleted) {
        profile.xp = (profile.xp || 0) + 15;

        // Check if all today's high priority tasks are finished
        const todayTasks = this.getStoredTasks().filter((t) => t.date === todayIso);
        const highPriority = todayTasks.filter((t) => t.priority === 'high');
        if (highPriority.length > 0 && highPriority.every((t) => t.is_completed)) {
          // Calculate streak once per day
          if (profile.last_streak_date !== todayIso) {
            const yesterdayIso = addDaysToIso(todayIso, -1);
            if (profile.last_streak_date === yesterdayIso) {
              profile.streak_days = (profile.streak_days || 0) + 1;
            } else {
              profile.streak_days = 1;
            }
            profile.previous_streak_date = profile.last_streak_date;
            profile.last_streak_date = todayIso;
          }
        }
      } else if (wasCompleted && !isCompleted) {
        profile.xp = Math.max(0, (profile.xp || 0) - 15);

        // If today's streak was already credited, check if rollback is needed
        if (profile.last_streak_date === todayIso) {
          const todayTasks = this.getStoredTasks().filter((t) => t.date === todayIso);
          const highPriority = todayTasks.filter((t) => t.priority === 'high');
          const allStillDone = highPriority.length > 0 && highPriority.every((t) => t.is_completed);
          if (!allStillDone) {
            profile.streak_days = Math.max(0, (profile.streak_days || 1) - 1);
            profile.last_streak_date = profile.previous_streak_date;
          }
        }
      }
      this.saveStoredProfile(profile);
    }

    return of(updatedTask!).pipe(delay(50));
  }

  updateTask(id: string | number, changes: Partial<Task>): Observable<Task> {
    const idStr = String(id);
    const tasks = this.getStoredTasks();
    const index = tasks.findIndex((t) => String(t.id) === idStr);
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

  deleteTask(id: string | number): Observable<void> {
    const idStr = String(id);
    if (idStr.startsWith('occ_')) {
      this.saveDismissedOccasionId(idStr);
      return of(undefined).pipe(delay(50));
    }
    const tasks = this.getStoredTasks().filter((t) => String(t.id) !== idStr);
    this.saveStoredTasks(tasks);
    return of(undefined).pipe(delay(50));
  }

  // ==========================================

  createTask(taskData: Partial<Task>): Observable<Task> {
    const tasks = this.getStoredTasks();
    const targetDate = (taskData.date && taskData.date !== 'today') ? taskData.date : getTodayIso();
    const newTask: Task = {
      id: generateUUID(),
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
      targetDate = addDaysToIso(getTodayIso(), 2);
    } else if (textLower.includes('فردا')) {
      targetDate = addDaysToIso(getTodayIso(), 1);
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

    // If user didn't specify an exact time, leverage their biological chronotype
    let plannedTime = parsed.time;
    if (!parsed.timeMatched) {
      const chronotype = profile?.psychology_profile?.['chronotype'];
      if (chronotype === 'morning') {
        plannedTime = '09:00';
      } else if (chronotype === 'afternoon') {
        plannedTime = '15:00';
      } else if (chronotype === 'night') {
        plannedTime = '20:30';
      }
    }

    // Normal Task Creation
    const newTask: Task = {
      id: generateUUID(),
      title: parsed.title,
      scheduled_time: plannedTime,
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
    // Calculate max scheduling time based on user's biological sleep_time (stopping 30 mins before sleep)
    let maxDayMinutes = 23 * 60; // 23:00 default
    if (profile?.sleep_time && profile.sleep_time.includes(':')) {
      const [sh, sm] = profile.sleep_time.split(':').map((v) => parseInt(v, 10));
      maxDayMinutes = Math.max(18 * 60, (sh * 60 + (sm || 0)) - 30);
    }

    // Dynamic compression ratio tuned by user's psychological resilience style
    const resilience = profile?.psychology_profile?.['resilienceStyle'];
    const compressRatio = resilience === 'compress_focus' ? 0.60 : 0.75;

    uncompleted.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
    });

    const tomorrowIso = addDaysToIso(targetDate, 1);

    for (const task of uncompleted) {
      // Compress duration based on resilience style (minimum 15 mins)
      const compressedDur = Math.max(15, Math.round(task.duration_minutes * compressRatio));

      if (currentCursor + compressedDur <= maxDayMinutes) {
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

  breakdownTask(taskId: string | number): Observable<TaskBreakdownResponse> {
    const tasks = this.getStoredTasks();
    const taskIndex = tasks.findIndex((t) => String(t.id) === String(taskId));
    if (taskIndex === -1) {
      return throwError(() => new Error('تسک یافت نشد'));
    }

    const profile = this.getStoredProfile();
    const catchphrase = this.getRandomCatchphrase(profile);

    const task = tasks[taskIndex];
    const totalDuration = task.duration_minutes || 60;
    const focusSpan = profile?.psychology_profile?.['focusSpan'] || 'pomodoro';

    const [h, m] = (task.scheduled_time || '10:00').split(':').map((v) => parseInt(v, 10));
    let startMin = (h || 10) * 60 + (m || 0);

    const formatTime = (mins: number) => {
      const hh = Math.floor(mins / 60) % 24;
      const mm = mins % 60;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };

    let subtasksData: { title: string; duration: number }[] = [];

    if (focusSpan === 'short_sprints') {
      const stepDur = Math.max(15, Math.round(totalDuration / 3));
      subtasksData = [
        { title: `اسپرینت ۱ (شروع سریع): ${task.title}`, duration: stepDur },
        { title: `اسپرینت ۲ (پیشروی پرانرژی): ${task.title}`, duration: stepDur },
        { title: `اسپرینت ۳ (جمع‌بندی): ${task.title}`, duration: Math.max(10, totalDuration - 2 * stepDur) }
      ];
    } else if (focusSpan === 'deep_work') {
      const half = Math.max(25, Math.round(totalDuration / 2));
      subtasksData = [
        { title: `بخش ۱ (تمرکز عمیق و غرقگی): ${task.title}`, duration: half },
        { title: `بخش ۲ (تکمیل و نهایی‌سازی): ${task.title}`, duration: Math.max(20, totalDuration - half) }
      ];
    } else {
      // pomodoro
      const step1Dur = Math.max(15, Math.round(totalDuration * 0.25));
      const step2Dur = Math.max(20, Math.round(totalDuration * 0.50));
      const step3Dur = Math.max(15, totalDuration - step1Dur - step2Dur);
      subtasksData = [
        { title: `مرحله ۱ (آماده‌سازی و استارت): ${task.title}`, duration: step1Dur },
        { title: `مرحله ۲ (تمرکز اصلی): ${task.title}`, duration: step2Dur },
        { title: `مرحله ۳ (جمع‌بندی و مرور): ${task.title}`, duration: step3Dur }
      ];
    }

    let cursorMin = startMin;
    const subtasks: Task[] = subtasksData.map((st, idx) => {
      const subtask: Task = {
        id: generateUUID(),
        title: st.title,
        scheduled_time: formatTime(cursorMin),
        duration_minutes: st.duration,
        priority: task.priority,
        category: task.category,
        icon: task.icon,
        notification_text: `زمان انجام ${st.title} رسید!`,
        is_completed: false,
        date: task.date,
        jalali_date: task.jalali_date,
        jalali_display: task.jalali_display,
        jalali_day_name: task.jalali_day_name,
        created_at: new Date().toISOString(),
      };
      cursorMin += st.duration + 5; // 5 min transition buffer
      return subtask;
    });

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

  generateAiGuidelines(wakeTime?: string, sleepTime?: string, answers?: any): Observable<string> {
    const current = this.getStoredProfile();
    const ans = answers || current?.psychology_profile || {};
    const wake = wakeTime || current?.wake_time || '07:00';
    const sleep = sleepTime || current?.sleep_time || '23:00';
    const guidelines = [
      `۱. برنامه‌ریزی متناسب با ریتم بدنی (${ans.chronotype || 'صبحگاهی'}) بین ساعت ${wake} تا ${sleep}.`,
      `۲. سبک کارکرد: ${ans.planningStyle || 'ساختاریافته'} با فواصل تمرکز ${ans.focusSpan || 'پومودورو'}.`,
      `۳. لحن رفتار: ${ans.aiTone || 'دوستانه و حامی'} همراه با بهره‌گیری از تیکه کلام‌ها.`,
      `۴. مدیریت استرس و انعطاف: ${ans.resilienceStyle || 'منعطف و آرامش‌بخش'}.`
    ].join('\n');
    return of(guidelines).pipe(delay(100));
  }

  setupProfile(payload: ProfileSetupPayload): Observable<UserProfile> {
    const existing = this.getStoredProfile();
    const answers = payload.lifestyle_answers || existing?.psychology_profile || {};
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
      xp: existing?.xp ?? 0,
      streak_days: existing?.streak_days ?? 0,
      last_streak_date: existing?.last_streak_date,
      previous_streak_date: existing?.previous_streak_date,
      created_at: existing?.created_at || new Date().toISOString(),
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

  parsePersianTaskText(rawText: string): {
    title: string;
    time: string;
    duration: number;
    priority: TaskPriority;
    category: TaskCategory;
    icon: TaskIcon;
    timeMatched: boolean;
  } {
    const normalized = this.normalizePersianDigits(rawText);
    const textLower = normalized.toLowerCase();

    // 1. Time Extraction
    let scheduledTime = '12:00';
    let timeMatched = false;
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const isNight = /(?<![\p{L}\p{N}])(?:عصر|بعدازظهر|شب|غروب|شام)(?![\p{L}\p{N}])/u.test(textLower);
    const isHalf = /(?<![\p{L}\p{N}])(?:نیم|و\s*نیم)(?![\p{L}\p{N}])/u.test(textLower);

    // 1.1 Match "HH:MM" e.g. "14:30", "ساعت 14:30"
    const mColon = textLower.match(/(?:ساعت\s*)?(\d{1,2}):(\d{1,2})/);
    if (mColon) {
      let h = parseInt(mColon[1], 10);
      const m = parseInt(mColon[2], 10);
      if (isNight && h >= 1 && h <= 11) h += 12;
      scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, m)).padStart(2, '0')}`;
      timeMatched = true;
    } else {
      // 1.2 Match single hour with explicit "ساعت" prefix or explicit time-of-day suffix
      const singleHourRegex = /(?:ساعت\s+)(\d{1,2})(?![\d\p{L}])|(?<![\d\p{L}])(\d{1,2})\s+(?=صبح|عصر|شب|بعدازظهر|ظهر)/u;
      const mSingle = textLower.match(singleHourRegex);
      if (mSingle) {
        let h = parseInt(mSingle[1] || mSingle[2], 10);
        if (isNight && h >= 1 && h <= 11) h += 12;
        const m = isHalf ? 30 : 0;
        scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        timeMatched = true;
      } else {
        // 1.3 Persian word numbers
        // Order by length descending so longer compound words match before short prefixes
        const hourWords: [string, number][] = [
          ['دوازده', 12], ['یازده', 11], ['شانزده', 16], ['هفده', 17],
          ['هجده', 18], ['بیست', 20], ['چهار', 4], ['هشت', 8],
          ['هفت', 7], ['پنج', 5], ['شش', 6], ['سه', 3],
          ['دو', 2], ['ده', 10], ['نه', 9], ['یک', 1]
        ];

        // Explicit "ساعت <word>" e.g. "ساعت سه", "ساعت ده"
        const prefixRegex = /(?:ساعت\s+)(دوازده|یازده|شانزده|هفده|هجده|بیست|چهار|هشت|هفت|پنج|شش|سه|دو|ده|نه|یک)(?![\p{L}\p{N}\u200C])/u;
        const mPrefix = textLower.match(prefixRegex);

        if (mPrefix) {
          const matchedWord = mPrefix[1];
          const entry = hourWords.find(([w]) => w === matchedWord);
          if (entry) {
            let h = entry[1];
            if (isNight && h >= 1 && h <= 11) h += 12;
            const m = isHalf ? 30 : 0;
            scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            timeMatched = true;
          }
        } else {
          // Standalone word WITH time modifier (e.g. "ده صبح", "سه و نیم", "پنج عصر")
          // Exclude weekdays (e.g. "یکشنبه", "سه‌شنبه") and food/words like "نهار", "بنده"
          for (const [w, val] of hourWords) {
            const standaloneWithSuffix = new RegExp(
              `(?<![\\p{L}\\p{N}\\u200C])${w}(?!\\s*\\u200C?شنبه)(?:\\s+(?:و\\s*نیم|صبح|عصر|شب|بعدازظهر|ظهر))(?![\\p{L}\\p{N}\\u200C])`,
              'u'
            );
            if (standaloneWithSuffix.test(textLower)) {
              let h = val;
              if (isNight && h >= 1 && h <= 11) h += 12;
              const m = isHalf ? 30 : 0;
              scheduledTime = `${String(Math.min(23, h)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              timeMatched = true;
              break;
            }
          }
        }
      }
    }

    if (!timeMatched && scheduledTime === '12:00' && !textLower.includes('۱۲') && !textLower.includes('دوازده')) {
      scheduledTime = defaultTime;
    }

    // 2. Duration Extraction
    let duration = 45;
    if (/(?<![\p{L}\p{N}])یک\s*ساعت(?![\p{L}\p{N}])/u.test(textLower)) duration = 60;
    else if (/(?<![\p{L}\p{N}])دو\s*ساعت(?![\p{L}\p{N}])/u.test(textLower)) duration = 120;
    else if (/(?<![\p{L}\p{N}])نیم\s*ساعت(?![\p{L}\p{N}])/u.test(textLower)) duration = 30;
    else if (/(\d+)\s*دقیقه/u.test(textLower)) {
      const matchDur = textLower.match(/(\d+)\s*دقیقه/u);
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
      .replace(/ساعت\s*\d{1,2}(?::\d{1,2})?/gu, '')
      .replace(/(?:ساعت\s+)(?:دوازده|یازده|شانزده|هفده|هجده|بیست|چهار|هشت|هفت|پنج|شش|سه|دو|ده|نه|یک)(?![\p{L}\p{N}\u200C])/gu, '')
      .replace(/(?<![\p{L}\p{N}\u200C])(?:دوازده|یازده|شانزده|هفده|هجده|بیست|چهار|هشت|هفت|پنج|شش|سه|دو|ده|نه|یک)(?!\s*\u200C?شنبه)(?:\s+(?:و\s*نیم|صبح|عصر|شب|بعدازظهر|ظهر))(?![\\p{L}\\p{N}\\u200C])/gu, '')
      .replace(/(?<![\p{L}\p{N}])(?:بعدازظهر|صبح|شب|عصر|غروب|نیم|دقیقه)(?![\p{L}\p{N}])/gu, '')
      .replace(/(?<![\p{L}\p{N}])به\s*مدت(?![\p{L}\p{N}])/gu, '')
      .replace(/(?<![\p{L}\p{N}])(?:میخوام|می‌خوام|باید|برم|دارم|انجام بدم|ست کن|بذار|تنظیم کن)(?![\p{L}\p{N}])/gu, '')
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
      timeMatched,
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
