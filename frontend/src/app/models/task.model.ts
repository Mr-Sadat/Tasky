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

export type AvatarBaseType = 'robot' | 'kitty' | 'bear' | 'alien';
export type ThemeColor = 'purple' | 'mint' | 'blue' | 'peach' | 'pink';
export type AvatarAccessory = 'none' | 'glasses' | 'party_hat' | 'headset' | 'wizard_star';

export interface AvatarCustomization {
  baseType: AvatarBaseType;
  themeColor: ThemeColor;
  accessory: AvatarAccessory;
}

export interface UserProfile {
  id?: number;
  name: string;
  wake_time: string;
  sleep_time: string;
  avatar_config: AvatarCustomization;
  ai_guidelines: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileSetupPayload {
  name: string;
  wake_time: string;
  sleep_time: string;
  avatar_config: AvatarCustomization;
  lifestyle_answers: {
    mainGoal?: string;
    stressLevel?: string;
    aiTone?: string;
    [key: string]: any;
  };
}

