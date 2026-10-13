import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';

@Component({
    selector: 'app-products-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <h1>Productos</h1>
          <p>Gestiona el catálogo, los precios y la disponibilidad.</p>
        </div>
        <a class="primary-button" routerLink="/admin/products/new">Añadir productos</a>
      </div>

      <p class="error" *ngIf="productsError">{{ productsError }}</p>

      <section class="panel" aria-label="Listado de productos">
        <div class="filters">
          <label class="search-field">
            <span>Buscar productos</span>
            <input type="search" [(ngModel)]="searchTerm" placeholder="Nombre, descripción o categoría" />
          </label>
          <label>
            Categoría
            <select [(ngModel)]="selectedCategory">
              <option value="all">Todas</option>
              <option *ngFor="let category of productCategories" [value]="category">{{ category }}</option>
            </select>
          </label>
          <label>
            Estado
            <select [(ngModel)]="selectedStatus">
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
        </div>

        <p class="muted" *ngIf="loading">Cargando productos…</p>
        <ng-container *ngIf="!loading">
          <p class="empty-state" *ngIf="!products.length && !productsError">
            Aún no existen productos.
          </p>
          <p class="empty-state" *ngIf="products.length && !filteredProducts.length">
            No hay productos que coincidan con la búsqueda o los filtros.
          </p>

          <ng-container *ngIf="filteredProducts.length">
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Inventario</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let product of visibleProducts">
                    <td>
                      <strong>{{ product.name }}</strong>
                      <span class="description">{{ product.description }}</span>
                    </td>
                    <td>{{ product.category }}</td>
                    <td>{{ product.price | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
                    <td>{{ product.inventoryManaged ? (product.stock ?? 0) : 'No gestionado' }}</td>
                    <td>
                      <span class="status" [class.inactive]="!product.isActive">
                        {{ product.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="actions-cell">
                      <a class="edit-button" [routerLink]="['/admin/products', product.slug]"
                        [attr.aria-label]="'Editar ' + product.name" title="Editar producto">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"></path>
                        </svg>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="list-footer">
              <span>Mostrando {{ visibleProducts.length }} de {{ filteredProducts.length }} productos</span>
              <button *ngIf="visibleProducts.length < filteredProducts.length"
                type="button" class="secondary-button" (click)="showMore()">Listar más productos</button>
            </div>
          </ng-container>
        </ng-container>

      </section>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      .page-heading, .list-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      h1, h2, p { margin-top: 0; }
      .page-heading p, .muted { color: #64748b; }
      .panel { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      button { border: 0; border-radius: 8px; padding: .7rem 1rem; font: inherit; font-weight: 700; cursor: pointer; }
      .primary-button { display: inline-block; border-radius: 8px; padding: .7rem 1rem; background: #c2410c; color: white; font: inherit; font-weight: 700; text-decoration: none; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      a.secondary-button { display: inline-block; text-decoration: none; white-space: nowrap; }
      .actions-cell { width: 1%; white-space: nowrap; }
      .edit-button { display: inline-grid; width: 36px; height: 36px; place-items: center; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #475569; text-decoration: none; transition: background .15s ease, color .15s ease, border-color .15s ease; }
      .edit-button:hover { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
      .edit-button:focus-visible { outline: 2px solid #c2410c; outline-offset: 2px; }
      .edit-button svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
      .filters { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(170px, .45fr) minmax(160px, .35fr); gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
      .filters label { display: grid; align-content: start; gap: .45rem; color: #475569; font-size: .8rem; font-weight: 700; }
      .filters input, .filters select { width: 100%; min-height: 42px; box-sizing: border-box; padding: .65rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: .9rem; transition: border-color .15s ease, box-shadow .15s ease; }
      .filters input::placeholder { color: #94a3b8; }
      .filters input:focus, .filters select:focus { border-color: #f97316; outline: none; box-shadow: 0 0 0 3px rgb(249 115 22 / 15%); }
      .search-field { min-width: 0; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; text-align: left; }
      th, td { padding: .9rem .75rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      th { color: #475569; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
      td strong, .description { display: block; }
      .description { max-width: 390px; margin-top: .3rem; color: #64748b; font-size: .85rem; }
      .status { display: inline-block; padding: .25rem .6rem; border-radius: 999px; background: #dcfce7; color: #166534; font-size: .8rem; font-weight: 700; }
      .status.inactive { background: #f1f5f9; color: #475569; }
      .list-footer { margin-top: 1rem; color: #64748b; font-size: .9rem; }
      .empty-state { padding: 2rem 1rem; color: #475569; text-align: center; }
      .error { color: #b91c1c; }
      @media (max-width: 700px) {
        .page { padding: 1.25rem; }
        .page-heading { align-items: flex-start; }
        .filters { grid-template-columns: 1fr; }
        .list-footer { align-items: flex-start; flex-direction: column; }
      }
    `],
})
export class ProductsAdminComponent implements OnInit {
    products: Product[] = [];
    loading = true;
    productsError = '';
    searchTerm = '';
    selectedCategory = 'all';
    selectedStatus = 'all';
    visibleCount = 6;

    constructor(
        private readonly adminService: AdminService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.loadProducts();
    }

    get productCategories(): string[] {
        return [...new Set(this.products.map((product) => product.category))].sort();
    }

    get filteredProducts(): Product[] {
        const term = this.searchTerm.trim().toLocaleLowerCase();
        return this.products.filter((product) => {
            const matchesTerm = !term || [product.name, product.description, product.category, product.slug]
                .some((value) => value.toLocaleLowerCase().includes(term));
            const matchesCategory = this.selectedCategory === 'all' || product.category === this.selectedCategory;
            const matchesStatus = this.selectedStatus === 'all'
                || (this.selectedStatus === 'active' ? product.isActive : !product.isActive);
            return matchesTerm && matchesCategory && matchesStatus;
        });
    }

    get visibleProducts(): Product[] {
        return this.filteredProducts.slice(0, this.visibleCount);
    }

    showMore(): void {
        this.visibleCount += 6;
    }

    private loadProducts(): void {
        this.loading = true;
        this.productsError = '';
        this.adminService.getProducts().subscribe({
            next: (products) => {
                this.products = products;
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.productsError = 'No se pudieron cargar los productos. Intenta recargar la página.';
                this.loading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

}
