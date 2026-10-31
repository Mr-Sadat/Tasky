import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarState, AvatarCustomization, Task } from '../../models/task.model';
import { ThemeService, THEME_PRESETS, ThemePreset } from '../../services/theme.service';
import { TtsService } from '../../services/tts.service';
import { DynamicAvatarComponent } from '../dynamic-avatar/dynamic-avatar.component';

@Component({
  selector: 'app-avatar-card',
  standalone: true,
  imports: [CommonModule, DynamicAvatarComponent],
  template: `
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-purple-900/40 to-slate-900/90 border border-purple-500/20 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-purple-950/40 transition-all duration-300">
      <!-- Glow ambient background effect -->
      <div 
        class="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        [ngClass]="getGlowColorClass()"
      ></div>
      <div class="absolute -bottom-10 -right-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative flex items-center gap-3.5 sm:gap-4">
        <!-- Human Instagram-Style Modular Avatar Container -->
        <div class="relative shrink-0 select-none">
          <div 
            class="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center transition-all duration-500 relative overflow-hidden"
            [ngClass]="getAvatarContainerClass()"
          >
            <!-- Pulse Waves for Listening State -->
            @if (state === 'listening') {
              <div class="absolute inset-0 rounded-2xl border-2 border-rose-500 animate-ping opacity-60"></div>
            }

            <app-dynamic-avatar
              [customization]="activeCustomization"
              [state]="state"
              [costume]="getContextualCostume()"
              [isSpeaking]="tts.isSpeaking()"
              [size]="88"
            ></app-dynamic-avatar>
          </div>

          <!-- Status Indicator Dot -->
          <span 
            class="absolute -bottom-1 -right-1 flex h-4 w-4"
            [title]="getStatusTitle()"
          >
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" [ngClass]="getStatusDotColor()"></span>
            <span class="relative inline-flex rounded-full h-4 w-4 border-2 border-slate-900" [ngClass]="getStatusDotColor()"></span>
          </span>
        </div>

        <!-- Speech Bubble & Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div class="flex items-center gap-1.5">
              <h2 class="text-sm font-bold tracking-wide text-purple-200">تَسکی (Tasky)</h2>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20">
                {{ getStatusLabel() }}
              </span>
              @if (getContextBadge()) {
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  {{ getContextBadge() }}
                </span>
              }
            </div>

            <div class="flex items-center gap-1">
              <!-- Voice-Back Speaker Mute/Unmute Button -->
              @if (tts.isSupported()) {
                <button
                  type="button"
                  (click)="toggleTtsMute()"
                  class="p-1 rounded-lg border text-xs transition interactive-spring cursor-pointer"
                  [ngClass]="tts.isMuted() 
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white' 
                    : 'bg-purple-950/80 text-purple-200 border-purple-500/40 hover:bg-purple-900 shadow-sm'"
                  [title]="tts.isMuted() ? 'فعال‌سازی بازخورد صوتی آواتار (صدا قطع است)' : 'قطع صدای آواتار (صدا وصل است)'"
                  aria-label="کنترل صدای آواتار"
                >
                  @if (tts.isMuted()) {
                    <span>🔇</span>
                  } @else {
                    <span [class.animate-pulse]="tts.isSpeaking()">🔊</span>
                  }
                </button>

                <!-- Replay speech button -->
                @if (!tts.isMuted()) {
                  <button
                    type="button"
                    (click)="replaySpeech()"
                    class="p-1 rounded-lg border border-purple-500/30 bg-slate-800/80 hover:bg-slate-700 text-purple-300 hover:text-white text-xs transition interactive-spring cursor-pointer"
                    title="پخش مجدد صدای آواتار"
                    aria-label="پخش مجدد"
                  >
                    🔁
                  </button>
                }
              }

              <!-- Customization Studio Trigger Button -->
              <button
                type="button"
                (click)="openStudio()"
                class="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-purple-300 hover:text-white border border-purple-500/30 interactive-spring cursor-pointer shadow-sm transition"
                title="طراحی آواتار سبک اینستاگرام"
                aria-label="استودیو آواتار"
              >
                <span>🎨</span>
                <span class="hidden sm:inline">طراحی آواتار</span>
              </button>
            </div>
          </div>

          <!-- Glassmorphism Speech bubble text -->
          <div class="relative bg-slate-800/80 rounded-2xl rounded-tr-sm p-3 border border-slate-700/60 shadow-inner backdrop-blur-md">
            <p class="text-sm font-medium text-slate-100 leading-relaxed break-words">
              {{ voiceReply || 'سلام سارا جان! آماده‌ام تا صدات رو بشنوم و کارهای قشنگ امروزت رو برنامه‌ریزی کنم. دکمه میکروفون رو بزن!' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Transcribed Text Pill (if available) -->
      @if (transcribedText) {
        <div class="mt-3 pt-3 border-t border-purple-500/10 flex items-start gap-2">
          <span class="text-xs text-purple-400 font-semibold shrink-0">شنیدم:</span>
          <p class="text-xs text-slate-300 italic truncate" [title]="transcribedText">
            "{{ transcribedText }}"
          </p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AvatarCardComponent {
  private readonly themeService = inject(ThemeService);
  readonly tts = inject(TtsService);

  @Input() state: AvatarState = 'idle';
  @Input() voiceReply: string = '';
  @Input() transcribedText: string = '';
  @Input() customization?: AvatarCustomization;
  
  @Input() activeTask?: Task | null;
  @Input() nextTask?: Task | null;
  @Input() sleepTime: string = '23:00';
  @Input() wakeTime: string = '07:00';

  @Output() studioClick = new EventEmitter<void>();

  get activeCustomization(): AvatarCustomization {
    return this.customization || this.themeService.customization();
  }

  getContextualCostume(): 'sleeping' | 'fitness' | 'study' | 'coffee' | 'default' {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const parseMinutes = (t: string) => {
      const parts = (t || '').split(':');
      return parts.length >= 2 ? parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) : 0;
    };

    const sleepMin = parseMinutes(this.sleepTime || '23:00');
    const wakeMin = parseMinutes(this.wakeTime || '07:00');

    // Check night / sleep hours
    const isNight = sleepMin > wakeMin
      ? (nowMinutes >= sleepMin || nowMinutes < wakeMin)
      : (nowMinutes >= sleepMin && nowMinutes < wakeMin);

    if (isNight) {
      return 'sleeping';
    }

    // Check ongoing active task or upcoming task
    const currentOrUpcoming = this.activeTask || this.nextTask;
    if (currentOrUpcoming) {
      const icon = currentOrUpcoming.icon;
      const cat = currentOrUpcoming.category;

      if (icon === 'dumbbell' || cat === 'fitness') return 'fitness';
      if (icon === 'briefcase' || icon === 'book' || cat === 'work' || cat === 'study') return 'study';
      if (icon === 'coffee' || cat === 'rest' || icon === 'heart' || cat === 'health') return 'coffee';
    }

    return 'default';
  }

  getContextBadge(): string | null {
    const costume = this.getContextualCostume();
    switch (costume) {
      case 'sleeping': return '🌙 وقت خواب';
      case 'fitness': return '🏋️ حالت ورزشی';
      case 'study': return '📚 حالت تمرکز و کار';
      case 'coffee': return '☕ وقت استراحت';
      default: return null;
    }
  }

  toggleTtsMute(): void {
    const muted = this.tts.toggleMute();
    if (!muted && this.voiceReply) {
      this.tts.speak(this.voiceReply);
    }
  }

  replaySpeech(): void {
    const textToSpeak = this.voiceReply || 'سلام رفیق! آماده‌ام تا صدات رو بشنوم.';
    this.tts.speak(textToSpeak);
  }

  openStudio(): void {
    this.studioClick.emit();
  }

  getPrimaryThemeColor(): string {
    const preset = THEME_PRESETS.find(p => p.id === this.activeCustomization.themeColor);
    return preset ? preset.primaryHex : '#a855f7';
  }

  getSecondaryThemeColor(): string {
    const preset = THEME_PRESETS.find(p => p.id === this.activeCustomization.themeColor);
    return preset ? preset.secondaryHex : '#6366f1';
  }

  getGlowColorClass(): string {
    switch (this.activeCustomization.themeColor) {
      case 'mint': return 'bg-emerald-500/25';
      case 'blue': return 'bg-blue-500/25';
      case 'peach': return 'bg-orange-500/25';
      case 'pink': return 'bg-pink-500/25';
      default: return 'bg-purple-600/25';
    }
  }

  getAvatarContainerClass(): string {
    switch (this.activeCustomization.themeColor) {
      case 'mint':
        return 'bg-gradient-to-tr from-emerald-950/80 to-teal-900/60 border border-emerald-500/30';
      case 'blue':
        return 'bg-gradient-to-tr from-blue-950/80 to-cyan-900/60 border border-blue-500/30';
      case 'peach':
        return 'bg-gradient-to-tr from-orange-950/80 to-amber-900/60 border border-orange-500/30';
      case 'pink':
        return 'bg-gradient-to-tr from-pink-950/80 to-rose-900/60 border border-pink-500/30';
      default:
        return 'bg-gradient-to-tr from-purple-950/80 to-indigo-900/60 border border-purple-500/30';
    }
  }

  getStatusLabel(): string {
    switch (this.state) {
      case 'listening': return 'در حال شنیدن... 🎙️';
      case 'thinking': return 'در حال تحلیل... 🧠';
      case 'happy': return 'خوشحال و پرانرژی! 🎉';
      case 'excited': return 'هیجان‌زده! ⭐';
      case 'serious': return 'متمرکز و دقیق 🧐';
      case 'supportive': return 'همراه و پشتیبان 💜';
      default: return 'آماده و هوشیار ✨';
    }
  }

  getStatusTitle(): string {
    return `وضعیت آواتار: ${this.getStatusLabel()}`;
  }

  getStatusDotColor(): string {
    switch (this.state) {
      case 'listening': return 'bg-rose-500';
      case 'thinking': return 'bg-amber-400';
      case 'happy':
      case 'excited': return 'bg-emerald-400';
      case 'serious': return 'bg-sky-400';
      case 'supportive': return 'bg-purple-400';
      default: return 'bg-emerald-400';
    }
  }
}
