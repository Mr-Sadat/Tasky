import re
import asyncio
import os
import logging
import datetime
import openai
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Task, VoiceLog, UserProfile
from .serializers import (
    TaskSerializer,
    VoiceLogSerializer,
    VoiceToPlanRequestSerializer,
    UserProfileSerializer,
    ProfileSetupRequestSerializer,
)
from .ai_service import (
    process_voice_to_tasks,
    parse_and_convert_to_gregorian,
    generate_ai_guidelines,
)

logger = logging.getLogger(__name__)


def normalize_persian_text(s: str) -> str:
    """Normalizes Persian/Arabic characters, removes diacritics, ZWNJ, and extra spaces for robust matching."""
    if not s:
        return ""
    # Remove Arabic diacritics / tatweel
    s = re.sub(r'[\u064B-\u065F\u0640]', '', str(s))
    # Replace Arabic kaf and yeh with Persian kaf and yeh
    s = s.replace("ي", "ی").replace("ك", "ک").replace("ى", "ی")
    # Remove zero-width non-joiners and whitespace
    s = s.replace("\u200c", "").replace("\u200d", "").replace(" ", "").lower().strip()
    # Normalize speech transcriptions (e.g. کودنویسی -> کدنویسی)
    s = s.replace("کودنویسی", "کدنویسی")
    return s


class VoiceToPlanView(APIView):
    """
    POST /api/voice-to-plan/
    Accepts audio file (multipart/form-data) or text input (JSON),
    processes it through the AI service, updates existing tasks (if rescheduling/completing/canceling)
    or creates new Task records, and returns the structured response.
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, *args, **kwargs):
        # Extract audio file from request.FILES if present
        audio_file = request.FILES.get("audio") or request.FILES.get("file")
        text_input = request.data.get("text", "")
        current_time_str = request.data.get("current_time", "09:00")
        target_date_str = request.data.get("date")

        # Determine target date
        if target_date_str:
            try:
                target_date = parse_and_convert_to_gregorian(
                    date_str=str(target_date_str),
                    raise_on_error=True
                )
            except ValueError:
                return Response(
                    {"error": "فرمت تاریخ نامعتبر است. از فرمت YYYY-MM-DD یا تقویم جلالی استفاده کنید."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_date = timezone.localdate()

        # Validate that at least audio or text is provided
        if not audio_file and not (text_input and str(text_input).strip()):
            return Response(
                {"error": "لطفاً فایل صوتی یا متن برنامه روزانه را ارسال نمایید."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Query existing tasks for target_date to provide context to the AI
        existing_tasks_qs = list(Task.objects.filter(date=target_date).order_by("scheduled_time"))
        existing_tasks_payload = [
            {
                "id": t.id,
                "title": t.title,
                "scheduled_time": t.scheduled_time.strftime("%H:%M") if t.scheduled_time else "12:00",
                "duration_minutes": t.duration_minutes,
                "is_completed": t.is_completed,
                "date": t.date.isoformat(),
            }
            for t in existing_tasks_qs
        ]

        # Process through AI service with existing tasks context
        ai_result = process_voice_to_tasks(
            audio_file=audio_file,
            text_input=str(text_input) if text_input else None,
            current_time_str=str(current_time_str),
            existing_tasks=existing_tasks_payload,
        )

        # Save VoiceLog
        raw_text = ai_result.get("raw_transcribed_text", "")
        avatar_reaction = ai_result.get("avatar_reaction", {})
        voice_log = VoiceLog.objects.create(
            raw_text=raw_text,
            avatar_mood=avatar_reaction.get("mood", "supportive"),
            avatar_reply=avatar_reaction.get("voice_reply", ""),
        )

        # Comprehensive Reschedule & Modification Intent Detection
        raw_lower = raw_text.lower()
        avatar_reply_lower = str(avatar_reaction.get("voice_reply", "")).lower()
        reschedule_keywords = [
            "بنداز", "بندازش", "بذار", "بذارش", "بگذار", "بگذار برای", "بذار برای",
            "جابه‌جا", "جابجا", "جا به جا", "انتقال", "منتقل",
            "موکول", "عقب", "جلو", "دیرتر", "زودتر",
            "تغییر", "عوض", "ویرایش", "اصلاح", "تعویض",
            "پشیمون", "پشیمان", "نمیخوام", "نمی‌خوام", "کنسل", "انصراف",
            "به جای", "به جا", "جای ساعت", "تنظیم کن برای", "ست کن برای",
        ]
        is_reschedule_intent = (
            any(kw in raw_lower for kw in reschedule_keywords) or
            any(kw in avatar_reply_lower for kw in ["منتقل کردم", "جابه‌جا کردم", "جابجا کردم", "تغییر دادم", "عوض کردم", "تنظیم کردم", "موکول شد"])
        )

        tasks_data = ai_result.get("tasks", [])
        result_tasks = []

        for item in tasks_data:
            time_val = item.get("scheduled_time", "12:00")
            if hasattr(time_val, "strftime"):
                time_val = time_val.strftime("%H:%M")
            elif isinstance(time_val, str):
                time_parts = time_val.split(":")
                if len(time_parts) >= 2:
                    try:
                        time_val = f"{int(time_parts[0]):02d}:{int(time_parts[1]):02d}"
                    except ValueError:
                        time_val = "12:00"
                else:
                    time_val = "12:00"
            else:
                time_val = "12:00"

            icon_val = item.get("icon", "star")
            if hasattr(icon_val, "value"):
                icon_val = icon_val.value
            priority_val = item.get("priority", "medium")
            if hasattr(priority_val, "value"):
                priority_val = priority_val.value
            category_val = item.get("category", "personal")
            if hasattr(category_val, "value"):
                category_val = category_val.value

            action = str(item.get("action", "create")).lower()
            existing_id = item.get("existing_task_id")
            title = str(item.get("title") or "تسک").strip()

            # Resolve task date: check task-specific scheduled_date or jalali_date, else fallback to target_date
            if target_date_str:
                task_date = target_date
            else:
                task_date = parse_and_convert_to_gregorian(
                    date_str=item.get("scheduled_date"),
                    jalali_str=item.get("jalali_date"),
                    default_date=target_date,
                )

            # Match existing task if any
            matched_task = None
            if existing_id:
                matched_task = Task.objects.filter(id=existing_id).first()

            if not matched_task:
                clean_item_title = normalize_persian_text(title)
                norm_raw = normalize_persian_text(raw_text)

                # 1. Exact or normalized title match
                for ex in existing_tasks_qs:
                    norm_ex = normalize_persian_text(ex.title)
                    if norm_ex and norm_item_title and (norm_ex == norm_item_title or norm_ex in norm_item_title or norm_item_title in norm_ex):
                        matched_task = ex
                        break

                # 2. Match if existing task title is explicitly mentioned in user raw voice/text
                if not matched_task and norm_raw:
                    for ex in existing_tasks_qs:
                        norm_ex = normalize_persian_text(ex.title)
                        if len(norm_ex) >= 3 and norm_ex in norm_raw:
                            matched_task = ex
                            break

                # 3. Match common root activity keywords (e.g. شام, ناهار, صبحانه, ورزش, کدنویسی, باشگاه, مطالعه, جلسه)
                if not matched_task:
                    activity_keywords = ["شام", "ناهار", "صبحانه", "ورزش", "کدنویسی", "باشگاه", "مطالعه", "کلاس", "جلسه", "پیاده‌روی", "خواب", "استراحت", "کار"]
                    for kw in activity_keywords:
                        norm_kw = normalize_persian_text(kw)
                        if (norm_kw in clean_item_title or norm_kw in norm_raw):
                            for ex in existing_tasks_qs:
                                norm_ex = normalize_persian_text(ex.title)
                                if norm_kw in norm_ex:
                                    matched_task = ex
                                    break
                            if matched_task:
                                break

            # If action is delete / cancel
            if action in ("delete", "remove", "cancel"):
                if matched_task:
                    matched_task.delete()
                    continue

            # If action is complete / done
            if action in ("complete", "done"):
                if matched_task:
                    matched_task.is_completed = True
                    matched_task.save()
                    result_tasks.append(matched_task)
                    continue

            # Should we update the matched task?
            # Yes, if:
            # - action is explicitly update or reschedule
            # - user intent is rescheduling and we found a matched task
            # - a pending task with matching title already exists on the target date (prevents duplicate tasks!)
            should_update = (
                action in ("update", "reschedule") or
                (is_reschedule_intent and matched_task is not None) or
                (matched_task is not None and not matched_task.is_completed and (
                    normalize_persian_text(matched_task.title) == normalize_persian_text(title) or
                    normalize_persian_text(matched_task.title) in normalize_persian_text(title) or
                    normalize_persian_text(title) in normalize_persian_text(matched_task.title)
                ))
            )

            if should_update and matched_task:
                matched_task.scheduled_time = time_val
                matched_task.date = task_date
                if item.get("duration_minutes"):
                    matched_task.duration_minutes = item.get("duration_minutes")
                if title and title != "تسک روزانه" and title != "تسک":
                    matched_task.title = title
                if item.get("priority"):
                    matched_task.priority = priority_val
                if item.get("category"):
                    matched_task.category = category_val
                if item.get("icon"):
                    matched_task.icon = icon_val
                if item.get("notification_text"):
                    matched_task.notification_text = item.get("notification_text")
                matched_task.save()
                result_tasks.append(matched_task)
                continue

            # Default: Create new task
            task_obj = Task.objects.create(
                title=title or "تسک روزانه",
                scheduled_time=time_val,
                duration_minutes=item.get("duration_minutes", 30),
                priority=priority_val,
                category=category_val,
                icon=icon_val,
                notification_text=item.get("notification_text", ""),
                date=task_date,
                is_completed=False,
            )
            result_tasks.append(task_obj)

        serialized_tasks = TaskSerializer(result_tasks, many=True).data

        return Response(
            {
                "voice_log_id": voice_log.id,
                "raw_transcribed_text": raw_text,
                "avatar_reaction": avatar_reaction,
                "tasks": serialized_tasks,
            },
            status=status.HTTP_201_CREATED,
        )


class TextToSpeechView(APIView):
    """
    GET /api/tts/?text=... or POST /api/tts/
    Generates natural human-like Persian speech MP3 audio using Microsoft Edge Neural TTS (fa-IR-DilaraNeural).
    Falls back to OpenAI/AvalAI tts-1 if Edge-TTS is unavailable.
    """
    def get(self, request, *args, **kwargs):
        text = request.query_params.get("text", "")
        return self._speak(text)

    def post(self, request, *args, **kwargs):
        text = request.data.get("text", "")
        return self._speak(text)

    def _speak(self, text: str):
        if not text or not str(text).strip():
            return Response({"error": "متن جهت تبدیل به صدا الزامی است."}, status=status.HTTP_400_BAD_REQUEST)

        raw_text = str(text).strip()
        # Clean text: remove emojis, markdown, and extra whitespace
        clean_text = re.sub(r'[\U00010000-\U0010ffff]', '', raw_text)
        clean_text = re.sub(r'[*#_`~]', '', clean_text).strip()

        if not clean_text:
            return HttpResponse(status=status.HTTP_204_NO_CONTENT)

        # 1. Primary Engine: Microsoft Edge Neural Persian TTS (fa-IR-DilaraNeural - authentic native Iranian Persian)
        try:
            import edge_tts

            async def generate_edge_tts():
                communicate = edge_tts.Communicate(clean_text[:600], "fa-IR-DilaraNeural")
                chunks = [chunk['data'] async for chunk in communicate.stream() if chunk['type'] == 'audio']
                return b''.join(chunks)

            audio_bytes = asyncio.run(generate_edge_tts())
            if audio_bytes and len(audio_bytes) > 0:
                return HttpResponse(audio_bytes, content_type="audio/mpeg")
        except Exception as edge_err:
            logger.warning(f"Edge-TTS generation failed: {edge_err}. Attempting OpenAI fallback...")

        # 2. Secondary Engine: OpenAI / AvalAI TTS fallback
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.avalai.ir/v1")
        if api_key and api_key != "your_key_here":
            try:
                client = openai.OpenAI(api_key=api_key, base_url=base_url)
                response = client.audio.speech.create(
                    model="tts-1",
                    voice="nova",
                    input=clean_text[:500]
                )
                audio_bytes = response.read() if hasattr(response, "read") else response.content
                return HttpResponse(audio_bytes, content_type="audio/mpeg")
            except Exception as e:
                logger.error(f"Fallback OpenAI TTS error: {e}")

        return HttpResponse(status=status.HTTP_204_NO_CONTENT)


class TaskListCreateView(APIView):
    """
    GET /api/tasks/: Returns tasks for today (or filtered by ?date=YYYY-MM-DD or Jalali date or ?date=all) ordered by scheduled_time.
    POST /api/tasks/: Create a new task manually.
    """
    def get(self, request, *args, **kwargs):
        date_param = request.query_params.get("date")

        if date_param == "all":
            tasks = Task.objects.all()
        elif date_param:
            try:
                query_date = parse_and_convert_to_gregorian(
                    date_str=date_param,
                    raise_on_error=True
                )
                tasks = Task.objects.filter(date=query_date)
            except ValueError:
                return Response(
                    {"error": "فرمت تاریخ نامعتبر است. از YYYY-MM-DD یا تقویم جلالی استفاده کنید."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            today = timezone.localdate()
            tasks = Task.objects.filter(date=today)

        tasks = tasks.order_by("scheduled_time", "created_at")
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskDetailView(APIView):
    """
    GET /api/tasks/<id>/: Retrieve task details.
    PATCH /api/tasks/<id>/: Partial update task fields (e.g. toggle is_completed, reschedule).
    PUT /api/tasks/<id>/: Full update task.
    DELETE /api/tasks/<id>/: Delete a task.
    """
    def get_object(self, pk):
        try:
            return Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return None

    def get(self, request, pk, *args, **kwargs):
        task = self.get_object(pk)
        if not task:
            return Response({"error": "تسک یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk, *args, **kwargs):
        task = self.get_object(pk)
        if not task:
            return Response({"error": "تسک یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk, *args, **kwargs):
        task = self.get_object(pk)
        if not task:
            return Response({"error": "تسک یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = TaskSerializer(task, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        task = self.get_object(pk)
        if not task:
            return Response({"error": "تسک یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileSetupView(APIView):
    """
    POST /api/profile/setup/
    Accepts user's name, times, avatar config, and answers to lifestyle questions.
    Calls LLM to generate 4-5 core rules for scheduling and persona tone.
    Saves generated rules into UserProfile.ai_guidelines.
    """
    def post(self, request, *args, **kwargs):
        serializer = ProfileSetupRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated = serializer.validated_data
        name = validated.get("name", "کاربر")
        wake_time = validated.get("wake_time", "07:00")
        sleep_time = validated.get("sleep_time", "23:00")
        avatar_config = validated.get("avatar_config", {})
        lifestyle_answers = validated.get("lifestyle_answers", {})

        # Generate guidelines via LLM / mock
        ai_guidelines = generate_ai_guidelines(
            name=name,
            wake_time=wake_time,
            sleep_time=sleep_time,
            lifestyle_answers=lifestyle_answers,
        )

        # Get existing or create new primary user profile
        profile = UserProfile.objects.first()
        if not profile:
            profile = UserProfile()

        profile.name = name
        profile.wake_time = wake_time
        profile.sleep_time = sleep_time
        profile.avatar_config = avatar_config
        profile.ai_guidelines = ai_guidelines
        profile.save()

        return Response(UserProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class UserProfileView(APIView):
    """
    GET /api/profile/: Fetch the user profile.
    PUT /api/profile/ or PATCH /api/profile/: Update user profile fields (including name, times, avatar, guidelines).
    """
    def get(self, request, *args, **kwargs):
        profile = UserProfile.objects.first()
        if not profile:
            return Response({"detail": "پروفیلی ثبت نشده است."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserProfileSerializer(profile).data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        profile = UserProfile.objects.first()
        if not profile:
            profile = UserProfile()

        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, *args, **kwargs):
        return self.put(request, *args, **kwargs)
