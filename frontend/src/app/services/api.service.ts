import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, VoiceToPlanResponse, UserProfile, ProfileSetupPayload } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8000/api';

  /**
   * Fetch tasks for today or a specific date.
   * If date is undefined, backend defaults to today.
   */
  getTasks(date?: string): Observable<Task[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<Task[]>(`${this.baseUrl}/tasks/`, { params });
  }

  /**
   * Submit voice recording or text note to AI voice-to-plan engine.
   */
  voiceToPlan(audioBlob?: Blob | null, text?: string, date?: string): Observable<VoiceToPlanResponse> {
    const formData = new FormData();

    if (audioBlob) {
      // Determine filename/extension based on blob type
      const mime = audioBlob.type || 'audio/webm';
      const extension = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
      formData.append('audio', audioBlob, `voice_note.${extension}`);
    }

    if (text && text.trim()) {
      formData.append('text', text.trim());
    }

    if (date) {
      formData.append('date', date);
    }

    // Get current local time in HH:MM
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    formData.append('current_time', `${hours}:${minutes}`);

    return this.http.post<VoiceToPlanResponse>(`${this.baseUrl}/voice-to-plan/`, formData);
  }

  /**
   * Toggle task completion status or update fields.
   */
  toggleTaskCompletion(id: number, isCompleted: boolean): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/`, {
      is_completed: isCompleted
    });
  }

  /**
   * Update arbitrary fields of a task.
   */
  updateTask(id: number, changes: Partial<Task>): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/`, changes);
  }

  /**
   * Delete a task.
   */
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}/`);
  }

  /**
   * Fetch current user profile and AI guidelines.
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile/`);
  }

  /**
   * Setup personalized onboarding profile and generate dynamic AI guidelines.
   */
  setupProfile(payload: ProfileSetupPayload): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.baseUrl}/profile/setup/`, payload);
  }

  /**
   * Update user profile settings or guidelines.
   */
  updateProfile(changes: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/profile/`, changes);
  }
}

