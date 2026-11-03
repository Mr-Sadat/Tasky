from django.db import models
from django.utils import timezone


class PriorityChoices(models.TextChoices):
    HIGH = "high", "High"
    MEDIUM = "medium", "Medium"
    LOW = "low", "Low"


class CategoryChoices(models.TextChoices):
    WORK = "work", "Work"
    STUDY = "study", "Study"
    FITNESS = "fitness", "Fitness"
    HEALTH = "health", "Health"
    SHOPPING = "shopping", "Shopping"
    PERSONAL = "personal", "Personal"
    REST = "rest", "Rest"


class IconChoices(models.TextChoices):
    BRIEFCASE = "briefcase", "Briefcase"
    BOOK = "book", "Book"
    DUMBBELL = "dumbbell", "Dumbbell"
    HEART = "heart", "Heart"
    CART = "cart", "Cart"
    STAR = "star", "Star"
    COFFEE = "coffee", "Coffee"
    MOON = "moon", "Moon"
    SUN = "sun", "Sun"


class MoodChoices(models.TextChoices):
    HAPPY = "happy", "Happy"
    SERIOUS = "serious", "Serious"
    SUPPORTIVE = "supportive", "Supportive"
    EXCITED = "excited", "Excited"


class Task(models.Model):
    title = models.CharField(max_length=255)
    scheduled_time = models.TimeField()
    duration_minutes = models.IntegerField(default=30)
    priority = models.CharField(
        max_length=20,
        choices=PriorityChoices.choices,
        default=PriorityChoices.MEDIUM,
    )
    category = models.CharField(
        max_length=50,
        choices=CategoryChoices.choices,
        default=CategoryChoices.PERSONAL,
    )
    icon = models.CharField(
        max_length=50,
        choices=IconChoices.choices,
        default=IconChoices.STAR,
    )
    notification_text = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_time", "created_at"]

    def __str__(self):
        return f"{self.title} ({self.scheduled_time}) [{self.date}]"


class VoiceLog(models.Model):
    raw_text = models.TextField()
    avatar_mood = models.CharField(
        max_length=50,
        choices=MoodChoices.choices,
        default=MoodChoices.SUPPORTIVE,
    )
    avatar_reply = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"VoiceLog {self.id} [{self.avatar_mood}]: {self.raw_text[:30]}"


class UserProfile(models.Model):
    name = models.CharField(max_length=150)
    wake_time = models.TimeField(default="07:00")
    sleep_time = models.TimeField(default="23:00")
    avatar_config = models.JSONField(default=dict, blank=True)
    ai_guidelines = models.TextField(blank=True, default="")
    xp = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)
    last_streak_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"UserProfile({self.name})"
