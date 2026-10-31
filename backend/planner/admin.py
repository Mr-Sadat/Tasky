from django.contrib import admin
from .models import Task, VoiceLog


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "date", "scheduled_time", "duration_minutes", "priority", "category", "is_completed")
    list_filter = ("date", "priority", "category", "is_completed")
    search_fields = ("title", "notification_text")
    ordering = ("date", "scheduled_time")


@admin.register(VoiceLog)
class VoiceLogAdmin(admin.ModelAdmin):
    list_display = ("id", "avatar_mood", "created_at", "raw_text_summary")
    list_filter = ("avatar_mood", "created_at")
    search_fields = ("raw_text", "avatar_reply")

    def raw_text_summary(self, obj):
        return obj.raw_text[:50] + ("..." if len(obj.raw_text) > 50 else "")
