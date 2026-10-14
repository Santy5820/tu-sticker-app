import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiError } from '../../../core/models/api';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <section class="auth-shell">
      <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Iniciar sesión</h2>

        <label>
          Correo electrónico
          <input type="email" formControlName="email" placeholder="ana@example.com" />
        </label>

        <label>
          Contraseña
          <input type="password" formControlName="password" placeholder="••••••••" />
        </label>

        <button type="submit" [disabled]="form.invalid || loading">{{ loading ? 'Ingresando…' : 'Entrar' }}</button>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
        <p class="muted">¿No tienes cuenta? <a routerLink="/register" [queryParams]="returnUrl !== '/shop' ? { returnUrl } : null">Crear una</a></p>
      </form>
    </section>
  `,
    styles: [
        `
      .auth-shell { min-height: 70vh; display: grid; place-items: center; padding: 2rem; }
      .auth-card { width: min(100%, 420px); background: #fff; border-radius: 18px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); padding: 2rem; }
      h2 { margin: 0 0 1.5rem; font-size: 2rem; }
      label { display: grid; gap: 0.5rem; margin-bottom: 1rem; font-weight: 600; }
      input { width: 100%; padding: 0.9rem 1rem; border: 1px solid #d1d5db; border-radius: 10px; font: inherit; box-sizing: border-box; }
      button { width: 100%; padding: 0.9rem; border: none; border-radius: 10px; background: #f97316; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; }
      .muted { color: #475569; text-align: center; margin-top: 1rem; }
      .error { color: #b91c1c; margin-top: 1rem; font-weight: 600; }
      a { color: #c2410c; text-decoration: none; }
    `,
    ],
})
export class LoginComponent {
    readonly form;
    readonly returnUrl: string;

    loading = false;
    errorMessage = '';

    constructor(
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly changeDetector: ChangeDetectorRef,
    ) {
        this.returnUrl = this.getReturnUrl();
        this.form = this.fb.nonNullable.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]],
        });
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        this.authService.login(this.form.getRawValue()).subscribe({
            next: () => this.router.navigateByUrl(this.returnUrl),
            error: (error: { error?: ApiError }) => {
                this.loading = false;
                this.errorMessage = error.error?.message ?? 'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.';
                this.changeDetector.markForCheck();
            },
            complete: () => {
                this.loading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    private getReturnUrl(): string {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/shop';
    }
}
