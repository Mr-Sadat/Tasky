import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title when wizard is completed', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.isWizardActive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('تَسکی | Tasky');
  });

  it('should render onboarding wizard when no profile exists', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.isWizardActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-wizard')).toBeTruthy();
  });
});
