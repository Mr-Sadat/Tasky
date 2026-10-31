import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarState, AvatarCustomization } from '../../models/task.model';
import { ThemeService, THEME_PRESETS, ThemePreset } from '../../services/theme.service';

@Component({
  selector: 'app-avatar-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-purple-900/40 to-slate-900/90 border border-purple-500/20 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-purple-950/40 transition-all duration-300">
      <!-- Glow ambient background effect -->
      <div 
        class="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-all duration-700"
        [ngClass]="getGlowColorClass()"
      ></div>
      <div class="absolute -bottom-10 -right-10 w-36 h-36 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative flex items-center gap-3.5 sm:gap-4">
        <!-- Cute Animated SVG Avatar Container -->
        <div class="relative shrink-0 select-none">
          <div 
            class="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center transition-all duration-500 relative"
            [ngClass]="getAvatarContainerClass()"
          >
            <!-- SVG Interactive Cute Avatar Character -->
            <svg 
              viewBox="0 0 120 120" 
              class="w-full h-full drop-shadow-md overflow-visible"
              [class.animate-breathing]="state === 'idle'"
            >
              <defs>
                <!-- Base Theme Gradients -->
                <linearGradient id="charGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" [attr.stop-color]="getPrimaryThemeColor()"/>
                  <stop offset="100%" [attr.stop-color]="getSecondaryThemeColor()"/>
                </linearGradient>

                <!-- Visor Screen Gradient -->
                <linearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#0f172a"/>
                  <stop offset="100%" stop-color="#1e1b4b"/>
                </linearGradient>

                <!-- Cheek Blush Gradient -->
                <radialGradient id="blushGrad">
                  <stop offset="0%" stop-color="#ff7b92" stop-opacity="0.9"/>
                  <stop offset="100%" stop-color="#ff7b92" stop-opacity="0"/>
                </radialGradient>
              </defs>

              <!-- Pulse Waves for Listening State -->
              @if (state === 'listening') {
                <circle cx="60" cy="62" r="42" fill="none" stroke="#fb7185" stroke-width="2" class="animate-wave-1 opacity-60"/>
                <circle cx="60" cy="62" r="50" fill="none" stroke="#f43f5e" stroke-width="1.5" class="animate-wave-2 opacity-40"/>
              }

              <!-- Orbiting Particles for Thinking State -->
              @if (state === 'thinking') {
                <g class="animate-orbit">
                  <circle cx="60" cy="18" r="3.5" fill="#fde047" opacity="0.9"/>
                  <circle cx="95" cy="60" r="2.5" fill="#c084fc" opacity="0.8"/>
                  <circle cx="25" cy="60" r="2.5" fill="#38bdf8" opacity="0.8"/>
                </g>
              }

              <!-- Confetti / Sparkles for Happy & Excited & Supportive -->
              @if (state === 'happy' || state === 'excited' || state === 'supportive') {
                <g>
                  <text x="14" y="32" font-size="12" fill="#fde047" class="animate-confetti-1">✨</text>
                  <text x="96" y="28" font-size="11" fill="#ec4899" class="animate-confetti-2">🎉</text>
                  <text x="92" y="88" font-size="10" fill="#38bdf8" class="animate-confetti-3">⭐</text>
                </g>
              }

              <!-- BASE TYPE 1: ROBOT 🤖 -->
              @if (activeCustomization.baseType === 'robot') {
                <!-- Left Antenna -->
                <g [class.animate-antenna-left]="state === 'listening'">
                  <path d="M 44 38 Q 32 20 26 14" fill="none" [attr.stroke]="getPrimaryThemeColor()" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="25" cy="13" r="5" [attr.fill]="getSecondaryThemeColor()" class="drop-shadow"/>
                  <circle cx="25" cy="13" r="2" fill="#ffffff" opacity="0.8"/>
                </g>
                <!-- Right Antenna -->
                <g [class.animate-antenna-right]="state === 'listening'">
                  <path d="M 76 38 Q 88 20 94 14" fill="none" [attr.stroke]="getPrimaryThemeColor()" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="95" cy="13" r="5" [attr.fill]="getSecondaryThemeColor()" class="drop-shadow"/>
                  <circle cx="95" cy="13" r="2" fill="#ffffff" opacity="0.8"/>
                </g>
                <!-- Head Chassis -->
                <rect x="24" y="34" width="72" height="64" rx="30" ry="30" fill="url(#charGrad)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
                <!-- Visor Screen -->
                <rect x="30" y="42" width="60" height="48" rx="22" ry="22" fill="url(#visorGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
              }

              <!-- BASE TYPE 2: CUTE KITTY 🐱 -->
              @if (activeCustomization.baseType === 'kitty') {
                <!-- Left Kitty Ear -->
                <polygon points="26,45 42,20 54,42" fill="url(#charGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <polygon points="31,43 42,26 49,41" fill="#f472b6" opacity="0.75"/>
                <!-- Right Kitty Ear -->
                <polygon points="94,45 78,20 66,42" fill="url(#charGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <polygon points="89,43 78,26 71,41" fill="#f472b6" opacity="0.75"/>
                <!-- Head -->
                <circle cx="60" cy="66" r="34" fill="url(#charGrad)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
                <!-- Whiskers -->
                <line x1="22" y1="64" x2="33" y2="66" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                <line x1="21" y1="71" x2="33" y2="70" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                <line x1="98" y1="64" x2="87" y2="66" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                <line x1="99" y1="71" x2="87" y2="70" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
                <!-- Cute Kitty Nose -->
                <polygon points="58,67 62,67 60,69" fill="#fda4af"/>
              }

              <!-- BASE TYPE 3: COZY BEAR 🐻 -->
              @if (activeCustomization.baseType === 'bear') {
                <!-- Left Bear Ear -->
                <circle cx="34" cy="38" r="13" fill="url(#charGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <circle cx="34" cy="38" r="7" fill="#fed7aa" opacity="0.7"/>
                <!-- Right Bear Ear -->
                <circle cx="86" cy="38" r="13" fill="url(#charGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <circle cx="86" cy="38" r="7" fill="#fed7aa" opacity="0.7"/>
                <!-- Head -->
                <circle cx="60" cy="66" r="34" fill="url(#charGrad)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
                <!-- Bear Snout / Muzzle -->
                <ellipse cx="60" cy="72" rx="14" ry="11" fill="#fef3c7" opacity="0.9"/>
                <ellipse cx="60" cy="67" rx="4" ry="2.5" fill="#1e293b"/>
              }

              <!-- BASE TYPE 4: FRIENDLY ALIEN 👾 -->
              @if (activeCustomization.baseType === 'alien') {
                <!-- Top Center Stalk Antenna -->
                <g [class.animate-breathing]="state === 'idle'">
                  <path d="M 60 36 Q 58 20 60 14" fill="none" [attr.stroke]="getPrimaryThemeColor()" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="60" cy="12" r="6" [attr.fill]="getSecondaryThemeColor()" class="drop-shadow"/>
                  <circle cx="60" cy="12" r="2.5" fill="#ffffff" opacity="0.9"/>
                </g>
                <!-- Alien Head Shape -->
                <ellipse cx="60" cy="65" rx="35" ry="32" fill="url(#charGrad)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
              }

              <!-- Cheeks (Blush) -->
              <circle cx="38" cy="71" r="5.5" fill="url(#blushGrad)" [attr.opacity]="getBlushOpacity()"/>
              <circle cx="82" cy="71" r="5.5" fill="url(#blushGrad)" [attr.opacity]="getBlushOpacity()"/>

              <!-- Eyes & Expressions according to State -->
              @if (state === 'idle') {
                <g class="animate-blink">
                  <circle cx="45" cy="58" r="6.5" fill="#f8fafc"/>
                  <circle cx="45" cy="58" r="5" fill="#0f172a"/>
                  <circle cx="43.5" cy="56" r="2" fill="#ffffff"/>
                  <circle cx="46.5" cy="60" r="1" fill="#ffffff"/>

                  <circle cx="75" cy="58" r="6.5" fill="#f8fafc"/>
                  <circle cx="75" cy="58" r="5" fill="#0f172a"/>
                  <circle cx="73.5" cy="56" r="2" fill="#ffffff"/>
                  <circle cx="76.5" cy="60" r="1" fill="#ffffff"/>
                </g>
                <path d="M 55 72 Q 60 76 65 72" fill="none" stroke="#f8fafc" stroke-width="2" stroke-linecap="round"/>
              }

              @if (state === 'listening') {
                <g>
                  <circle cx="45" cy="58" r="7.5" fill="#f43f5e"/>
                  <circle cx="45" cy="58" r="5.5" fill="#0f172a"/>
                  <circle cx="43" cy="56" r="2.5" fill="#ffffff"/>
                  <circle cx="47" cy="60" r="1.2" fill="#fda4af"/>

                  <circle cx="75" cy="58" r="7.5" fill="#f43f5e"/>
                  <circle cx="75" cy="58" r="5.5" fill="#0f172a"/>
                  <circle cx="73" cy="56" r="2.5" fill="#ffffff"/>
                  <circle cx="77" cy="60" r="1.2" fill="#fda4af"/>
                </g>
                <circle cx="60" cy="73" r="3.2" fill="#fda4af" stroke="#ffffff" stroke-width="1"/>
              }

              @if (state === 'thinking') {
                <g>
                  <circle cx="46" cy="54" r="6" fill="#f8fafc"/>
                  <circle cx="47" cy="53" r="4.5" [attr.fill]="getPrimaryThemeColor()"/>
                  <circle cx="46" cy="51.5" r="1.8" fill="#ffffff"/>

                  <circle cx="76" cy="54" r="6" fill="#f8fafc"/>
                  <circle cx="77" cy="53" r="4.5" [attr.fill]="getPrimaryThemeColor()"/>
                  <circle cx="76" cy="51.5" r="1.8" fill="#ffffff"/>
                </g>
                <path d="M 56 73 Q 60 71 64 73" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round"/>
              }

              @if (state === 'happy' || state === 'excited') {
                <g>
                  <path d="M 40 60 Q 46 51 52 60" fill="none" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
                  <path d="M 68 60 Q 74 51 80 60" fill="none" stroke="#fde047" stroke-width="3" stroke-linecap="round"/>
                </g>
                <path d="M 52 70 Q 60 82 68 70 Z" fill="#f43f5e"/>
                <path d="M 52 70 Q 60 82 68 70" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
                <ellipse cx="60" cy="76" rx="4" ry="2" fill="#fda4af"/>
              }

              @if (state === 'supportive') {
                <g>
                  <path d="M 40 59 Q 46 53 52 59" fill="none" stroke="#f472b6" stroke-width="2.5" stroke-linecap="round"/>
                  <path d="M 68 59 Q 74 53 80 59" fill="none" stroke="#f472b6" stroke-width="2.5" stroke-linecap="round"/>
                  <circle cx="46" cy="62" r="1.2" fill="#ffffff"/>
                  <circle cx="74" cy="62" r="1.2" fill="#ffffff"/>
                </g>
                <path d="M 53 72 Q 60 78 67 72" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              }

              @if (state === 'serious') {
                <g>
                  <circle cx="45" cy="58" r="5" fill="#f8fafc"/>
                  <circle cx="45" cy="58" r="3.5" fill="#3b82f6"/>
                  <circle cx="44" cy="57" r="1.5" fill="#ffffff"/>

                  <circle cx="75" cy="58" r="5" fill="#f8fafc"/>
                  <circle cx="75" cy="58" r="3.5" fill="#3b82f6"/>
                  <circle cx="74" cy="57" r="1.5" fill="#ffffff"/>
                </g>
                <path d="M 55 73 L 65 73" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
              }

              <!-- ACCESSORY: GLASSES 👓 -->
              @if (activeCustomization.accessory === 'glasses') {
                <g class="drop-shadow-sm">
                  <!-- Left Frame -->
                  <circle cx="45" cy="58" r="9" fill="rgba(255,255,255,0.15)" stroke="#fbbf24" stroke-width="2"/>
                  <!-- Right Frame -->
                  <circle cx="75" cy="58" r="9" fill="rgba(255,255,255,0.15)" stroke="#fbbf24" stroke-width="2"/>
                  <!-- Bridge -->
                  <path d="M 54 58 Q 60 55 66 58" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round"/>
                  <!-- Temples -->
                  <line x1="36" y1="58" x2="28" y2="55" stroke="#fbbf24" stroke-width="1.8"/>
                  <line x1="84" y1="58" x2="92" y2="55" stroke="#fbbf24" stroke-width="1.8"/>
                </g>
              }

              <!-- ACCESSORY: PARTY HAT 🥳 -->
              @if (activeCustomization.accessory === 'party_hat') {
                <g transform="rotate(12, 60, 25)">
                  <!-- Cone -->
                  <polygon points="50,34 74,34 62,8" fill="#ec4899" stroke="#f43f5e" stroke-width="1"/>
                  <!-- Stripes -->
                  <line x1="53" y1="28" x2="71" y2="28" stroke="#fde047" stroke-width="2.5"/>
                  <line x1="56" y1="20" x2="68" y2="20" stroke="#38bdf8" stroke-width="2.5"/>
                  <!-- Pom-pom -->
                  <circle cx="62" cy="7" r="4.5" fill="#fde047" class="drop-shadow"/>
                </g>
              }

              <!-- ACCESSORY: GAMER HEADSET 🎧 -->
              @if (activeCustomization.accessory === 'headset') {
                <g class="drop-shadow-md">
                  <!-- Arc Headband -->
                  <path d="M 27 60 A 33 33 0 0 1 93 60" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
                  <path d="M 28 60 A 32 32 0 0 1 92 60" fill="none" [attr.stroke]="getPrimaryThemeColor()" stroke-width="2" stroke-linecap="round"/>
                  <!-- Left Earpad -->
                  <rect x="20" y="52" width="8" height="18" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
                  <circle cx="24" cy="61" r="2" fill="#38bdf8"/>
                  <!-- Right Earpad -->
                  <rect x="92" y="52" width="8" height="18" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
                  <circle cx="96" cy="61" r="2" fill="#38bdf8"/>
                  <!-- Mic arm -->
                  <path d="M 24 67 Q 30 78 40 76" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="41" cy="76" r="2.5" fill="#f43f5e"/>
                </g>
              }

              <!-- ACCESSORY: WIZARD STAR ⭐ -->
              @if (activeCustomization.accessory === 'wizard_star') {
                <g class="animate-bounce" style="animation-duration: 2.2s;">
                  <polygon points="60,20 63,27 70,28 65,33 66,40 60,36 54,40 55,33 50,28 57,27" fill="#fde047" stroke="#eab308" stroke-width="1.2" class="drop-shadow-md"/>
                  <circle cx="60" cy="30" r="1.5" fill="#ffffff"/>
                </g>
              }
            </svg>
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
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold tracking-wide text-purple-200">تَسکی (Tasky)</h2>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20">
                {{ getStatusLabel() }}
              </span>
            </div>

            <!-- Customization Studio Trigger Button -->
            <button
              type="button"
              (click)="openStudio()"
              class="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-purple-300 hover:text-white border border-purple-500/30 interactive-spring cursor-pointer shadow-sm transition"
              title="شخصی‌سازی آواتار و تم رنگی"
              aria-label="استودیو آواتار"
            >
              <span>🎨</span>
              <span class="hidden sm:inline">شخصی‌سازی</span>
            </button>
          </div>

          <!-- Glassmorphism Speech bubble text -->
          <div class="relative bg-slate-800/80 rounded-2xl rounded-tr-sm p-3 border border-slate-700/60 shadow-inner backdrop-blur-md">
            <p class="text-sm font-medium text-slate-100 leading-relaxed break-words">
              {{ voiceReply || 'سلام رفیق! آماده‌ام تا صدات رو بشنوم و کارهای قشنگ امروزت رو مرتب کنم. دکمه میکروفون رو بزن!' }}
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

  @Input() state: AvatarState = 'idle';
  @Input() voiceReply: string = '';
  @Input() transcribedText: string = '';
  @Input() customization?: AvatarCustomization;

  @Output() studioClick = new EventEmitter<void>();

  get activeCustomization(): AvatarCustomization {
    return this.customization || this.themeService.customization();
  }

  openStudio(): void {
    this.studioClick.emit();
    this.themeService.openStudio();
  }

  getPrimaryThemeColor(): string {
    const preset = THEME_PRESETS.find((p) => p.id === this.activeCustomization.themeColor);
    return preset ? preset.primaryHex : '#c084fc';
  }

  getSecondaryThemeColor(): string {
    const preset = THEME_PRESETS.find((p) => p.id === this.activeCustomization.themeColor);
    return preset ? preset.secondaryHex : '#7e22ce';
  }

  getBlushOpacity(): number {
    switch (this.state) {
      case 'happy':
      case 'excited':
        return 1.0;
      case 'supportive':
        return 0.85;
      case 'listening':
        return 0.7;
      default:
        return 0.45;
    }
  }

  getGlowColorClass(): string {
    switch (this.state) {
      case 'listening': return 'bg-rose-500/25';
      case 'thinking': return 'bg-amber-500/25';
      case 'excited': return 'bg-orange-500/25';
      case 'happy': return 'bg-emerald-500/25';
      case 'serious': return 'bg-blue-500/25';
      case 'supportive': return 'bg-fuchsia-500/25';
      default: return 'bg-purple-500/15';
    }
  }

  getAvatarContainerClass(): string {
    switch (this.state) {
      case 'listening':
        return 'bg-gradient-to-br from-rose-950/80 to-slate-900 border border-rose-500/40 shadow-rose-900/40 scale-105';
      case 'thinking':
        return 'bg-gradient-to-br from-amber-950/80 to-purple-950/80 border border-amber-500/40 shadow-purple-900/40';
      case 'excited':
        return 'bg-gradient-to-br from-amber-950/80 to-orange-950/80 border border-orange-500/40 shadow-orange-900/40 animate-bounce';
      case 'happy':
        return 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/40 shadow-emerald-900/40';
      case 'serious':
        return 'bg-gradient-to-br from-blue-950/80 to-slate-900 border border-blue-500/40 shadow-blue-900/40';
      case 'supportive':
        return 'bg-gradient-to-br from-fuchsia-950/80 to-slate-900 border border-fuchsia-500/40 shadow-fuchsia-900/40';
      default:
        return 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-purple-500/30 shadow-purple-900/20';
    }
  }

  getStatusDotColor(): string {
    switch (this.state) {
      case 'listening': return 'bg-rose-500';
      case 'thinking': return 'bg-amber-400';
      case 'excited': return 'bg-orange-500';
      case 'happy': return 'bg-emerald-400';
      case 'serious': return 'bg-blue-400';
      case 'supportive': return 'bg-fuchsia-400';
      default: return 'bg-emerald-500';
    }
  }

  getStatusLabel(): string {
    switch (this.state) {
      case 'listening': return 'در حال گوش دادن... 🎙️';
      case 'thinking': return 'در حال تنظیم تسک‌ها... 🔮';
      case 'excited': return 'پرانرژی و مشتاق! 🚀';
      case 'happy': return 'خوشحال و راضی ✨';
      case 'serious': return 'متمرکز و دقیق 🧐';
      case 'supportive': return 'همراه و کنارت 🥰';
      default: return 'آماده و هوشیار 🤖';
    }
  }

  getStatusTitle(): string {
    return this.getStatusLabel();
  }
}
