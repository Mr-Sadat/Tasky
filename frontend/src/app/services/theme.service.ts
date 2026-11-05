import { Injectable, signal } from '@angular/core';
import {
  AvatarCustomization,
  FaceShape,
  HairStyle,
  EyeShape,
  EyebrowStyle,
  MouthExpression,
  OutfitStyle,
  AvatarAccessory,
  ThemeColor,
  AvatarBaseType,
} from '../models/task.model';

const STORAGE_KEY = 'tasky_avatar_customization';

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface ChoiceOption<T = string> {
  id: T;
  label: string;
  subLabel?: string;
  icon?: string;
}

export const SKIN_TONE_OPTIONS: ColorOption[] = [
  { id: '#fce8d5', name: 'روشن مرمری', hex: '#fce8d5' },
  { id: '#f6d2b5', name: 'گندمی هلویی', hex: '#f6d2b5' },
  { id: '#e8b38a', name: 'گندمی طبیعی', hex: '#e8b38a' },
  { id: '#c98d60', name: 'برنزه آفتابی', hex: '#c98d60' },
  { id: '#8d5524', name: 'سبزه گرم', hex: '#8d5524' },
  { id: '#5c3818', name: 'تیره شکلاتی', hex: '#5c3818' },
];

export const FACE_SHAPE_OPTIONS: ChoiceOption<FaceShape>[] = [
  { id: 'oval', label: 'بیضی کلاسیک', subLabel: 'متعادل و جذاب', icon: '🥚' },
  { id: 'round', label: 'گرد و باطراوت', subLabel: 'گونه‌های پر و صمیمی', icon: '⭕' },
  { id: 'square', label: 'زاویه‌دار و شیک', subLabel: 'خط فک کاریزماتیک', icon: '⏹️' },
  { id: 'heart', label: 'قلبی ظریف', subLabel: 'چانه خوش‌فرم V-Shape', icon: '🤍' },
];

export const HAIR_STYLE_OPTIONS: ChoiceOption<HairStyle>[] = [
  { id: 'medium_wavy', label: 'موج‌دار متوسط', subLabel: 'موج‌های لطیف دور صورت', icon: '🌊' },
  { id: 'long_straight', label: 'بلند و لخت', subLabel: 'ریزش نرم روی شانه', icon: '💇‍♀️' },
  { id: 'short_casual', label: 'کوتاه کژوال', subLabel: 'اسپرت، رها و پرانرژی', icon: '✂️' },
  { id: 'curly_bob', label: 'فرفری پرپشت', subLabel: 'حلقه‌های جذاب با حجم بالا', icon: '🌀' },
  { id: 'bangs_lob', label: 'چتری فرانسوی', subLabel: 'مدل چتری صاف روی پیشانی', icon: '🎀' },
  { id: 'top_bun', label: 'گوجه‌ای بالا', subLabel: 'مدرن و فشن با تارهای رها', icon: '👱‍♀️' },
  { id: 'ponytail', label: 'دم‌اسبی اسپرت', subLabel: 'کشیده شده به بالا و شیک', icon: '🐴' },
  { id: 'buzz_fade', label: 'کوتاه فید مدرن', subLabel: 'سایه دور سر و مینیمال', icon: '💈' },
  { id: 'braids', label: 'بافت‌های ریز', subLabel: 'استایل خاص و آرتیستیک', icon: '✨' },
];

export const HAIR_COLOR_OPTIONS: ColorOption[] = [
  { id: '#18181b', name: 'مشکی شب', hex: '#18181b' },
  { id: '#451a03', name: 'قهوه‌ای سوخته', hex: '#451a03' },
  { id: '#78350f', name: 'فندقی عسلی', hex: '#78350f' },
  { id: '#d97706', name: 'بلوند طلایی', hex: '#d97706' },
  { id: '#f43f5e', name: 'صورتی نئونی', hex: '#f43f5e' },
  { id: '#6366f1', name: 'بنفش فانتزی', hex: '#6366f1' },
  { id: '#0ea5e9', name: 'آبی اقیانوسی', hex: '#0ea5e9' },
  { id: '#cbd5e1', name: 'نقره‌ای یخی', hex: '#cbd5e1' },
];

export const EYE_SHAPE_OPTIONS: ChoiceOption<EyeShape>[] = [
  { id: 'almond', label: 'بادامی گیرا', subLabel: 'کلاسیک و متناسب', icon: '👁️' },
  { id: 'round_doe', label: 'درشت و گرد', subLabel: 'نگاه معصوم و درخشان', icon: '👀' },
  { id: 'cat_eye', label: 'کشیده گربه‌ای', subLabel: 'خط چشم شیک رو به بالا', icon: '🐱' },
  { id: 'smiling', label: 'خندان و مهربان', subLabel: 'منحنی‌های صمیمی خوشحال', icon: '😊' },
];

export const EYE_COLOR_OPTIONS: ColorOption[] = [
  { id: '#292524', name: 'قهوه‌ای تیره', hex: '#292524' },
  { id: '#78350f', name: 'عسلی براق', hex: '#78350f' },
  { id: '#047857', name: 'سبز زمردی', hex: '#047857' },
  { id: '#0284c7', name: 'آبی رویال', hex: '#0284c7' },
  { id: '#475569', name: 'طوسی کریستالی', hex: '#475569' },
];

export const EYEBROW_OPTIONS: ChoiceOption<EyebrowStyle>[] = [
  { id: 'arched', label: 'کمانی مرتب', subLabel: 'انحنای جذاب و تمیز', icon: '〰️' },
  { id: 'natural_full', label: 'پرپشت طبیعی', subLabel: 'حالت مویی پهن و مدرن', icon: '📐' },
  { id: 'straight', label: 'صاف کره‌ای', subLabel: 'افقی و ملایم', icon: '➖' },
  { id: 'thin', label: 'باریک ظریف', subLabel: 'خطوط نازک کلاسیک', icon: '✏️' },
];

export const MOUTH_EXPRESSION_OPTIONS: ChoiceOption<MouthExpression>[] = [
  { id: 'gentle_smile', label: 'لبخند آرام', subLabel: 'مهربان، دلنشین و باوقار', icon: '🙂' },
  { id: 'happy_teeth', label: 'خنده پرانرژی', subLabel: 'لبخند باز با دندان‌های درخشان', icon: '😁' },
  { id: 'cool_smirk', label: 'نیشخند باحال', subLabel: 'گوشه لب بازیگوش و کاریزماتیک', icon: '😏' },
  { id: 'excited', label: 'هیجان‌زده و شاد', subLabel: 'دهان باز خوشحال و شگفت‌زده', icon: '😃' },
  { id: 'neutral', label: 'متمرکز و آرام', subLabel: 'حالت خنثی، جدی و باهدف', icon: '😐' },
];

export const LIP_COLOR_OPTIONS: ColorOption[] = [
  { id: '#fb7185', name: 'رز روشن', hex: '#fb7185' },
  { id: '#f43f5e', name: 'سرخابی پرانرژی', hex: '#f43f5e' },
  { id: '#f97316', name: 'هلویی ملایم', hex: '#f97316' },
  { id: '#e11d48', name: 'زرشکی شیک', hex: '#e11d48' },
  { id: '#fda4af', name: 'کالباسی مات', hex: '#fda4af' },
];

export const OUTFIT_STYLE_OPTIONS: ChoiceOption<OutfitStyle>[] = [
  { id: 'hoodie', label: 'هودی اسپرت', subLabel: 'کلاه‌دار و راحت خیابانی', icon: '🧥' },
  { id: 'tshirt', label: 'تی‌شرت کژوال', subLabel: 'یقه گرد مینیمال و شیک', icon: '👕' },
  { id: 'blazer', label: 'کت و پیراهن رسمی', subLabel: 'بیزنس کژوال باکلاس', icon: '👔' },
  { id: 'turtleneck', label: 'پلیور یقه اسکی', subLabel: 'گرم، دنج و آرتیستیک', icon: '🧶' },
  { id: 'athletic', label: 'تاپ ورزشی / جیم', subLabel: 'آماده تمرین و پرتحرک', icon: '🏃' },
];

export const OUTFIT_COLOR_OPTIONS: ColorOption[] = [
  { id: '#6366f1', name: 'نیلی / بنفش نئونی', hex: '#6366f1' },
  { id: '#0d9488', name: 'کله‌غازی زمردی', hex: '#0d9488' },
  { id: '#f43f5e', name: 'رزبری پرجنب‌وجوش', hex: '#f43f5e' },
  { id: '#f97316', name: 'پرتقالی گرم', hex: '#f97316' },
  { id: '#0284c7', name: 'آبی کبالت', hex: '#0284c7' },
  { id: '#1e293b', name: 'مشکی زغالی', hex: '#1e293b' },
];

export const ACCESSORY_OPTIONS: ChoiceOption<AvatarAccessory>[] = [
  { id: 'none', label: 'ساده بدون اکسسوری', subLabel: 'طبیعی و مینیمال', icon: '✨' },
  { id: 'glasses_round', label: 'عینک طبی گرد', subLabel: 'فریم طلایی نازک رترو', icon: '👓' },
  { id: 'glasses_cat', label: 'عینک دودی گربه‌ای', subLabel: 'شیک و ترند اینستاگرامی', icon: '🕶️' },
  { id: 'headphones', label: 'هدفون روگوشی', subLabel: 'اسپرت، آماده موزیک و تمرکز', icon: '🎧' },
  { id: 'earrings', label: 'گوشواره حلقه‌ای', subLabel: 'حلقه طلایی درخشان', icon: '💍' },
  { id: 'beanie', label: 'کلاه بافتنی', subLabel: 'گرم، پاییزی و راحت', icon: '🧢' },
  { id: 'baseball_cap', label: 'کلاه لبه‌دار', subLabel: 'اسپرت و کوچه خیابانی', icon: '🧢' },
];

export const DEFAULT_AVATAR_CUSTOMIZATION: AvatarCustomization = {
  faceShape: 'oval',
  skinTone: '#f6d2b5',
  hairStyle: 'medium_wavy',
  hairColor: '#451a03',
  eyeShape: 'almond',
  eyeColor: '#292524',
  eyebrows: 'arched',
  mouthExpression: 'gentle_smile',
  lipColor: '#fb7185',
  outfitStyle: 'hoodie',
  outfitColor: '#6366f1',
  accessory: 'none',
  baseType: 'human',
  themeColor: 'purple',
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

export function sanitizeAvatarConfig(raw: any): AvatarCustomization {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_AVATAR_CUSTOMIZATION };
  }

  // Map legacy accessories if needed
  let acc: AvatarAccessory = raw.accessory || 'none';
  if (acc === 'glasses') acc = 'glasses_round';
  if (acc === 'headset') acc = 'headphones';

  return {
    faceShape: raw.faceShape || 'oval',
    skinTone: raw.skinTone || '#f6d2b5',
    hairStyle: raw.hairStyle || 'medium_wavy',
    hairColor: raw.hairColor || '#451a03',
    eyeShape: raw.eyeShape || 'almond',
    eyeColor: raw.eyeColor || '#292524',
    eyebrows: raw.eyebrows || 'arched',
    mouthExpression: raw.mouthExpression || 'gentle_smile',
    lipColor: raw.lipColor || '#fb7185',
    outfitStyle: raw.outfitStyle || 'hoodie',
    outfitColor: raw.outfitColor || '#6366f1',
    accessory: acc,
    baseType: raw.baseType || 'human',
    themeColor: raw.themeColor || 'purple',
  };
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly customization = signal<AvatarCustomization>(DEFAULT_AVATAR_CUSTOMIZATION);
  readonly isStudioOpen = signal<boolean>(false);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const sanitized = sanitizeAvatarConfig(parsed);
        this.customization.set(sanitized);
        this.applyThemeToDOM(sanitized.themeColor || 'purple');
        return;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }

    this.applyThemeToDOM('purple');
  }

  updateCustomization(updated: Partial<AvatarCustomization>): void {
    const current = this.customization();
    const next: AvatarCustomization = sanitizeAvatarConfig({
      ...current,
      ...updated,
    });

    this.customization.set(next);
    this.saveToStorage(next);
    this.applyThemeToDOM(next.themeColor || 'purple');
  }

  saveCustomization(full: AvatarCustomization): void {
    const sanitized = sanitizeAvatarConfig(full);
    this.customization.set(sanitized);
    this.saveToStorage(sanitized);
    this.applyThemeToDOM(sanitized.themeColor || 'purple');
  }

  getRandomAvatar(): AvatarCustomization {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    return {
      faceShape: pick(FACE_SHAPE_OPTIONS).id,
      skinTone: pick(SKIN_TONE_OPTIONS).id,
      hairStyle: pick(HAIR_STYLE_OPTIONS).id,
      hairColor: pick(HAIR_COLOR_OPTIONS).id,
      eyeShape: pick(EYE_SHAPE_OPTIONS).id,
      eyeColor: pick(EYE_COLOR_OPTIONS).id,
      eyebrows: pick(EYEBROW_OPTIONS).id,
      mouthExpression: pick(MOUTH_EXPRESSION_OPTIONS).id,
      lipColor: pick(LIP_COLOR_OPTIONS).id,
      outfitStyle: pick(OUTFIT_STYLE_OPTIONS).id,
      outfitColor: pick(OUTFIT_COLOR_OPTIONS).id,
      accessory: pick(ACCESSORY_OPTIONS).id,
      baseType: 'human',
      themeColor: pick(THEME_PRESETS).id,
    };
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
    root.setAttribute('data-accent', color);

    const preset = THEME_PRESETS.find((p) => p.id === color) || THEME_PRESETS[0];
    root.style.setProperty('--color-primary', preset.primaryHex);
    root.style.setProperty('--color-secondary', preset.secondaryHex);
  }

  getCurrentPreset(): ThemePreset {
    const currentTheme = this.customization().themeColor || 'purple';
    return THEME_PRESETS.find((p) => p.id === currentTheme) || THEME_PRESETS[0];
  }

  openStudio(): void {
    this.isStudioOpen.set(true);
  }

  closeStudio(): void {
    this.isStudioOpen.set(false);
  }
}
