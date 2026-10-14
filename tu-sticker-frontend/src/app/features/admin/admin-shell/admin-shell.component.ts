import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Order, UserPublic } from '../../../core/models/api';
import { filter } from 'rxjs';

interface AdminNavigationItem {
    label: string;
    icon: string;
    path: string;
}

@Component({
    selector: 'app-admin-shell',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
    template: `
    <div class="admin-layout" [class.collapsed]="collapsed">
      <aside class="sidebar" [attr.aria-label]="collapsed ? 'Menú administrativo contraído' : 'Menú administrativo'">
        <div class="sidebar-brand">
          <span class="brand-mark">TS</span>
          <span class="brand-name" *ngIf="!collapsed">Administración</span>
        </div>

        <p class="nav-caption" *ngIf="!collapsed">ESPACIO DE TRABAJO</p>
        <nav class="navigation">
          <a *ngFor="let item of navigationItems"
            [routerLink]="item.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.path === '/admin' }"
            [attr.title]="collapsed ? item.label : null"
            [attr.aria-label]="collapsed ? item.label : null">
            <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
            <span class="nav-label" *ngIf="!collapsed">{{ item.label }}</span>
            <span class="active-mark" *ngIf="!collapsed"></span>
          </a>
        </nav>

        <div class="sidebar-bottom">
          <button type="button" class="collapse-button" (click)="toggleMenu()"
            [attr.aria-label]="collapsed ? 'Mostrar menú' : 'Ocultar menú'"
            [attr.title]="collapsed ? 'Mostrar menú' : 'Ocultar menú'">
            <span aria-hidden="true">{{ collapsed ? '→' : '←' }}</span>
            <span *ngIf="!collapsed">Ocultar menú</span>
          </button>
        </div>
      </aside>

      <div class="workspace">
        <header class="workspace-header">
          <nav class="breadcrumbs" aria-label="Ruta de navegación">
            <a routerLink="/admin">Panel</a>
            <ng-container *ngIf="section">
              <span aria-hidden="true">/</span>
              <a *ngIf="sectionPath; else currentSection" [routerLink]="sectionPath">{{ section }}</a>
              <ng-template #currentSection><span>{{ section }}</span></ng-template>
            </ng-container>
            <ng-container *ngIf="detail">
              <span aria-hidden="true">/</span>
              <span class="current-crumb">{{ detail }}</span>
            </ng-container>
          </nav>
          <div class="admin-user">
            <span class="user-avatar" aria-hidden="true">{{ administratorInitials }}</span>
            <span class="user-name">{{ administratorName }}</span>
            <span class="role-label">Administrador</span>
          </div>
        </header>

        <main class="workspace-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
    styles: [`
      :host { display: block; min-height: calc(100vh - 72px); background: #f8fafc; }
      .admin-layout { --sidebar-width: 250px; display: grid; grid-template-columns: var(--sidebar-width) minmax(0, 1fr); min-height: calc(100vh - 72px); transition: grid-template-columns .2s ease; }
      .admin-layout.collapsed { --sidebar-width: 76px; }
      .sidebar { position: sticky; top: 0; display: flex; flex-direction: column; height: calc(100vh - 72px); min-height: 520px; padding: 1.1rem .85rem; box-sizing: border-box; border-right: 1px solid #e2e8f0; background: #fff; }
      .sidebar-brand { display: flex; align-items: center; gap: .75rem; min-height: 48px; padding: 0 .55rem; color: #0f172a; font-weight: 800; }
      .brand-mark { display: grid; flex: 0 0 36px; width: 36px; height: 36px; place-items: center; border-radius: 11px; background: #c2410c; color: #fff; font-size: .8rem; }
      .brand-name { white-space: nowrap; }
      .nav-caption { margin: 2rem .65rem .65rem; color: #94a3b8; font-size: .65rem; font-weight: 800; letter-spacing: .1em; white-space: nowrap; }
      .navigation { display: grid; gap: .3rem; margin-top: 1rem; }
      .nav-caption + .navigation { margin-top: 0; }
      .navigation a { position: relative; display: flex; align-items: center; gap: .8rem; min-height: 44px; padding: 0 .7rem; border-radius: 10px; color: #64748b; text-decoration: none; font-size: .9rem; font-weight: 650; }
      .navigation a:hover { background: #f8fafc; color: #334155; }
      .navigation a.active { background: #fff7ed; color: #9a3412; }
      .nav-icon { display: grid; flex: 0 0 30px; width: 30px; height: 30px; place-items: center; border-radius: 9px; font-size: 1rem; }
      .active .nav-icon { background: #ffedd5; }
      .nav-label { white-space: nowrap; }
      .active-mark { width: 5px; height: 5px; margin-left: auto; border-radius: 50%; background: #ea580c; }
      .sidebar-bottom { margin-top: auto; }
      .collapse-button { display: flex; align-items: center; justify-content: flex-start; gap: .8rem; width: 100%; min-height: 42px; padding: 0 .7rem; border: 0; border-radius: 10px; background: transparent; color: #64748b; font: inherit; font-size: .85rem; cursor: pointer; white-space: nowrap; }
      .collapse-button:hover { background: #f1f5f9; color: #0f172a; }
      .collapse-button span:first-child { display: grid; flex: 0 0 30px; width: 30px; height: 30px; place-items: center; font-size: 1.1rem; }
      .collapsed .sidebar-brand { justify-content: center; padding: 0; }
      .collapsed .navigation a { justify-content: center; padding: 0; }
      .collapsed .collapse-button { justify-content: center; padding: 0; }
      .workspace { min-width: 0; }
      .workspace-header { position: sticky; z-index: 2; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 62px; padding: 0 1.75rem; border-bottom: 1px solid #e2e8f0; background: rgba(255, 255, 255, .94); backdrop-filter: blur(12px); }
      .breadcrumbs { display: flex; align-items: center; gap: .65rem; min-width: 0; color: #94a3b8; font-size: .85rem; }
      .breadcrumbs a { color: #64748b; text-decoration: none; }
      .breadcrumbs a:hover { color: #c2410c; }
      .current-crumb { overflow: hidden; color: #0f172a; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .admin-user { display: flex; align-items: center; gap: .6rem; }
      .user-avatar { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: #ffedd5; color: #9a3412; font-size: .78rem; font-weight: 800; }
      .user-name { color: #334155; font-size: .85rem; font-weight: 700; }
      .role-label { padding: .25rem .5rem; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: .68rem; font-weight: 700; }
      .workspace-content { min-width: 0; }
      @media (max-width: 700px) {
        :host, .admin-layout { min-height: calc(100vh - 60px); }
        .admin-layout { --sidebar-width: 64px; }
        .admin-layout.collapsed { --sidebar-width: 64px; }
        .sidebar { height: calc(100vh - 60px); padding: .9rem .5rem; }
        .sidebar-brand { justify-content: center; padding: 0; }
        .brand-name, .nav-caption, .nav-label, .active-mark, .collapse-button span:last-child { display: none; }
        .navigation a { justify-content: center; padding: 0; }
        .collapse-button { justify-content: center; padding: 0; }
        .workspace-header { min-height: 56px; padding: 0 .8rem; }
        .breadcrumbs { gap: .4rem; font-size: .75rem; }
        .role-label { display: none; }
        .user-name { max-width: 92px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      }
    `],
})
export class AdminShellComponent implements OnInit {
    readonly navigationItems: AdminNavigationItem[] = [
        { label: 'Panel', icon: '⌂', path: '/admin' },
        { label: 'Productos', icon: '▦', path: '/admin/products' },
        { label: 'Categorías', icon: '◈', path: '/admin/categories' },
        { label: 'Pedidos', icon: '▤', path: '/admin/orders' },
        { label: 'Usuarios', icon: '♙', path: '/admin/users' },
    ];
    collapsed = false;
    section = '';
    sectionPath = '';
    detail = '';
    administratorName = 'Administrador';
    administratorInitials = 'AD';

    constructor(
        private readonly router: Router,
        private readonly authService: AuthService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.collapsed = localStorage.getItem('tu-sticker-admin-menu-collapsed') === 'true';
        this.updateBreadcrumbs();
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.updateBreadcrumbs();
            this.changeDetector.markForCheck();
        });

        const user = this.authService.currentUser();
        if (user) {
            this.administratorName = user.name;
            this.administratorInitials = user.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0].toLocaleUpperCase())
                .join('');
        }
    }

    toggleMenu(): void {
        this.collapsed = !this.collapsed;
        localStorage.setItem('tu-sticker-admin-menu-collapsed', String(this.collapsed));
    }

    private updateBreadcrumbs(): void {
        const segments = this.router.url.split('?')[0].split('/').filter(Boolean).slice(1);
        this.section = '';
        this.sectionPath = '';
        this.detail = '';
        if (!segments.length) {
            return;
        }

        const labels: Record<string, string> = {
            products: 'Productos',
            categories: 'Categorías',
            orders: 'Pedidos',
            users: 'Usuarios',
        };
        this.section = labels[segments[0]] ?? '';
        if (segments[0] === 'users' && segments.length > 1) {
            this.section = 'Usuario';
        }
        this.sectionPath = this.section ? `/admin/${segments[0]}` : '';
        if (segments.length > 1) {
            if (segments[0] === 'orders') {
                const route = this.router.routerState.snapshot.root;
                let deepestRoute = route;
                while (deepestRoute.firstChild) {
                    deepestRoute = deepestRoute.firstChild;
                }
                const order = deepestRoute.data['order'] as Order | undefined;
                this.detail = order?.orderNumber ?? decodeURIComponent(segments[1]).replace(/-/g, ' ');
            } else if (segments[0] === 'users' && segments[1] !== 'new') {
                const route = this.router.routerState.snapshot.root;
                let deepestRoute = route;
                while (deepestRoute.firstChild) {
                    deepestRoute = deepestRoute.firstChild;
                }
                const user = deepestRoute.data['user'] as UserPublic | undefined;
                this.detail = user?.name ?? decodeURIComponent(segments[1]).replace(/-/g, ' ');
            } else {
                this.detail = segments[1] === 'new'
                    ? 'Crear usuario'
                    : decodeURIComponent(segments[1]).replace(/-/g, ' ');
            }
        }
    }

}
