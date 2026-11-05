export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

export const JALALI_MONTHS_EN = [
  'Farvardin', 'Ordibehesht', 'Khordad',
  'Tir', 'Mordad', 'Shahrivar',
  'Mehr', 'Aban', 'Azar',
  'Dey', 'Bahman', 'Esfand'
];

export const PERSIAN_WEEKDAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'
];

export const JALALI_WEEKDAYS_EN = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const PERSIAN_WEEKDAYS_SHORT = [
  'ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'
];

/**
 * Converts Gregorian date (year, month 1-12, day 1-31) to Jalali [jy, jm, jd]
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

/**
 * Converts Jalali date [jy, jm, jd] to Gregorian [gy, gm, gd]
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  jy += 1595;
  let days = -355668 + (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

/**
 * Converts Jalali date [jy, jm, jd] to Gregorian ISO string "YYYY-MM-DD"
 */
export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

/**
 * Returns number of days in a given Jalali month (1-12)
 */
export function getJalaliMonthLength(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  // Month 12 (Esfand): Check leap year
  const [gy, gm, gd] = jalaliToGregorian(jy, 12, 30);
  const [backY, backM, backD] = gregorianToJalali(gy, gm, gd);
  return (backY === jy && backM === 12 && backD === 30) ? 30 : 29;
}

/**
 * Returns Persian weekday index for the 1st of a Jalali month (0 = Shanbeh, 6 = Jomeh)
 */
export function getJalaliMonthStartWeekday(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const d = new Date(gy, gm - 1, gd);
  // In JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // In Persian: 0=Sat (Shanbeh), 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
  return (d.getDay() + 1) % 7;
}

/**
 * Converts a Date object to local ISO string "YYYY-MM-DD" based on local timezone, avoiding UTC shifts
 */
export function toLocalIsoDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses a Date or "YYYY-MM-DD" / "YYYY/MM/DD" string into a Date object at local midnight.
 * Automatically recognizes and converts Jalali year strings (1300-1500) to proper Gregorian Date,
 * preventing historical 14th century Gregorian interpretation bugs.
 */
export function parseLocalIsoDate(dateInput?: Date | string): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      // If year is Jalali (e.g. 1300 to 1500), convert to Gregorian Date
      if (y >= 1300 && y <= 1500) {
        const [gy, gm, gd] = jalaliToGregorian(y, m, d);
        return new Date(gy, gm - 1, gd);
      }
      return new Date(y, m - 1, d);
    }
    return new Date(trimmed);
  }
  return new Date();
}

/**
 * Safely adds days to a date string or object and returns local ISO (YYYY-MM-DD)
 */
export function addDaysToIso(dateInput: Date | string, days: number): string {
  const d = parseLocalIsoDate(dateInput);
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

/**
 * Returns formatted Jalali date string e.g. "1405-08-12" from Date object or ISO string
 */
export function getJalaliDateStr(dateInput?: Date | string): string {
  const d = parseLocalIsoDate(dateInput);
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;
}

/**
 * Returns human-readable Persian or English Jalali date e.g. "12 Aban 1405" or "۱۲ آبان ۱۴۰۵"
 */
export function getJalaliDisplayStr(dateInput?: Date | string, lang: 'fa' | 'en' = 'fa'): string {
  const d = parseLocalIsoDate(dateInput);
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  if (lang === 'en') {
    const monthName = JALALI_MONTHS_EN[jm - 1] || '';
    return `${jd} ${monthName} ${jy}`;
  }
  const monthName = PERSIAN_MONTHS[jm - 1] || '';
  return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
}

/**
 * Returns Persian or English weekday name e.g. "سه‌شنبه" or "Tuesday"
 */
export function getJalaliDayNameStr(dateInput?: Date | string, lang: 'fa' | 'en' = 'fa'): string {
  const d = parseLocalIsoDate(dateInput);
  if (lang === 'en') {
    return JALALI_WEEKDAYS_EN[d.getDay()] || '';
  }
  return PERSIAN_WEEKDAYS[d.getDay()] || '';
}

/**
 * Returns today's ISO string (YYYY-MM-DD) in local time
 */
export function getTodayIso(): string {
  return toLocalIsoDate(new Date());
}

/**
 * Formats any number or string with digits into clean Persian digits (e.g. 12 -> ۱۲)
 */
export function toPersianDigits(val: number | string | undefined | null): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (d) => persianDigits[parseInt(d, 10)]);
}

/**
 * Returns current Jalali date [jy, jm, jd]
 */
export function getTodayJalali(): [number, number, number] {
  const d = new Date();
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
