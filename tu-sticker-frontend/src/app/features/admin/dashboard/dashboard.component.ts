import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category, Product } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <section class="page">
      <header class="welcome">
        <p class="eyebrow">Resumen de la tienda</p>
        <h1>Hola, {{ administratorName }} 👋</h1>
        <p>Este es el resumen de actividad de tu plataforma.</p>
      </header>

      <p class="error" *ngIf="loadError">{{ loadError }}</p>

      <section class="metrics" aria-label="Resumen administrativo">
        <a routerLink="/admin/products" class="metric-card">
          <span class="metric-icon products-icon" aria-hidden="true">▦</span>
          <span class="metric-label">Productos agregados</span>
          <strong>{{ products.length }}</strong>
          <span class="metric-link">Gestionar productos →</span>
        </a>
        <a routerLink="/admin/categories" class="metric-card">
          <span class="metric-icon categories-icon" aria-hidden="true">◈</span>
          <span class="metric-label">Categorías agregadas</span>
          <strong>{{ categories.length }}</strong>
          <span class="metric-link">Gestionar categorías →</span>
        </a>
        <article class="metric-card planned">
          <span class="metric-icon sales-icon" aria-hidden="true">↗</span>
          <span class="metric-label">Ventas de hoy</span>
          <strong>Próximamente</strong>
          <span class="metric-note">El seguimiento estará disponible al habilitar el módulo de ventas.</span>
        </article>
        <article class="metric-card planned">
          <span class="metric-icon earnings-icon" aria-hidden="true">$</span>
          <span class="metric-label">Ganancias de hoy</span>
          <strong>Próximamente</strong>
          <span class="metric-note">El resumen de ganancias estará disponible próximamente.</span>
        </article>
      </section>

      <section class="quick-links">
        <h2>Accesos rápidos</h2>
        <div class="cards">
          <a routerLink="/admin/products" class="quick-card"><span>▦</span>Productos <b>→</b></a>
          <a routerLink="/admin/categories" class="quick-card"><span>◈</span>Categorías <b>→</b></a>
          <a routerLink="/admin/orders" class="quick-card"><span>▤</span>Pedidos <b>→</b></a>
          <a routerLink="/admin/users" class="quick-card"><span>♙</span>Usuarios <b>→</b></a>
        </div>
      </section>
    </section>
  `,
    styles: [
        `
      .page { max-width: 1200px; margin: 0 auto; padding: 2.25rem; }
      .welcome { margin-bottom: 2rem; }
      .welcome h1 { margin: .25rem 0 .5rem; color: #0f172a; font-size: clamp(2rem, 4vw, 2.75rem); }
      .welcome p:last-child { margin: 0; color: #64748b; }
      .eyebrow { margin: 0; color: #c2410c; font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      .metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      .metric-card { display: grid; align-content: start; gap: .7rem; min-height: 190px; padding: 1.3rem; border: 1px solid #e2e8f0; border-radius: 18px; background: white; color: inherit; text-decoration: none; box-shadow: 0 8px 20px rgba(15, 23, 42, .035); }
      .metric-card[href]:hover, .quick-card:hover { border-color: #fdba74; transform: translateY(-2px); }
      .metric-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; font-size: 1.2rem; font-weight: 800; }
      .products-icon { background: #fff7ed; color: #c2410c; }
      .categories-icon { background: #eff6ff; color: #1d4ed8; }
      .sales-icon { background: #ecfdf5; color: #047857; }
      .earnings-icon { background: #f5f3ff; color: #6d28d9; }
      .metric-label { color: #64748b; font-size: .9rem; font-weight: 600; }
      .metric-card strong { color: #0f172a; font-size: 1.65rem; }
      .metric-link { color: #c2410c; font-size: .85rem; font-weight: 700; }
      .metric-note { max-width: 340px; color: #64748b; font-size: .85rem; line-height: 1.5; }
      .planned { background: linear-gradient(135deg, #fff 0%, #f8fafc 100%); }
      .quick-links { margin-top: 2.25rem; }
      h2 { margin: 0 0 1rem; color: #0f172a; font-size: 1.2rem; }
      .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .85rem; }
      .quick-card { display: flex; align-items: center; gap: .7rem; min-height: 66px; padding: .85rem 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: white; color: #334155; text-decoration: none; font-weight: 700; transition: transform .15s ease, border-color .15s ease; }
      .quick-card span { color: #c2410c; }
      .quick-card b { margin-left: auto; color: #94a3b8; }
      .error { color: #b91c1c; }
      @media (max-width: 760px) { .page { padding: 1.25rem; } .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 480px) { .metrics { grid-template-columns: 1fr; } .cards { grid-template-columns: 1fr; } }
    `],
})
export class AdminDashboardComponent implements OnInit {
    products: Product[] = [];
    categories: Category[] = [];
    loadError = '';

    constructor(
        private readonly adminService: AdminService,
        private readonly authService: AuthService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    get administratorName(): string {
        const name = this.authService.currentUser()?.name.trim();
        return name ? name.split(/\s+/)[0] : 'administrador';
    }

    ngOnInit(): void {
        this.adminService.getProducts().subscribe({
            next: (products) => {
                this.products = products;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudieron cargar los conteos del panel.';
                this.changeDetector.markForCheck();
            },
        });
        this.adminService.getAdminCategories().subscribe({
            next: (categories) => {
                this.categories = categories;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudieron cargar los conteos del panel.';
                this.changeDetector.markForCheck();
            },
        });
    }
}
