import { SpecialOccasion, Task } from '../models/task.model';
import { getTodayIso, getJalaliDateStr, getJalaliDisplayStr, getJalaliDayNameStr } from './jalali';

const STORAGE_OCCASIONS_KEY = 'tasky_occasions_calendar';

/**
 * Built-in dataset of significant Iranian and international holidays and occasions.
 * Represented in Jalali month-day format ('MM-DD') or fixed events.
 */
export const BUILTIN_OCCASIONS: SpecialOccasion[] = [
  // فروردین
  { id: 'norooz_1', title: 'عید نوروز و آغاز سال نو', date: '01-01', type: 'official', icon: '🌸', description: 'جشن باستانی فروردین و سال نو خورشیدی' },
  { id: 'norooz_2', title: 'عید نوروز (روز دوم)', date: '01-02', type: 'official', icon: '🌱' },
  { id: 'norooz_3', title: 'عید نوروز (روز سوم)', date: '01-03', type: 'official', icon: '🌱' },
  { id: 'norooz_4', title: 'عید نوروز (روز چهارم)', date: '01-04', type: 'official', icon: '🌱' },
  { id: 'nature_day', title: 'روز طبیعت (سیزده‌بدر)', date: '01-13', type: 'official', icon: '🌿', description: 'گشت‌وگذار در دامن طبیعت' },

  // اردیبهشت
  { id: 'earth_day', title: 'روز جهانی زمین پاک', date: '02-02', type: 'official', icon: '🌍' },
  { id: 'labor_day', title: 'روز جهانی کار و کارگر', date: '02-11', type: 'official', icon: '🛠️' },
  { id: 'teacher_day', title: 'روز معلم و استاد', date: '02-12', type: 'official', icon: '📚', description: 'قدردانی از معلمان و اساتید دلسوز' },

  // خرداد تا شهریور
  { id: 'doctor_day', title: 'روز پزشک (بزرگداشت ابوعلی سینا)', date: '06-01', type: 'official', icon: '🩺' },
  { id: 'pharmacist_day', title: 'روز داروساز (بزرگداشت زکریای رازی)', date: '06-05', type: 'official', icon: '💊' },
  { id: 'cinema_day', title: 'روز ملی سینما', date: '06-21', type: 'official', icon: '🎬' },
  { id: 'programmer_day', title: 'روز جهانی برنامه‌نویس', date: '06-22', type: 'official', icon: '💻', description: '۲۵۶مین روز سال، روز عاشقان کد' },

  // پاییز
  { id: 'autumn_start', title: 'آغاز پاییز و بازگشایی دانشگاه‌ها و مدارس', date: '07-01', type: 'official', icon: '🍁' },
  { id: 'children_day', title: 'روز جهانی کودک', date: '07-16', type: 'official', icon: '🎈' },
  { id: 'halloween', title: 'جشن هالووین', date: '08-10', type: 'official', icon: '🎃', description: 'جشن پاییزی هالووین' },
  { id: 'books_day', title: 'روز کتاب، کتابخوانی و کتابدار', date: '08-24', type: 'official', icon: '📖' },
  { id: 'men_day', title: 'روز جهانی مرد و روز پدر', date: '08-29', type: 'official', icon: '👔', description: 'بزرگداشت مقام پدر و مردان تلاشگر' },
  { id: 'student_day', title: 'روز دانشجو', date: '09-16', type: 'official', icon: '🎓', description: 'گرامیداشت دانشجویان پویا و آگاه' },
  { id: 'yalda_night', title: 'شب یلدا (چله بزرگ)', date: '09-30', type: 'official', icon: '🍉', description: 'طولانی‌ترین شب سال، دورهمی و فال حافظ' },

  // زمستان
  { id: 'christmas', title: 'جشن میلاد حضرت مسیح (کریسمس)', date: '10-05', type: 'official', icon: '🎄' },
  { id: 'new_year', title: 'آغاز سال نو میلادی', date: '10-11', type: 'official', icon: '✨' },
  { id: 'mother_day', title: 'روز زن و مادر', date: '10-23', type: 'official', icon: '💐', description: 'فرصتی ناب برای قدردانی و بوسیدن دستان مادر' },
  { id: 'valentine', title: 'روز ولنتاین (روز عشق)', date: '11-25', type: 'official', icon: '💖', description: 'روز ابراز عشق و محبت' },
  { id: 'sepandarmazgan', title: 'جشن سپندارمذگان (روز عشق و بانوان ایرانی)', date: '12-05', type: 'official', icon: '🌹', description: 'جشن اصیل ایرانی پاسداشت زمین و بانوان' },
  { id: 'women_day_intl', title: 'روز جهانی زن', date: '12-18', type: 'official', icon: '🌸' },
  { id: 'chaharshanbe_soori', title: 'چهارشنبه‌سوری', date: '12-25', type: 'official', icon: '🔥', description: 'سرخی تو از من، زردی من از تو' },
];

/**
 * Reads all occasions from localStorage, seeding default national/global list if empty.
 */
export function getStoredOccasions(): SpecialOccasion[] {
  try {
    const raw = localStorage.getItem(STORAGE_OCCASIONS_KEY);
    if (raw) {
      const parsed: SpecialOccasion[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse occasions from localStorage:', e);
  }

  // Auto seed and save if empty
  saveStoredOccasions(BUILTIN_OCCASIONS);
  return BUILTIN_OCCASIONS;
}

export function saveStoredOccasions(occasions: SpecialOccasion[]): void {
  try {
    localStorage.setItem(STORAGE_OCCASIONS_KEY, JSON.stringify(occasions));
  } catch (e) {
    console.error('Could not save occasions to localStorage', e);
  }
}

/**
 * Checks for occasions matching today and tomorrow (in both Jalali MM-DD and YYYY-MM-DD).
 */
export function findOccasionsForTimeline(
  targetDateIso: string,
  userOccasions: SpecialOccasion[] = []
): { todayOccasions: SpecialOccasion[]; tomorrowOccasions: SpecialOccasion[] } {
  const allOccasions = [...getStoredOccasions(), ...userOccasions];

  const targetDate = new Date(targetDateIso);
  const tomorrowDate = new Date(targetDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  // Jalali parts for target date (e.g. "1405-08-12" -> "08-12")
  const targetJalali = getJalaliDateStr(targetDate);
  const targetJalaliMMDD = targetJalali.slice(5); // "08-12"

  // Jalali parts for tomorrow
  const tomorrowJalali = getJalaliDateStr(tomorrowDate);
  const tomorrowJalaliMMDD = tomorrowJalali.slice(5);

  const isMatch = (occ: SpecialOccasion, jalaliFull: string, jalaliMMDD: string, isoFull: string) => {
    const d = occ.date.trim();
    return d === jalaliFull || d === jalaliMMDD || d === isoFull || d === isoFull.slice(5);
  };

  const todayOccasions = allOccasions.filter((occ) =>
    isMatch(occ, targetJalali, targetJalaliMMDD, targetDateIso)
  );

  const tomorrowOccasions = allOccasions.filter((occ) =>
    isMatch(occ, tomorrowJalali, tomorrowJalaliMMDD, tomorrowDate.toISOString().split('T')[0])
  );

  return { todayOccasions, tomorrowOccasions };
}
