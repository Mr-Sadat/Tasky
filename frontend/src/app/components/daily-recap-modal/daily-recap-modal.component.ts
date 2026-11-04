import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, UserProfile } from '../../models/task.model';
import { ThemeService, THEME_PRESETS } from '../../services/theme.service';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';
import { getTodayIso } from '../../utils/jalali';

@Component({
  selector: 'app-daily-recap-modal',
  standalone: true,
  imports: [CommonModule, DynamicAvatarComponent],
  template: `
    <!-- Modal Backdrop -->
    <div 
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
      (click)="onBackdropClick($event)"
      dir="rtl"
    >
      <!-- Modal Wrapper -->
      <div 
        class="w-full max-w-sm flex flex-col items-center gap-3 relative my-auto"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dailyRecapModalTitle"
      >
        <!-- Story Card (9:16 Aspect Ratio) -->
        <div 
          #storyCard
          id="tasky-story-card"
          class="w-full aspect-[9/16] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between border border-purple-500/30 text-white select-none transition-transform duration-300"
          [ngClass]="getCardThemeGradient()"
        >
          <!-- Background Ambient Glow & Star Particles -->
          <div class="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-purple-500/30 blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-pink-500/25 blur-3xl pointer-events-none"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

          <!-- TOP HEADER -->
          <div class="relative z-10 flex items-center justify-between pb-3 border-b border-white/15">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-sm shadow">✨</span>
              <div>
                <h3 id="dailyRecapModalTitle" class="text-xs font-black tracking-wider text-purple-100 uppercase">تَسکی | Tasky</h3>
                <p class="text-[9px] text-purple-200/80">کارنامه روزانه من</p>
              </div>
            </div>

            <!-- Persian Date Badge -->
            <div class="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-sm">
              {{ formattedDate }}
            </div>
          </div>

          <!-- AVATAR & USER PROFILE HERO -->
          <div class="relative z-10 flex flex-col items-center text-center my-auto py-2">
            <!-- Glowing Avatar Badge -->
            <div class="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/30 backdrop-blur-xl flex items-center justify-center shadow-xl shadow-purple-950/60 mb-2.5 relative overflow-hidden">
              <app-dynamic-avatar
                [customization]="themeService.customization()"
                state="happy"
                [size]="76"
              ></app-dynamic-avatar>
              <span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-[9px] font-black text-white shadow">
                {{ getScoreGrade() }}
              </span>
            </div>

            <h2 class="text-lg font-black text-white drop-shadow">
              کارنامه {{ userProfile?.name || 'رفیق تَسکی' }}
            </h2>
            <p class="text-[11px] text-purple-100/90 mt-0.5">
              {{ getEncouragementTitle() }}
            </p>
          </div>

          <!-- STATS GRID -->
          <div class="relative z-10 space-y-2.5 my-auto">
            <!-- Main Completion Progress Bar -->
            <div class="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/15">
              <div class="flex items-center justify-between text-xs font-bold mb-1.5">
                <span class="text-purple-200">میزان موفقیت روزانه:</span>
                <span class="text-emerald-300 font-mono text-sm">{{ getCompletionPercent() }}%</span>
              </div>
              <div class="w-full bg-white/10 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/20">
                <div 
                  class="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 shadow-sm"
                  [style.width.%]="getCompletionPercent()"
                ></div>
              </div>
            </div>

            <!-- Mini Metrics Row -->
            <div class="grid grid-cols-2 gap-2 text-center">
              <div class="p-2.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10">
                <span class="text-base">✅</span>
                <p class="text-[10px] text-purple-200 mt-0.5">تسک‌های انجام‌شده</p>
                <p class="text-sm font-extrabold text-white mt-0.5 font-mono">
                  {{ completedTasksCount }} از {{ totalTasksCount }}
                </p>
              </div>

              <div class="p-2.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10">
                <span class="text-base">⏱️</span>
                <p class="text-[10px] text-purple-200 mt-0.5">زمان مفید کل</p>
                <p class="text-sm font-extrabold text-white mt-0.5 font-mono">
                  {{ totalDurationFormatted() }}
                </p>
              </div>
            </div>

            <!-- Daily AI Quote / Note -->
            <div class="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <p class="text-[11px] text-purple-100 font-medium leading-relaxed italic">
                "{{ getAIQuote() }}"
              </p>
            </div>
          </div>

          <!-- FOOTER BRANDING -->
          <div class="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-[9px] text-purple-200/80">
            <span>✨ برنامه‌ریزی صوتی با هوش مصنوعی</span>
            <span class="font-mono font-bold">tasky.ai</span>
          </div>
        </div>

        <!-- ACTION BUTTONS BELOW STORY CARD -->
        <div class="w-full flex items-center justify-between gap-2 px-1">
          <!-- Download Image Button -->
          <button
            type="button"
            (click)="downloadStoryImage()"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 interactive-spring cursor-pointer border border-purple-400/40 select-none transition"
          >
            <span>📸</span>
            <span>دانلود استوری</span>
          </button>

          <!-- Copy Text Button -->
          <button
            type="button"
            (click)="copyRecapText()"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-purple-200 hover:text-white text-xs font-bold shadow-md border border-slate-700/80 interactive-spring cursor-pointer select-none transition"
          >
            <span>📋</span>
            <span>کپی متن</span>
          </button>

          <!-- Close Button -->
          <button
            type="button"
            (click)="close.emit()"
            class="w-10 h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/80 interactive-spring cursor-pointer select-none"
            title="بستن"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  `
})
export class DailyRecapModalComponent {
  private readonly themeService = inject(ThemeService);

  @Input() tasks: Task[] = [];
  @Input() userProfile: UserProfile | null = null;
  @Input() formattedDate: string = 'امروز';
  @Output() close = new EventEmitter<void>();
  @Output() toast = new EventEmitter<string>();

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.close.emit();
  }

  get totalTasksCount(): number {
    return this.tasks.length;
  }

  get completedTasksCount(): number {
    return this.tasks.filter((t) => t.is_completed).length;
  }

  getCompletionPercent(): number {
    if (this.totalTasksCount === 0) return 100;
    return Math.round((this.completedTasksCount / this.totalTasksCount) * 100);
  }

  totalDurationFormatted(): string {
    const totalMinutes = this.tasks.reduce((sum, t) => sum + (t.duration_minutes || 30), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours}س و ${mins}د`;
    if (hours > 0) return `${hours} ساعت`;
    return `${mins} دقیقه`;
  }

  getScoreGrade(): string {
    const percent = this.getCompletionPercent();
    if (percent === 100) return 'A+';
    if (percent >= 80) return 'A';
    if (percent >= 60) return 'B';
    return 'C';
  }

  getEncouragementTitle(): string {
    const percent = this.getCompletionPercent();
    if (percent === 100) return '🏆 قهرمان بی‌نظیر امروز!';
    if (percent >= 80) return '⭐ عملکرد فوق‌العاده و پرانرژی!';
    if (percent >= 50) return '💪 گام‌های پیوسته به سمت هدف';
    return '🌱 شروع پرقدرت برای فردا';
  }

  getAvatarEmoji(): string {
    const baseType = this.themeService.customization().baseType;
    switch (baseType) {
      case 'kitty': return '🐱';
      case 'bear': return '🐻';
      case 'alien': return '👾';
      default: return '🤖';
    }
  }

  getAIQuote(): string {
    const percent = this.getCompletionPercent();
    const name = this.userProfile?.name || 'رفیق';
    if (percent === 100) {
      return `تمام برنامه‌های امروز تیک خورد ${name} عزیز! فردا هم با همین قدرت کنارتم ✨`;
    }
    if (percent >= 70) {
      return `کارت عالی بود ${name}! بخش اعظم برنامه‌هات تموم شد. شب با آرامش استراحت کن 🌙`;
    }
    return `مهم اینه که دست از تلاش برنداشتی ${name}! فردا یک روز تازه با فرصت‌های نوئه 🚀`;
  }

  getCardThemeGradient(): string {
    const theme = this.themeService.customization().themeColor;
    switch (theme) {
      case 'mint':
        return 'bg-gradient-to-b from-emerald-950 via-teal-900 to-slate-950';
      case 'blue':
        return 'bg-gradient-to-b from-blue-950 via-indigo-900 to-slate-950';
      case 'peach':
        return 'bg-gradient-to-b from-orange-950 via-amber-900 to-slate-950';
      case 'pink':
        return 'bg-gradient-to-b from-pink-950 via-rose-900 to-slate-950';
      default:
        return 'bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950';
    }
  }

  onBackdropClick(event: MouseEvent): void {
    this.close.emit();
  }

  copyRecapText(): void {
    const name = this.userProfile?.name || 'من';
    const percent = this.getCompletionPercent();
    const text = 
`✨ کارنامه امروز ${name} در تَسکی:
📅 تاریخ: ${this.formattedDate}
🎯 میزان موفقیت: ${percent}% (${this.completedTasksCount} از ${this.totalTasksCount} تسک)
⏱️ زمان مفید کل: ${this.totalDurationFormatted()}
💬 "${this.getAIQuote()}"
💜 برنامه‌ریزی هوشمند با #تَسکی`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.emit('متن کارنامه با موفقیت در کلیپ‌بورد کپی شد! 📋✨');
      }).catch(() => {
        this.toast.emit('خطا در کپی متن.');
      });
    }
  }

  /**
   * Generates a high-resolution 1080x1920 Instagram Story image using HTML5 Canvas.
   */
  downloadStoryImage(): void {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#2e1065');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // 2. Draw Decorative Ambient Circles
      ctx.beginPath();
      ctx.arc(200, 300, 250, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(900, 1600, 300, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
      ctx.fill();

      // 3. Card Container Inner Box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 4;
      this.roundRect(ctx, 80, 100, 920, 1720, 60);
      ctx.fill();
      ctx.stroke();

      // 4. Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('تَسکی | Tasky', 920, 220);

      ctx.fillStyle = '#c084fc';
      ctx.font = '36px sans-serif';
      ctx.fillText(`کارنامه روزانه • ${this.formattedDate}`, 920, 280);

      // Separator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(160, 330);
      ctx.lineTo(920, 330);
      ctx.stroke();

      // 5. Hero Avatar Emoji Box
      this.roundRect(ctx, 420, 420, 240, 240, 50);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = '110px sans-serif';
      ctx.fillText(this.getAvatarEmoji(), 540, 575);

      // User Title
      const name = this.userProfile?.name || 'کاربر تَسکی';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px sans-serif';
      ctx.fillText(`کارنامه ${name}`, 540, 740);

      ctx.fillStyle = '#f3e8ff';
      ctx.font = '38px sans-serif';
      ctx.fillText(this.getEncouragementTitle(), 540, 805);

      // 6. Progress Card
      this.roundRect(ctx, 160, 890, 760, 220, 40);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText('میزان موفقیت امروز:', 880, 965);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(`${this.getCompletionPercent()}%`, 200, 965);

      // Progress bar track
      this.roundRect(ctx, 200, 1010, 680, 30, 15);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      // Progress bar fill
      const fillW = Math.max(30, (680 * this.getCompletionPercent()) / 100);
      this.roundRect(ctx, 200, 1010, fillW, 30, 15);
      const barGrad = ctx.createLinearGradient(200, 0, 880, 0);
      barGrad.addColorStop(0, '#34d399');
      barGrad.addColorStop(1, '#2dd4bf');
      ctx.fillStyle = barGrad;
      ctx.fill();

      // 7. Two Metrics Boxes
      // Box 1: Completed Tasks
      this.roundRect(ctx, 160, 1150, 360, 190, 36);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#c084fc';
      ctx.font = '32px sans-serif';
      ctx.fillText('تسک‌های انجام‌شده', 340, 1220);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px monospace';
      ctx.fillText(`${this.completedTasksCount} / ${this.totalTasksCount}`, 340, 1290);

      // Box 2: Total Duration
      this.roundRect(ctx, 560, 1150, 360, 190, 36);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = '32px sans-serif';
      ctx.fillText('زمان مفید کل', 740, 1220);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(this.totalDurationFormatted(), 740, 1290);

      // 8. Quote Box
      this.roundRect(ctx, 160, 1380, 760, 200, 36);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f3e8ff';
      ctx.font = 'italic 34px sans-serif';
      ctx.fillText(`"${this.getAIQuote()}"`, 540, 1495);

      // 9. Footer
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('✨ برنامه‌ریزی صوتی روزانه با تَسکی | tasky.ai', 540, 1720);

      // 10. Download Data URL
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `tasky-recap-${getTodayIso()}.png`;
      a.click();

      this.toast.emit('تصویر استوری با کیفیت بالا دانلود شد! 📸✨');
    } catch (e) {
      console.error('Error generating story image:', e);
      this.toast.emit('خطا در دانلود تصویر استوری.');
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
