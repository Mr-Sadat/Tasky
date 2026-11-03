import os
import io
import re
import json
import logging
import datetime
import jdatetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import openai
from django.utils import timezone

logger = logging.getLogger(__name__)


class PriorityEnum(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class CategoryEnum(str, Enum):
    WORK = "work"
    STUDY = "study"
    FITNESS = "fitness"
    HEALTH = "health"
    SHOPPING = "shopping"
    PERSONAL = "personal"
    REST = "rest"


class IconEnum(str, Enum):
    BRIEFCASE = "briefcase"
    BOOK = "book"
    DUMBBELL = "dumbbell"
    HEART = "heart"
    CART = "cart"
    STAR = "star"
    COFFEE = "coffee"
    MOON = "moon"
    SUN = "sun"


class MoodEnum(str, Enum):
    HAPPY = "happy"
    SERIOUS = "serious"
    SUPPORTIVE = "supportive"
    EXCITED = "excited"


class TaskActionEnum(str, Enum):
    CREATE = "create"
    RESCHEDULE = "reschedule"
    UPDATE = "update"
    DELETE = "delete"
    COMPLETE = "complete"


def parse_and_convert_to_gregorian(
    date_str: Optional[str] = None,
    jalali_str: Optional[str] = None,
    default_date: Optional[datetime.date] = None,
    raise_on_error: bool = False,
) -> Optional[datetime.date]:
    """
    Parses a date string (which may be Jalali like 1405-08-15 or 1405/08/15 with Persian/Arabic digits,
    or Gregorian like 2026-11-06) and returns a standard Gregorian datetime.date.
    If raise_on_error is True, raises ValueError if the string cannot be parsed as a valid date.
    """
    s = (date_str or jalali_str or "").strip()
    if not s:
        if default_date is not None:
            return default_date
        if raise_on_error:
            raise ValueError("Empty date string")
        return datetime.date.today()

    # Normalize Persian and Arabic digits to ASCII digits
    persian_digits = "۰۱۲۳۴۵۶۷۸۹"
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    for i, (p, a) in enumerate(zip(persian_digits, arabic_digits)):
        s = s.replace(p, str(i)).replace(a, str(i))

    m = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', s)
    if m:
        y, m_val, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        # Jalali year range (1300 - 1600)
        if 1300 <= y <= 1600:
            try:
                return jdatetime.date(y, m_val, d).togregorian()
            except (ValueError, TypeError):
                if raise_on_error:
                    raise ValueError(f"Invalid Jalali date: {s}")
                return default_date or datetime.date.today()
        # Gregorian year range (1900 - 2200)
        elif 1900 <= y <= 2200:
            try:
                return datetime.date(y, m_val, d)
            except (ValueError, TypeError):
                if raise_on_error:
                    raise ValueError(f"Invalid Gregorian date: {s}")
                return default_date or datetime.date.today()

    # Match month and day only e.g. "08-15" or "8/15" without year
    m_month_day = re.search(r'\b(\d{1,2})[-/.](\d{1,2})\b', s)
    if m_month_day:
        m_val, d = int(m_month_day.group(1)), int(m_month_day.group(2))
        current_j_year = jdatetime.date.today().year
        try:
            return jdatetime.date(current_j_year, m_val, d).togregorian()
        except (ValueError, TypeError):
            if raise_on_error:
                raise ValueError(f"Invalid Jalali date: {s}")
            return default_date or datetime.date.today()

    if raise_on_error:
        raise ValueError(f"Cannot parse date: {s}")
    return default_date or datetime.date.today()


def get_jalali_info(g_date: Optional[datetime.date] = None) -> dict:
    """Converts a Gregorian date to detailed Jalali formatting info."""
    if not g_date:
        g_date = datetime.date.today()
    try:
        j = jdatetime.date.fromgregorian(date=g_date)
        month_fa = jdatetime.date.j_months_fa[j.month - 1]
        weekday_fa = jdatetime.date.j_weekdays_fa[j.weekday()]
        return {
            "jalali_date": j.strftime("%Y/%m/%d"),
            "jalali_display": f"{j.day} {month_fa}",
            "jalali_full_display": f"{weekday_fa}، {j.day} {month_fa} {j.year}",
            "weekday_fa": weekday_fa,
        }
    except Exception:
        return {
            "jalali_date": "",
            "jalali_display": "",
            "jalali_full_display": "",
            "weekday_fa": "",
        }


def normalize_time_str(val: any, default_time: str = "12:00") -> str:
    """Normalizes any loose time representation (digits or Persian words) into standard 24-hour HH:MM format."""
    if not val:
        return default_time
    val_str = str(val).strip()
    if not val_str:
        return default_time

    # Normalize Persian & Arabic digits
    persian_digits = "۰۱۲۳۴۵۶۷۸۹"
    arabic_digits = "٠١٢٣٤٥٦٧٨٩"
    for i, (p, a) in enumerate(zip(persian_digits, arabic_digits)):
        val_str = val_str.replace(p, str(i)).replace(a, str(i))

    is_night = any(w in val_str for w in ["شب", "عصر", "بعدازظهر", "غروب", "شام"])
    is_half = any(w in val_str for w in ["نیم", "هنویم", "هنویمه"])

    # Match patterns like HH:MM or H:MM
    m = re.search(r'(\d{1,2})[:](\d{1,2})', val_str)
    if m:
        h, mn = int(m.group(1)), int(m.group(2))
        if is_night and 1 <= h <= 11:
            h += 12
        return f"{max(0, min(23, h)):02d}:{max(0, min(59, mn)):02d}"

    # Match single or two digit numbers e.g. "10" or "9"
    m_single = re.search(r'\b(\d{1,2})\b', val_str)
    if m_single:
        h = int(m_single.group(1))
        if is_night and 1 <= h <= 11:
            h += 12
        mn = 30 if is_half else 0
        return f"{max(0, min(23, h)):02d}:{mn:02d}"

    # Persian number words mapping
    word_to_num = {
        "یک": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5, "شش": 6,
        "هفت": 7, "هشت": 8, "نه": 9, "ده": 10, "یازده": 11, "دوازده": 12,
        "سیزده": 13, "چهارده": 14, "پانزده": 15, "شانزده": 16, "هفده": 17,
        "هجده": 18, "نوزده": 19, "بیست": 20, "بیست و یک": 21, "بیست و دو": 22,
        "بیست و سه": 23
    }
    for word, num in sorted(word_to_num.items(), key=lambda x: -len(x[0])):
        if word in val_str:
            h = num
            if is_night and 1 <= h <= 11:
                h += 12
            mn = 30 if is_half else 0
            return f"{max(0, min(23, h)):02d}:{mn:02d}"

    return default_time


def sanitize_icon(val: any) -> IconEnum:
    """Safely maps icons or synonyms to supported IconEnum values, defaulting to STAR."""
    if isinstance(val, IconEnum):
        return val
    if isinstance(val, str):
        cleaned = val.strip().lower()
        mapping = {
            "briefcase": IconEnum.BRIEFCASE, "work": IconEnum.BRIEFCASE, "job": IconEnum.BRIEFCASE,
            "book": IconEnum.BOOK, "study": IconEnum.BOOK, "read": IconEnum.BOOK, "reading": IconEnum.BOOK,
            "dumbbell": IconEnum.DUMBBELL, "gym": IconEnum.DUMBBELL, "fitness": IconEnum.DUMBBELL, "sport": IconEnum.DUMBBELL, "exercise": IconEnum.DUMBBELL,
            "heart": IconEnum.HEART, "health": IconEnum.HEART, "medical": IconEnum.HEART,
            "cart": IconEnum.CART, "shopping": IconEnum.CART, "buy": IconEnum.CART, "store": IconEnum.CART,
            "coffee": IconEnum.COFFEE, "cafe": IconEnum.COFFEE, "tea": IconEnum.COFFEE, "break": IconEnum.COFFEE,
            "moon": IconEnum.MOON, "night": IconEnum.MOON, "sleep": IconEnum.MOON, "bed": IconEnum.MOON,
            "sun": IconEnum.SUN, "morning": IconEnum.SUN, "day": IconEnum.SUN, "wake": IconEnum.SUN,
            "star": IconEnum.STAR,
        }
        if cleaned in mapping:
            return mapping[cleaned]
        try:
            return IconEnum(cleaned)
        except ValueError:
            pass
    return IconEnum.STAR


def sanitize_category(val: any) -> CategoryEnum:
    """Safely maps categories, defaulting to PERSONAL."""
    if isinstance(val, CategoryEnum):
        return val
    if isinstance(val, str):
        cleaned = val.strip().lower()
        mapping = {
            "work": CategoryEnum.WORK,
            "study": CategoryEnum.STUDY,
            "fitness": CategoryEnum.FITNESS,
            "health": CategoryEnum.HEALTH,
            "shopping": CategoryEnum.SHOPPING,
            "personal": CategoryEnum.PERSONAL,
            "rest": CategoryEnum.REST,
        }
        if cleaned in mapping:
            return mapping[cleaned]
    return CategoryEnum.PERSONAL


def sanitize_priority(val: any) -> PriorityEnum:
    """Safely maps priorities, defaulting to MEDIUM."""
    if isinstance(val, PriorityEnum):
        return val
    if isinstance(val, str):
        cleaned = val.strip().lower()
        if cleaned in ("high", "medium", "low"):
            return PriorityEnum(cleaned)
    return PriorityEnum.MEDIUM


def sanitize_mood(val: any) -> MoodEnum:
    """Safely maps mood, defaulting to SUPPORTIVE."""
    if isinstance(val, MoodEnum):
        return val
    if isinstance(val, str):
        cleaned = val.strip().lower()
        if cleaned in ("happy", "serious", "supportive", "excited"):
            return MoodEnum(cleaned)
    return MoodEnum.SUPPORTIVE


class AvatarReaction(BaseModel):
    mood: MoodEnum = Field(
        default=MoodEnum.SUPPORTIVE,
        description="حالت روحی آواتار: happy, serious, supportive, excited"
    )
    voice_reply: str = Field(
        default="برنامه‌هات ثبت شد رفیق! بیا با هم دونه‌دونه جلو ببریمشون.",
        description="یک پاسخ کوتاه، صمیمی، انگیزه بخش و بامزه به زبان فارسی"
    )

    @field_validator("mood", mode="before")
    @classmethod
    def validate_mood(cls, v):
        return sanitize_mood(v)

    @field_validator("voice_reply", mode="before")
    @classmethod
    def validate_voice_reply(cls, v):
        if isinstance(v, str) and v.strip():
            return v.strip()
        return "برنامه‌هات ثبت شد رفیق! بیا با هم دونه‌دونه جلو ببریمشون."


class TaskPlanItem(BaseModel):
    title: str = Field(default="تسک روزانه", description="عنوان شفاف و مختصر تسک به فارسی")
    scheduled_time: str = Field(
        default="12:00",
        description="ساعت شروع به فرمت HH:MM (۲۴ ساعته، مثل 10:30 یا 17:00)"
    )
    scheduled_date: str = Field(
        default="",
        description="Target date in YYYY-MM-DD (Gregorian or Jalali like 1405-08-15)"
    )
    jalali_display_date: str = Field(
        default="",
        description="Friendly Persian date string, e.g. 'امروز', 'فردا', '۱۵ آبان'"
    )
    duration_minutes: int = Field(
        default=30,
        description="مدت زمان تخمینی تسک به دقیقه"
    )
    priority: PriorityEnum = Field(
        default=PriorityEnum.MEDIUM,
        description="اولویت انجام تسک: high, medium, low"
    )
    category: CategoryEnum = Field(
        default=CategoryEnum.PERSONAL,
        description="دسته‌بندی تسک: work, study, fitness, health, shopping, personal, rest"
    )
    icon: IconEnum = Field(
        default=IconEnum.STAR,
        description="آیکون متناسب با موضوع تسک (briefcase, book, dumbbell, heart, cart, star, coffee, moon, sun)"
    )
    notification_text: str = Field(
        default="یادآور تسک",
        description="یک متن نوتیفیکیشن دوستانه و انگیزاننده به فارسی برای یادآوری"
    )
    action: TaskActionEnum = Field(
        default=TaskActionEnum.CREATE,
        description="نوع عملیات: create (ایجاد تسک جدید)، reschedule (جابه‌جایی یا تغییر ساعت تسک موجود)، update (تغییر جزئیات)، delete (حذف/لغو تسک)، complete (انجام شدن)"
    )
    existing_task_id: Optional[int] = Field(
        default=None,
        description="شناسه عددی (ID) تسک موجود در صورت جابه‌جایی، تغییر یا حذف"
    )

    @field_validator("title", mode="before")
    @classmethod
    def validate_title(cls, v):
        if isinstance(v, str) and v.strip():
            return v.strip()
        return "تسک روزانه"

    @field_validator("scheduled_time", mode="before")
    @classmethod
    def validate_scheduled_time(cls, v):
        return normalize_time_str(v, "12:00")

    @field_validator("scheduled_date", mode="before")
    @classmethod
    def validate_scheduled_date(cls, v):
        if isinstance(v, str):
            return v.strip()
        return ""

    @field_validator("jalali_display_date", mode="before")
    @classmethod
    def validate_jalali_display(cls, v):
        if isinstance(v, str):
            return v.strip()
        return ""

    @field_validator("duration_minutes", mode="before")
    @classmethod
    def validate_duration(cls, v):
        try:
            val = int(v)
            if val > 0:
                return val
        except (TypeError, ValueError):
            pass
        return 30

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority_field(cls, v):
        return sanitize_priority(v)

    @field_validator("category", mode="before")
    @classmethod
    def validate_category_field(cls, v):
        return sanitize_category(v)

    @field_validator("icon", mode="before")
    @classmethod
    def validate_icon_field(cls, v):
        return sanitize_icon(v)

    @field_validator("notification_text", mode="before")
    @classmethod
    def validate_notification(cls, v, info=None):
        if isinstance(v, str) and v.strip():
            return v.strip()
        title = "تسک"
        if info and hasattr(info, "data") and isinstance(info.data, dict):
            title = info.data.get("title") or "تسک"
        return f"وقت انجام {title} رسیده!"

    @field_validator("action", mode="before")
    @classmethod
    def validate_action(cls, v):
        if isinstance(v, TaskActionEnum):
            return v
        if isinstance(v, str):
            s = v.strip().lower()
            if s in ("reschedule", "move", "shift", "change_time", "delay"):
                return TaskActionEnum.RESCHEDULE
            if s in ("update", "edit", "modify"):
                return TaskActionEnum.UPDATE
            if s in ("delete", "remove", "cancel"):
                return TaskActionEnum.DELETE
            if s in ("complete", "done", "finish"):
                return TaskActionEnum.COMPLETE
        return TaskActionEnum.CREATE

    @field_validator("existing_task_id", mode="before")
    @classmethod
    def validate_existing_id(cls, v):
        try:
            if v is not None and str(v).strip():
                return int(v)
        except (ValueError, TypeError):
            pass
        return None


class LLMPlanResponse(BaseModel):
    avatar_reaction: AvatarReaction = Field(
        default_factory=AvatarReaction,
        description="واکنش احساسی و کلامی آواتار"
    )
    tasks: List[TaskPlanItem] = Field(
        default_factory=list,
        description="لیست تسک‌های استخراج شده برای برنامه‌ریزی روزانه"
    )

    @field_validator("avatar_reaction", mode="before")
    @classmethod
    def validate_avatar_reaction(cls, v):
        if not v or not isinstance(v, (dict, AvatarReaction)):
            return AvatarReaction()
        return v

    @field_validator("tasks", mode="before")
    @classmethod
    def validate_tasks(cls, v):
        if not v or not isinstance(v, list):
            return []
        return v


class PlanResponse(LLMPlanResponse):
    raw_transcribed_text: str = Field(
        default="",
        description="متن کامل پیاده شده از صدای کاربر یا ورودی متنی"
    )


def soft_parse_llm_json(
    raw_text: str,
    current_time_str: str = "09:00",
    transcribed_text: str = ""
) -> Optional[dict]:
    """
    Attempts a forgiving parse of malformed or non-standard JSON returned by the model.
    Guarantees that user's transcribed voice is preserved and never dropped.
    """
    if not raw_text or not isinstance(raw_text, str):
        return None

    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()

    data = None
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # Try extracting JSON object or array using regex
        match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
        if match:
            try:
                data = json.loads(match.group(1))
            except Exception:
                pass

    if not data or not isinstance(data, (dict, list)):
        return None

    raw_tasks = []
    avatar_reaction = {
        "mood": "supportive",
        "voice_reply": "برنامه‌هات دریافت شد! بیا با هم دونه‌دونه جلو ببریمشون."
    }

    if isinstance(data, list):
        raw_tasks = data
    elif isinstance(data, dict):
        if "tasks" in data and isinstance(data["tasks"], list):
            raw_tasks = data["tasks"]
        elif "plan" in data and isinstance(data["plan"], list):
            raw_tasks = data["plan"]
        elif "items" in data and isinstance(data["items"], list):
            raw_tasks = data["items"]

        if "avatar_reaction" in data and isinstance(data["avatar_reaction"], dict):
            av = data["avatar_reaction"]
            avatar_reaction = {
                "mood": sanitize_mood(av.get("mood")).value,
                "voice_reply": str(av.get("voice_reply") or "برنامه‌هات دریافت شد! بیا با هم جلو ببریمشون.")
            }
        elif "mood" in data or "voice_reply" in data:
            avatar_reaction = {
                "mood": sanitize_mood(data.get("mood")).value,
                "voice_reply": str(data.get("voice_reply") or "برنامه‌هات دریافت شد! بیا با هم جلو ببریمشون.")
            }

    parsed_tasks = []
    for item in raw_tasks:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "تسک روزانه").strip()
        time_val = normalize_time_str(item.get("scheduled_time"), default_time=current_time_str)
        date_val = str(item.get("scheduled_date") or item.get("jalali_date") or "").strip()
        display_date_val = str(item.get("jalali_display_date") or item.get("jalali_display") or "").strip()

        try:
            dur = int(item.get("duration_minutes", 30))
            if dur <= 0:
                dur = 30
        except (ValueError, TypeError):
            dur = 30

        prio = sanitize_priority(item.get("priority")).value
        cat = sanitize_category(item.get("category")).value
        ic = sanitize_icon(item.get("icon")).value
        notif = str(item.get("notification_text") or f"وقت انجام {title} رسیده!").strip()

        act_raw = str(item.get("action") or "create").lower()
        if act_raw in ("reschedule", "move", "shift", "delay"):
            act_val = "reschedule"
        elif act_raw in ("update", "edit"):
            act_val = "update"
        elif act_raw in ("delete", "remove", "cancel"):
            act_val = "delete"
        elif act_raw in ("complete", "done"):
            act_val = "complete"
        else:
            act_val = "create"

        ex_id = item.get("existing_task_id")
        try:
            ex_id = int(ex_id) if ex_id is not None else None
        except (ValueError, TypeError):
            ex_id = None

        parsed_tasks.append({
            "title": title,
            "scheduled_time": time_val,
            "scheduled_date": date_val,
            "jalali_display_date": display_date_val,
            "duration_minutes": dur,
            "priority": prio,
            "category": cat,
            "icon": ic,
            "notification_text": notif,
            "action": act_val,
            "existing_task_id": ex_id,
        })

    # If no tasks could be parsed but user provided transcribed text, generate a fallback task
    if not parsed_tasks and transcribed_text.strip():
        parsed_tasks.append({
            "title": transcribed_text.strip()[:60],
            "scheduled_time": current_time_str,
            "scheduled_date": datetime.date.today().isoformat(),
            "jalali_display_date": "امروز",
            "duration_minutes": 30,
            "priority": "medium",
            "category": "personal",
            "icon": "star",
            "notification_text": f"یادآوری: {transcribed_text.strip()[:60]}",
        })

    return {
        "raw_transcribed_text": transcribed_text,
        "avatar_reaction": avatar_reaction,
        "tasks": parsed_tasks,
    }


def get_user_profile():
    """Safely retrieves the primary UserProfile record if present, avoiding circular imports."""
    try:
        from .models import UserProfile
        return UserProfile.objects.first()
    except Exception as e:
        logger.warning(f"Could not fetch UserProfile: {e}")
        return None


def generate_ai_guidelines(
    name: str = "کاربر",
    wake_time: str = "07:00",
    sleep_time: str = "23:00",
    lifestyle_answers: Optional[dict] = None
) -> str:
    """
    Generates strict core rules (4-5 guidelines) for scheduling and persona tone
    based on the user's lifestyle questionnaire answers and schedule constraints.
    Calls LLM (gemini-2.5-flash or gpt-4o-mini) with prompt:
    'Based on these lifestyle answers, generate a strict set of 4-5 core rules for scheduling and persona tone. Keep it concise.'
    """
    lifestyle_answers = lifestyle_answers or {}
    use_mock = os.getenv("USE_MOCK_AI", "True").lower() in ("true", "1", "yes")
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.avalai.ir/v1")
    ai_model = os.getenv("AI_MODEL", "gemini-2.5-flash")

    # If mock mode or missing API key, return realistic Persian guidelines tailored to answers
    if use_mock or not api_key or api_key == "your_key_here":
        goal = lifestyle_answers.get("mainGoal") or lifestyle_answers.get("main_goal") or lifestyle_answers.get("goal") or "بهره‌وری و رشد فردی"
        stress = lifestyle_answers.get("stressLevel") or lifestyle_answers.get("stress_level") or "متعادل"
        tone = lifestyle_answers.get("aiTone") or lifestyle_answers.get("ai_tone") or "دوست صمیمی و پرانرژی"

        return (
            f"۱. تمام تسک‌ها باید اکیداً در بازه بیداری {name} ({wake_time} الی {sleep_time}) زمان‌بندی شوند و از قرار دادن تسک در ساعات استراحت شبانه پرهیز گردد.\n"
            f"۲. با توجه به هدف اصلی «{goal}»، تسک‌های مرتبط با آن در بالاترین اولویت و در ساعات اوج تمرکز صبحگاهی تنظیم شوند.\n"
            f"۳. متناسب با سطح فشار «{stress}»، بین فعالیت‌های تمرکزی فواصل استراحت کافی (۱۵ تا ۲۰ دقیقه) لحاظ شود تا از فرسودگی ذهنی جلوگیری گردد.\n"
            f"۴. لحن و شخصیت هوش مصنوعی همواره «{tone}» باشد؛ همراه با گفتار دوستانه، انگیزاننده و خطاب قرار دادن کاربر با نام «{name}».\n"
            f"۵. در پایان روز کاری، تسک‌های سبک و آرامش‌بخش برای بازگشت به آرامش پیش از خواب پیشنهاد شود."
        )

    # Live LLM call
    try:
        client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        system_prompt = (
            "You are Tasky's Chief AI Persona & Lifestyle Architect.\n"
            "Based on these lifestyle answers, generate a strict set of 4-5 core rules for scheduling and persona tone. Keep it concise.\n"
            "Format the output strictly in Persian as a clean numbered list (1 to 5). Include the user's name and exact wake/sleep constraints."
        )
        answers_str = json.dumps(lifestyle_answers, ensure_ascii=False)
        user_prompt = (
            f"User Name: {name}\n"
            f"Wake Time: {wake_time}\n"
            f"Sleep Time: {sleep_time}\n"
            f"Lifestyle Questionnaire Answers: {answers_str}"
        )
        completion = client.chat.completions.create(
            model=ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
        )
        guidelines = completion.choices[0].message.content.strip()
        if guidelines.startswith("```"):
            guidelines = re.sub(r"^```[a-zA-Z]*\n?", "", guidelines)
            guidelines = re.sub(r"\n?```$", "", guidelines).strip()
        return guidelines
    except Exception as e:
        logger.error(f"Error generating AI guidelines via LLM: {e}")
        return (
            f"۱. تمام تسک‌ها باید اکیداً در بازه بیداری {name} ({wake_time} الی {sleep_time}) زمان‌بندی شوند.\n"
            f"۲. تسک‌های مهم و با تمرکز بالا در ساعات ابتدایی روز چیده شوند.\n"
            f"۳. لحن هوش مصنوعی با {name} صمیمی، انگیزه‌بخش و پشتیبان باشد.\n"
            f"۴. بازه‌های تنفس و استراحت منظم بین تسک‌های طولانی لحاظ شود."
        )


def get_mock_plan(user_text: Optional[str] = None, profile=None, existing_tasks: Optional[list] = None) -> dict:
    """Returns a realistic Persian plan conforming to the structured output contract, user profile, and existing tasks."""
    profile = profile or get_user_profile()

    user_name = profile.name if profile and profile.name else "رفیق"
    wake_time_str = "07:00"
    sleep_time_str = "23:00"
    if profile:
        if hasattr(profile.wake_time, "strftime"):
            wake_time_str = profile.wake_time.strftime("%H:%M")
        elif profile.wake_time:
            wake_time_str = str(profile.wake_time)[:5]

        if hasattr(profile.sleep_time, "strftime"):
            sleep_time_str = profile.sleep_time.strftime("%H:%M")
        elif profile.sleep_time:
            sleep_time_str = str(profile.sleep_time)[:5]

    transcribed = (
        user_text.strip()
        if user_text and user_text.strip()
        else "امروز می‌خوام ساعت ۱۰ با تیم جلسه هماهنگی داشته باشم، بعدازظهر ساعت ۵ برم ورزش و شب هم نیم ساعت کتاب بخونم."
    )

    # Check if user is asking to reschedule an existing task in mock mode
    if existing_tasks and user_text:
        t_lower = user_text.lower()
        resched_words = ["بنداز", "جابه‌جا", "جابجا", "عقب", "جلو", "تغییر", "ساعت", "پشیمون", "نمیخوام", "بذار", "بگذار", "عوض", "موکول"]
        if any(w in t_lower for w in resched_words):
            for ex in existing_tasks:
                ex_title_lower = ex.get("title", "").lower()
                if (
                    ex_title_lower in t_lower
                    or "کدنویسی" in t_lower
                    or "کودنویسی" in t_lower
                    or "شام" in t_lower
                    or "ورزش" in t_lower
                ):
                    new_time = normalize_time_str(user_text, "10:00")
                    mock_resched = {
                        "raw_transcribed_text": transcribed,
                        "avatar_reaction": {
                            "mood": "supportive",
                            "voice_reply": f"چشم {user_name} جان! زمان تسک «{ex.get('title')}» رو برات تنظیم کردم روی ساعت {new_time} تا با آرامش کامل انجامش بدی. ✨"
                        },
                        "tasks": [
                            {
                                "action": "reschedule",
                                "existing_task_id": ex.get("id"),
                                "title": ex.get("title"),
                                "scheduled_time": new_time,
                                "scheduled_date": "",
                                "jalali_display_date": "امروز",
                                "duration_minutes": ex.get("duration_minutes", 30),
                                "priority": "medium",
                                "category": "work",
                                "icon": "briefcase",
                                "notification_text": f"یادآوری: تسک «{ex.get('title')}» سر ساعت {new_time}!",
                            }
                        ]
                    }
                    validated = PlanResponse(**mock_resched)
                    return validated.model_dump()

    mock_data = {
        "raw_transcribed_text": transcribed,
        "avatar_reaction": {
            "mood": "supportive",
            "voice_reply": f"سلام {user_name} عزیز! برنامه‌هات با در نظر گرفتن بازه فعالیتت ({wake_time_str} تا {sleep_time_str}) تنظیم شد. با هم دونه‌دونه جلو می‌بریم!"
        },
        "tasks": [
            {
                "title": "جلسه کاری و هماهنگی هفتگی تیم",
                "scheduled_time": "10:00",
                "scheduled_date": "",
                "jalali_display_date": "امروز",
                "duration_minutes": 60,
                "priority": "high",
                "category": "work",
                "icon": "briefcase",
                "notification_text": "آماده‌ای برای درخشیدن تو جلسه؟ چند دقیقه دیگه شروع میشه!"
            },
            {
                "title": "تمرین و ورزش باشگاه",
                "scheduled_time": "17:00",
                "scheduled_date": "",
                "jalali_display_date": "امروز",
                "duration_minutes": 45,
                "priority": "medium",
                "category": "fitness",
                "icon": "dumbbell",
                "notification_text": "وقت تحرک و انرژی گرفتنه! بطری آبت رو بردار و شروع کن."
            },
            {
                "title": "مطالعه کتاب و یادداشت نکات",
                "scheduled_time": "21:30",
                "scheduled_date": "",
                "jalali_display_date": "امروز",
                "duration_minutes": 30,
                "priority": "low",
                "category": "study",
                "icon": "book",
                "notification_text": "یک چای گرم بریز و ۳۰ دقیقه برای ذهن قشنگت وقت بذار."
            }
        ]
    }

    validated = PlanResponse(**mock_data)
    return validated.model_dump()


def process_voice_to_tasks(
    audio_file=None,
    text_input: Optional[str] = None,
    current_time_str: str = "09:00",
    profile=None,
    existing_tasks: Optional[list] = None
) -> dict:
    """
    Processes user voice audio or text note into structured daily tasks and avatar reaction.
    Supports USE_MOCK_AI flag as well as live OpenAI / AvalAI / Gemini endpoints.
    Fully understands Persian Jalali calendar dates, schedule constraints, existing tasks, and smart rescheduling.
    """
    profile = profile or get_user_profile()

    use_mock = os.getenv("USE_MOCK_AI", "True").lower() in ("true", "1", "yes")
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.avalai.ir/v1")
    ai_model = os.getenv("AI_MODEL", "gemini-2.5-flash")

    # If mock mode is forced or API key is not configured, return mock plan
    if use_mock or not api_key or api_key == "your_key_here":
        return get_mock_plan(text_input, profile=profile, existing_tasks=existing_tasks)

    try:
        client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url
        )

        transcribed_text = text_input or ""

        # Step 1: Transcribe audio if provided and text was not supplied
        if audio_file and not transcribed_text:
            try:
                if isinstance(audio_file, tuple):
                    file_tuple = audio_file
                else:
                    if hasattr(audio_file, "seek"):
                        audio_file.seek(0)
                    filename = getattr(audio_file, "name", "voice.webm") or "voice.webm"
                    content_type = getattr(audio_file, "content_type", "audio/webm") or "audio/webm"
                    file_bytes = audio_file.read() if hasattr(audio_file, "read") else audio_file
                    file_tuple = (filename, file_bytes, content_type)

                transcription = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=file_tuple,
                    language="fa"
                )
                transcribed_text = getattr(transcription, "text", str(transcription)).strip()
            except Exception as e:
                logger.error(f"Error during audio transcription: {e}")
                return get_mock_plan(f"خطا در پیاده‌سازی صدا: {e}", existing_tasks=existing_tasks)

        if not transcribed_text:
            return get_mock_plan("برنامه روزانه پیش‌فرض", existing_tasks=existing_tasks)

        # Step 2: Calculate both current Gregorian date and Jalali date in local timezone
        now_gregorian = timezone.localdate()
        now_jalali = jdatetime.date.fromgregorian(date=now_gregorian)
        weekday_name_fa = jdatetime.date.j_weekdays_fa[now_jalali.weekday()]
        current_context = (
            f"امروز: {now_jalali.strftime('%Y/%m/%d')} ({weekday_name_fa} - تقویم جلالی/شمسی) "
            f"معادل میلادی: {now_gregorian.strftime('%Y-%m-%d')}"
        )

        # Step 3: Inject UserProfile context if available
        user_profile_context = ""
        user_address = "the user"
        if profile:
            w_time = profile.wake_time.strftime("%H:%M") if hasattr(profile.wake_time, "strftime") else str(profile.wake_time)[:5]
            s_time = profile.sleep_time.strftime("%H:%M") if hasattr(profile.sleep_time, "strftime") else str(profile.sleep_time)[:5]
            user_address = profile.name or "the user"
            user_profile_context = (
                f"\nUSER PROFILE & LIFESTYLE GUIDELINES (MANDATORY TO FOLLOW):\n"
                f"- User Name: {profile.name}\n"
                f"- Wake Time: {w_time} | Sleep Time: {s_time}\n"
                f"- Active Hours Constraint: All daily tasks MUST be strictly scheduled within the user's awake hours ({w_time} to {s_time}). NEVER schedule any tasks during sleep hours!\n"
                f"- Personalized Persona Tone & Core Rules:\n"
                f"{profile.ai_guidelines}\n"
            )

        # Step 4: Inject Existing Tasks Context
        existing_tasks_context = ""
        if existing_tasks:
            lines = []
            for t in existing_tasks:
                tid = t.get("id")
                t_title = t.get("title")
                t_time = t.get("scheduled_time")
                t_dur = t.get("duration_minutes", 30)
                t_status = "تکمیل شده" if t.get("is_completed") else "انجام‌نشده"
                lines.append(f"- شناسه {tid}: «{t_title}» (ساعت {t_time}، مدت {t_dur} دقیقه، وضعیت: {t_status})")

            existing_tasks_context = (
                "\nCURRENT EXISTING TASKS ALREADY IN USER'S SCHEDULE:\n"
                + "\n".join(lines)
                + "\nCRITICAL RULES FOR RESCHEDULING & TASK MODIFICATIONS:\n"
                + "1. If the user mentions moving, delaying, shifting, changing the time, or changing their mind about an existing task:\n"
                + "   Persian examples:\n"
                + "   - 'تسک کدنویسی رو بنداز برای ساعت ۱۰'\n"
                + "   - 'من پشیمون شدم ساعت ۱۰ میخوام شام بخورم'\n"
                + "   - 'تسک شروع کدنویسی رو بذار برای ساعت ده و نیم شب'\n"
                + "   - 'شام رو منتقل کن به ساعت ۲۲'\n"
                + "   - 'الان نمیخوام ورزش کنم، بذار ساعت ۶ عصر'\n"
                + "   - 'ورزش رو تغییر بده'\n"
                + "   RULES:\n"
                + "   - NEVER CREATE A DUPLICATE TASK!\n"
                + "   - You MUST set 'action': 'reschedule' (or 'update')\n"
                + "   - You MUST set 'existing_task_id': the numeric ID of the matching task from the list above.\n"
                + "   - Set 'scheduled_time': the new requested 24-hour time (e.g. '22:00').\n"
                + "   - In 'avatar_reaction.voice_reply', speak warmly in natural, fluent Persian stating that this existing task was rescheduled to the new time.\n"
                + "2. If the user asks to cancel or delete an existing task (e.g. 'کدنویسی رو حذف کن', 'جلسه کنسل شد'):\n"
                + "   - Set 'action': 'delete'\n"
                + "   - Set 'existing_task_id': the matching task ID.\n"
                + "3. If the user says an existing task is finished or completed (e.g. 'کدنویسی انجام شد'):\n"
                + "   - Set 'action': 'complete'\n"
                + "   - Set 'existing_task_id': the matching task ID.\n"
                + "4. If an existing task on the schedule covers the same activity (e.g. dinner/شام, coding/کدنویسی, gym/ورزش), DO NOT create a new task with 'action': 'create' — ALWAYS treat it as a reschedule/update with 'action': 'reschedule' and specify 'existing_task_id'.\n"
                + "5. Only set 'action': 'create' when the user is introducing an entirely NEW activity not already on the schedule.\n"
            )

        # Step 5: System prompt reinforcing Jalali calendar, HH:MM format, and user profile constraints
        system_prompt = (
            "You are Tasky, an adorable, enthusiastic, and highly organized Persian personal assistant avatar.\n"
            "Analyze the user's Persian voice note or text message and extract or update their tasks and schedule.\n\n"
            f"CALENDAR & TIME CONTEXT:\n"
            f"- Current Date: {current_context}\n"
            f"- Current Approximate Time: {current_time_str}\n"
            f"{user_profile_context}\n"
            f"{existing_tasks_context}\n"
            "CRITICAL RULES FOR DATES & CALENDAR:\n"
            "1. The user may mention dates using Persian Jalali calendar (e.g. '۱۵ آبان', 'آخر این ماه', 'اول آذر', '۲۵ اسفند'), relative terms (e.g. 'امروز', 'فردا', 'پس‌فردا', 'سه شنبه', 'شنبه هفته بعد'), or specific days.\n"
            "2. For each task, determine the target date ('scheduled_date' in YYYY-MM-DD format, 'jalali_display_date' friendly Persian label).\n"
            "3. Every single task in 'tasks' MUST have an explicit 'scheduled_time' in 24-hour HH:MM format (e.g. '09:00', '14:30', '20:00'). NEVER leave scheduled_time empty or null.\n"
            "4. Return a JSON object with exactly two keys: 'avatar_reaction' and 'tasks'. Do NOT include 'raw_transcribed_text'.\n"
            f"5. 'avatar_reaction' MUST be an object with 'mood' ('happy', 'serious', 'supportive', or 'excited') and 'voice_reply':\n"
            f"   - A warm, friendly, short, and natural conversational Persian sentence addressed to {user_address}.\n"
            "   - Tone must be authentic, fluent colloquial Iranian Persian (فارسی روان، صمیمی، دلنشین و محاوره‌ای مانند یک دوست صمیمی و پرانرژی؛ از لحن خشک کتابی، ماشینی، اداری یا جملات تکراری کاملاً پرهیز کن).\n"
            "   - If tasks were rescheduled or moved, explicitly confirm that the task was moved/rescheduled to the new time.\n"
            "6. For each task in 'tasks', provide:\n"
            "   - 'action': 'create', 'reschedule', 'update', 'delete', or 'complete'\n"
            "   - 'existing_task_id': integer ID if modifying an existing task, else null\n"
            "   - 'title': concise Persian title\n"
            "   - 'scheduled_time': HH:MM (mandatory, 24-hour format)\n"
            "   - 'scheduled_date': YYYY-MM-DD\n"
            "   - 'jalali_display_date': friendly Persian date label\n"
            "   - 'duration_minutes': integer (default 30)\n"
            "   - 'priority': 'high', 'medium', or 'low'\n"
            "   - 'category': 'work', 'study', 'fitness', 'health', 'shopping', 'personal', or 'rest'\n"
            "   - 'icon': 'briefcase', 'book', 'dumbbell', 'heart', 'cart', 'star', 'coffee', 'moon', or 'sun'\n"
            "   - 'notification_text': cute, encouraging Persian reminder message\n"
        )

        parsed_plan = None
        raw_content = ""

        try:
            completion = client.beta.chat.completions.parse(
                model=ai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcribed_text}
                ],
                response_format=LLMPlanResponse,
            )
            choice = completion.choices[0]
            parsed_plan = getattr(choice.message, "parsed", None)
            raw_content = getattr(choice.message, "content", "") or ""
        except Exception as parse_err:
            logger.warning(f"client.beta.chat.completions.parse encountered an issue: {parse_err}. Attempting fallback...")
            try:
                fallback_comp = client.chat.completions.create(
                    model=ai_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": transcribed_text}
                    ],
                    response_format={"type": "json_object"},
                )
                raw_content = fallback_comp.choices[0].message.content or ""
            except Exception as raw_err:
                logger.error(f"Fallback chat.completions.create also failed: {raw_err}")

        # Check if parsed_plan succeeded
        if parsed_plan:
            plan_dict = parsed_plan.model_dump()
            plan_dict["raw_transcribed_text"] = transcribed_text
            return plan_dict

        # If parsed_plan is None, log raw JSON and perform soft parse
        logger.warning(f"Raw JSON from LLM: {raw_content}")
        soft_parsed = soft_parse_llm_json(
            raw_content,
            current_time_str=current_time_str,
            transcribed_text=transcribed_text
        )
        if soft_parsed:
            return soft_parsed

        # Ultimate fallback: keep user's actual voice note as a task instead of replacing with mock data
        return {
            "raw_transcribed_text": transcribed_text,
            "avatar_reaction": {
                "mood": "supportive",
                "voice_reply": "صدات رو شنیدم و برات ثبت کردم! بیا برنامه‌ت رو بررسی کنیم."
            },
            "tasks": [
                {
                    "title": transcribed_text[:80],
                    "scheduled_time": current_time_str,
                    "scheduled_date": datetime.date.today().isoformat(),
                    "jalali_display_date": "امروز",
                    "duration_minutes": 30,
                    "priority": "medium",
                    "category": "personal",
                    "icon": "star",
                    "notification_text": f"یادآوری: {transcribed_text[:60]}",
                }
            ]
        }

    except Exception as e:
        logger.error(f"Error in process_voice_to_tasks: {e}")
        if transcribed_text:
            return {
                "raw_transcribed_text": transcribed_text,
                "avatar_reaction": {
                    "mood": "supportive",
                    "voice_reply": "برنامه‌ت ثبت شد! بیا با هم چکش کنیم."
                },
                "tasks": [
                    {
                        "title": transcribed_text[:80],
                        "scheduled_time": current_time_str,
                        "scheduled_date": datetime.date.today().isoformat(),
                        "jalali_display_date": "امروز",
                        "duration_minutes": 30,
                        "priority": "medium",
                        "category": "personal",
                        "icon": "star",
                        "notification_text": f"یادآوری: {transcribed_text[:60]}",
                    }
                ]
            }
        return get_mock_plan(text_input or str(e))


def time_to_minutes(time_str: str) -> int:
    """Converts HH:MM string to total minutes since midnight."""
    try:
        norm = normalize_time_str(time_str, "12:00")
        parts = norm.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 12 * 60


def minutes_to_time(minutes: int) -> str:
    """Converts total minutes to 24-hour HH:MM format."""
    m = minutes % (24 * 60)
    h = m // 60
    mn = m % 60
    return f"{h:02d}:{mn:02d}"


def process_panic_reschedule(
    tasks: List[dict],
    current_time_str: str = "15:00",
    reason: str = "برنامه‌ام به هم ریخت",
    profile: Optional[any] = None,
) -> dict:
    """
    Emergency Rescheduling ("Panic Button"):
    Analyzes uncompleted tasks, shifts essential tasks forward starting from current_time_str,
    compresses long/monolithic durations, and defers low-priority non-essential tasks to tomorrow.
    Returns rescheduled and deferred tasks with an empathetic avatar cheer-up response.
    """
    use_mock = os.getenv("USE_MOCK_AI", "True").lower() in ("true", "1", "yes")
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.avalai.ir/v1")
    ai_model = os.getenv("AI_MODEL", "gemini-2.5-flash")

    user_name = "سارا"
    sleep_time_str = "23:00"
    if profile:
        user_name = getattr(profile, "name", "کاربر") or "کاربر"
        s_val = getattr(profile, "sleep_time", "23:00")
        sleep_time_str = s_val.strftime("%H:%M") if hasattr(s_val, "strftime") else str(s_val)[:5]

    norm_current = normalize_time_str(current_time_str, "15:00")
    curr_minutes = time_to_minutes(norm_current)
    sleep_minutes = time_to_minutes(sleep_time_str)
    # If sleep time is around midnight/early morning (e.g. 00:00 - 04:00), treat as past 24:00
    if sleep_minutes < 300:
        sleep_minutes += 1440

    if not tasks:
        return {
            "avatar_reaction": {
                "mood": "supportive",
                "voice_reply": f"عزیزم هیچ تسک انجام‌نشده‌ای برای امروزت نمونده! خیالت راحت باشه و با آرامش استراحت کن. 🌸✨"
            },
            "rescheduled_tasks": [],
            "deferred_tasks": [],
        }

    # Algorithmic calculation (used directly in mock mode, or as fallback)
    # Sort tasks: high priority first, then medium, then low
    priority_weight = {"high": 3, "medium": 2, "low": 1}
    sorted_tasks = sorted(
        tasks,
        key=lambda x: (-priority_weight.get(str(x.get("priority", "medium")).lower(), 2), x.get("scheduled_time", "12:00"))
    )

    rescheduled = []
    deferred = []
    pointer = curr_minutes + 5  # Give 5 minutes breathing room from right now

    for t in sorted_tasks:
        tid = t.get("id")
        t_priority = str(t.get("priority", "medium")).lower()
        orig_dur = t.get("duration_minutes", 30)

        # Defer low priority tasks immediately to tomorrow to relieve stress
        if t_priority == "low":
            deferred.append({
                "id": tid,
                "scheduled_time": "10:30",
                "duration_minutes": orig_dur,
                "deferred_to_tomorrow": True,
            })
            continue

        # If task is long (>= 45m), compress slightly (e.g. by 25%) so it's manageable
        compressed_dur = max(25, int(orig_dur * 0.75)) if orig_dur >= 45 else orig_dur

        # Check if scheduling this task would overflow past sleep time
        if pointer + compressed_dur > sleep_minutes - 15:
            # Overflows past sleep hour, defer to tomorrow
            deferred.append({
                "id": tid,
                "scheduled_time": "11:00",
                "duration_minutes": orig_dur,
                "deferred_to_tomorrow": True,
            })
        else:
            new_time = minutes_to_time(pointer)
            rescheduled.append({
                "id": tid,
                "scheduled_time": new_time,
                "duration_minutes": compressed_dur,
                "deferred_to_tomorrow": False,
            })
            pointer += compressed_dur + 10  # 10 minutes break between tasks

    warm_voice_reply = (
        f"اصلاً نگران نباش {user_name} جان! روزت هنوز تموم نشده. "
        f"کارهای غیرضروری رو منتقل کردم به فردا و بقیه کارهات رو از همین الان مرتب و جمع‌وجور کردم. "
        f"نفس عمیق بکش و بیا با هم پرانرژی شروع کنیم! 🌸✨"
    )

    algorithmic_result = {
        "avatar_reaction": {
            "mood": "supportive",
            "voice_reply": warm_voice_reply,
        },
        "rescheduled_tasks": rescheduled,
        "deferred_tasks": deferred,
    }

    if use_mock or not api_key or api_key == "your_key_here":
        return algorithmic_result

    # If LLM is enabled, attempt LLM call
    try:
        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        system_prompt = (
            "You are Tasky, an empathetic, encouraging Persian personal assistant.\n"
            f"The user hit the PANIC BUTTON because their schedule fell apart ('{reason}') at {norm_current}.\n"
            f"User sleep time: {sleep_time_str}. User Name: {user_name}.\n"
            "Rearrange remaining tasks sequentially from current_time, compress large tasks slightly, "
            "and defer low-priority tasks to tomorrow so the user feels immediate relief.\n"
            "Respond in JSON format with 'avatar_reaction' ('mood': 'supportive', 'voice_reply': sweet, calming colloquial Persian encouragement) "
            "and 'rescheduled_tasks' (list of {id, scheduled_time, duration_minutes}) and 'deferred_tasks' (list of {id, scheduled_time, duration_minutes})."
        )
        completion = client.chat.completions.create(
            model=ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps({"tasks": tasks, "current_time": norm_current}, ensure_ascii=False)}
            ],
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content or ""
        parsed = json.loads(content)
        if "avatar_reaction" in parsed and ("rescheduled_tasks" in parsed or "deferred_tasks" in parsed):
            clean_rescheduled = []
            for r in parsed.get("rescheduled_tasks", []):
                clean_rescheduled.append({
                    "id": r.get("id"),
                    "scheduled_time": normalize_time_str(r.get("scheduled_time"), "15:00"),
                    "duration_minutes": int(r.get("duration_minutes", 30)) if str(r.get("duration_minutes", "")).isdigit() else 30,
                    "deferred_to_tomorrow": False,
                })
            clean_deferred = []
            for d in parsed.get("deferred_tasks", []):
                clean_deferred.append({
                    "id": d.get("id"),
                    "scheduled_time": normalize_time_str(d.get("scheduled_time"), "10:30"),
                    "duration_minutes": int(d.get("duration_minutes", 30)) if str(d.get("duration_minutes", "")).isdigit() else 30,
                    "deferred_to_tomorrow": True,
                })
            return {
                "avatar_reaction": {
                    "mood": parsed["avatar_reaction"].get("mood", "supportive"),
                    "voice_reply": parsed["avatar_reaction"].get("voice_reply", warm_voice_reply),
                },
                "rescheduled_tasks": clean_rescheduled or rescheduled,
                "deferred_tasks": clean_deferred or deferred,
            }
    except Exception as e:
        logger.warning(f"LLM panic reschedule failed, using algorithmic fallback: {e}")

    return algorithmic_result


def process_task_breakdown(
    task: dict,
    profile: Optional[any] = None,
) -> dict:
    """
    Subtask Breakdown for Overwhelming Tasks:
    Takes a complex or long task (e.g. duration >= 45m) and breaks it down into 2 to 4
    actionable, sequential micro-steps (20-30m each).
    """
    use_mock = os.getenv("USE_MOCK_AI", "True").lower() in ("true", "1", "yes")
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.avalai.ir/v1")
    ai_model = os.getenv("AI_MODEL", "gemini-2.5-flash")

    title = task.get("title", "تسک")
    total_dur = task.get("duration_minutes", 60)
    start_time_str = normalize_time_str(task.get("scheduled_time", "10:00"), "10:00")
    start_minutes = time_to_minutes(start_time_str)
    category = task.get("category", "work")
    icon = task.get("icon", "briefcase")
    priority = task.get("priority", "medium")

    # Algorithmic calculation
    if total_dur <= 45:
        step_counts = 2
        durs = [int(total_dur * 0.55), total_dur - int(total_dur * 0.55)]
        step_titles = [
            f"فاز ۱: شروع و پیاده‌سازی بخش اول «{title}»",
            f"فاز ۲: تکمیل و بازبینی نهایی «{title}»",
        ]
    elif total_dur <= 90:
        step_counts = 3
        d1 = max(15, int(total_dur * 0.35))
        d2 = max(20, int(total_dur * 0.40))
        d3 = max(10, total_dur - d1 - d2)
        durs = [d1, d2, d3]
        step_titles = [
            f"فاز ۱: آماده‌سازی و مقدمات «{title}»",
            f"فاز ۲: تمرکز روی بخش اصلی «{title}»",
            f"فاز ۳: جمع‌بندی و کنترل کیفیت «{title}»",
        ]
    else:
        step_counts = 4
        d1 = int(total_dur * 0.25)
        d2 = int(total_dur * 0.30)
        d3 = int(total_dur * 0.25)
        d4 = max(15, total_dur - d1 - d2 - d3)
        durs = [d1, d2, d3, d4]
        step_titles = [
            f"فاز ۱: ساختار و برنامه‌ریزی «{title}»",
            f"فاز ۲: اجرای بخش اول «{title}»",
            f"فاز ۳: توسعه و پیاده‌سازی بخش دوم «{title}»",
            f"فاز ۴: تست نهایی و جمع‌بندی «{title}»",
        ]

    subtasks = []
    pointer = start_minutes
    for i in range(step_counts):
        sub_dur = durs[i]
        subtasks.append({
            "title": step_titles[i],
            "scheduled_time": minutes_to_time(pointer),
            "duration_minutes": sub_dur,
            "priority": priority,
            "category": category,
            "icon": icon,
            "notification_text": f"وقت انجام {step_titles[i]} رسید! با تمرکز شروع کن. ✨",
        })
        pointer += sub_dur

    voice_reply = f"عالی شد! تسک «{title}» رو به {step_counts} مرحله سبک و شفاف تقسیم کردم تا بدون هیچ استرسی انجامش بدی! 🧩✨"

    algorithmic_result = {
        "avatar_reaction": {
            "mood": "excited",
            "voice_reply": voice_reply,
        },
        "subtasks": subtasks,
    }

    if use_mock or not api_key or api_key == "your_key_here":
        return algorithmic_result

    # If LLM is available, invoke LLM for contextual breakdown
    try:
        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        system_prompt = (
            "You are Tasky, an enthusiastic productivity companion.\n"
            f"The user wants to break down the overwhelming task «{title}» ({total_dur} minutes, starting at {start_time_str}).\n"
            "Decompose it into 2 to 4 actionable, sequential micro-steps in fluent colloquial Persian.\n"
            "Each micro-step MUST have: 'title', 'scheduled_time' (sequential in HH:MM), 'duration_minutes' (summing to approximately the original duration), 'priority', 'category', 'icon', 'notification_text'.\n"
            "Return JSON with 'avatar_reaction' ('mood': 'excited', 'voice_reply': upbeat cheering Persian message) and 'subtasks' (list of micro-steps)."
        )
        completion = client.chat.completions.create(
            model=ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(task, ensure_ascii=False)}
            ],
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content or ""
        parsed = json.loads(content)
        if "subtasks" in parsed and len(parsed["subtasks"]) >= 2:
            clean_subtasks = []
            for sub in parsed["subtasks"]:
                dur_raw = str(sub.get("duration_minutes", 20))
                dur_val = int(dur_raw) if dur_raw.isdigit() else 20
                clean_subtasks.append({
                    "title": sub.get("title", f"مرحله از {title}"),
                    "scheduled_time": normalize_time_str(sub.get("scheduled_time"), start_time_str),
                    "duration_minutes": dur_val,
                    "priority": sub.get("priority", priority),
                    "category": sub.get("category", category),
                    "icon": sub.get("icon", icon),
                    "notification_text": sub.get("notification_text", f"یادآور: {sub.get('title')}"),
                })
            return {
                "avatar_reaction": {
                    "mood": parsed.get("avatar_reaction", {}).get("mood", "excited"),
                    "voice_reply": parsed.get("avatar_reaction", {}).get("voice_reply", voice_reply),
                },
                "subtasks": clean_subtasks,
            }
    except Exception as e:
        logger.warning(f"LLM task breakdown failed, using algorithmic fallback: {e}")

    return algorithmic_result



def generate_morning_briefing(
    user_name: str,
    tasks: list,
    date_str: Optional[str] = None,
    profile: Optional[any] = None,
) -> dict:
    """
    Daily Audio Briefing Generator:
    Composes a warm, energetic 2-3 sentence Persian radio-style morning summary
    referencing user name, scheduled tasks, and top priorities.
    """
    use_mock = os.getenv("USE_MOCK_AI", "True").lower() in ("true", "1", "yes")
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.avalai.ir/v1")
    ai_model = os.getenv("AI_MODEL", "gemini-2.5-flash")

    tasks_count = len(tasks)
    top_task = None
    if tasks_count > 0:
        top_task = next((t for t in tasks if t.get("priority") == "high"), tasks[0])

    top_task_title = top_task.get("title", "") if top_task else ""
    top_task_time = str(top_task.get("scheduled_time", ""))[:5] if top_task else ""

    if tasks_count == 0:
        fallback_text = (
            f"صبح زیبات بخیر {user_name} جان! امروز هنوز تسکی در برنامه نداری و روزت کاملاً آزاده. "
            f"هر زمان خواستی دکمه میکروفون رو بزن تا با هم یک روز فوق‌العاده بسازیم!"
        )
    elif tasks_count == 1:
        fallback_text = (
            f"صبح پرانرژیت بخیر {user_name} عزیز! امروز یک تسک مهم داری به اسم «{top_task_title}» برای ساعت {top_task_time}. "
            f"با تمرکز و انگیزه روزت رو شروع کن، تو فوق‌العاده‌ای!"
        )
    else:
        fallback_text = (
            f"صبح بخیر {user_name} جان! امروز رادیو تَسکی همراهته و {tasks_count} تا تسک عالی پیش‌رو داری که مهم‌ترینش «{top_task_title}» در ساعت {top_task_time} هست. "
            f"امروز روز توئه، بزن بریم پرانرژی و موفق پیش ببریم!"
        )

    algorithmic_result = {
        "briefing_text": fallback_text,
        "audio_script": fallback_text,
        "tasks_count": tasks_count,
        "top_task": top_task_title,
        "user_name": user_name,
    }

    if use_mock or not api_key:
        return algorithmic_result

    try:
        task_summaries = []
        for t in tasks[:5]:
            t_time = str(t.get("scheduled_time", ""))[:5]
            t_title = t.get("title", "")
            t_prio = t.get("priority", "medium")
            task_summaries.append(f"- {t_title} (ساعت {t_time}، اولویت: {t_prio})")

        task_list_str = "\n".join(task_summaries) if task_summaries else "هیچ تسکی هنوز ثبت نشده است."

        client = openai.OpenAI(api_key=api_key, base_url=base_url)
        system_prompt = (
            "شما مجری پرانرژی، صمیمی، کاریزماتیک و روحیه بخش «رادیو صبحگاهی تَسکی» هستید.\n"
            "وظیفه شما تهیه یک خلاصه صوتی صبحگاهی پرانرژی و شنیدنی به زبان فارسی در ۲ تا ۳ جمله کوتاه است.\n"
            "قوانین مهم:\n"
            f"۱. حتماً نام کاربر ({user_name}) را در ابتدای سلام بگویید.\n"
            "۲. به تعداد تسک‌های امروز و مهم‌ترین یا اولین تسک اشاره کنید.\n"
            "۳. لحن باید بسیار گرم، گوینده رادیویی صبحگاهی، مثبت و انگیزه‌بخش باشد.\n"
            "۴. از به کار بردن ایموجی در متن خودداری کنید تا برای موتور متن‌به‌صدا (TTS) کاملاً روان و طبیعی خوانده شود.\n"
            "۵. خروجی فقط و فقط متن خام خلاصه صبحگاهی باشد بدون هیچ توضیح اضافی یا پیشوند."
        )

        user_prompt = (
            f"نام کاربر: {user_name}\n"
            f"لیست تسک‌های امروز:\n{task_list_str}\n\n"
            "لطفاً خلاصه صوتی صبحگاهی رادیویی ۲ الی ۳ جمله‌ای را آماده کن."
        )

        response = client.chat.completions.create(
            model=ai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=300,
        )

        llm_text = response.choices[0].message.content.strip() if response.choices else ""
        llm_text = llm_text.replace('"', '').replace('`', '').strip()
        if len(llm_text) >= 20:
            return {
                "briefing_text": llm_text,
                "audio_script": llm_text,
                "tasks_count": tasks_count,
                "top_task": top_task_title,
                "user_name": user_name,
            }
    except Exception as e:
        logger.warning(f"LLM morning briefing generation failed, using fallback: {e}")

    return algorithmic_result
