import { describe, it, expect } from 'vitest';
import {
  gregorianToJalali,
  jalaliToGregorian,
  jalaliToIso,
  getJalaliMonthLength,
  getJalaliMonthStartWeekday,
  toLocalIsoDate,
  parseLocalIsoDate,
  addDaysToIso,
  getJalaliDateStr,
  getJalaliDisplayStr,
  getJalaliDayNameStr,
  getTodayIso,
  PERSIAN_MONTHS,
} from './jalali';

describe('Jalali Calendar Utils', () => {
  describe('gregorianToJalali and jalaliToGregorian conversion', () => {
    it('should correctly convert Nowruz 1403 (2024-03-20)', () => {
      const [jy, jm, jd] = gregorianToJalali(2024, 3, 20);
      expect(jy).toBe(1403);
      expect(jm).toBe(1);
      expect(jd).toBe(1);

      const [gy, gm, gd] = jalaliToGregorian(1403, 1, 1);
      expect(gy).toBe(2024);
      expect(gm).toBe(3);
      expect(gd).toBe(20);
    });

    it('should correctly convert a date in Aban 1403 (2024-11-03 -> 1403-08-13)', () => {
      const [jy, jm, jd] = gregorianToJalali(2024, 11, 3);
      expect(jy).toBe(1403);
      expect(jm).toBe(8);
      expect(jd).toBe(13);

      const [gy, gm, gd] = jalaliToGregorian(1403, 8, 13);
      expect(gy).toBe(2024);
      expect(gm).toBe(11);
      expect(gd).toBe(3);
    });

    it('should maintain round-trip conversion fidelity across various dates', () => {
      const testDates = [
        [1400, 1, 1],
        [1402, 6, 31],
        [1403, 7, 15],
        [1403, 12, 30], // Leap year
        [1404, 12, 29], // Non-leap year
      ];

      for (const [jy, jm, jd] of testDates) {
        const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
        const [backJy, backJm, backJd] = gregorianToJalali(gy, gm, gd);
        expect(backJy).toBe(jy);
        expect(backJm).toBe(jm);
        expect(backJd).toBe(jd);
      }
    });

    it('should correctly format jalaliToIso', () => {
      expect(jalaliToIso(1403, 1, 1)).toBe('2024-03-20');
      expect(jalaliToIso(1403, 8, 13)).toBe('2024-11-03');
    });
  });

  describe('Month lengths and leap years', () => {
    it('months 1-6 should have 31 days', () => {
      for (let m = 1; m <= 6; m++) {
        expect(getJalaliMonthLength(1403, m)).toBe(31);
      }
    });

    it('months 7-11 should have 30 days', () => {
      for (let m = 7; m <= 11; m++) {
        expect(getJalaliMonthLength(1403, m)).toBe(30);
      }
    });

    it('Esfand (month 12) should have 30 days in leap year 1403', () => {
      expect(getJalaliMonthLength(1403, 12)).toBe(30);
    });

    it('Esfand (month 12) should have 29 days in normal year 1402', () => {
      expect(getJalaliMonthLength(1402, 12)).toBe(29);
    });
  });

  describe('Local ISO parsing and manipulation', () => {
    it('parseLocalIsoDate should correctly parse YYYY-MM-DD into local Date without UTC shift', () => {
      const parsed = parseLocalIsoDate('2024-05-15');
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(4); // 0-indexed May
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(0);
    });

    it('toLocalIsoDate should output YYYY-MM-DD string', () => {
      const d = new Date(2024, 6, 25);
      expect(toLocalIsoDate(d)).toBe('2024-07-25');
    });

    it('addDaysToIso should correctly add days across month boundaries', () => {
      expect(addDaysToIso('2024-02-28', 1)).toBe('2024-02-29'); // 2024 leap year
      expect(addDaysToIso('2024-02-29', 1)).toBe('2024-03-01');
      expect(addDaysToIso('2024-01-01', -1)).toBe('2023-12-31');
    });

    it('getTodayIso should return a string matching YYYY-MM-DD format', () => {
      const today = getTodayIso();
      expect(/^\d{4}-\d{2}-\d{2}$/.test(today)).toBe(true);
    });
  });

  describe('Formatting and display helpers', () => {
    it('getJalaliDateStr should return YYYY-MM-DD Jalali date', () => {
      expect(getJalaliDateStr('2024-03-20')).toBe('1403-01-01');
    });

    it('getJalaliDisplayStr should return human readable Persian date', () => {
      expect(getJalaliDisplayStr('2024-03-20')).toBe('1 فروردین 1403');
    });

    it('getJalaliDayNameStr should return correct weekday name', () => {
      // 2024-03-20 was Wednesday (چهارشنبه)
      // Note: JavaScript Date.getDay() for 2024-03-20 is 3 (Wednesday)
      const dayName = getJalaliDayNameStr('2024-03-20');
      expect(dayName).toBe('چهارشنبه');
    });
  });
});
