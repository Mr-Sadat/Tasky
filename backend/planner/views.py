import datetime
from django.utils import timezone
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


class VoiceToPlanView(APIView):
    """
    POST /api/voice-to-plan/
    Accepts audio file (multipart/form-data) or text input (JSON),
    processes it through the AI service, creates VoiceLog and Task records in SQLite,
    and returns the structured response with task database IDs.
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

        # Process through AI service
        ai_result = process_voice_to_tasks(
            audio_file=audio_file,
            text_input=str(text_input) if text_input else None,
            current_time_str=str(current_time_str),
        )

        # Save VoiceLog
        raw_text = ai_result.get("raw_transcribed_text", "")
        avatar_reaction = ai_result.get("avatar_reaction", {})
        voice_log = VoiceLog.objects.create(
            raw_text=raw_text,
            avatar_mood=avatar_reaction.get("mood", "supportive"),
            avatar_reply=avatar_reaction.get("voice_reply", ""),
        )

        # Save extracted Task items
        tasks_data = ai_result.get("tasks", [])
        created_tasks = []
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

            # Resolve task date: check task-specific scheduled_date or jalali_date, else fallback to target_date
            if target_date_str:
                task_date = target_date
            else:
                task_date = parse_and_convert_to_gregorian(
                    date_str=item.get("scheduled_date"),
                    jalali_str=item.get("jalali_date"),
                    default_date=target_date,
                )

            task_obj = Task.objects.create(
                title=item.get("title", "تسک بدون عنوان"),
                scheduled_time=time_val,
                duration_minutes=item.get("duration_minutes", 30),
                priority=priority_val,
                category=category_val,
                icon=icon_val,
                notification_text=item.get("notification_text", ""),
                date=task_date,
                is_completed=False,
            )
            created_tasks.append(task_obj)

        serialized_tasks = TaskSerializer(created_tasks, many=True).data

        return Response(
            {
                "voice_log_id": voice_log.id,
                "raw_transcribed_text": raw_text,
                "avatar_reaction": avatar_reaction,
                "tasks": serialized_tasks,
            },
            status=status.HTTP_201_CREATED,
        )


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
