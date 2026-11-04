# AGENT_RULES.md - Tasky Project Master Blueprint

## ۱. مرور پروژه و معماری کلی
- **نام پروژه:** تسکی (Tasky) - برنامه‌ریز هوشمند روزانه با رابط کاربری مینیمال، آواتار پویا و تعامل صوتی
- **معماری:** Pure Angular Standalone Components با Signals، TailwindCSS و چیدمان ۱۰۰٪ راست‌چین (RTL) بدون هیچ‌گونه وابستگی به سرور بک‌اند (Backend-Free / Local-First).
- **ذخیره‌سازی و پایداری:** ذخیره‌سازی محلی در مرورگر (`localStorage` با `schemaVersion` و پشتیبانی از خروجی/ورودی فایل JSON) جهت حفظ کامل حریم خصوصی و امنیت داده‌های کاربر.
- **تبدیل تقویم:** کتابخانه مستقل و دقیق ریاضی تقویم جلالی (بدون کتابخانه‌های حجیم بیرونی) با اصلاح کامل محاسبات منطقه زمانی محلی (UTC+3:30 ایران).
- **پورت توسعه محلی:** `http://localhost:4200`
- **فرآیند استقرار (CI/CD):** استقرار خودکار بر روی GitHub Pages از طریق GitHub Actions (`.github/workflows/deploy.yml`) و Vercel.

---

## ۲. استانداردهای کدنویسی و قوانین کلیدی
1. **زبان فارسی و تراز راست (RTL Mandatory):** تمام ارتباطات با کاربر، متون UI، پیام‌های آواتار و خروجی‌ها باید راست‌چین (`dir="rtl"`) و با لحن محترمانه و صمیمی فارسی باشند.
2. **شفافیت منطقی (Honest Heuristics & Local Intelligence):** تمام پردازش‌های صوتی و متنی، زمان‌بندی و تفکیک تسک‌ها به‌صورت محلی (Local Heuristic Engine) با اتکا بر ریتم بیولوژیکی (Chronotype)، زمان بیداری/خواب و سبک تمرکز کاربر انجام می‌شود. ادعای نادرست هوش مصنوعی ابری ممنوع است و پردازش‌ها ۱۰۰٪ محلی و بدون خروج داده هستند (با امکان اختیاری اتصال به پروکسی اختصاصی LLM برای کاربرانی که کلید اختصاصی وارد کنند).
3. **عدم تکرار کد (DRY):** اجزای اشتراکی (مانند ویرایشگر تنظیمات آواتار `AvatarEditorComponent` و توابع تاریخ جلالی `jalali.ts`) در کامپوننت‌های مستقل پیاده‌سازی شده و در ویزارد، استودیو و پروفایل بازاستفاده می‌شوند.
4. **تست خودکار و پوشش رگرسیون:** تمامی توابع تبدیل تقویم، پارسر متنی زبان فارسی، سیستم استریک و الگوریتم‌های زمان‌بندی بحرانی باید دارای تست‌های واحد در Vitest باشند (`npm test`).

---

## ۳. قرارداد ساختار داده‌ها (Data Contracts)

### تسک (`Task`):
```typescript
export interface Task {
  id: string | number;
  title: string;
  scheduled_time: string; // "HH:MM"
  duration_minutes: number;
  priority: 'high' | 'medium' | 'low';
  category: 'work' | 'study' | 'fitness' | 'health' | 'shopping' | 'personal' | 'rest';
  icon: 'briefcase' | 'book' | 'dumbbell' | 'heart' | 'cart' | 'star' | 'coffee' | 'moon' | 'sun';
  notification_text?: string;
  is_completed: boolean;
  date: string; // Local ISO: "YYYY-MM-DD"
  jalali_date?: string;
  jalali_display?: string;
  jalali_day_name?: string;
  created_at?: string;
}
```

### پروفایل کاربر (`UserProfile`):
```typescript
export interface UserProfile {
  name: string;
  wake_time: string;
  sleep_time: string;
  avatar_config?: AvatarCustomization;
  ai_guidelines?: string;
  catchphrases?: string[];
  occasions?: SpecialOccasion[];
  psychology_profile?: {
    chronotype?: 'morning' | 'afternoon' | 'night';
    planningStyle?: string;
    focusSpan?: 'pomodoro' | 'deep_work' | 'short_sprints';
    resilienceStyle?: 'compress_focus' | 'panic_defer';
    [key: string]: any;
  };
  xp?: number;
  streak_days?: number;
  last_streak_date?: string;
  previous_streak_date?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

## ۴. وضعیت و گزارش پیشرفت فازها
- [x] پیاده‌سازی رابط کاربری Angular Standalone با Signals و TailwindCSS
- [x] تبدیل کامل تقویم جلالی و تطبیق منطقه زمانی محلی (UTC+3:30)
- [x] موتور هوشمند تحلیل متن فارسی و زمان‌بندی متناسب با ریتم بدنی (Chronotype)
- [x] آواتار SVG تعاملی با تغییر حالات احساسی (Idle, Happy, Supportive, Thinking)
- [x] مدیریت مناسبت‌های ملی و شخصی در زمان نمایش (Computed Display)
- [x] سیستم امتیازدهی XP و استریک روزانه بدون باگ تکرار
- [x] پشتیبان‌گیری و بازیابی محلی داده‌ها (JSON Export/Import با Schema Version)
- [x] ماژولارکردن ویرایشگر آواتار و دسترسی‌پذیری مودال‌ها (Escape & Focus Trap)
- [x] استقرار خودکار با GitHub Actions بر روی GitHub Pages
