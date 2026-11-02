import os
import datetime
from io import BytesIO
from unittest.mock import patch, MagicMock
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile, InMemoryUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Task, VoiceLog, UserProfile, PriorityChoices, CategoryChoices, IconChoices, MoodChoices
from .ai_service import (
    process_voice_to_tasks,
    generate_ai_guidelines,
    PlanResponse,
    LLMPlanResponse,
    TaskPlanItem,
    AvatarReaction,
    IconEnum,
    MoodEnum,
    CategoryEnum,
    PriorityEnum,
    soft_parse_llm_json,
    parse_and_convert_to_gregorian,
)


class AIServiceUnitTests(APITestCase):
    def test_mock_plan_contract(self):
        """Test that ai_service in mock mode produces a response conforming to PlanResponse."""
        result = process_voice_to_tasks(text_input="امروز جلسه کاری دارم")
        # Validate through Pydantic
        validated = PlanResponse(**result)
        self.assertEqual(validated.raw_transcribed_text, "امروز جلسه کاری دارم")
        self.assertIn(validated.avatar_reaction.mood.value, ["happy", "serious", "supportive", "excited"])
        self.assertTrue(len(validated.avatar_reaction.voice_reply) > 0)
        self.assertTrue(len(validated.tasks) >= 1)

        for task in validated.tasks:
            self.assertIn(task.priority.value, ["high", "medium", "low"])
            self.assertIn(task.category.value, ["work", "study", "fitness", "health", "shopping", "personal", "rest"])
            self.assertIn(task.icon.value, ["briefcase", "book", "dumbbell", "heart", "cart", "star", "coffee"])
            self.assertTrue(":" in task.scheduled_time)
            self.assertGreater(task.duration_minutes, 0)
            self.assertTrue(len(task.notification_text) > 0)

    def test_mock_plan_default_text(self):
        """Test mock plan with no text provided produces default Persian text."""
        result = process_voice_to_tasks()
        self.assertTrue(len(result["raw_transcribed_text"]) > 0)
        self.assertIsInstance(result["tasks"], list)
        self.assertEqual(len(result["tasks"]), 3)

    @patch.dict(os.environ, {"USE_MOCK_AI": "False", "OPENAI_API_KEY": "test-key"})
    @patch("planner.ai_service.openai.OpenAI")
    def test_in_memory_uploaded_file_converted_to_tuple_for_transcription(self, mock_openai_cls):
        """Test that InMemoryUploadedFile is converted to (filename, bytes, content_type) tuple for OpenAI transcriptions."""
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        # Mock transcription response
        mock_transcription = MagicMock()
        mock_transcription.text = "برنامه تست صدای کاربر"
        mock_client.audio.transcriptions.create.return_value = mock_transcription

        # Mock chat completion response
        mock_parsed = MagicMock()
        mock_parsed.model_dump.return_value = {
            "raw_transcribed_text": "برنامه تست صدای کاربر",
            "avatar_reaction": {
                "mood": "happy",
                "voice_reply": "سلام رفیق!"
            },
            "tasks": [
                {
                    "title": "تسک تستی",
                    "scheduled_time": "11:00",
                    "duration_minutes": 30,
                    "priority": "high",
                    "category": "work",
                    "icon": "briefcase",
                    "notification_text": "یادآور تست"
                }
            ]
        }
        mock_choice = MagicMock()
        mock_choice.message.parsed = mock_parsed
        mock_client.beta.chat.completions.parse.return_value = MagicMock(choices=[mock_choice])

        # Create InMemoryUploadedFile with offset to test seek(0)
        audio_content = b"fake voice audio bytes for testing whisper"
        audio_io = BytesIO(audio_content)
        audio_io.seek(5)  # simulate stream that was partially read

        uploaded_audio = InMemoryUploadedFile(
            file=audio_io,
            field_name="audio",
            name="recorded_sample.webm",
            content_type="audio/webm",
            size=len(audio_content),
            charset=None
        )

        result = process_voice_to_tasks(audio_file=uploaded_audio)

        # Verify client.audio.transcriptions.create was called
        mock_client.audio.transcriptions.create.assert_called_once()
        call_kwargs = mock_client.audio.transcriptions.create.call_args.kwargs

        self.assertEqual(call_kwargs["model"], "whisper-1")
        self.assertEqual(call_kwargs["language"], "fa")

        # Verify the file parameter is a tuple of (filename, bytes, content_type)
        file_arg = call_kwargs["file"]
        self.assertIsInstance(file_arg, tuple)
        self.assertEqual(len(file_arg), 3)
        self.assertEqual(file_arg[0], "recorded_sample.webm")
        self.assertEqual(file_arg[1], audio_content)
        self.assertEqual(file_arg[2], "audio/webm")

        self.assertEqual(result["raw_transcribed_text"], "برنامه تست صدای کاربر")

    def test_relaxed_task_plan_item_validation(self):
        """Test that TaskPlanItem handles missing scheduled_time, invalid icon, unknown category/priority gracefully."""
        # 1. Missing scheduled_time defaults to 12:00
        item = TaskPlanItem.model_validate({"title": "تسک تستی"})
        self.assertEqual(item.scheduled_time, "12:00")
        self.assertEqual(item.icon, IconEnum.STAR)
        self.assertEqual(item.category, CategoryEnum.PERSONAL)
        self.assertEqual(item.priority, PriorityEnum.MEDIUM)

        # 2. Support for moon and sun icons
        item_moon = TaskPlanItem.model_validate({"title": "خواب شب", "icon": "moon", "scheduled_time": "23:00"})
        self.assertEqual(item_moon.icon, IconEnum.MOON)
        self.assertEqual(item_moon.icon.value, "moon")

        item_sun = TaskPlanItem.model_validate({"title": "پیاده‌روی صبح", "icon": "sun", "scheduled_time": "7:15"})
        self.assertEqual(item_sun.icon, IconEnum.SUN)
        self.assertEqual(item_sun.scheduled_time, "07:15")

        # 3. Invalid/unknown icon falls back to star without error
        item_unknown_icon = TaskPlanItem.model_validate({"title": "تسک با آیکون نامعتبر", "icon": "flying_carpet"})
        self.assertEqual(item_unknown_icon.icon, IconEnum.STAR)
        self.assertEqual(item_unknown_icon.icon.value, "star")

        # 4. Unknown category and priority fall back safely
        item_fallback = TaskPlanItem.model_validate({
            "title": "تسک",
            "category": "unknown_category_xyz",
            "priority": "ultra_high",
        })
        self.assertEqual(item_fallback.category, CategoryEnum.PERSONAL)
        self.assertEqual(item_fallback.priority, PriorityEnum.MEDIUM)

    def test_avatar_reaction_robust_fallback(self):
        """Test that AvatarReaction safely falls back on unknown mood or empty voice_reply."""
        reaction = AvatarReaction.model_validate({
            "mood": "philosophical",  # not in enum
            "voice_reply": "",
        })
        self.assertEqual(reaction.mood, MoodEnum.SUPPORTIVE)
        self.assertEqual(reaction.mood.value, "supportive")
        self.assertTrue(len(reaction.voice_reply) > 0)

    def test_soft_parse_llm_json_recovers_data(self):
        """Test soft_parse_llm_json recovers tasks and avatar reaction even if JSON is enclosed in markdown or has root fields."""
        raw_markdown_json = """
        ```json
        {
            "mood": "excited",
            "voice_reply": "ایول، روز خفنی در پیشه!",
            "tasks": [
                {
                    "title": "ارسال گزارش مالی",
                    "scheduled_time": "14:00",
                    "duration_minutes": 45,
                    "category": "work",
                    "icon": "briefcase"
                },
                {
                    "title": "خواب نیم‌روزی",
                    "duration_minutes": 30,
                    "icon": "moon"
                }
            ]
        }
        ```
        """
        parsed = soft_parse_llm_json(
            raw_markdown_json,
            current_time_str="10:00",
            transcribed_text="ارسال گزارش و خواب"
        )
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["raw_transcribed_text"], "ارسال گزارش و خواب")
        self.assertEqual(parsed["avatar_reaction"]["mood"], "excited")
        self.assertEqual(len(parsed["tasks"]), 2)
        # Verify first task
        self.assertEqual(parsed["tasks"][0]["scheduled_time"], "14:00")
        self.assertEqual(parsed["tasks"][0]["icon"], "briefcase")
        # Verify second task (missing scheduled_time defaulted to current_time_str, icon moon preserved)
        self.assertEqual(parsed["tasks"][1]["scheduled_time"], "10:00")
        self.assertEqual(parsed["tasks"][1]["icon"], "moon")

    @patch.dict(os.environ, {"USE_MOCK_AI": "False", "OPENAI_API_KEY": "test-key"})
    @patch("planner.ai_service.openai.OpenAI")
    def test_llm_response_without_raw_transcribed_text_merged_in_python(self, mock_openai_cls):
        """Test that LLM only returning avatar_reaction and tasks has raw_transcribed_text injected by Python."""
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        mock_parsed = LLMPlanResponse(
            avatar_reaction=AvatarReaction(
                mood=MoodEnum.HAPPY,
                voice_reply="روز پرانرژی داشته باشی!"
            ),
            tasks=[
                TaskPlanItem(
                    title="تسک جدید",
                    scheduled_time="15:30",
                    duration_minutes=30,
                    priority=PriorityEnum.HIGH,
                    category=CategoryEnum.WORK,
                    icon=IconEnum.SUN,
                    notification_text="وقت کاره!"
                )
            ]
        )
        mock_choice = MagicMock()
        mock_choice.message.parsed = mock_parsed
        mock_client.beta.chat.completions.parse.return_value = MagicMock(choices=[mock_choice])

        result = process_voice_to_tasks(text_input="متن تستی برای برنامه‌ریزی")
        # Ensure raw_transcribed_text is present and matches the original input
        self.assertEqual(result["raw_transcribed_text"], "متن تستی برای برنامه‌ریزی")
        self.assertEqual(result["avatar_reaction"]["mood"], "happy")
        self.assertEqual(len(result["tasks"]), 1)
        self.assertEqual(result["tasks"][0]["icon"], "sun")

    def test_parse_and_convert_to_gregorian(self):
        """Test parse_and_convert_to_gregorian handles Jalali, Persian digits, and Gregorian dates."""
        import datetime
        # Jalali 1405-08-15 is Gregorian 2026-11-06
        d1 = parse_and_convert_to_gregorian("1405-08-15")
        self.assertEqual(d1, datetime.date(2026, 11, 6))

        # Persian digits ۱۴۰۵/۰۸/۱۵
        d2 = parse_and_convert_to_gregorian("۱۴۰۵/۰۸/۱۵")
        self.assertEqual(d2, datetime.date(2026, 11, 6))

        # Standard Gregorian
        d3 = parse_and_convert_to_gregorian("2026-11-06")
        self.assertEqual(d3, datetime.date(2026, 11, 6))

        # Empty returns default
        fallback = datetime.date(2026, 1, 1)
        d4 = parse_and_convert_to_gregorian("", default_date=fallback)
        self.assertEqual(d4, fallback)


@patch.dict(os.environ, {"USE_MOCK_AI": "True"})
class VoiceToPlanAPITests(APITestCase):
    def test_voice_to_plan_with_text(self):
        """Test POST /api/voice-to-plan/ with JSON text payload."""
        payload = {
            "text": "امروز می‌خوام ساعت ۱۰ گزارش پروژه رو بفرستم",
            "current_time": "09:30"
        }
        response = self.client.post("/api/voice-to-plan/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.data
        self.assertIn("voice_log_id", data)
        self.assertEqual(data["raw_transcribed_text"], payload["text"])
        self.assertIn("avatar_reaction", data)
        self.assertIn("tasks", data)
        self.assertGreaterEqual(len(data["tasks"]), 1)

        # Verify database persistence
        voice_log = VoiceLog.objects.get(id=data["voice_log_id"])
        self.assertEqual(voice_log.raw_text, payload["text"])

        # Verify Task records exist in SQLite
        saved_task_ids = [t["id"] for t in data["tasks"]]
        db_tasks = Task.objects.filter(id__in=saved_task_ids)
        self.assertEqual(db_tasks.count(), len(data["tasks"]))

        # Verify fields of saved tasks
        for task in db_tasks:
            self.assertFalse(task.is_completed)
            self.assertEqual(task.date, timezone.localdate())

    def test_voice_to_plan_with_audio_file(self):
        """Test POST /api/voice-to-plan/ with simulated audio upload (multipart)."""
        audio_content = b"fake audio voice bytes"
        uploaded_audio = SimpleUploadedFile(
            "voice_note.mp3",
            audio_content,
            content_type="audio/mpeg"
        )

        response = self.client.post(
            "/api/voice-to-plan/",
            {"audio": uploaded_audio},
            format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertIn("voice_log_id", data)
        self.assertGreaterEqual(len(data["tasks"]), 1)

        # Check DB count
        self.assertEqual(VoiceLog.objects.count(), 1)
        self.assertEqual(Task.objects.count(), len(data["tasks"]))

    def test_voice_to_plan_with_custom_date(self):
        """Test POST /api/voice-to-plan/ with a specific target date."""
        target_date_str = "2026-11-15"
        payload = {
            "text": "برنامه روز ۱۵ نوامبر",
            "date": target_date_str
        }
        response = self.client.post("/api/voice-to-plan/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        tasks = Task.objects.filter(date=target_date_str)
        self.assertGreaterEqual(tasks.count(), 1)
        self.assertEqual(str(tasks.first().date), target_date_str)

    def test_voice_to_plan_empty_payload(self):
        """Test POST /api/voice-to-plan/ with missing text and audio returns 400."""
        response = self.client.post("/api/voice-to-plan/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_voice_to_plan_invalid_date(self):
        """Test POST /api/voice-to-plan/ with invalid date format returns 400."""
        response = self.client.post(
            "/api/voice-to-plan/",
            {"text": "تست تاریخ", "date": "invalid-date"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_voice_to_plan_with_jalali_date(self):
        """Test POST /api/voice-to-plan/ with a Jalali date string."""
        payload = {
            "text": "۱۵ آبان باید برم دندونپزشکی",
            "date": "1405-08-15"
        }
        response = self.client.post("/api/voice-to-plan/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertGreaterEqual(len(data["tasks"]), 1)
        # Verify date in SQLite was converted to 2026-11-06
        self.assertEqual(data["tasks"][0]["date"], "2026-11-06")
        self.assertEqual(data["tasks"][0]["jalali_date"], "1405/08/15")
        self.assertEqual(data["tasks"][0]["jalali_display"], "15 آبان")
        self.assertEqual(data["tasks"][0]["jalali_day_name"], "جمعه")


class TaskCRUDApiTests(APITestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.tomorrow = self.today + datetime.timedelta(days=1)

        # Create sample tasks
        self.task1 = Task.objects.create(
            title="جلسه صبحگاهی",
            scheduled_time="09:00",
            duration_minutes=30,
            priority=PriorityChoices.HIGH,
            category=CategoryChoices.WORK,
            icon=IconChoices.BRIEFCASE,
            notification_text="یادآور جلسه کاری",
            date=self.today,
            is_completed=False,
        )
        self.task2 = Task.objects.create(
            title="ورزش عصر",
            scheduled_time="18:00",
            duration_minutes=60,
            priority=PriorityChoices.MEDIUM,
            category=CategoryChoices.FITNESS,
            icon=IconChoices.DUMBBELL,
            notification_text="آماده ورزش شو",
            date=self.today,
            is_completed=False,
        )
        self.task_tomorrow = Task.objects.create(
            title="خرید هفتگی فردا",
            scheduled_time="11:00",
            duration_minutes=45,
            priority=PriorityChoices.LOW,
            category=CategoryChoices.SHOPPING,
            icon=IconChoices.CART,
            notification_text="لیست خرید یادت نره",
            date=self.tomorrow,
            is_completed=False,
        )

    def test_get_tasks_default_today(self):
        """Test GET /api/tasks/ defaults to tasks for today ordered by scheduled_time."""
        response = self.client.get("/api/tasks/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Should be ordered by scheduled_time: 09:00 first, 18:00 second
        self.assertEqual(response.data[0]["id"], self.task1.id)
        self.assertEqual(response.data[1]["id"], self.task2.id)

    def test_get_tasks_filtered_by_date(self):
        """Test GET /api/tasks/?date=YYYY-MM-DD filters correctly."""
        response = self.client.get(f"/api/tasks/?date={self.tomorrow.isoformat()}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.task_tomorrow.id)

    def test_get_tasks_all(self):
        """Test GET /api/tasks/?date=all returns all tasks."""
        response = self.client.get("/api/tasks/?date=all")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_get_tasks_invalid_date(self):
        """Test GET /api/tasks/?date=bad returns 400."""
        response = self.client.get("/api/tasks/?date=not-a-date")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_task_manually(self):
        """Test POST /api/tasks/ manually creates a new task."""
        payload = {
            "title": "تماس با پشتیبانی",
            "scheduled_time": "14:15",
            "duration_minutes": 20,
            "priority": "low",
            "category": "personal",
            "icon": "coffee",
            "notification_text": "تماس ۵ دقیقه‌ای",
            "date": self.today.isoformat(),
        }
        response = self.client.post("/api/tasks/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], payload["title"])
        self.assertEqual(response.data["is_completed"], False)
        self.assertTrue(Task.objects.filter(title="تماس با پشتیبانی").exists())

    def test_patch_task_toggle_completion(self):
        """Test PATCH /api/tasks/<id>/ toggles is_completed."""
        self.assertFalse(self.task1.is_completed)
        response = self.client.patch(
            f"/api/tasks/{self.task1.id}/",
            {"is_completed": True},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_completed"])

        self.task1.refresh_from_db()
        self.assertTrue(self.task1.is_completed)

    def test_patch_task_update_fields(self):
        """Test PATCH /api/tasks/<id>/ updates specified fields."""
        response = self.client.patch(
            f"/api/tasks/{self.task2.id}/",
            {"title": "تمرین شنا", "scheduled_time": "19:00", "priority": "high"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task2.refresh_from_db()
        self.assertEqual(self.task2.title, "تمرین شنا")
        self.assertEqual(self.task2.scheduled_time.strftime("%H:%M"), "19:00")
        self.assertEqual(self.task2.priority, PriorityChoices.HIGH)

    def test_delete_task(self):
        """Test DELETE /api/tasks/<id>/ removes task from database."""
        response = self.client.delete(f"/api/tasks/{self.task1.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=self.task1.id).exists())

    def test_task_detail_not_found(self):
        """Test GET, PATCH, DELETE with non-existent ID returns 404."""
        get_res = self.client.get("/api/tasks/99999/")
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        patch_res = self.client.patch("/api/tasks/99999/", {"is_completed": True}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_404_NOT_FOUND)

        delete_res = self.client.delete("/api/tasks/99999/")
        self.assertEqual(delete_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_tasks_filtered_by_jalali_date(self):
        """Test GET /api/tasks/?date=1405-08-15 filters correctly."""
        import jdatetime
        j_tomorrow = jdatetime.date.fromgregorian(date=self.tomorrow)
        j_param = j_tomorrow.strftime("%Y-%m-%d")
        response = self.client.get(f"/api/tasks/?date={j_param}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.task_tomorrow.id)
        self.assertEqual(response.data[0]["jalali_date"], j_tomorrow.strftime("%Y/%m/%d"))
        self.assertIn("jalali_display", response.data[0])
        self.assertIn("jalali_day_name", response.data[0])


@patch.dict(os.environ, {"USE_MOCK_AI": "True"})
class UserProfileAPITests(APITestCase):
    def test_get_profile_when_none_returns_404(self):
        """Test GET /api/profile/ returns 404 when no profile is created yet."""
        response = self.client.get("/api/profile/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_setup_profile_endpoint_creates_profile_and_guidelines(self):
        """Test POST /api/profile/setup/ creates UserProfile and generates AI guidelines."""
        payload = {
            "name": "سارا",
            "wake_time": "06:30",
            "sleep_time": "22:30",
            "avatar_config": {
                "baseType": "kitty",
                "themeColor": "pink",
                "accessory": "glasses"
            },
            "lifestyle_answers": {
                "mainGoal": "تعادل کار و زندگی",
                "stressLevel": "متوسط",
                "aiTone": "دوست صمیمی و پرانرژی"
            }
        }
        response = self.client.post("/api/profile/setup/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data["name"], "سارا")
        self.assertEqual(data["wake_time"], "06:30")
        self.assertEqual(data["sleep_time"], "22:30")
        self.assertEqual(data["avatar_config"]["baseType"], "kitty")
        self.assertTrue(len(data["ai_guidelines"]) > 0)
        self.assertIn("سارا", data["ai_guidelines"])
        self.assertIn("06:30", data["ai_guidelines"])
        self.assertIn("22:30", data["ai_guidelines"])

        # Check database
        profile = UserProfile.objects.first()
        self.assertIsNotNone(profile)
        self.assertEqual(profile.name, "سارا")

    def test_get_and_put_profile(self):
        """Test GET /api/profile/ and PUT /api/profile/ for updating profile."""
        profile = UserProfile.objects.create(
            name="علی",
            wake_time="07:00",
            sleep_time="23:00",
            avatar_config={"baseType": "robot", "themeColor": "purple", "accessory": "none"},
            ai_guidelines="قانون ۱: کارهای مهم اول صبح"
        )

        # GET
        get_res = self.client.get("/api/profile/")
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data["name"], "علی")

        # PUT
        put_payload = {
            "name": "علی رضایی",
            "ai_guidelines": "قانون جدید: اولویت با مطالعه شبانه",
            "wake_time": "08:00"
        }
        put_res = self.client.put("/api/profile/", put_payload, format="json")
        self.assertEqual(put_res.status_code, status.HTTP_200_OK)
        self.assertEqual(put_res.data["name"], "علی رضایی")
        self.assertEqual(put_res.data["wake_time"], "08:00")
        self.assertEqual(put_res.data["ai_guidelines"], "قانون جدید: اولویت با مطالعه شبانه")

        profile.refresh_from_db()
        self.assertEqual(profile.name, "علی رضایی")
        self.assertEqual(profile.ai_guidelines, "قانون جدید: اولویت با مطالعه شبانه")


class AIProfileContextInjectionTests(APITestCase):
    @patch.dict(os.environ, {"USE_MOCK_AI": "True"})
    def test_mock_plan_injects_user_profile_name_and_schedule(self):
        """Test that get_mock_plan personalizes greeting with UserProfile name and schedule."""
        UserProfile.objects.create(
            name="نیما",
            wake_time="06:00",
            sleep_time="22:00",
            avatar_config={"baseType": "bear", "themeColor": "mint", "accessory": "headset"},
            ai_guidelines="قوانین نیما"
        )
        plan = process_voice_to_tasks(text_input="برنامه کاری امروز")
        self.assertIn("نیما", plan["avatar_reaction"]["voice_reply"])
        self.assertIn("06:00", plan["avatar_reaction"]["voice_reply"])
        self.assertIn("22:00", plan["avatar_reaction"]["voice_reply"])

    @patch.dict(os.environ, {"USE_MOCK_AI": "False", "OPENAI_API_KEY": "test-key"})
    @patch("planner.ai_service.openai.OpenAI")
    def test_live_ai_system_prompt_includes_profile_guidelines(self, mock_openai_cls):
        """Test that client.beta.chat.completions.parse receives system prompt with UserProfile schedule and guidelines."""
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        mock_parsed = LLMPlanResponse(
            avatar_reaction=AvatarReaction(mood=MoodEnum.HAPPY, voice_reply="سلام پریسا!"),
            tasks=[
                TaskPlanItem(
                    title="جلسه صبح",
                    scheduled_time="08:30",
                    duration_minutes=30,
                    priority=PriorityEnum.HIGH,
                    category=CategoryEnum.WORK,
                    icon=IconEnum.BRIEFCASE,
                    notification_text="یادآور جلسه"
                )
            ]
        )
        mock_choice = MagicMock()
        mock_choice.message.parsed = mock_parsed
        mock_client.beta.chat.completions.parse.return_value = MagicMock(choices=[mock_choice])

        profile = UserProfile.objects.create(
            name="پریسا",
            wake_time="07:30",
            sleep_time="23:30",
            avatar_config={"baseType": "kitty", "themeColor": "peach", "accessory": "party_hat"},
            ai_guidelines="۱. لحن بسیار صمیمی باشد.\n۲. هیچ تسکی قبل ۷:۳۰ چیده نشود."
        )

        result = process_voice_to_tasks(text_input="جلسه صبحگاهی", profile=profile)

        # Inspect call arguments to client.beta.chat.completions.parse
        mock_client.beta.chat.completions.parse.assert_called_once()
        kwargs = mock_client.beta.chat.completions.parse.call_args.kwargs
        messages = kwargs["messages"]
        system_content = messages[0]["content"]

        self.assertIn("USER PROFILE & LIFESTYLE GUIDELINES", system_content)
        self.assertIn("پریسا", system_content)
        self.assertIn("07:30", system_content)
        self.assertIn("23:30", system_content)
        self.assertIn("هیچ تسکی قبل ۷:۳۰ چیده نشود", system_content)

    def test_voice_to_plan_smart_rescheduling_updates_existing_task_no_duplicate(self):
        """Test that asking to reschedule 'کدنویسی' to 10:00 updates the existing task without creating a duplicate."""
        today = timezone.localdate()
        task = Task.objects.create(
            title="کدنویسی",
            scheduled_time="07:54",
            duration_minutes=30,
            priority="high",
            category="work",
            date=today,
        )

        response = self.client.post(
            "/api/voice-to-plan/",
            {"text": "تسک کدنویسی رو بنداز برای ساعت ۱۰:۰۰"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Ensure no duplicate was created
        self.assertEqual(Task.objects.filter(date=today).count(), 1)

        # Ensure existing task was updated
        task.refresh_from_db()
        self.assertEqual(task.scheduled_time.strftime("%H:%M"), "10:00")

    def test_voice_to_plan_colloquial_rescheduling_pashimoon_shodam_no_duplicate(self):
        """Test 'من پشیمون شدم ساعت ده میخوام شام بخورم' updates existing 'صرف شام' without duplicates."""
        today = timezone.localdate()
        task = Task.objects.create(
            title="صرف شام",
            scheduled_time="20:00",
            duration_minutes=45,
            priority="medium",
            category="personal",
            date=today,
        )

        response = self.client.post(
            "/api/voice-to-plan/",
            {"text": "من پشیمون شدم ساعت ده میخوام شام بخورم"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Ensure no duplicate was created
        self.assertEqual(Task.objects.filter(date=today).count(), 1)
        task.refresh_from_db()
        self.assertEqual(task.scheduled_time.strftime("%H:%M"), "22:00")

    def test_voice_to_plan_colloquial_rescheduling_bezar_baraye_koodnevisi(self):
        """Test 'تسک شروع کودنویسی رو بذار برای ساعت ده شب' matches 'کدنویسی' without duplicates."""
        today = timezone.localdate()
        task = Task.objects.create(
            title="کدنویسی",
            scheduled_time="19:54",
            duration_minutes=60,
            priority="high",
            category="work",
            date=today,
        )

        response = self.client.post(
            "/api/voice-to-plan/",
            {"text": "تسک شروع کودنویسی رو بذار برای ساعت ده شب"},
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Ensure no duplicate was created
        self.assertEqual(Task.objects.filter(date=today).count(), 1)
        task.refresh_from_db()
        self.assertEqual(task.scheduled_time.strftime("%H:%M"), "22:00")

    def test_text_to_speech_view_endpoint(self):
        """Test GET and POST on /api/tts/ endpoint."""
        # Empty text should return 400
        res_empty = self.client.get("/api/tts/")
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid text should return 200 with audio/mpeg from Edge-TTS
        res_valid = self.client.get("/api/tts/?text=سلام")
        self.assertIn(res_valid.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])
        if res_valid.status_code == status.HTTP_200_OK:
            self.assertEqual(res_valid["Content-Type"], "audio/mpeg")
            self.assertGreater(len(res_valid.content), 0)



    @patch.dict(os.environ, {"USE_MOCK_AI": "True"})
    def test_panic_reschedule_view_endpoint(self):
        """Test POST /api/tasks/panic-reschedule/ intelligently shifts tasks and defers low priority to tomorrow."""
        today = timezone.localdate()
        tomorrow = today + datetime.timedelta(days=1)

        UserProfile.objects.create(
            name="سارا",
            wake_time="07:00",
            sleep_time="23:00",
        )

        task_high = Task.objects.create(
            title="جلسه کاری مهم",
            scheduled_time="14:00",
            duration_minutes=60,
            priority="high",
            category="work",
            date=today,
            is_completed=False,
        )
        task_med = Task.objects.create(
            title="مطالعه درس",
            scheduled_time="15:30",
            duration_minutes=45,
            priority="medium",
            category="study",
            date=today,
            is_completed=False,
        )
        task_low = Task.objects.create(
            title="خرید گل برای بالکن",
            scheduled_time="16:30",
            duration_minutes=30,
            priority="low",
            category="shopping",
            date=today,
            is_completed=False,
        )

        response = self.client.post(
            "/api/tasks/panic-reschedule/",
            {
                "reason": "ترافیک سنگین بود و ۲ ساعت عقب افتادم",
                "current_time": "17:00",
                "date": today.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn("avatar_reaction", data)
        self.assertTrue(len(data["avatar_reaction"]["voice_reply"]) > 0)
        self.assertIn(data["avatar_reaction"]["mood"], ["supportive", "happy", "excited"])

        # Check that low priority task is deferred to tomorrow
        task_low.refresh_from_db()
        self.assertEqual(task_low.date, tomorrow)

        # Check that high/medium tasks are scheduled after 17:00 today
        task_high.refresh_from_db()
        task_med.refresh_from_db()
        self.assertEqual(task_high.date, today)
        self.assertEqual(task_med.date, today)
        self.assertGreaterEqual(task_high.scheduled_time.strftime("%H:%M"), "17:00")

        # Check VoiceLog created
        self.assertTrue(VoiceLog.objects.filter(raw_text__contains="وضعیت اضطراری").exists())

    def test_panic_reschedule_no_uncompleted_tasks(self):
        """Test panic reschedule when no tasks are pending returns supportive message."""
        today = timezone.localdate()
        response = self.client.post(
            "/api/tasks/panic-reschedule/",
            {"current_time": "18:00", "date": today.isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("avatar_reaction", data)
        self.assertEqual(data["rescheduled_count"], 0)
        self.assertEqual(data["deferred_count"], 0)

    @patch.dict(os.environ, {"USE_MOCK_AI": "True"})
    def test_task_breakdown_view_endpoint(self):
        """Test POST /api/tasks/<id>/breakdown/ breaks monolithic task into sequential micro-steps."""
        today = timezone.localdate()
        task = Task.objects.create(
            title="پیاده‌سازی ماژول پرداخت آنلاین",
            scheduled_time="14:00",
            duration_minutes=90,
            priority="high",
            category="work",
            date=today,
            is_completed=False,
        )

        response = self.client.post(f"/api/tasks/{task.id}/breakdown/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn("subtasks", data)
        self.assertTrue(len(data["subtasks"]) >= 2)
        self.assertIn("avatar_reaction", data)

        # Original task should be replaced
        self.assertFalse(Task.objects.filter(id=task.id).exists())

        # Subtasks should be in DB with sequential times starting at 14:00
        subtasks_in_db = Task.objects.filter(date=today, category="work").order_by("scheduled_time")
        self.assertTrue(subtasks_in_db.count() >= 2)
        self.assertEqual(subtasks_in_db.first().scheduled_time.strftime("%H:%M"), "14:00")

    def test_task_breakdown_not_found(self):
        """Test breakdown on non-existent task returns 404."""
        response = self.client.post("/api/tasks/99999/breakdown/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
