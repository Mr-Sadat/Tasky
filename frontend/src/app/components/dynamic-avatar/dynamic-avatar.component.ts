import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AvatarCustomization,
  AvatarState,
  FaceShape,
  HairStyle,
  EyeShape,
  EyebrowStyle,
  MouthExpression,
  OutfitStyle,
  AvatarAccessory,
} from '../../models/task.model';
import { DEFAULT_AVATAR_CUSTOMIZATION, sanitizeAvatarConfig } from '../../services/theme.service';

@Component({
  selector: 'app-dynamic-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="relative flex items-center justify-center select-none"
      [style.width.px]="size"
      [style.height.px]="size"
    >
      <svg
        viewBox="0 0 160 160"
        class="w-full h-full drop-shadow-md overflow-visible"
        [class.animate-breathing]="state === 'idle' && costume !== 'sleeping'"
      >
        <defs>
          <!-- Skin Shading / Contour Gradient -->
          <linearGradient [id]="'skinShade_' + uniqueId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" [attr.stop-color]="config().skinTone"/>
            <stop offset="100%" [attr.stop-color]="getDarkerShade(config().skinTone, 0.12)"/>
          </linearGradient>

          <!-- Hair Highlight Gradient -->
          <linearGradient [id]="'hairGrad_' + uniqueId" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" [attr.stop-color]="getLighterShade(config().hairColor, 0.18)"/>
            <stop offset="40%" [attr.stop-color]="config().hairColor"/>
            <stop offset="100%" [attr.stop-color]="getDarkerShade(config().hairColor, 0.25)"/>
          </linearGradient>

          <!-- Outfit Gradient -->
          <linearGradient [id]="'outfitGrad_' + uniqueId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" [attr.stop-color]="getLighterShade(config().outfitColor, 0.15)"/>
            <stop offset="100%" [attr.stop-color]="config().outfitColor"/>
          </linearGradient>

          <!-- Cheek Blush -->
          <radialGradient [id]="'blushGrad_' + uniqueId">
            <stop offset="0%" stop-color="#ff7b92" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#ff7b92" stop-opacity="0"/>
          </radialGradient>

          <!-- Glasses Lens Sheen -->
          <linearGradient [id]="'lensSheen_' + uniqueId" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
            <stop offset="40%" stop-color="#ffffff" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2"/>
          </linearGradient>
        </defs>

        <!-- ==================================================== -->
        <!-- LAYER 1: BACK HAIR (Behind Head & Neck)              -->
        <!-- ==================================================== -->
        @if (config().hairStyle === 'long_straight') {
          <!-- Long straight locks falling behind shoulders -->
          <path
            d="M 44 55 C 36 75, 34 110, 36 142 C 48 144, 60 144, 64 125 C 64 90, 62 70, 62 58 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <path
            d="M 116 55 C 124 75, 126 110, 124 142 C 112 144, 100 144, 96 125 C 96 90, 98 70, 98 58 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
        } @else if (config().hairStyle === 'medium_wavy') {
          <!-- Bouncy flowing waves behind -->
          <path
            d="M 46 58 C 30 75, 32 95, 28 118 C 26 130, 42 136, 52 126 C 60 115, 62 95, 62 68 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <path
            d="M 114 58 C 130 75, 128 95, 132 118 C 134 130, 118 136, 108 126 C 100 115, 98 95, 98 68 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
        } @else if (config().hairStyle === 'curly_bob') {
          <!-- Voluminous curl clouds behind head -->
          <circle cx="42" cy="65" r="15" [attr.fill]="config().hairColor"/>
          <circle cx="38" cy="82" r="14" [attr.fill]="config().hairColor"/>
          <circle cx="44" cy="98" r="13" [attr.fill]="config().hairColor"/>
          <circle cx="118" cy="65" r="15" [attr.fill]="config().hairColor"/>
          <circle cx="122" cy="82" r="14" [attr.fill]="config().hairColor"/>
          <circle cx="116" cy="98" r="13" [attr.fill]="config().hairColor"/>
        } @else if (config().hairStyle === 'top_bun') {
          <!-- High chic messy bun at top -->
          <ellipse cx="80" cy="22" rx="19" ry="16" [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"/>
          <!-- Stray hair wisps -->
          <path d="M 72 26 Q 78 12 88 18" fill="none" [attr.stroke]="getLighterShade(config().hairColor, 0.2)" stroke-width="1.8"/>
        } @else if (config().hairStyle === 'ponytail') {
          <!-- Sleek ponytail swinging to the right -->
          <path
            d="M 94 42 C 115 36, 138 55, 134 88 C 130 110, 120 125, 114 132 C 112 125, 114 105, 118 85 C 120 65, 105 52, 94 46 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <!-- Hair tie band -->
          <ellipse cx="94" cy="44" rx="4" ry="7" fill="#f43f5e" transform="rotate(-25, 94, 44)"/>
        } @else if (config().hairStyle === 'braids') {
          <!-- Box braids falling behind -->
          <line x1="44" y1="58" x2="38" y2="135" [attr.stroke]="config().hairColor" stroke-width="4.5" stroke-dasharray="3,2"/>
          <line x1="50" y1="62" x2="48" y2="138" [attr.stroke]="config().hairColor" stroke-width="4" stroke-dasharray="3,2"/>
          <line x1="116" y1="58" x2="122" y2="135" [attr.stroke]="config().hairColor" stroke-width="4.5" stroke-dasharray="3,2"/>
          <line x1="110" y1="62" x2="112" y2="138" [attr.stroke]="config().hairColor" stroke-width="4" stroke-dasharray="3,2"/>
        }

        <!-- ==================================================== -->
        <!-- LAYER 2: NECK & BODY / UPPER TORSO                   -->
        <!-- ==================================================== -->
        <!-- Neck -->
        <path
          d="M 68 85 L 68 114 L 92 114 L 92 85 Z"
          [attr.fill]="'url(#skinShade_' + uniqueId + ')'"
        />
        <!-- Shadow under chin -->
        <ellipse cx="80" cy="93" rx="14" ry="4" [attr.fill]="getDarkerShade(config().skinTone, 0.2)" opacity="0.45"/>

        <!-- Upper Torso / Shoulders Base -->
        <path
          d="M 28 160 C 28 126, 52 112, 80 112 C 108 112, 132 126, 132 160 Z"
          [attr.fill]="'url(#outfitGrad_' + uniqueId + ')'"
        />

        <!-- ==================================================== -->
        <!-- LAYER 3: OUTFIT STYLES & DETAILS                     -->
        <!-- ==================================================== -->
        @if (config().outfitStyle === 'hoodie') {
          <!-- Cozy Hoodie Collar & Drawstrings -->
          <path
            d="M 60 110 C 66 122, 94 122, 100 110 C 108 124, 88 136, 80 134 C 72 136, 52 124, 60 110 Z"
            [attr.fill]="getDarkerShade(config().outfitColor, 0.15)"
          />
          <path
            d="M 66 112 C 72 126, 88 126, 94 112"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <!-- Drawstrings -->
          <line x1="72" y1="122" x2="72" y2="144" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <line x1="88" y1="122" x2="88" y2="144" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
          <!-- Aglets -->
          <rect x="71" y="142" width="2" height="4" rx="1" fill="#cbd5e1"/>
          <rect x="87" y="142" width="2" height="4" rx="1" fill="#cbd5e1"/>
        } @else if (config().outfitStyle === 'tshirt') {
          <!-- Crewneck T-Shirt Ribbing -->
          <path
            d="M 66 112 C 70 120, 90 120, 94 112"
            fill="none"
            [attr.stroke]="getDarkerShade(config().outfitColor, 0.2)"
            stroke-width="4.5"
            stroke-linecap="round"
          />
          <path
            d="M 66 112 C 70 120, 90 120, 94 112"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        } @else if (config().outfitStyle === 'blazer') {
          <!-- Smart Casual Blazer Lapels & White Undershirt -->
          <polygon points="80,112 68,136 92,136" fill="#f8fafc"/>
          <!-- Left lapel -->
          <polygon points="56,112 72,138 64,160 38,160 44,124" [attr.fill]="getDarkerShade(config().outfitColor, 0.12)"/>
          <!-- Right lapel -->
          <polygon points="104,112 88,138 96,160 122,160 116,124" [attr.fill]="getDarkerShade(config().outfitColor, 0.12)"/>
        } @else if (config().outfitStyle === 'turtleneck') {
          <!-- Cozy Ribbed Turtleneck Collar -->
          <rect
            x="64"
            y="104"
            width="32"
            height="16"
            rx="5"
            [attr.fill]="getDarkerShade(config().outfitColor, 0.18)"
            stroke="rgba(255,255,255,0.2)"
            stroke-width="1"
          />
          <line x1="70" y1="106" x2="70" y2="118" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
          <line x1="76" y1="106" x2="76" y2="118" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
          <line x1="84" y1="106" x2="84" y2="118" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
          <line x1="90" y1="106" x2="90" y2="118" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
        } @else if (config().outfitStyle === 'athletic') {
          <!-- Racerback Athletic Gym Tank with Accent Stripes -->
          <path
            d="M 64 112 C 70 122, 90 122, 96 112 L 102 160 L 58 160 Z"
            [attr.fill]="getLighterShade(config().outfitColor, 0.1)"
          />
          <line x1="68" y1="118" x2="62" y2="160" stroke="#fde047" stroke-width="2.5"/>
          <line x1="92" y1="118" x2="98" y2="160" stroke="#fde047" stroke-width="2.5"/>
        }

        <!-- ==================================================== -->
        <!-- LAYER 4: EARS & EARRINGS                             -->
        <!-- ==================================================== -->
        <!-- Left Ear -->
        <ellipse cx="48" cy="69" rx="6" ry="9" [attr.fill]="config().skinTone"/>
        <path d="M 48 64 Q 45 69 49 74" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.22)" stroke-width="1.2"/>
        <!-- Right Ear -->
        <ellipse cx="112" cy="69" rx="6" ry="9" [attr.fill]="config().skinTone"/>
        <path d="M 112 64 Q 115 69 111 74" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.22)" stroke-width="1.2"/>

        <!-- Accessory: Earrings -->
        @if (config().accessory === 'earrings') {
          <circle cx="46" cy="76" r="3.5" fill="none" stroke="#fbbf24" stroke-width="1.8"/>
          <circle cx="114" cy="76" r="3.5" fill="none" stroke="#fbbf24" stroke-width="1.8"/>
        }

        <!-- ==================================================== -->
        <!-- LAYER 5: HEAD & FACE SHAPES                          -->
        <!-- ==================================================== -->
        @if (config().faceShape === 'round') {
          <!-- Soft, full round cheeks -->
          <path
            d="M 50 62 C 48 38, 112 38, 110 62 C 110 88, 102 102, 80 102 C 58 102, 50 88, 50 62 Z"
            [attr.fill]="'url(#skinShade_' + uniqueId + ')'"
          />
        } @else if (config().faceShape === 'square') {
          <!-- Defined chiseled jawline -->
          <path
            d="M 51 60 C 50 36, 110 36, 109 60 C 109 82, 104 98, 80 102 C 56 98, 51 82, 51 60 Z"
            [attr.fill]="'url(#skinShade_' + uniqueId + ')'"
          />
        } @else if (config().faceShape === 'heart') {
          <!-- V-shape chin with wider forehead -->
          <path
            d="M 48 58 C 47 36, 113 36, 112 58 C 112 80, 96 98, 80 105 C 64 98, 48 80, 48 58 Z"
            [attr.fill]="'url(#skinShade_' + uniqueId + ')'"
          />
        } @else {
          <!-- Default: Elegant Balanced Oval -->
          <path
            d="M 50 60 C 50 36, 110 36, 110 60 C 110 88, 98 103, 80 103 C 62 103, 50 88, 50 60 Z"
            [attr.fill]="'url(#skinShade_' + uniqueId + ')'"
          />
        }

        <!-- Cheeks Blush -->
        <circle cx="58" cy="75" rx="7.5" ry="5.5" [attr.fill]="'url(#blushGrad_' + uniqueId + ')'"/>
        <circle cx="102" cy="75" rx="7.5" ry="5.5" [attr.fill]="'url(#blushGrad_' + uniqueId + ')'"/>

        <!-- Cute Stylized Nose -->
        <path
          d="M 78 70 Q 80 74 83 73"
          fill="none"
          [attr.stroke]="getDarkerShade(config().skinTone, 0.28)"
          stroke-width="1.6"
          stroke-linecap="round"
        />

        <!-- ==================================================== -->
        <!-- LAYER 6: MOUTH & EXPRESSIONS / MOOD                  -->
        <!-- ==================================================== -->
        @if (isSpeaking) {
          <!-- Dynamic Lip-Sync Mouth When TTS is Speaking -->
          <ellipse
            cx="80"
            cy="86"
            rx="6.5"
            ry="4.5"
            [attr.fill]="config().lipColor"
            class="animate-pulse"
            style="animation-duration: 0.25s;"
          />
          <path d="M 76 84 Q 80 83 84 84" fill="#ffffff"/>
        } @else if (config().mouthExpression === 'happy_teeth') {
          <!-- Wide toothful joyous smile -->
          <path
            d="M 71 83 Q 80 96 89 83 Z"
            [attr.fill]="getDarkerShade(config().lipColor, 0.2)"
          />
          <!-- Glistening white upper teeth -->
          <path d="M 72 83 Q 80 88 88 83" fill="#ffffff" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Lower lip edge -->
          <path d="M 70 83 Q 80 97 90 83" fill="none" [attr.stroke]="config().lipColor" stroke-width="2" stroke-linecap="round"/>
        } @else if (config().mouthExpression === 'cool_smirk') {
          <!-- Asymmetrical charismatic smirk -->
          <path
            d="M 73 87 Q 80 86 89 82"
            fill="none"
            [attr.stroke]="config().lipColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <!-- Cheek dimple -->
          <path d="M 90 80 Q 92 82 91 84" fill="none" [attr.stroke]="config().lipColor" stroke-width="1.5" stroke-linecap="round"/>
        } @else if (config().mouthExpression === 'excited') {
          <!-- Expressive excited open smile -->
          <ellipse cx="80" cy="85" rx="6" ry="6.5" [attr.fill]="getDarkerShade(config().lipColor, 0.2)"/>
          <ellipse cx="80" cy="88" rx="4" ry="2.5" fill="#f43f5e"/>
          <path d="M 74 82 Q 80 85 86 82" fill="#ffffff"/>
          <path d="M 74 82 Q 80 94 86 82" fill="none" [attr.stroke]="config().lipColor" stroke-width="2" stroke-linecap="round"/>
        } @else if (config().mouthExpression === 'neutral') {
          <!-- Composed focused neutral line -->
          <line
            x1="74"
            y1="85"
            x2="86"
            y2="85"
            [attr.stroke]="config().lipColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          <!-- Soft bottom lip shadow -->
          <path d="M 76 88 Q 80 90 84 88" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.2)" stroke-width="1.2"/>
        } @else {
          <!-- Default: Gentle warm smile -->
          <path
            d="M 72 84 Q 80 92 88 84"
            fill="none"
            [attr.stroke]="config().lipColor"
            stroke-width="2.6"
            stroke-linecap="round"
          />
          <!-- Soft bottom lip fullness -->
          <path d="M 76 87 Q 80 90 84 87" fill="none" [attr.stroke]="config().lipColor" stroke-width="1.4" opacity="0.75"/>
        }

        <!-- ==================================================== -->
        <!-- LAYER 7: EYES & EYEBALLS                             -->
        <!-- ==================================================== -->
        @if (costume === 'sleeping') {
          <!-- Sleeping Peaceful Curved Eyelashes -->
          <path d="M 61 66 Q 67 73 73 66" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.45)" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M 87 66 Q 93 73 99 66" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.45)" stroke-width="2.8" stroke-linecap="round"/>
        } @else if (config().eyeShape === 'smiling') {
          <!-- Friendly smiling crescent eyes -->
          <path d="M 60 67 Q 67 59 74 67" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.55)" stroke-width="3" stroke-linecap="round"/>
          <path d="M 86 67 Q 93 59 100 67" fill="none" [attr.stroke]="getDarkerShade(config().skinTone, 0.55)" stroke-width="3" stroke-linecap="round"/>
        } @else {
          <!-- Open Interactive Eyes with Sclera, Iris, Pupil and Sparkles -->
          
          <!-- LEFT EYE -->
          <g>
            @if (config().eyeShape === 'cat_eye') {
              <!-- Cat Eye Winged Shape -->
              <path d="M 58 66 Q 67 59 75 66 Q 67 72 58 66 Z" fill="#ffffff" stroke="#18181b" stroke-width="1.2"/>
              <!-- Winged Eyeliner Flick -->
              <path d="M 58 66 Q 55 63 53 62" fill="none" stroke="#18181b" stroke-width="2" stroke-linecap="round"/>
            } @else if (config().eyeShape === 'round_doe') {
              <!-- Round Doe Eye -->
              <ellipse cx="67" cy="65" rx="7.5" ry="6.5" fill="#ffffff" stroke="#18181b" stroke-width="1"/>
            } @else {
              <!-- Almond Eye -->
              <path d="M 59 66 Q 67 59 75 66 Q 67 71 59 66 Z" fill="#ffffff" stroke="#18181b" stroke-width="1"/>
            }

            <!-- Left Iris -->
            <circle cx="67" cy="65" r="4.2" [attr.fill]="config().eyeColor"/>
            <!-- Left Pupil -->
            <circle cx="67" cy="65" r="2.4" fill="#09090b"/>
            <!-- Dual Sparkles -->
            <circle cx="65.5" cy="63.5" r="1.3" fill="#ffffff"/>
            <circle cx="68.2" cy="66.2" r="0.7" fill="#ffffff"/>
            <!-- Upper Eyelid Line -->
            <path d="M 58 65 Q 67 58 75 65" fill="none" stroke="#18181b" stroke-width="1.8" stroke-linecap="round"/>
          </g>

          <!-- RIGHT EYE -->
          <g>
            @if (config().eyeShape === 'cat_eye') {
              <!-- Cat Eye Winged Shape -->
              <path d="M 85 66 Q 93 59 102 66 Q 93 72 85 66 Z" fill="#ffffff" stroke="#18181b" stroke-width="1.2"/>
              <!-- Winged Eyeliner Flick -->
              <path d="M 102 66 Q 105 63 107 62" fill="none" stroke="#18181b" stroke-width="2" stroke-linecap="round"/>
            } @else if (config().eyeShape === 'round_doe') {
              <!-- Round Doe Eye -->
              <ellipse cx="93" cy="65" rx="7.5" ry="6.5" fill="#ffffff" stroke="#18181b" stroke-width="1"/>
            } @else {
              <!-- Almond Eye -->
              <path d="M 85 66 Q 93 59 101 66 Q 93 71 85 66 Z" fill="#ffffff" stroke="#18181b" stroke-width="1"/>
            }

            <!-- Right Iris -->
            <circle cx="93" cy="65" r="4.2" [attr.fill]="config().eyeColor"/>
            <!-- Right Pupil -->
            <circle cx="93" cy="65" r="2.4" fill="#09090b"/>
            <!-- Dual Sparkles -->
            <circle cx="91.5" cy="63.5" r="1.3" fill="#ffffff"/>
            <circle cx="94.2" cy="66.2" r="0.7" fill="#ffffff"/>
            <!-- Upper Eyelid Line -->
            <path d="M 85 65 Q 93 58 102 65" fill="none" stroke="#18181b" stroke-width="1.8" stroke-linecap="round"/>
          </g>
        }

        <!-- ==================================================== -->
        <!-- LAYER 8: EYEBROWS                                    -->
        <!-- ==================================================== -->
        @if (config().eyebrows === 'natural_full') {
          <!-- Full Natural Brows -->
          <path d="M 57 58 Q 66 52 75 56" fill="none" [attr.stroke]="config().hairColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M 85 56 Q 94 52 103 58" fill="none" [attr.stroke]="config().hairColor" stroke-width="3" stroke-linecap="round"/>
        } @else if (config().eyebrows === 'straight') {
          <!-- Straight K-Style Brows -->
          <line x1="58" y1="56" x2="75" y2="56" [attr.stroke]="config().hairColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="85" y1="56" x2="102" y2="56" [attr.stroke]="config().hairColor" stroke-width="2.5" stroke-linecap="round"/>
        } @else if (config().eyebrows === 'thin') {
          <!-- Delicate Thin Brows -->
          <path d="M 58 57 Q 66 53 74 56" fill="none" [attr.stroke]="config().hairColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M 86 56 Q 94 53 102 57" fill="none" [attr.stroke]="config().hairColor" stroke-width="1.5" stroke-linecap="round"/>
        } @else {
          <!-- Arched Clean Brows -->
          <path d="M 58 58 Q 66 50 75 56" fill="none" [attr.stroke]="config().hairColor" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M 85 56 Q 94 50 102 58" fill="none" [attr.stroke]="config().hairColor" stroke-width="2.4" stroke-linecap="round"/>
        }

        <!-- ==================================================== -->
        <!-- LAYER 9: FRONT HAIR & BANGS                          -->
        <!-- ==================================================== -->
        @if (config().hairStyle === 'long_straight') {
          <!-- Sleek middle part with face-framing strands -->
          <path
            d="M 48 55 C 48 30, 112 30, 112 55 C 112 40, 95 34, 80 44 C 65 34, 48 40, 48 55 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <path d="M 49 55 C 47 68, 52 82, 54 94" fill="none" [attr.stroke]="config().hairColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M 111 55 C 113 68, 108 82, 106 94" fill="none" [attr.stroke]="config().hairColor" stroke-width="3" stroke-linecap="round"/>
        } @else if (config().hairStyle === 'short_casual') {
          <!-- Textured short crop with side-swept bangs -->
          <path
            d="M 46 58 C 45 30, 115 30, 114 58 C 112 45, 100 38, 88 44 C 74 38, 56 45, 46 58 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <path d="M 52 46 Q 72 44 86 52" fill="none" [attr.stroke]="config().hairColor" stroke-width="6" stroke-linecap="round"/>
        } @else if (config().hairStyle === 'medium_wavy') {
          <!-- Wavy side fringe -->
          <path
            d="M 46 56 C 45 30, 115 30, 114 56 C 112 40, 96 36, 82 45 C 68 36, 52 40, 46 56 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <path d="M 50 48 Q 65 42 78 50" fill="none" [attr.stroke]="config().hairColor" stroke-width="5" stroke-linecap="round"/>
          <path d="M 82 48 Q 96 42 110 52" fill="none" [attr.stroke]="config().hairColor" stroke-width="4" stroke-linecap="round"/>
        } @else if (config().hairStyle === 'curly_bob') {
          <!-- Front curly bangs -->
          <path
            d="M 46 54 C 45 30, 115 30, 114 54 C 112 42, 98 38, 80 42 C 62 38, 48 42, 46 54 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <!-- Curly ringlets across forehead -->
          <circle cx="62" cy="48" r="7" [attr.fill]="config().hairColor"/>
          <circle cx="74" cy="46" r="7.5" [attr.fill]="config().hairColor"/>
          <circle cx="86" cy="46" r="7.5" [attr.fill]="config().hairColor"/>
          <circle cx="98" cy="48" r="7" [attr.fill]="config().hairColor"/>
        } @else if (config().hairStyle === 'bangs_lob') {
          <!-- Full chic straight blunt bangs -->
          <path
            d="M 46 58 C 45 30, 115 30, 114 58 C 112 36, 48 36, 46 58 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <path
            d="M 52 54 C 62 55, 98 55, 108 54 L 108 45 L 52 45 Z"
            [attr.fill]="config().hairColor"
          />
          <!-- Side locks -->
          <rect x="48" y="52" width="6" height="32" rx="3" [attr.fill]="config().hairColor"/>
          <rect x="106" y="52" width="6" height="32" rx="3" [attr.fill]="config().hairColor"/>
        } @else if (config().hairStyle === 'top_bun') {
          <!-- Clean pulled back front with soft tendrils -->
          <path
            d="M 48 56 C 46 32, 114 32, 112 56 C 108 40, 52 40, 48 56 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <!-- Face framing tendrils -->
          <path d="M 50 56 Q 48 70 52 82" fill="none" [attr.stroke]="config().hairColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M 110 56 Q 112 70 108 82" fill="none" [attr.stroke]="config().hairColor" stroke-width="2" stroke-linecap="round"/>
        } @else if (config().hairStyle === 'ponytail') {
          <!-- Pulled back sporty sleek front -->
          <path
            d="M 48 55 C 46 30, 114 30, 112 55 C 108 38, 52 38, 48 55 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <line x1="60" y1="46" x2="90" y2="38" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        } @else if (config().hairStyle === 'buzz_fade') {
          <!-- Modern clean buzzcut / fade contour -->
          <path
            d="M 48 56 C 46 32, 114 32, 112 56 C 110 42, 50 42, 48 56 Z"
            [attr.fill]="config().hairColor"
            opacity="0.85"
          />
        } @else if (config().hairStyle === 'braids') {
          <!-- Front styled neat braids -->
          <path
            d="M 48 55 C 46 32, 114 32, 112 55 C 108 40, 52 40, 48 55 Z"
            [attr.fill]="'url(#hairGrad_' + uniqueId + ')'"
          />
          <line x1="62" y1="40" x2="56" y2="60" [attr.stroke]="config().hairColor" stroke-width="3" stroke-dasharray="2,2"/>
          <line x1="74" y1="36" x2="70" y2="58" [attr.stroke]="config().hairColor" stroke-width="3" stroke-dasharray="2,2"/>
          <line x1="86" y1="36" x2="90" y2="58" [attr.stroke]="config().hairColor" stroke-width="3" stroke-dasharray="2,2"/>
          <line x1="98" y1="40" x2="104" y2="60" [attr.stroke]="config().hairColor" stroke-width="3" stroke-dasharray="2,2"/>
        }

        <!-- ==================================================== -->
        <!-- LAYER 10: USER ACCESSORIES (Glasses, Hats, etc.)    -->
        <!-- ==================================================== -->
        @if (config().accessory === 'glasses_round' || (costume === 'study' && config().accessory !== 'glasses_cat')) {
          <!-- Trendy Round Thin Gold/Metal Glasses -->
          <g class="drop-shadow-sm">
            <!-- Left lens & frame -->
            <circle cx="67" cy="65" r="9.5" [attr.fill]="'url(#lensSheen_' + uniqueId + ')'" stroke="#f59e0b" stroke-width="1.8"/>
            <!-- Right lens & frame -->
            <circle cx="93" cy="65" r="9.5" [attr.fill]="'url(#lensSheen_' + uniqueId + ')'" stroke="#f59e0b" stroke-width="1.8"/>
            <!-- Bridge -->
            <path d="M 76.5 65 Q 80 62 83.5 65" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
            <!-- Temples -->
            <line x1="57.5" y1="65" x2="48" y2="63" stroke="#f59e0b" stroke-width="1.6"/>
            <line x1="102.5" y1="65" x2="112" y2="63" stroke="#f59e0b" stroke-width="1.6"/>
          </g>
        } @else if (config().accessory === 'glasses_cat') {
          <!-- Chic Tinted Cat-Eye Sunglasses -->
          <g class="drop-shadow-md">
            <!-- Left cat eye frame -->
            <path d="M 56 64 C 55 58, 76 56, 76 65 C 76 72, 60 74, 56 64 Z" fill="#18181b" stroke="#38bdf8" stroke-width="1.2"/>
            <path d="M 58 63 C 58 59, 74 58, 74 64 C 74 70, 62 71, 58 63 Z" [attr.fill]="'url(#lensSheen_' + uniqueId + ')'"/>
            <!-- Right cat eye frame -->
            <path d="M 104 64 C 105 58, 84 56, 84 65 C 84 72, 100 74, 104 64 Z" fill="#18181b" stroke="#38bdf8" stroke-width="1.2"/>
            <path d="M 102 63 C 102 59, 86 58, 86 64 C 86 70, 98 71, 102 63 Z" [attr.fill]="'url(#lensSheen_' + uniqueId + ')'"/>
            <!-- Center Bridge -->
            <line x1="76" y1="63" x2="84" y2="63" stroke="#18181b" stroke-width="2.5"/>
          </g>
        } @else if (config().accessory === 'headphones') {
          <!-- Modern Over-Ear Sport Headphones -->
          <g class="drop-shadow-md">
            <!-- Headband Arch -->
            <path d="M 44 68 A 38 38 0 0 1 116 68" fill="none" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
            <path d="M 44 68 A 37 37 0 0 1 116 68" fill="none" [attr.stroke]="config().outfitColor" stroke-width="2" stroke-linecap="round"/>
            <!-- Left Earcup Cushion -->
            <rect x="38" y="58" width="9" height="20" rx="4.5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
            <circle cx="42.5" cy="68" r="2.5" [attr.fill]="config().outfitColor"/>
            <!-- Right Earcup Cushion -->
            <rect x="113" y="58" width="9" height="20" rx="4.5" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
            <circle cx="117.5" cy="68" r="2.5" [attr.fill]="config().outfitColor"/>
          </g>
        } @else if (config().accessory === 'beanie') {
          <!-- Cozy Ribbed Knit Beanie -->
          <g class="drop-shadow-md">
            <path
              d="M 46 54 C 44 22, 116 22, 114 54 Z"
              [attr.fill]="config().outfitColor"
            />
            <!-- Folded Cuff -->
            <rect
              x="44"
              y="46"
              width="72"
              height="10"
              rx="4"
              [attr.fill]="getDarkerShade(config().outfitColor, 0.2)"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="1"
            />
          </g>
        } @else if (config().accessory === 'baseball_cap') {
          <!-- Sporty Baseball Cap -->
          <g class="drop-shadow-md">
            <!-- Cap Dome -->
            <path d="M 46 52 C 46 26, 114 26, 114 52 Z" [attr.fill]="config().outfitColor"/>
            <!-- Front Brim Visor -->
            <path d="M 42 50 C 44 46, 116 46, 126 55 C 104 57, 56 57, 42 50 Z" [attr.fill]="getDarkerShade(config().outfitColor, 0.25)"/>
            <!-- Button on top -->
            <circle cx="80" cy="27" r="3" [attr.fill]="getDarkerShade(config().outfitColor, 0.35)"/>
          </g>
        }

        <!-- ==================================================== -->
        <!-- LAYER 11: CONTEXTUAL DYNAMIC PROPS & OVERLAYS       -->
        <!-- ==================================================== -->
        @if (costume === 'sleeping') {
          <!-- Nightcap & Zzz Particles -->
          <g class="animate-pulse" style="animation-duration: 3s;">
            <path d="M 48 46 Q 80 16 112 46 Q 105 18 80 14 Q 52 18 48 46 Z" fill="#6366f1" stroke="#4f46e5" stroke-width="1.5"/>
            <path d="M 48 46 C 36 34, 24 50, 22 62" fill="none" stroke="#6366f1" stroke-width="7" stroke-linecap="round"/>
            <circle cx="22" cy="62" r="5" fill="#fde047" class="drop-shadow"/>
            <path d="M 44 46 Q 80 38 116 46" fill="none" stroke="#e0e7ff" stroke-width="4.5" stroke-linecap="round"/>
          </g>
          <g class="select-none pointer-events-none">
            <text x="115" y="28" font-size="12" font-weight="bold" fill="#a5b4fc" class="animate-bounce" style="animation-duration: 2.2s;">z</text>
            <text x="126" y="16" font-size="15" font-weight="bold" fill="#818cf8" class="animate-bounce" style="animation-duration: 2.8s;">Z</text>
          </g>
        } @else if (costume === 'fitness') {
          <!-- Sports Sweatband & Water Bottle -->
          <g class="drop-shadow-sm">
            <rect x="44" y="44" width="72" height="7.5" rx="3.5" fill="#ef4444" stroke="#dc2626" stroke-width="1"/>
            <line x1="47" y1="47.5" x2="113" y2="47.5" stroke="#ffffff" stroke-width="2"/>
          </g>
          <!-- Water Bottle Prop -->
          <g transform="translate(118, 92)" class="drop-shadow-md">
            <rect x="0" y="6" width="14" height="26" rx="4" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>
            <rect x="3" y="2" width="8" height="4" rx="1.5" fill="#e0f2fe"/>
            <line x1="7" y1="0" x2="7" y2="2" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
          </g>
        } @else if (costume === 'study') {
          <!-- Laptop Prop -->
          <g transform="translate(105, 98)" class="drop-shadow-md">
            <rect x="0" y="0" width="24" height="16" rx="2" fill="#334155" stroke="#64748b" stroke-width="1"/>
            <rect x="2" y="2" width="20" height="12" rx="1" fill="#38bdf8" opacity="0.9"/>
            <line x1="5" y1="6" x2="15" y2="6" stroke="#ffffff" stroke-width="1.2"/>
            <line x1="5" y1="9" x2="19" y2="9" stroke="#fde047" stroke-width="1.2"/>
          </g>
        } @else if (costume === 'coffee') {
          <!-- Steaming Mug Prop -->
          <g transform="translate(114, 90)" class="drop-shadow-md">
            <rect x="0" y="8" width="18" height="20" rx="3.5" fill="#f97316" stroke="#ea580c" stroke-width="1"/>
            <path d="M 18 12 Q 25 17 18 22" fill="none" stroke="#ea580c" stroke-width="2.8" stroke-linecap="round"/>
            <ellipse cx="9" cy="9" rx="7" ry="2.5" fill="#78350f"/>
            <!-- Steam curves -->
            <path d="M 6 6 Q 4 1 7 -1" fill="none" stroke="#fed7aa" stroke-width="1.2" stroke-linecap="round" class="animate-pulse" opacity="0.8"/>
            <path d="M 12 6 Q 14 1 11 -1" fill="none" stroke="#fed7aa" stroke-width="1.2" stroke-linecap="round" class="animate-pulse" opacity="0.8" style="animation-delay: 0.5s;"/>
          </g>
        }
      </svg>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `],
})
export class DynamicAvatarComponent {
  @Input() customization: AvatarCustomization | null = null;
  @Input() state: AvatarState = 'idle';
  @Input() costume: 'default' | 'sleeping' | 'fitness' | 'study' | 'coffee' = 'default';
  @Input() isSpeaking: boolean = false;
  @Input() size: number = 140;

  readonly uniqueId = Math.random().toString(36).substring(2, 8);

  readonly config = computed<AvatarCustomization>(() => {
    return sanitizeAvatarConfig(this.customization || DEFAULT_AVATAR_CUSTOMIZATION);
  });

  getDarkerShade(hex: string, percent: number): string {
    return this.adjustColorBrightness(hex, -percent);
  }

  getLighterShade(hex: string, percent: number): string {
    return this.adjustColorBrightness(hex, percent);
  }

  private adjustColorBrightness(hex: string, percent: number): string {
    if (!hex || !hex.startsWith('#')) return hex || '#000000';
    let c = hex.substring(1);
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const num = parseInt(c, 16);
    let r = (num >> 16) + Math.round(255 * percent);
    let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
    let b = (num & 0x0000ff) + Math.round(255 * percent);

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}
