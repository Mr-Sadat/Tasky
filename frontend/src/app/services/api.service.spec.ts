import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { getTodayIso, toLocalIsoDate, parseLocalIsoDate, addDaysToIso } from '../utils/jalali';
import { Task } from '../models/task.model';

describe('ApiService Bug Fixes', () => {
  let service: ApiService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // Bug 1: Date Consistency (Local vs UTC)
  describe('Bug 1: Local Date Helpers', () => {
    it('getTodayIso should return local YYYY-MM-DD instead of UTC', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(getTodayIso()).toBe(expected);
      expect(toLocalIsoDate(now)).toBe(expected);
    });

    it('parseLocalIsoDate should create local midnight date without timezone shift', () => {
      const parsed = parseLocalIsoDate('2026-11-03');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(10); // 0-indexed November
      expect(parsed.getDate()).toBe(3);
    });

    it('addDaysToIso should correctly increment local days', () => {
      expect(addDaysToIso('2026-11-03', 1)).toBe('2026-11-04');
      expect(addDaysToIso('2026-11-03', 3)).toBe('2026-11-06');
    });
  });

  // Bug 3: AI Guidelines regeneration preserving XP and Streak
  describe('Bug 3: AI Guidelines and Profile setup', () => {
    it('setupProfile should preserve existing XP and streak', async () => {
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'علی',
        wake_time: '07:00',
        sleep_time: '23:00',
        xp: 150,
        streak_days: 5,
        last_streak_date: '2026-11-02'
      }));

      const profile = await firstValueFrom(service.setupProfile({
        name: 'علی جدید',
        wake_time: '08:00',
        sleep_time: '23:30',
        avatar_config: {} as any,
        lifestyle_answers: {}
      }));

      expect(profile.xp).toBe(150);
      expect(profile.streak_days).toBe(5);
      expect(profile.last_streak_date).toBe('2026-11-02');
    });

    it('generateAiGuidelines should return guidelines without touching profile XP', async () => {
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'سارا',
        wake_time: '06:30',
        sleep_time: '22:30',
        xp: 200,
        streak_days: 7
      }));

      const guidelines = await firstValueFrom(
        service.generateAiGuidelines('06:30', '22:30', { chronotype: 'صبحگاهی' })
      );
      expect(guidelines).toContain('06:30');
      expect(guidelines).toContain('22:30');
      const stored = JSON.parse(localStorage.getItem('tasky_user_profile') || '{}');
      expect(stored.xp).toBe(200);
      expect(stored.streak_days).toBe(7);
    });
  });

  // Bug 4: Persian text parser substring matching
  describe('Bug 4: Persian Text NLP Parsing', () => {
    it('should not confuse weekdays or words like نهار and بنده with hours', async () => {
      const res = await firstValueFrom(
        service.voiceToPlan(null, 'یکشنبه نهار با بنده خدا ساعت ۱۶')
      );
      const task = res.tasks[0];
      expect(task.scheduled_time).toBe('16:00');
      expect(task.title).toContain('نهار با بنده خدا');
    });

    it('should extract correct time when preceded by ساعت', async () => {
      const res = await firstValueFrom(
        service.voiceToPlan(null, 'کلاس فیزیک ساعت سه بعدازظهر')
      );
      const task = res.tasks[0];
      expect(task.scheduled_time).toBe('15:00');
    });

    it('should parse ساعت ده و نیم correctly', async () => {
      const res = await firstValueFrom(
        service.voiceToPlan(null, 'جلسه مهم ساعت ده و نیم')
      );
      const task = res.tasks[0];
      expect(task.scheduled_time).toBe('10:30');
      expect(task.priority).toBe('high');
    });
  });

  // Bug 5: Occasion tasks computed dynamically and not resurrected after deletion
  describe('Bug 5: Occasion Tasks Dynamic Display & Deletion', () => {
    it('should compute occasion tasks for display without writing them to tasky_tasks in localStorage', async () => {
      const todayIso = getTodayIso();
      await firstValueFrom(service.getTasks(todayIso));
      const stored = JSON.parse(localStorage.getItem('tasky_tasks') || '[]');
      const storedOccasions = stored.filter((t: Task) => t.title.startsWith('🎉 امروز:'));
      expect(storedOccasions.length).toBe(0);
    });

    it('should keep deleted occasion tasks dismissed so they do not return on subsequent getTasks', async () => {
      const todayIso = getTodayIso();
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'تست',
        occasions: [{ id: 'test_occ', title: 'روز آزمایشی', date: todayIso }]
      }));

      const tasks = await firstValueFrom(service.getTasks(todayIso));
      const occTask = tasks.find(t => t.title.includes('روز آزمایشی'));
      expect(occTask).toBeTruthy();

      // Delete the occasion task
      await firstValueFrom(service.deleteTask(occTask!.id));

      // Fetch again - the deleted occasion task must NOT return
      const updatedTasks = await firstValueFrom(service.getTasks(todayIso));
      const deletedOcc = updatedTasks.find(t => t.title.includes('روز آزمایشی'));
      expect(deletedOcc).toBeUndefined();
    });
  });

  // Bug 6: Streak & XP exploit prevention
  describe('Bug 6: Streak & XP Exploit Prevention', () => {
    it('should only award streak once per day and roll back if uncompleted on that day', async () => {
      const todayIso = getTodayIso();
      localStorage.setItem('tasky_tasks', '[]');
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'تست',
        xp: 0,
        streak_days: 0
      }));

      const task = await firstValueFrom(service.createTask({
        title: 'تسک حیاتی ۱',
        priority: 'high',
        date: todayIso
      }));

      // Step 1: Complete high priority task
      await firstValueFrom(service.toggleTaskCompletion(task.id, true));
      let profile = JSON.parse(localStorage.getItem('tasky_user_profile') || '{}');
      expect(profile.xp).toBe(15);
      expect(profile.streak_days).toBe(1);
      expect(profile.last_streak_date).toBe(todayIso);

      // Step 2: Uncomplete the task
      await firstValueFrom(service.toggleTaskCompletion(task.id, false));
      profile = JSON.parse(localStorage.getItem('tasky_user_profile') || '{}');
      expect(profile.xp).toBe(0);
      expect(profile.streak_days).toBe(0); // Rolled back!

      // Step 3: Complete again - streak should be 1, NOT 2!
      await firstValueFrom(service.toggleTaskCompletion(task.id, true));
      profile = JSON.parse(localStorage.getItem('tasky_user_profile') || '{}');
      expect(profile.xp).toBe(15);
      expect(profile.streak_days).toBe(1); // Still 1, cannot be exploited!
    });
  });

  // Bug 7: Collision-free task IDs using UUID
  describe('Bug 7: UUID Generation for Tasks', () => {
    it('createTask should generate unique string UUIDs', async () => {
      const task1 = await firstValueFrom(service.createTask({ title: 'تسک اول' }));
      const task2 = await firstValueFrom(service.createTask({ title: 'تسک دوم' }));
      expect(typeof task1.id).toBe('string');
      expect(typeof task2.id).toBe('string');
      expect(task1.id).not.toBe(task2.id);
      expect(String(task1.id).length).toBeGreaterThan(15);
    });
  });

  // Bug 8: Panic reschedule low priority handling
  describe('Bug 8: Panic Reschedule Low Priority', () => {
    it('should schedule low priority tasks today if there is remaining time', async () => {
      const todayIso = getTodayIso();
      localStorage.setItem('tasky_tasks', '[]');

      await firstValueFrom(service.createTask({
        title: 'کار مهم',
        priority: 'high',
        duration_minutes: 30,
        date: todayIso
      }));

      await firstValueFrom(service.createTask({
        title: 'کار ساده و کم‌اهمیت',
        priority: 'low',
        duration_minutes: 20,
        date: todayIso
      }));

      // Reschedule early in the afternoon (e.g. 14:00) so there is plenty of room before 23:00
      const res = await firstValueFrom(service.panicReschedule('عجله دارم', '14:00', todayIso));
      expect(res.deferred_count).toBe(0);
      expect(res.rescheduled_count).toBe(2);
      expect(res.tasks.some(t => t.priority === 'low' && t.date === todayIso)).toBe(true);
    });
  });

  // Feature: Data Backup Export and Import (Schema Versioning)
  describe('Backup and Schema Versioning', () => {
    it('exportBackup should export current state with schemaVersion 2', () => {
      const backup = service.exportBackup();
      expect(backup.schemaVersion).toBe(2);
      expect(Array.isArray(backup.tasks)).toBe(true);
      expect(backup.exportedAt).toBeTruthy();
    });

    it('importBackup should restore tasks and profile', () => {
      const sampleBackup = {
        schemaVersion: 2,
        exportedAt: '2026-11-03T12:00:00.000Z',
        profile: {
          name: 'رضا',
          wake_time: '06:00',
          sleep_time: '22:00',
          ai_guidelines: 'تست',
          avatar_config: {} as any
        },
        tasks: [
          {
            id: 'backup-task-1',
            title: 'تسک بازیابی شده',
            scheduled_time: '11:00',
            duration_minutes: 45,
            priority: 'high' as const,
            category: 'work' as const,
            icon: 'briefcase' as const,
            is_completed: false,
            date: '2026-11-03'
          }
        ]
      };

      const result = service.importBackup(sampleBackup);
      expect(result.success).toBe(true);
      expect(result.tasksCount).toBe(1);

      const restoredTasks = service.getStoredTasks();
      expect(restoredTasks.length).toBe(1);
      expect(restoredTasks[0].title).toBe('تسک بازیابی شده');

      const restoredProfile = service.getStoredProfile();
      expect(restoredProfile?.name).toBe('رضا');
    });

    it('importBackup should reject invalid data', () => {
      const result = service.importBackup('invalid-json');
      expect(result.success).toBe(false);
    });
  });

  // Feature: Psychological rhythm integration
  describe('Psychological Profile Integration in Planning', () => {
    it('voiceToPlan should use morning chronotype when time is not specified', async () => {
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'سحرخیز',
        psychology_profile: { chronotype: 'morning' }
      }));

      const res = await firstValueFrom(service.voiceToPlan(null, 'مطالعه کتاب فیزیک'));
      expect(res.tasks[0].scheduled_time).toBe('09:00');
    });

    it('voiceToPlan should use night chronotype when time is not specified', async () => {
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'شب‌بیدار',
        psychology_profile: { chronotype: 'night' }
      }));

      const res = await firstValueFrom(service.voiceToPlan(null, 'کدنویسی پروژه'));
      expect(res.tasks[0].scheduled_time).toBe('20:30');
    });

    it('breakdownTask should adapt to short_sprints focusSpan', async () => {
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'سریع',
        psychology_profile: { focusSpan: 'short_sprints' }
      }));

      const task = await firstValueFrom(service.createTask({
        title: 'پروژه بزرگ',
        duration_minutes: 60,
        scheduled_time: '10:00'
      }));

      const breakdown = await firstValueFrom(service.breakdownTask(task.id));
      expect(breakdown.subtasks.length).toBe(3);
      expect(breakdown.subtasks[0].title).toContain('اسپرینت ۱');
    });

    it('panicReschedule should use user sleep_time and compress_focus style', async () => {
      localStorage.setItem('tasky_tasks', '[]');
      localStorage.setItem('tasky_user_profile', JSON.stringify({
        name: 'کاربر منعطف',
        sleep_time: '22:00',
        psychology_profile: { resilienceStyle: 'compress_focus' }
      }));

      await firstValueFrom(service.createTask({
        title: 'کار فشرده',
        priority: 'high',
        duration_minutes: 60,
        date: getTodayIso()
      }));

      const res = await firstValueFrom(service.panicReschedule('تست', '15:00', getTodayIso()));
      const rescheduled = res.tasks.find(t => t.title === 'کار فشرده');
      expect(rescheduled).toBeTruthy();
      // 60 minutes * 0.60 = 36 minutes
      expect(rescheduled!.duration_minutes).toBe(36);
    });
  });

  // Feature: Direct Persian NLP Parser tests
  describe('parsePersianTaskText NLP Engine', () => {
    it('should parse Persian digits and words accurately', () => {
      const parsed1 = service.parsePersianTaskText('ورزش صبحگاهی ساعت ۰۷:۳۰ به مدت ۴۵ دقیقه');
      expect(parsed1.time).toBe('07:30');
      expect(parsed1.duration).toBe(45);
      expect(parsed1.category).toBe('fitness');

      const parsed2 = service.parsePersianTaskText('جلسه کاری با مدیر ساعت دو و نیم بعدازظهر حتما');
      expect(parsed2.time).toBe('14:30');
      expect(parsed2.priority).toBe('high');
      expect(parsed2.category).toBe('work');

      const parsed3 = service.parsePersianTaskText('یک ساعت مطالعه درس ریاضی فردا');
      expect(parsed3.duration).toBe(60);
      expect(parsed3.category).toBe('study');
    });
  });
});
