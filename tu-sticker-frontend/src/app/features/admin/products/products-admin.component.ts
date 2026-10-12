import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category, Product, ProductCreateRequest } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';

@Component({
    selector: 'app-products-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <h1>Productos</h1>
          <p>Gestiona el catálogo, los precios y la disponibilidad.</p>
        </div>
        <button type="button" class="primary-button" (click)="openCreateForm()">Añadir productos</button>
      </div>

      <form *ngIf="showCreateForm" class="create-form" (ngSubmit)="createProduct()">
        <div class="form-heading">
          <h2>Nuevo producto</h2>
          <button type="button" class="close-button" aria-label="Cerrar formulario" (click)="showCreateForm = false">×</button>
        </div>

        <p class="error" *ngIf="formError">{{ formError }}</p>
        <p class="muted" *ngIf="!categories.length">No hay categorías activas disponibles para asignar al producto.</p>

        <div class="form-grid">
          <label>
            Nombre
            <input name="name" [(ngModel)]="draft.name" required maxlength="120" />
          </label>
          <label>
            Categoría
            <select name="category" [(ngModel)]="draft.category" required>
              <option value="" disabled>Selecciona una categoría</option>
              <option *ngFor="let category of categories" [value]="category.slug">{{ category.name }}</option>
            </select>
          </label>
          <label>
            Precio (COP)
            <input name="price" type="number" [(ngModel)]="draft.price" required min="1" step="1" />
          </label>
          <label class="checkbox-label">
            <input name="isCustomizable" type="checkbox" [(ngModel)]="draft.isCustomizable" />
            Producto personalizable
          </label>
          <label class="full-width">
            Descripción
            <textarea name="description" [(ngModel)]="draft.description" required rows="3"></textarea>
          </label>
        </div>

        <div class="form-actions">
          <button type="button" class="secondary-button" (click)="showCreateForm = false">Cancelar</button>
          <button type="submit" class="primary-button" [disabled]="saving || !categories.length">
            {{ saving ? 'Guardando…' : 'Guardar producto' }}
          </button>
        </div>
      </form>

      <p class="error" *ngIf="loadError">{{ loadError }}</p>
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
      .page-heading, .form-heading, .form-actions, .list-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      h1, h2, p { margin-top: 0; }
      .page-heading p, .muted { color: #64748b; }
      .panel, .create-form { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      .create-form { display: grid; gap: 1rem; background: #f8fafc; }
      .form-heading h2 { margin: 0; }
      .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      label { display: grid; gap: .45rem; color: #334155; font-size: .9rem; font-weight: 600; }
      input, select, textarea { width: 100%; box-sizing: border-box; padding: .7rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font: inherit; }
      .checkbox-label { display: flex; align-items: center; align-self: end; min-height: 42px; }
      .checkbox-label input { width: auto; }
      .full-width { grid-column: 1 / -1; }
      button { border: 0; border-radius: 8px; padding: .7rem 1rem; font: inherit; font-weight: 700; cursor: pointer; }
      button:disabled { cursor: wait; opacity: .65; }
      .primary-button { background: #c2410c; color: white; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      .close-button { background: transparent; color: #475569; font-size: 1.5rem; }
      .filters { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(150px, .45fr) minmax(140px, .35fr); gap: 1rem; margin-bottom: 1.25rem; }
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
        .filters, .form-grid { grid-template-columns: 1fr; }
        .full-width { grid-column: auto; }
        .list-footer { align-items: flex-start; flex-direction: column; }
      }
    `],
})
export class ProductsAdminComponent implements OnInit {
    products: Product[] = [];
    categories: Category[] = [];
    loading = true;
    saving = false;
    showCreateForm = false;
    loadError = '';
    productsError = '';
    formError = '';
    searchTerm = '';
    selectedCategory = 'all';
    selectedStatus = 'all';
    visibleCount = 6;
    draft: ProductCreateRequest = this.emptyDraft();

    constructor(private readonly adminService: AdminService) { }

    ngOnInit(): void {
        this.loadProducts();
        this.adminService.getCategories().subscribe({
            next: (categories) => {
                this.categories = categories.filter((category) => category.isActive);
            },
            error: () => {
                this.loadError = 'No se pudieron cargar las categorías. Intenta recargar la página.';
            },
        });
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

    openCreateForm(): void {
        this.formError = '';
        this.draft = this.emptyDraft();
        this.showCreateForm = true;
    }

    createProduct(): void {
        if (!this.draft.name.trim() || !this.draft.description.trim()
            || !this.draft.category || !Number.isFinite(this.draft.price) || this.draft.price <= 0) {
            this.formError = 'Completa los campos obligatorios e indica un precio mayor que cero.';
            return;
        }

        this.saving = true;
        this.formError = '';
        this.adminService.createProduct({
            ...this.draft,
            name: this.draft.name.trim(),
            description: this.draft.description.trim(),
        }).subscribe({
            next: (product) => {
                this.products = [product, ...this.products];
                this.visibleCount = Math.max(6, this.visibleCount);
                this.searchTerm = '';
                this.selectedCategory = 'all';
                this.selectedStatus = 'all';
                this.showCreateForm = false;
                this.saving = false;
            },
            error: () => {
                this.formError = 'No se pudo guardar el producto. Verifica los datos y los permisos de tu cuenta.';
                this.saving = false;
            },
        });
    }

    private loadProducts(): void {
        this.loading = true;
        this.productsError = '';
        this.adminService.getProducts().subscribe({
            next: (products) => {
                this.products = products;
                this.loading = false;
            },
            error: () => {
                this.productsError = 'No se pudieron cargar los productos. Intenta recargar la página.';
                this.loading = false;
            },
        });
    }

    private emptyDraft(): ProductCreateRequest {
        return {
            name: '',
            description: '',
            price: 1,
            category: '',
            isCustomizable: false,
        };
    }
}
