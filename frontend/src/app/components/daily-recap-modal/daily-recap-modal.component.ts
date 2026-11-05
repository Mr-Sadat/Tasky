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
        <div class="w-full flex flex-col gap-2 px-1">
          <!-- Social Sharing Buttons Grid -->
          <div class="grid grid-cols-3 gap-2">
            <!-- Instagram Story Button -->
            <button
              type="button"
              (click)="shareToInstagram()"
              class="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-pink-950/40 interactive-spring cursor-pointer border border-pink-400/30 select-none transition truncate"
              title="اشتراک‌گذاری در استوری اینستاگرام"
            >
              <span>📸</span>
              <span>استوری</span>
            </button>

            <!-- WhatsApp Button -->
            <button
              type="button"
              (click)="shareToWhatsApp()"
              class="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-lg shadow-emerald-950/40 interactive-spring cursor-pointer border border-emerald-400/30 select-none transition truncate"
              title="ارسال کارنامه در واتساپ"
            >
              <span>💬</span>
              <span>واتساپ</span>
            </button>

            <!-- Telegram Button -->
            <button
              type="button"
              (click)="shareToTelegram()"
              class="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[#229ED9] hover:bg-[#1e8bc0] text-white text-xs font-bold shadow-lg shadow-sky-950/40 interactive-spring cursor-pointer border border-sky-400/30 select-none transition truncate"
              title="ارسال کارنامه در تلگرام"
            >
              <span>✈️</span>
              <span>تلگرام</span>
            </button>
          </div>

          <!-- Secondary Actions Row: Copy Text & Download & Close -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="downloadStoryImage()"
              class="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-xs font-bold border border-purple-500/40 interactive-spring cursor-pointer select-none transition"
              title="دانلود تصویر با کیفیت ۱۰۸۰ در ۱۹۲۰"
            >
              <span>📥</span>
              <span>دانلود تصویر</span>
            </button>

            <button
              type="button"
              (click)="copyRecapText()"
              class="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold border border-slate-700/80 interactive-spring cursor-pointer select-none transition"
              title="کپی متن کارنامه"
            >
              <span>📋</span>
              <span>کپی متن</span>
            </button>

            <button
              type="button"
              (click)="close.emit()"
              class="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/80 interactive-spring cursor-pointer select-none shrink-0"
              title="بستن"
              aria-label="بستن پنجره"
            >
              ✕
            </button>
          </div>
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

  getShareText(): string {
    const name = this.userProfile?.name || 'من';
    const percent = this.getCompletionPercent();
    return `✨ کارنامه امروز ${name} در برنامه‌ریز تَسکی (Tasky):
📅 تاریخ: ${this.formattedDate}
🎯 میزان موفقیت: ${percent}٪ (${this.completedTasksCount} از ${this.totalTasksCount} تسک انجام شد)
⏱️ زمان مفید کل: ${this.totalDurationFormatted()}
💬 "${this.getAIQuote()}"

💜 برنامه‌ریزی هوشمند روزانه با هوش مصنوعی و صوت
🔗 https://mr-sadat.github.io/Tasky/`;
  }

  copyRecapText(): void {
    const text = this.getShareText();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast.emit('متن کارنامه با موفقیت در کلیپ‌بورد کپی شد! 📋✨');
      }).catch(() => {
        this.toast.emit('خطا در کپی متن.');
      });
    }
  }

  shareToInstagram(): void {
    const canvas = this.generateStoryCanvas();
    if (!canvas) {
      this.toast.emit('خطا در تولید تصویر استوری.');
      return;
    }

    canvas.toBlob(async (blob) => {
      if (blob && typeof navigator !== 'undefined' && (navigator as any).canShare) {
        const file = new File([blob], 'tasky-story.png', { type: 'image/png' });
        if ((navigator as any).canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'کارنامه روزانه من در تَسکی',
              text: this.getShareText(),
              files: [file],
            });
            this.toast.emit('پنجره اشتراک‌گذاری باز شد! گزینه Instagram Stories را انتخاب کنید 📸✨');
            return;
          } catch (err: any) {
            // User cancelled or share dismissed
            if (err?.name === 'AbortError') return;
          }
        }
      }

      // Fallback: download canvas image and copy text
      this.downloadStoryImage();
      this.copyRecapText();
      this.toast.emit('تصویر استوری دانلود شد! می‌توانید آن را در استوری اینستاگرام خود قرار دهید 📸✨');
    }, 'image/png');
  }

  shareToWhatsApp(): void {
    const text = this.getShareText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
      this.toast.emit('در حال انتقال به واتساپ... 💬');
    }
  }

  shareToTelegram(): void {
    const text = this.getShareText();
    const appUrl = 'https://mr-sadat.github.io/Tasky/';
    const url = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
      this.toast.emit('در حال انتقال به تلگرام... ✈️');
    }
  }

  /**
   * Helper to build and draw on the HTML5 Canvas
   */
  private generateStoryCanvas(): HTMLCanvasElement | null {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 1. Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#2e1065');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // 2. Decorative Ambient Circles
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

      ctx.fillStyle = '#e9d5ff';
      ctx.font = '34px sans-serif';
      ctx.fillText(this.getEncouragementTitle(), 540, 800);

      // 6. Stats Section Box
      this.roundRect(ctx, 140, 880, 800, 420, 40);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Progress Bar
      const percent = this.getCompletionPercent();
      ctx.textAlign = 'right';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#d8b4fe';
      ctx.fillText('میزان موفقیت روزانه:', 880, 960);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText(`${percent}%`, 200, 960);

      // Progress Track
      this.roundRect(ctx, 200, 990, 680, 30, 15);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      // Progress Fill
      const fillW = Math.max(30, (680 * percent) / 100);
      this.roundRect(ctx, 200, 990, fillW, 30, 15);
      const fillGrad = ctx.createLinearGradient(200, 0, 880, 0);
      fillGrad.addColorStop(0, '#10b981');
      fillGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Sub Metrics
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`✅ ${this.completedTasksCount} از ${this.totalTasksCount} تسک`, 340, 1110);
      ctx.fillText(`⏱️ ${this.totalDurationFormatted()} زمان مفید`, 700, 1110);

      // 7. AI Quote Box
      this.roundRect(ctx, 140, 1340, 800, 240, 40);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'italic 34px sans-serif';
      ctx.fillStyle = '#f3e8ff';
      this.wrapText(ctx, `"${this.getAIQuote()}"`, 540, 1430, 720, 50);

      // 8. Footer
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('✨ تَسکی: دستیار و برنامه‌ریز هوشمند صوتی', 540, 1680);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px monospace';
      ctx.fillText('mr-sadat.github.io/Tasky', 540, 1740);

      return canvas;
    } catch (e) {
      console.warn('Canvas story generation error:', e);
      return null;
    }
  }

  /**
   * Generates a high-resolution 1080x1920 Instagram Story image using HTML5 Canvas.
   */
  downloadStoryImage(): void {
    const canvas = this.generateStoryCanvas();
    if (!canvas) return;

    try {
      const link = document.createElement('a');
      link.download = `tasky-story-${getTodayIso()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.toast.emit('تصویر استوری دانلود شد! 📸');
    } catch (e) {
      this.toast.emit('خطا در دانلود استوری.');
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
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
