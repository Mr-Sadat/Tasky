import jdatetime
from django.utils import timezone
from rest_framework import serializers
from .models import Task, VoiceLog, UserProfile, PriorityChoices, CategoryChoices, IconChoices, MoodChoices


class TaskSerializer(serializers.ModelSerializer):
    jalali_date = serializers.SerializerMethodField()
    jalali_display = serializers.SerializerMethodField()
    jalali_day_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "scheduled_time",
            "duration_minutes",
            "priority",
            "category",
            "icon",
            "notification_text",
            "is_completed",
            "date",
            "jalali_date",
            "jalali_display",
            "jalali_day_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_jalali_date(self, obj) -> str:
        if not obj.date:
            return ""
        try:
            j = jdatetime.date.fromgregorian(date=obj.date)
            return j.strftime("%Y/%m/%d")
        except Exception:
            return ""

    def get_jalali_display(self, obj) -> str:
        if not obj.date:
            return ""
        try:
            today = timezone.localdate()
            diff = (obj.date - today).days
            j = jdatetime.date.fromgregorian(date=obj.date)
            month_fa = jdatetime.date.j_months_fa[j.month - 1]
            if diff == 0:
                return f"امروز ({j.day} {month_fa})"
            elif diff == 1:
                return f"فردا ({j.day} {month_fa})"
            elif diff == -1:
                return f"دیروز ({j.day} {month_fa})"
            return f"{j.day} {month_fa}"
        except Exception:
            return ""

    def get_jalali_day_name(self, obj) -> str:
        if not obj.date:
            return ""
        try:
            j = jdatetime.date.fromgregorian(date=obj.date)
            return jdatetime.date.j_weekdays_fa[j.weekday()]
        except Exception:
            return ""


class VoiceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceLog
        fields = [
            "id",
            "raw_text",
            "avatar_mood",
            "avatar_reply",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class VoiceToPlanRequestSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default="")
    audio = serializers.FileField(required=False, allow_null=True, default=None)
    date = serializers.CharField(required=False, allow_null=True, default=None)
    current_time = serializers.CharField(required=False, default="09:00")

    def validate(self, attrs):
        if not attrs.get("text") and not attrs.get("audio"):
            raise serializers.ValidationError("Either 'text' or 'audio' file must be provided.")
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    wake_time = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    sleep_time = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "name",
            "wake_time",
            "sleep_time",
            "avatar_config",
            "ai_guidelines",
            "xp",
            "streak_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProfileSetupRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    wake_time = serializers.CharField(default="07:00")
    sleep_time = serializers.CharField(default="23:00")
    avatar_config = serializers.DictField(required=False, default=dict)
    lifestyle_answers = serializers.DictField(required=False, default=dict)
