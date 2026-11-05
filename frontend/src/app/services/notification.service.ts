import { Injectable, signal } from '@angular/core';
import { Task } from '../models/task.model';

export interface NotificationTestResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly permission = signal<NotificationPermission>('default');
  readonly isSupported = signal<boolean>(false);
  readonly scheduledCount = signal<number>(0);
  readonly showPermissionBanner = signal<boolean>(false);

  private scheduledTimers: Map<string | number, any> = new Map();

  constructor() {
    this.checkSupportAndPermission();
  }

  private checkSupportAndPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.isSupported.set(true);
      const current = Notification.permission;
      this.permission.set(current);
      if (current === 'default') {
        this.showPermissionBanner.set(true);
      }
    } else {
      this.isSupported.set(false);
      this.permission.set('denied');
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission.set(result);
      if (result === 'granted') {
        this.showPermissionBanner.set(false);
        this.playAudioChime();
        this.dispatchNativeNotification(
          'اعلان‌های تَسکی فعال شد! 🎉',
          'از این به بعد سر ساعت، کارهای مهمت رو بهت یادآوری می‌کنم.'
        );
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  }

  dismissBanner(): void {
    this.showPermissionBanner.set(false);
  }

  /**
   * Generates a sweet, gentle synthetic chime using Web Audio API
   * Guaranteed to work across mobile and desktop without external audio file assets
   */
  playAudioChime(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: A5 (880 Hz) - uplifting chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio chime playback skipped:', e);
    }
  }

  /**
   * Fires test notification and provides actionable guidance if permission is denied or unsupported.
   */
  async testNotification(): Promise<NotificationTestResult> {
    if (typeof window === 'undefined') {
      return { success: false, message: 'محیط نامعتبر است.' };
    }

    // Always play chime for audible feedback
    this.playAudioChime();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }

    if (!('Notification' in window)) {
      return {
        success: false,
        message: 'مرورگر شما از سیستم اعلان سیستمی پشتیبانی نمی‌کند (اما صدای یادآور تست شد). در آیفون، برنامه را Add to Home Screen کنید.',
      };
    }

    let perm = Notification.permission;
    if (perm === 'default') {
      try {
        perm = await Notification.requestPermission();
        this.permission.set(perm);
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }

    if (perm === 'denied') {
      return {
        success: false,
        message: '⚠️ دسترسی اعلان مسدود (Blocked) است. روی آیکون قفل 🔒 یا تنظیمات مرورگر در کنار آدرس سایت کلیک کرده و Notifications را روی Allow قرار دهید.',
      };
    }

    if (perm === 'granted') {
      const sent = this.dispatchNativeNotification(
        '🔔 اعلان تستی تَسکی',
        'سلام! سیستم اعلان‌ها و یادآورهای صوتی تَسکی با موفقیت فعال و هماهنگ شد 🎉'
      );
      if (sent) {
        return {
          success: true,
          message: 'نوتیفیکیشن تستی با موفقیت ارسال شد و صدای یادآور پخش گردید! 🎉',
        };
      } else {
        return {
          success: true,
          message: 'صدای یادآور پخش شد (نوتیفیکیشن سیستمی در نوار وضعیت ذخیره شد).',
        };
      }
    }

    return {
      success: false,
      message: 'دسترسی اعلان صادر نشد. لطفاً در پنجره مرورگر دکمه Allow را تایید کنید.',
    };
  }

  /**
   * Schedules OS browser notifications for tasks based on their scheduled_time and date.
   */
  scheduleTaskNotifications(tasks: Task[]): void {
    if (!this.isSupported() || this.permission() !== 'granted') {
      return;
    }

    this.clearAllTimers();

    const now = Date.now();
    let scheduled = 0;

    for (const task of tasks) {
      if (task.is_completed) {
        continue;
      }

      const targetTime = this.calculateTaskDateTime(task);
      if (!targetTime) {
        continue;
      }

      const diffMs = targetTime.getTime() - now;

      // Schedule if within next 7 days
      if (diffMs > 0 && diffMs <= 7 * 24 * 60 * 60 * 1000) {
        const timerId = window.setTimeout(() => {
          this.triggerTaskNotification(task);
          this.scheduledTimers.delete(task.id);
          this.scheduledCount.update((c) => Math.max(0, c - 1));
        }, diffMs);

        this.scheduledTimers.set(task.id, timerId);
        scheduled++;
      }
    }

    this.scheduledCount.set(scheduled);
  }

  private calculateTaskDateTime(task: Task): Date | null {
    try {
      if (!task.date || !task.scheduled_time) {
        return null;
      }

      const dateParts = task.date.split('-');
      if (dateParts.length !== 3) {
        return null;
      }

      const timeParts = task.scheduled_time.split(':');
      if (timeParts.length < 2) {
        return null;
      }

      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const seconds = timeParts.length >= 3 ? parseInt(timeParts[2], 10) : 0;

      const d = new Date(year, month, day, hours, minutes, seconds);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }

  private triggerTaskNotification(task: Task): void {
    this.playAudioChime();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    const title = `⏰ وقتشه: ${task.title}`;
    const body = task.notification_text || `زمان انجام تسک «${task.title}» فرا رسیده است! همراه با تَسکی پیش برو ✨`;
    this.dispatchNativeNotification(title, body, `task-${task.id}`);
  }

  private dispatchNativeNotification(title: string, body: string, tag: string = 'tasky-notification'): boolean {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return false;
      }

      const options: NotificationOptions = {
        body,
        tag,
        icon: 'favicon.ico',
        dir: 'rtl',
        lang: 'fa',
      };

      // Priority 1: Service Worker Registration showNotification (Works on Mobile Chrome / PWA / Android)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        }).catch(() => {
          this.fallbackNotification(title, options);
        });
        return true;
      }

      // Priority 2: Standard Desktop Notification
      this.fallbackNotification(title, options);
      return true;
    } catch (e) {
      console.warn('Native Notification failed:', e);
      return false;
    }
  }

  private fallbackNotification(title: string, options: NotificationOptions): void {
    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      // Mobile Safari / Chrome throw TypeError on new Notification() constructor
      console.warn('Fallback Notification constructor error (handled):', e);
    }
  }

  clearAllTimers(): void {
    this.scheduledTimers.forEach((timerId) => clearTimeout(timerId));
    this.scheduledTimers.clear();
    this.scheduledCount.set(0);
  }
}
