import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-site-header',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    template: `
    <header class="topbar">
      <div class="brand">Tu Sticker</div>

      <nav class="nav">
        <a routerLink="/shop" routerLinkActive="active">Shop</a>
        <a routerLink="/products" routerLinkActive="active">Productos</a>
        <a routerLink="/cart" routerLinkActive="active">Carrito</a>
        <a routerLink="/orders" routerLinkActive="active">Pedidos</a>
        <a routerLink="/admin" routerLinkActive="active">Admin</a>
      </nav>

      <div class="actions" *ngIf="!authService.isAuthenticated(); else signedIn">
        <a routerLink="/login" class="btn btn-light">Iniciar sesión</a>
        <a routerLink="/register" class="btn btn-primary">Registrarse</a>
      </div>

      <ng-template #signedIn>
        <div class="actions">
          <span class="user-pill">{{ authService.currentUser()?.name || 'Usuario' }}</span>
          <button type="button" class="btn btn-light" (click)="logout()">Cerrar sesión</button>
        </div>
      </ng-template>
    </header>
  `,
    styles: [
        `
      :host {
        display: block;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 2rem;
        background: #111827;
        color: #fff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .brand {
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: 0.04em;
      }

      .nav {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .nav a {
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        font-weight: 600;
      }

      .nav a.active {
        color: #fff;
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .btn {
        border: none;
        border-radius: 999px;
        padding: 0.7rem 1rem;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }

      .btn-primary {
        background: #f97316;
        color: white;
      }

      .btn-light {
        background: #f3f4f6;
        color: #111827;
      }

      .user-pill {
        display: inline-flex;
        align-items: center;
        min-height: 2.5rem;
        padding: 0 0.85rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }
    `,
    ],
})
export class SiteHeaderComponent {
    constructor(public readonly authService: AuthService) { }

    logout(): void {
        this.authService.logout();
        window.location.href = '/login';
    }
}
