import { Injectable, signal } from '@angular/core';

export type SupportedLanguage = 'fa' | 'en';

const STORAGE_LANG_KEY = 'tasky_app_language';

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  fa: {
    'app.greeting': 'سلام',
    'app.today_rhythm': 'ریتم امروز شما',
    'app.today_focus': 'تمرکز امروز',
    'app.tasks_tab': 'تسک‌ها',
    'app.dashboard_tab': 'داشبورد',
    'app.add_task': 'افزودن',
    'app.profile_tab': 'پروفایل',
    'app.quick_capture': 'ثبت سریع با صوت',
    'app.quick_capture_sub': 'تَسکی آماده شنیدن صدای شماست',
    'app.voice_drafts': 'پیش‌نویس‌های صوتی',
    'app.voice_drafts_sub': 'آماده بررسی و ثبت',
    'app.energy_level': 'سطح انرژی',
    'app.energy_great': 'عالی',
    'app.habits_stat': '۵ از ۶ انجام شد',
    'app.streak': 'روز استمرار',
    'app.tasks_done': 'کارهای انجام‌شده',
    'app.voice_memos': 'یادداشت صوتی',
    'app.app_atmosphere': 'فضای اپلیکیشن',
    'app.dark_neon': 'دارک نئون',
    'app.cyber_sunset': 'غروب سایبری',
    'app.light': 'تم روشن',
    'app.ai_personality': 'شخصیت هوش مصنوعی',
    'app.voice_nudges': 'یادآورهای صوتی',
    'app.backup_json': 'دانلود پشتیبان',
    'app.restore_json': 'بازیابی اطلاعات',
    'app.share_story': 'کارنامه و اشتراک',
    'app.pwa_tutorial': 'آموزش نصب PWA',
    'app.level_badge': 'استاد تمرکز',
    'app.level': 'سطح',
    'app.my_interests': 'تمرکز و علایق من',
    'app.manage': 'مدیریت',
    'app.edit': 'ویرایش',
    'app.your_space': 'فضای کاربری',
    'app.save': 'ذخیره',
    'app.cancel': 'انصراف',
    'app.add_new_task': 'افزودن تسک جدید',
    'app.task_title': 'عنوان کار یا تسک',
    'app.task_category': 'دسته‌بندی',
    'app.task_priority': 'اولویت',
    'app.task_time': 'زمان و ساعت',
    'app.task_date': 'تاریخ شمسی',
    'app.task_duration': 'مدت تخمینی'
  },
  en: {
    'app.greeting': 'Hi',
    'app.today_rhythm': "Today's Rhythm",
    'app.today_focus': "Today's Focus",
    'app.tasks_tab': 'Tasks',
    'app.dashboard_tab': 'Dashboard',
    'app.add_task': 'Add Task',
    'app.profile_tab': 'Profile',
    'app.quick_capture': 'Quick Voice Capture',
    'app.quick_capture_sub': 'Tasky is ready to listen',
    'app.voice_drafts': 'Voice Drafts',
    'app.voice_drafts_sub': 'Ready to review',
    'app.energy_level': 'Energy Level',
    'app.energy_great': 'Great',
    'app.habits_stat': '5 of 6 done',
    'app.streak': 'Day streak',
    'app.tasks_done': 'Tasks done',
    'app.voice_memos': 'Voice memos',
    'app.app_atmosphere': 'App Atmosphere',
    'app.dark_neon': 'Dark Neon',
    'app.cyber_sunset': 'Cyber Sunset',
    'app.light': 'Light Theme',
    'app.ai_personality': 'AI Personality',
    'app.voice_nudges': 'Voice Nudges',
    'app.backup_json': 'Backup JSON',
    'app.restore_json': 'Restore JSON',
    'app.share_story': 'Share Story',
    'app.pwa_tutorial': 'Install PWA',
    'app.level_badge': 'Flow Master',
    'app.level': 'Level',
    'app.my_interests': 'My Focus & Interests',
    'app.manage': 'Manage',
    'app.edit': 'Edit',
    'app.your_space': 'Your Space',
    'app.save': 'Save',
    'app.cancel': 'Cancel',
    'app.add_new_task': 'Add New Task',
    'app.task_title': 'Task Title',
    'app.task_category': 'Category',
    'app.task_priority': 'Priority',
    'app.task_time': 'Time',
    'app.task_date': 'Solar Date',
    'app.task_duration': 'Estimated Duration'
  }
};

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  readonly currentLang = signal<SupportedLanguage>('fa');

  constructor() {
    this.initLanguage();
  }

  private initLanguage(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY) as SupportedLanguage | null;
      if (saved === 'en' || saved === 'fa') {
        this.currentLang.set(saved);
        this.applyDomLang(saved);
      } else {
        this.currentLang.set('fa');
        this.applyDomLang('fa');
      }
    } catch {
      this.currentLang.set('fa');
    }
  }

  setLanguage(lang: SupportedLanguage): void {
    this.currentLang.set(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LANG_KEY, lang);
      } catch {}
    }
    this.applyDomLang(lang);
  }

  toggleLanguage(): void {
    const next = this.currentLang() === 'fa' ? 'en' : 'fa';
    this.setLanguage(next);
  }

  private applyDomLang(lang: SupportedLanguage): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
  }

  t(key: string): string {
    const lang = this.currentLang();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fa[key] || key;
  }
}
