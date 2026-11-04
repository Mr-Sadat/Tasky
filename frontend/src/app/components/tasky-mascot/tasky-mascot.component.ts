import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tasky-mascot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="relative inline-flex items-center justify-center select-none"
      [style.width.px]="size"
      [style.height.px]="size"
    >
      <svg
        viewBox="0 0 100 100"
        class="w-full h-full drop-shadow-lg overflow-visible"
      >
        <defs>
          <!-- Mascot Face Radial Gradient -->
          <radialGradient id="mascotFace" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stop-color="#c49eff"/>
            <stop offset="70%" stop-color="#9d6ef8"/>
            <stop offset="100%" stop-color="#8047ea"/>
          </radialGradient>

          <!-- Hair Linear Gradient -->
          <linearGradient id="mascotHair" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#3b2d69"/>
            <stop offset="100%" stop-color="#241b44"/>
          </linearGradient>

          <!-- Star Sparkle Gradient -->
          <linearGradient id="mascotStar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#facc15"/>
          </linearGradient>
        </defs>

        <!-- Body / Neck shadow base -->
        <path d="M 28 88 Q 50 78 72 88 L 74 100 L 26 100 Z" fill="#6d35d9" opacity="0.6"/>

        <!-- Head / Face Circle -->
        <circle cx="50" cy="50" r="38" fill="url(#mascotFace)" filter="drop-shadow(0 4px 10px rgba(128, 71, 234, 0.45))"/>

        <!-- Hair / Cute Pixie Fringe Cut -->
        <path 
          d="M 17 44 C 15 28, 28 16, 50 16 C 72 16, 85 28, 83 44 C 79 32, 68 28, 57 32 C 48 35, 42 27, 34 33 C 26 39, 20 40, 17 44 Z" 
          fill="url(#mascotHair)"
        />

        <!-- Yellow Sparkle Star on Top Right of Hair -->
        <g transform="translate(68, 19) scale(0.9)">
          <path 
            d="M 6 0 Q 7 5 12 6 Q 7 7 6 12 Q 5 7 0 6 Q 5 5 6 0 Z" 
            fill="url(#mascotStar)" 
            filter="drop-shadow(0 0 4px rgba(250, 204, 21, 0.8))"
          />
        </g>

        <!-- Left Eye -->
        <circle cx="37" cy="52" r="3.6" fill="#1e1838"/>
        <circle cx="36" cy="50.8" r="1.1" fill="#ffffff"/>

        <!-- Right Eye -->
        <circle cx="63" cy="52" r="3.6" fill="#1e1838"/>
        <circle cx="62" cy="50.8" r="1.1" fill="#ffffff"/>

        <!-- Soft Rosy Blush Cheeks -->
        <circle cx="29" cy="59" r="5" fill="#f472b6" opacity="0.45"/>
        <circle cx="71" cy="59" r="5" fill="#f472b6" opacity="0.45"/>

        <!-- Cute Smile -->
        <path 
          d="M 42 62 Q 50 71 58 62" 
          fill="none" 
          stroke="#1e1838" 
          stroke-width="2.6" 
          stroke-linecap="round"
        />
      </svg>

      <!-- Online Green Dot Badge -->
      @if (badge === 'online') {
        <span class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#121427]"></span>
        </span>
      }

      <!-- Pink Sparkle Star Pill Badge -->
      @if (badge === 'sparkle') {
        <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-500 border-2 border-[#121427] flex items-center justify-center shadow-md shadow-pink-500/40">
          <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 6.8L21 11.2l-6.6 2.4L12 20.4l-2.4-6.8L3 11.2l6.6-2.4z"/>
          </svg>
        </div>
      }
    </div>
  `
})
export class TaskyMascotComponent {
  @Input() size: number = 80;
  @Input() badge: 'none' | 'online' | 'sparkle' = 'none';
}
