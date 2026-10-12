import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
    <section class="auth-shell">
      <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Crear cuenta</h2>

        <label>
          Nombre completo
          <input type="text" formControlName="name" placeholder="Ana Pérez" />
        </label>

        <label>
          Correo electrónico
          <input type="email" formControlName="email" placeholder="ana@example.com" />
        </label>

        <label>
          Contraseña
          <input type="password" formControlName="password" placeholder="Mínimo 8 caracteres" />
        </label>

        <button type="submit" [disabled]="form.invalid || loading">{{ loading ? 'Creando…' : 'Registrarme' }}</button>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
        <p class="muted">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
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
      button { width: 100%; padding: 0.9rem; border: none; border-radius: 10px; background: #111827; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; }
      .muted { color: #475569; text-align: center; margin-top: 1rem; }
      .error { color: #b91c1c; margin-top: 1rem; font-weight: 600; }
      a { color: #1d4ed8; text-decoration: none; }
    `,
    ],
})
export class RegisterComponent {
    readonly form;

    loading = false;
    errorMessage = '';

    constructor(
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router,
    ) {
        this.form = this.fb.nonNullable.group({
            name: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            role: ['CUSTOMER' as const],
        });
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.errorMessage = '';

        this.authService.register(this.form.getRawValue()).subscribe({
            next: () => this.router.navigate(['/shop']),
            error: () => {
                this.loading = false;
                this.errorMessage = 'No se pudo crear la cuenta. Inténtalo nuevamente.';
            },
            complete: () => {
                this.loading = false;
            },
        });
    }
}
