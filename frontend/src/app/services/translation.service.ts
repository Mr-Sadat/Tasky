import { Injectable, signal } from '@angular/core';

export type SupportedLanguage = 'fa' | 'en';

const STORAGE_LANG_KEY = 'tasky_app_language';

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  fa: {
    // Top Bar & App Header
    'app.greeting': 'سلام',
    'app.today_rhythm': 'ریتم امروز شما',
    'app.today_focus': 'تمرکز امروز',
    'app.tasks_tab': 'تسک‌ها',
    'app.dashboard_tab': 'داشبورد',
    'app.add_task': 'افزودن',
    'app.profile_tab': 'پروفایل',

    // Quick Actions
    'tasks.voice_capture': 'ثبت صوتی',
    'tasks.live_typing': 'تایپ زنده صدا',
    'tasks.add_task': 'افزودن تسک',
    'tasks.solar_calendar': 'با تقویم شمسی',

    // Timeline
    'timeline.title': 'برنامه کارهای امروز',
    'timeline.all_title': 'همه برنامه‌ها',
    'timeline.daily_title': 'برنامه روزانه',
    'timeline.schedule_of': 'برنامه',
    'timeline.tasks_count': 'تسک',
    'timeline.done_count': 'انجام شده',
    'timeline.panic': 'روز من به هم ریخت!',
    'timeline.story': 'کارنامه روز من',
    'timeline.today': 'امروز',
    'timeline.tomorrow': 'فردا',
    'timeline.all': 'همه',
    'timeline.all_sub': 'کل تسک‌ها',
    'timeline.minutes': 'دقیقه',
    'timeline.empty_title': 'هنوز برنامه‌ای برای این تاریخ نداری!',
    'timeline.empty_sub': 'دکمه میکروفون پایین رو لمس کن و کارهایی که می‌خوای انجام بدی رو بگو تا تَسکی هوشمندانه زمان‌بندی کنه.',
    'timeline.focus': 'تمرکز',
    'timeline.more_actions': 'عملیات بیشتر',
    'timeline.move_up': 'انتقال یک ردیف بالاتر',
    'timeline.move_down': 'انتقال یک ردیف پایین‌تر',
    'timeline.add_15m': 'تمدید ۱۵ دقیقه',
    'timeline.add_30m': 'تمدید ۳۰ دقیقه',
    'timeline.to_tomorrow': 'انتقال به فردا',
    'timeline.delete': 'حذف تسک',

    // Dashboard
    'dash.mascot_online': 'تَسکی آنلاین و فعال است',
    'dash.mascot_heading': 'آماده‌ای برای جریان دادن به روزت؟',
    'dash.mascot_sub': 'در بازه اوج تمرکز و انرژی روزانه هستی',
    'dash.quick_capture_title': 'ثبت سریع با صوت',
    'dash.quick_capture_sub': 'هوش مصنوعی آماده شنیدن است',
    'dash.quick_capture_btn': 'شروع صحبت',
    'dash.your_day': 'روز شما',
    'dash.rhythm': 'ریتم امروز',
    'dash.see_all': 'مشاهده همه',
    'dash.close_list': 'بستن لیست',
    'dash.today_focus': 'تمرکز امروز',
    'dash.focus_sub': 'شتابت رو حفظ کن، نزدیک شدی.',
    'dash.focus_tasks': '۳ کانون تمرکز',
    'dash.voice_drafts': 'پیش‌نویس‌های صوتی',
    'dash.voice_drafts_sub': 'آماده بررسی',
    'dash.energy_level': 'سطح انرژی',
    'dash.energy_great': 'عالی',
    'dash.habits_info': 'عادت‌ها و پایداری',
    'dash.habits_done': '۵ از ۶ انجام شد',
    'dash.quick_tools': 'ابزارهای سریع داشبورد',
    'dash.share_recap': 'کارنامه و اشتراک',
    'dash.share_sub': 'استوری، واتساپ، تلگرام',
    'dash.backup': 'دانلود پشتیبان',
    'dash.backup_sub': 'خروجی فایل JSON',
    'dash.restore': 'بازیابی اطلاعات',
    'dash.restore_sub': 'ورودی فایل JSON',
    'dash.pwa': 'آموزش نصب PWA',
    'dash.pwa_sub': 'راهنمای نصب گوشی',

    // Profile View
    'profile.title': 'پروفایل',
    'profile.your_space': 'فضای کاربری',
    'profile.edit': 'ویرایش',
    'profile.change_avatar': 'تغییر چهره',
    'profile.level': 'سطح',
    'profile.flow_master': 'استاد تمرکز',
    'profile.tasks_done': 'کارهای انجام‌شده',
    'profile.voice_memos': 'یادداشت صوتی',
    'profile.day_streak': 'روز استمرار',
    'profile.personalize': 'شخصی‌سازی',
    'profile.focus_interests': 'تمرکز و علایق من',
    'profile.manage': 'مدیریت',
    'interest.coding': 'کدنویسی',
    'interest.fitness': 'تناسب اندام',
    'interest.study': 'مطالعه',
    'interest.creative': 'خلاقیت',
    'interest.mindfulness': 'ذهن‌آگاهی',
    'profile.experience': 'تجربه کاربری',
    'profile.app_atmosphere': 'فضای اپلیکیشن',
    'profile.app_atmosphere_sub': 'تنظیم حس‌وحال و ظاهر برنامه',
    'theme.dark_neon': 'دارک نئون',
    'theme.cyber_sunset': 'غروب سایبری',
    'theme.light': 'تم روشن',
    'profile.ai_personality': 'شخصیت هوش مصنوعی',
    'profile.voice_nudges': 'یادآورهای صوتی',
    'profile.voice_nudges_sub': 'یادآوری صوتی ملایم هنگام کاهش تمرکز',

    // Navigation Dock
    'nav.tasks': 'تسک‌ها',
    'nav.dashboard': 'داشبورد',
    'nav.add': 'افزودن',
    'nav.profile': 'پروفایل',

    // Add Task Modal
    'modal.add_title': 'افزودن تسک و برنامه جدید',
    'modal.add_sub': 'مشخصات، زمان دقیق و دسته‌بندی کار خود را وارد کنید',
    'modal.title_label': 'عنوان یا متن تسک',
    'modal.title_placeholder': 'مثلاً: جلسه بازبینی طراحی اپلیکیشن یا مطالعه...',
    'modal.date_label': 'تاریخ (تقویم شمسی)',
    'modal.from_calendar': '📅 انتخاب از تقویم',
    'modal.today': 'امروز',
    'modal.tomorrow': 'فردا',
    'modal.time_label': 'ساعت انجام کار',
    'modal.duration_label': 'مدت زمان تقریبی',
    'modal.category_label': 'دسته‌بندی تسک',
    'modal.custom_category': '+ دسته جدید',
    'modal.priority_label': 'اولویت انجام',
    'modal.urgent': 'فوری و مهم',
    'modal.medium': 'متوسط',
    'modal.normal': 'عادی',
    'modal.notification_label': 'اعلان و یادآوری صوتی',
    'modal.notification_sub': 'یادآوری قبل از ساعت مقرر ارسال خواهد شد',
    'modal.cancel': 'انصراف',
    'modal.submit': 'افزودن به برنامه',
    'modal.new_cat_name': 'نام دسته‌بندی جدید',
    'modal.save_cat': 'ذخیره دسته',

    // Categories
    'cat.work': 'کاری',
    'cat.study': 'مطالعه',
    'cat.fitness': 'ورزش',
    'cat.health': 'سلامت',
    'cat.shopping': 'خرید',
    'cat.personal': 'شخصی',
    'cat.rest': 'استراحت',

    // Voice Modal
    'voice.listening': 'در حال شنیدن و تایپ زنده...',
    'voice.paused': 'متوقف شده',
    'voice.prompt': 'صحبت کنید، همزمان تایپ می‌شود...',
    'voice.box_label': 'متن صدا و تایپ همزمان',
    'voice.box_placeholder': 'صحبت کنید تا کلمات در این کادر تایپ شوند (یا خودتان اینجا بنویسید)...',
    'voice.tasks_preview': 'پیش‌نمایش تسک‌های استخراج‌شده',
    'voice.save': 'ثبت برنامه',
  },
  en: {
    // Top Bar & App Header
    'app.greeting': 'Hi',
    'app.today_rhythm': "Today's Rhythm",
    'app.today_focus': "Today's Focus",
    'app.tasks_tab': 'Tasks',
    'app.dashboard_tab': 'Dashboard',
    'app.add_task': 'Add',
    'app.profile_tab': 'Profile',

    // Quick Actions
    'tasks.voice_capture': 'Voice Capture',
    'tasks.live_typing': 'Live Speech Typing',
    'tasks.add_task': 'Add Task',
    'tasks.solar_calendar': 'Solar Calendar',

    // Timeline
    'timeline.title': "Today's Schedule",
    'timeline.all_title': 'All Tasks',
    'timeline.daily_title': 'Daily Schedule',
    'timeline.schedule_of': 'Schedule for',
    'timeline.tasks_count': 'Tasks',
    'timeline.done_count': 'Done',
    'timeline.panic': 'Day Off Track!',
    'timeline.story': 'Daily Story',
    'timeline.today': 'Today',
    'timeline.tomorrow': 'Tomorrow',
    'timeline.all': 'All',
    'timeline.all_sub': 'All Tasks',
    'timeline.minutes': 'min',
    'timeline.empty_title': 'No tasks scheduled for this date yet!',
    'timeline.empty_sub': 'Tap the microphone below and speak your tasks to have Tasky schedule them intelligently.',
    'timeline.focus': 'Focus',
    'timeline.more_actions': 'More actions',
    'timeline.move_up': 'Move up one row',
    'timeline.move_down': 'Move down one row',
    'timeline.add_15m': '+15 min extension',
    'timeline.add_30m': '+30 min extension',
    'timeline.to_tomorrow': 'Move to tomorrow',
    'timeline.delete': 'Delete task',

    // Dashboard
    'dash.mascot_online': 'Tasky is online',
    'dash.mascot_heading': 'Ready to make today flow?',
    'dash.mascot_sub': "You're in a high-energy window",
    'dash.quick_capture_title': 'Quick Voice Capture',
    'dash.quick_capture_sub': 'AI is ready to listen',
    'dash.quick_capture_btn': 'Tap to talk',
    'dash.your_day': 'Your Day',
    'dash.rhythm': "Today's Rhythm",
    'dash.see_all': 'See all',
    'dash.close_list': 'Collapse',
    'dash.today_focus': "Today's Focus",
    'dash.focus_sub': 'Keep the momentum, you are almost there.',
    'dash.focus_tasks': '3 Focus Tasks',
    'dash.voice_drafts': 'Voice Drafts',
    'dash.voice_drafts_sub': 'Ready to review',
    'dash.energy_level': 'Energy',
    'dash.energy_great': 'Great',
    'dash.habits_info': 'Habits & Energy',
    'dash.habits_done': '5/6 done',
    'dash.quick_tools': 'Quick Dashboard Tools',
    'dash.share_recap': 'Recap & Share',
    'dash.share_sub': 'Story, WhatsApp, Telegram',
    'dash.backup': 'Backup JSON',
    'dash.backup_sub': 'Export JSON File',
    'dash.restore': 'Restore Data',
    'dash.restore_sub': 'Import JSON File',
    'dash.pwa': 'Install PWA',
    'dash.pwa_sub': 'Mobile Setup Guide',

    // Profile View
    'profile.title': 'Profile',
    'profile.your_space': 'Your Space',
    'profile.edit': 'Edit',
    'profile.change_avatar': 'Change Avatar',
    'profile.level': 'Level',
    'profile.flow_master': 'Flow Master',
    'profile.tasks_done': 'Tasks Done',
    'profile.voice_memos': 'Voice Memos',
    'profile.day_streak': 'Day Streak',
    'profile.personalize': 'Personalize',
    'profile.focus_interests': 'My Focus & Interests',
    'profile.manage': 'Manage',
    'interest.coding': 'Coding',
    'interest.fitness': 'Fitness',
    'interest.study': 'Study',
    'interest.creative': 'Creative',
    'interest.mindfulness': 'Mindfulness',
    'profile.experience': 'Experience',
    'profile.app_atmosphere': 'App Atmosphere',
    'profile.app_atmosphere_sub': 'Match your current vibe',
    'theme.dark_neon': 'Dark Neon',
    'theme.cyber_sunset': 'Cyber Sunset',
    'theme.light': 'Light Theme',
    'profile.ai_personality': 'AI Personality',
    'profile.voice_nudges': 'Voice Nudges',
    'profile.voice_nudges_sub': 'Gentle reminders when you drift',

    // Navigation Dock
    'nav.tasks': 'Tasks',
    'nav.dashboard': 'Dashboard',
    'nav.add': 'Add',
    'nav.profile': 'Profile',

    // Add Task Modal
    'modal.add_title': 'Add New Task',
    'modal.add_sub': 'Set task details, precise time and category',
    'modal.title_label': 'Task Title',
    'modal.title_placeholder': 'e.g. Design review meeting, gym workout...',
    'modal.date_label': 'Date (Solar Calendar)',
    'modal.from_calendar': '📅 Pick from calendar',
    'modal.today': 'Today',
    'modal.tomorrow': 'Tomorrow',
    'modal.time_label': 'Scheduled Time',
    'modal.duration_label': 'Estimated Duration',
    'modal.category_label': 'Category',
    'modal.custom_category': '+ New Category',
    'modal.priority_label': 'Priority',
    'modal.urgent': 'Urgent & High',
    'modal.medium': 'Medium',
    'modal.normal': 'Normal',
    'modal.notification_label': 'Voice & Push Notification',
    'modal.notification_sub': 'Reminder will trigger before scheduled time',
    'modal.cancel': 'Cancel',
    'modal.submit': 'Add to Schedule',
    'modal.new_cat_name': 'New category name',
    'modal.save_cat': 'Save Category',

    // Categories
    'cat.work': 'Work',
    'cat.study': 'Study',
    'cat.fitness': 'Fitness',
    'cat.health': 'Health',
    'cat.shopping': 'Shopping',
    'cat.personal': 'Personal',
    'cat.rest': 'Rest',

    // Voice Modal
    'voice.listening': 'Listening & Live Typing...',
    'voice.paused': 'Paused',
    'voice.prompt': 'Speak, words will be typed live...',
    'voice.box_label': 'Live Voice Transcript',
    'voice.box_placeholder': 'Speak to see words typed here live (or type directly)...',
    'voice.tasks_preview': 'Extracted Tasks Preview',
    'voice.save': 'Save Schedule',
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
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    if (document.body) {
      document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    }
  }

  t(key: string): string {
    const lang = this.currentLang();
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.fa[key] || key;
  }
}
