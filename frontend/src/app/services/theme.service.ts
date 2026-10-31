import { Injectable, signal } from '@angular/core';
import { AvatarCustomization, AvatarBaseType, ThemeColor, AvatarAccessory } from '../models/task.model';

const STORAGE_KEY = 'tasky_avatar_customization';

const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
  baseType: 'robot',
  themeColor: 'purple',
  accessory: 'none',
};

export interface ThemePreset {
  id: ThemeColor;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  badgeBg: string;
  borderClass: string;
  textClass: string;
  buttonGrad: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'purple',
    name: 'بنفش نئونی',
    primaryHex: '#a855f7',
    secondaryHex: '#6366f1',
    badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-800/40',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-300',
    buttonGrad: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'mint',
    name: 'نعنایی پاستلی',
    primaryHex: '#10b981',
    secondaryHex: '#0d9488',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-300',
    buttonGrad: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'blue',
    name: 'آبی اقیانوسی',
    primaryHex: '#3b82f6',
    secondaryHex: '#0284c7',
    badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-800/40',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-300',
    buttonGrad: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'peach',
    name: 'هلویی غروب',
    primaryHex: '#f97316',
    secondaryHex: '#d97706',
    badgeBg: 'bg-orange-950/60 text-orange-300 border-orange-800/40',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-300',
    buttonGrad: 'from-orange-500 to-amber-600',
  },
  {
    id: 'pink',
    name: 'صورتی فانتزی',
    primaryHex: '#ec4899',
    secondaryHex: '#e11d48',
    badgeBg: 'bg-pink-950/60 text-pink-300 border-pink-800/40',
    borderClass: 'border-pink-500/30',
    textClass: 'text-pink-300',
    buttonGrad: 'from-pink-500 to-rose-600',
  },
];

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly customization = signal<AvatarCustomization>(DEFAULT_CUSTOMIZATION);
  readonly isStudioOpen = signal<boolean>(false);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AvatarCustomization>;
        const merged: AvatarCustomization = {
          baseType: parsed.baseType || 'robot',
          themeColor: parsed.themeColor || 'purple',
          accessory: parsed.accessory || 'none',
        };
        this.customization.set(merged);
        this.applyThemeToDOM(merged.themeColor);
        return;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }

    this.applyThemeToDOM('purple');
  }

  updateCustomization(updated: Partial<AvatarCustomization>): void {
    const current = this.customization();
    const next: AvatarCustomization = {
      baseType: updated.baseType ?? current.baseType,
      themeColor: updated.themeColor ?? current.themeColor,
      accessory: updated.accessory ?? current.accessory,
    };

    this.customization.set(next);
    this.saveToStorage(next);
    this.applyThemeToDOM(next.themeColor);
  }

  private saveToStorage(val: AvatarCustomization): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }

  private applyThemeToDOM(color: ThemeColor): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', color);

    const preset = THEME_PRESETS.find((p) => p.id === color) || THEME_PRESETS[0];
    root.style.setProperty('--color-primary', preset.primaryHex);
    root.style.setProperty('--color-secondary', preset.secondaryHex);
  }

  getCurrentPreset(): ThemePreset {
    const currentTheme = this.customization().themeColor;
    return THEME_PRESETS.find((p) => p.id === currentTheme) || THEME_PRESETS[0];
  }

  openStudio(): void {
    this.isStudioOpen.set(true);
  }

  closeStudio(): void {
    this.isStudioOpen.set(false);
  }
}
