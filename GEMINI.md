# Tasky Project Workspace Rules

## 1. زبان و راست‌چین بودن (Persian & RTL Mandatory)
- **پاسخ‌دهی به فارسی راست‌چین:** تمام پاسخ‌ها به کاربر باید راست‌چین و به زبان فارسی باشد.
- **فرانت‌اند و UI کاملاً RTL:** تمامی قالب‌ها، کامپوننت‌ها و استایل‌های پروژه باید بر پایه `dir="rtl"` و تراز راست متون (`text-right`) باشند.

## 2. استانداردهای توسعه Tasky
- **معماری:** Pure Angular Standalone Components با Signals، TailwindCSS و چیدمان RTL (بدون وابستگی به سرور بک‌اند).
- **ذخیره‌سازی و پایداری داده‌ها:** معماری مدرن Local-First مبتنی بر مرورگر (`localStorage`) و تبدیل ریاضی دقیق و مستقل تقویم جلالی.
- **پورت توسعه محلی:** `http://localhost:4200`.
- **استقرار ابری و استاتیک:** انتشار خودکار بر روی GitHub Pages (`https://mr-sadat.github.io/Tasky/`) و Vercel.
