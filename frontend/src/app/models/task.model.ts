export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'work' | 'study' | 'fitness' | 'health' | 'shopping' | 'personal' | 'rest';
export type TaskIcon = 'briefcase' | 'book' | 'dumbbell' | 'heart' | 'cart' | 'star' | 'coffee' | 'moon' | 'sun';
export type AvatarMood = 'happy' | 'serious' | 'supportive' | 'excited';
export type AvatarState = 'idle' | 'listening' | 'thinking' | AvatarMood;

export interface Task {
  id: number;
  title: string;
  scheduled_time: string;
  duration_minutes: number;
  priority: TaskPriority;
  category: TaskCategory;
  icon: TaskIcon;
  notification_text?: string;
  is_completed: boolean;
  date: string;
  jalali_date?: string;
  jalali_display?: string;
  jalali_day_name?: string;
  created_at?: string;
}

export interface AvatarReaction {
  mood: AvatarMood;
  voice_reply: string;
}

export interface VoiceToPlanResponse {
  voice_log_id: number;
  raw_transcribed_text: string;
  avatar_reaction: AvatarReaction;
  tasks: Task[];
}

export interface JalaliDateTab {
  label: string;
  subLabel?: string;
  dateValue: string;
  isToday?: boolean;
}

export type AvatarBaseType = 'human' | 'robot' | 'kitty' | 'bear' | 'alien';
export type ThemeColor = 'purple' | 'mint' | 'blue' | 'peach' | 'pink';

export type FaceShape = 'round' | 'oval' | 'square' | 'heart';
export type HairStyle =
  | 'long_straight'
  | 'short_casual'
  | 'medium_wavy'
  | 'curly_bob'
  | 'bangs_lob'
  | 'top_bun'
  | 'ponytail'
  | 'buzz_fade'
  | 'braids';
export type EyeShape = 'almond' | 'round_doe' | 'cat_eye' | 'smiling';
export type EyebrowStyle = 'natural_full' | 'arched' | 'straight' | 'thin';
export type MouthExpression = 'gentle_smile' | 'happy_teeth' | 'cool_smirk' | 'neutral' | 'excited';
export type OutfitStyle = 'hoodie' | 'tshirt' | 'blazer' | 'turtleneck' | 'athletic';

export type AvatarAccessory =
  | 'none'
  | 'glasses_round'
  | 'glasses_cat'
  | 'headphones'
  | 'earrings'
  | 'beanie'
  | 'baseball_cap'
  // Legacy aliases
  | 'glasses'
  | 'party_hat'
  | 'headset'
  | 'wizard_star';

export interface AvatarCustomization {
  faceShape: FaceShape;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyeShape: EyeShape;
  eyeColor: string;
  eyebrows: EyebrowStyle;
  mouthExpression: MouthExpression;
  lipColor: string;
  outfitStyle: OutfitStyle;
  outfitColor: string;
  accessory: AvatarAccessory;
  baseType?: AvatarBaseType;
  themeColor?: ThemeColor;
}

export interface SpecialOccasion {
  id: string;
  title: string;
  date: string; // ISO (YYYY-MM-DD) or Jalali date (YYYY-MM-DD or MM-DD)
  type: 'personal' | 'official';
  icon?: string;
  description?: string;
}

export interface UserProfile {
  id?: number;
  name: string;
  wake_time: string;
  sleep_time: string;
  avatar_config: AvatarCustomization;
  ai_guidelines: string;
  catchphrases?: string[];
  occasions?: SpecialOccasion[];
  psychology_profile?: { [key: string]: any };
  xp?: number;
  streak_days?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileSetupPayload {
  name: string;
  wake_time: string;
  sleep_time: string;
  avatar_config: AvatarCustomization;
  catchphrases?: string[];
  occasions?: SpecialOccasion[];
  lifestyle_answers: {
    mainGoal?: string;
    stressLevel?: string;
    aiTone?: string;
    chronotype?: string;
    planningStyle?: string;
    motivationDriver?: string;
    procrastinationStyle?: string;
    focusSpan?: string;
    workLifeBoundary?: string;
    resilienceStyle?: string;
    notificationPreference?: string;
    [key: string]: any;
  };
}

export interface MorningBriefingResponse {
  briefing_text: string;
  audio_script: string;
  tasks_count: number;
  top_task: string;
  user_name: string;
  xp: number;
  streak_days: number;
}
