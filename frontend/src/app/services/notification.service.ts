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

  private scheduledTimers: Map<number, number> = new Map();

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
   * Fires test notification and provides actionable feedback if permission is denied or unsupported.
   */
  async testNotification(): Promise<NotificationTestResult> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        success: false,
        message: 'مرورگر شما از Notification API سیستمی پشتیبانی نمی‌کند.',
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
        message: '⚠️ دسترسی اعلان در مرورگر مسدود (Blocked) است. روی آیکون قفل 🔒 در کنار آدرس سایت کلیک کرده و Notifications را روی Allow قرار دهید.',
      };
    }

    if (perm === 'granted') {
      const sent = this.dispatchNativeNotification(
        'تست اعلان تسکی',
        'سلام! سیستم اعلان‌های تسکی با موفقیت فعال شد 🎉'
      );
      if (sent) {
        return {
          success: true,
          message: 'نوتیفیکیشن تست با موفقیت به سیستم شما ارسال شد! 🎉',
        };
      } else {
        return {
          success: false,
          message: 'خطا در ارسال نوتیفیکیشن دسکتاپ.',
        };
      }
    }

    return {
      success: false,
      message: 'دسترسی اعلان صادر نشد.',
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
    const title = `⏰ وقتشه: ${task.title}`;
    const body = task.notification_text || `زمان انجام تسک "${task.title}" فرا رسیده است! همراه با تَسکی پیش برو.`;
    this.dispatchNativeNotification(title, body, `task-${task.id}`);
  }

  private dispatchNativeNotification(title: string, body: string, tag: string = 'tasky-notification'): boolean {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          tag,
          icon: '/favicon.ico',
          dir: 'rtl',
          lang: 'fa',
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return true;
      }
      return false;
    } catch (e) {
      console.warn('Native Notification failed:', e);
      return false;
    }
  }

  clearAllTimers(): void {
    this.scheduledTimers.forEach((timerId) => clearTimeout(timerId));
    this.scheduledTimers.clear();
    this.scheduledCount.set(0);
  }
}
