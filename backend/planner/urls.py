from django.urls import path
from .views import (
    VoiceToPlanView,
    TaskListCreateView,
    TaskDetailView,
    UserProfileView,
    ProfileSetupView,
)

urlpatterns = [
    path("voice-to-plan/", VoiceToPlanView.as_view(), name="voice_to_plan"),
    path("tasks/", TaskListCreateView.as_view(), name="task_list_create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task_detail"),
    path("profile/", UserProfileView.as_view(), name="user_profile"),
    path("profile/setup/", ProfileSetupView.as_view(), name="profile_setup"),
]
