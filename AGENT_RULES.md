# AGENT_RULES.md - Tasky Project Master Blueprint

## 1. Project Overview & Roles
- **Project Name:** Tasky (Voice-First AI Daily Planner with Cute/Minimal UI & Avatar)
- **Product Owner (Human):** Reviews UX/UI, human tests, and business logic.
- **Project Architect (Gemini):** Defines architecture, rules, and phase gates.
- **Execution Agent (Antigravity):** Lead Developer, Tester, and Code Reviewer. You MUST read this file before executing any task and update the "Project Progress Log" at the bottom after completing each phase.

## 2. Core Technical Stack (Strict)
- **Backend:** Python 3.11+, Django 5+, Django REST Framework (DRF), Pydantic, `openai` Python SDK, `python-dotenv`, `django-cors-headers`.
- **Database:** SQLite (`db.sqlite3`) for local development and automated testing (use standard Django ORM only so we can switch to PostgreSQL in production effortlessly).
- **Frontend:** Angular (Latest Standalone Components, Signals), TailwindCSS, full RTL support (`dir="rtl"`) with Persian font (`Vazirmatn`).
- **AI Integration:** `openai` SDK configured with custom `OPENAI_BASE_URL` and `OPENAI_API_KEY` loaded from `.env` (supporting OpenAI/Gemini proxy providers like AvalAI/Liara/Metis).
  - **Mock Mode:** If `USE_MOCK_AI=True` in `.env` (or if API key is missing), the backend MUST return a realistic hardcoded Persian JSON response so development and unit tests never fail due to missing API keys.

## 3. Strict Coding & Testing Rules for Antigravity
1. **No Duplicate Work:** Always inspect existing directories (`backend/`, `frontend/`) before creating files. Keep a clean monorepo structure (`backend/` and `frontend/` in the root).
2. **Self-Testing Mandatory:** Do NOT mark a phase complete until you run `python manage.py test` (for backend) or build checks (for frontend) in the terminal and fix all errors yourself.
3. **CORS & Ports:** Backend runs on `http://localhost:8000`, Frontend runs on `http://localhost:4200`. Enable CORS for `localhost:4200` from Day 1.
4. **Structured AI Output Contract:** The AI service MUST always return this exact JSON structure:
```json
{
  "raw_transcribed_text": "متن پیاده شده از صدای کاربر",
  "avatar_reaction": {
    "mood": "supportive",
    "voice_reply": "یک جمله صمیمی و کوتاه به فارسی در واکنش به برنامه امروز"
  },
  "tasks": [
    {
      "title": "عنوان تسک به فارسی",
      "scheduled_time": "17:00",
      "duration_minutes": 60,
      "priority": "high",
      "category": "work",
      "icon": "briefcase",
      "notification_text": "متن یادآور بامزه و صمیمی به فارسی"
    }
  ]
}
Allowed Enum values:

priority: ["high", "medium", "low"]

category: ["work", "study", "fitness", "health", "shopping", "personal", "rest"]

icon: ["briefcase", "book", "dumbbell", "heart", "cart", "star", "coffee"]

mood: ["happy", "serious", "supportive", "excited"]

4. Implementation Phases
Phase 1: Backend Core & Voice-to-Task Engine (Current Target)
Create backend/ directory, initialize a Python virtual environment (.venv), and install django, djangorestframework, django-cors-headers, openai, pydantic, python-dotenv.

Initialize Django project tasky_core inside backend/ and create app planner.

Create .env.example and .env inside backend/ with USE_MOCK_AI=True, OPENAI_API_KEY=your_key_here, OPENAI_BASE_URL=https://api.avalai.ir/v1, AI_MODEL=gemini-2.5-flash.

Create Models in planner/models.py:

Task: title (CharField), scheduled_time (TimeField), duration_minutes (IntegerField, default=30), priority (CharField), category (CharField), icon (CharField), notification_text (TextField), is_completed (BooleanField, default=False), date (DateField, default=today), created_at (DateTimeField).

VoiceLog: raw_text (TextField), avatar_mood (CharField), avatar_reply (TextField), created_at (DateTimeField).

Create planner/ai_service.py:

Implement process_voice_to_tasks(audio_file=None, text_input=None, current_time_str="09:00").

If USE_MOCK_AI=True, return a realistic Persian dictionary matching the contract above (with 3 diverse daily tasks in Persian).

If USE_MOCK_AI=False, transcribe audio_file using client.audio.transcriptions.create(model="whisper-1", language="fa") (if audio_file is provided), then call client.beta.chat.completions.parse with Pydantic models to extract Persian tasks and avatar reaction.

Create REST Endpoints in planner/views.py & urls.py:

POST /api/voice-to-plan/: Accepts audio file (multipart/form-data) or text (JSON), calls ai_service, saves VoiceLog and Task records to SQLite, and returns the structured JSON response (including saved task ids).

GET /api/tasks/: Returns tasks for today (or filtered by ?date=YYYY-MM-DD) ordered by scheduled_time.

PATCH /api/tasks/<id>/: Update task fields or toggle is_completed.

DELETE /api/tasks/<id>/: Delete a task.

Write & Run Automated Tests (planner/tests.py):

Test POST /api/voice-to-plan/ in Mock Mode and verify Task and VoiceLog objects are saved in SQLite.

Test GET /api/tasks/, PATCH /api/tasks/<id>/, and DELETE /api/tasks/<id>/.

Phase 2: Functional Angular Frontend (Wait for Owner Approval)
Scaffold Angular project in frontend/ with TailwindCSS and RTL Persian layout.

Build Avatar Status Banner, Audio Recorder (MediaRecorder API), and Daily Task Timeline.

Phase 3: Cute Avatar Animations (Rive/Lottie) & Local Notifications (Wait for Owner Approval)
5. Project Progress Log (Updated by Antigravity)
[x] Phase 1: Backend Core & Automated Tests

[x] Phase 2: Functional Angular Frontend

[x] Phase 3: Polish, Avatar Animations & Notifications

[x] Phase 4: Personalized Onboarding Wizard & Dynamic AI Guidelines (Schedule & Tone Context Injection)