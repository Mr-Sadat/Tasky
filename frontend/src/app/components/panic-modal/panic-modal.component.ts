import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-panic-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <dialog
      #panicDialog
      class="fixed inset-0 z-50 p-4 m-auto rounded-3xl bg-slate-900/95 border border-rose-500/40 shadow-2xl backdrop:bg-slate-950/85 backdrop:backdrop-blur-md text-slate-100 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden outline-none animate-fade-in"
      (cancel)="onCancel($event)"
      (click)="onDialogClick($event)"
      dir="rtl"
    >
      <!-- Dialog Header -->
      <div class="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 flex items-center justify-center text-xl shadow-lg shadow-rose-950/60">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-rose-500 opacity-40"></span>
            <span class="relative">🚨</span>
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-black text-white">روز من به هم ریخت!</h3>
            <p class="text-[11px] text-rose-300/80 font-medium">بازتنظیم اضطراری و هوشمند برنامه روزانه</p>
          </div>
        </div>

        <button
          type="button"
          (click)="closeModal()"
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          aria-label="بستن"
        >
          ✕
        </button>
      </div>

      <!-- Scrollable Body -->
      <div class="flex-1 overflow-y-auto py-3.5 space-y-4">
        <!-- Calming message card -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/30 shadow-inner space-y-2">
          <div class="flex items-center gap-2 text-rose-200 font-bold text-xs">
            <span>🌸</span>
            <span>نفس عمیق بکش؛ هیچ مشکلی نیست!</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">
            برای همه پیش میاد که کارها طبق برنامه پیش نره. با زدن این دکمه، هوش مصنوعی تَسکی:
          </p>
          <ul class="text-[11px] text-slate-300/90 space-y-1.5 pr-3 list-disc list-inside">
            <li>کارهای غیرضروری و سبک رو <strong class="text-amber-300">به فردا منتقل</strong> می‌کنه.</li>
            <li>کارهای اصلی رو از <strong class="text-emerald-300">همین ساعت</strong> با زمان فشرده‌تر مرتب می‌کنه.</li>
            <li>مانع از تداخل کارها با <strong class="text-purple-300">ساعت خواب و استراحتت</strong> میشه.</li>
          </ul>
        </div>

        <!-- Remaining tasks count -->
        @if (uncompletedTasksCount > 0) {
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <span class="text-slate-400">کارهای در انتظار امروز:</span>
            <span class="font-bold text-amber-300 font-mono">{{ uncompletedTasksCount }} تسک باقی‌مانده</span>
          </div>
        }

        <!-- Quick Reason Presets -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">
            انتخاب سریع علت (اختیاری):
          </label>
          <div class="flex items-center gap-1.5 flex-wrap">
            @for (preset of presetReasons; track preset) {
              <button
                type="button"
                (click)="reason = preset"
                class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition cursor-pointer interactive-spring"
                [ngClass]="reason === preset
                  ? 'bg-rose-600/30 border-rose-400 text-rose-200 ring-1 ring-rose-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'"
              >
                {{ preset }}
              </button>
            }
          </div>
        </div>

        <!-- Custom Reason Input -->
        <div>
          <label for="panicReasonInput" class="block text-xs font-semibold text-slate-300 mb-1.5">
            یا توضیح خودت رو بنویس:
          </label>
          <input
            id="panicReasonInput"
            type="text"
            [(ngModel)]="reason"
            placeholder="مثلاً: درگیر یک کار فوری شدم و ۲ ساعت عقب افتادم..."
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition placeholder:text-slate-500"
          />
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          (click)="closeModal()"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          انصراف
        </button>

        <button
          type="button"
          (click)="onConfirm()"
          [disabled]="isProcessing"
          class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:brightness-110 active:scale-95 text-white shadow-lg shadow-rose-950/60 transition cursor-pointer flex items-center gap-2 disabled:opacity-50 interactive-spring"
        >
          @if (isProcessing) {
            <span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>در حال بازتنظیم هوشمند...</span>
          } @else {
            <span>🚨</span>
            <span>آرامش و بازتنظیم هوشمند روز</span>
          }
        </button>
      </div>
    </dialog>
  `,
  styles: [`
    dialog::backdrop {
      background: rgba(2, 6, 23, 0.85);
      backdrop-filter: blur(8px);
    }
  `],
})
export class PanicModalComponent implements AfterViewInit {
  @ViewChild('panicDialog') dialogRef?: ElementRef<HTMLDialogElement>;

  @Input() isProcessing: boolean = false;
  @Input() uncompletedTasksCount: number = 0;

  @Output() confirm = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  reason: string = 'برنامه‌ام به هم ریخت و عقب افتادم';

  readonly presetReasons = [
    'عقب افتادم',
    'گیر ترافیک افتادم',
    'کار فوری پیش اومد',
    'خسته‌ام و انرژی ندارم',
    'جلسه طول کشید',
  ];

  ngAfterViewInit(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  onConfirm(): void {
    this.confirm.emit(this.reason);
  }

  closeModal(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && dialog.open) {
      dialog.close();
    }
    this.close.emit();
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.closeModal();
  }

  onDialogClick(event: MouseEvent): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog && event.target === dialog) {
      this.closeModal();
    }
  }
}
