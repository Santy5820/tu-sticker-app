import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Category } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';

@Component({
    selector: 'app-categories-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <section class="page">
      <div class="page-heading">
        <div>
          <h1>Categorías</h1>
          <p>Organiza las categorías disponibles en el catálogo.</p>
        </div>
        <button type="button" class="primary-button" (click)="openCreateForm()">Añadir categoría</button>
      </div>

      <form *ngIf="showForm" class="category-form" (ngSubmit)="saveCategory()">
        <div class="form-heading">
          <h2>{{ editingCategory ? 'Editar categoría' : 'Nueva categoría' }}</h2>
          <button type="button" class="close-button" aria-label="Cerrar formulario" (click)="closeForm()">×</button>
        </div>

        <p class="error" *ngIf="formError">{{ formError }}</p>
        <div class="form-grid">
          <label>
            Nombre
            <input name="name" [(ngModel)]="draft.name" required maxlength="100" />
          </label>
          <label class="description-field">
            Descripción (opcional)
            <textarea name="description" [(ngModel)]="draft.description" rows="2"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="secondary-button" (click)="closeForm()">Cancelar</button>
          <button type="submit" class="primary-button" [disabled]="saving">
            {{ saving ? 'Guardando…' : editingCategory ? 'Guardar cambios' : 'Crear categoría' }}
          </button>
        </div>
      </form>

      <p class="error" *ngIf="loadError">{{ loadError }}</p>
      <section class="panel" aria-label="Listado de categorías">
        <div class="filters">
          <label class="search-field">
            <span>Buscar categorías</span>
            <input type="search" [(ngModel)]="searchTerm" placeholder="Nombre o descripción" />
          </label>
          <label>
            Estado
            <select [(ngModel)]="selectedStatus">
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </label>
        </div>

        <p class="muted" *ngIf="loading">Cargando categorías…</p>
        <ng-container *ngIf="!loading">
          <p class="empty-state" *ngIf="!categories.length && !loadError">
            Aún no existen categorías.
          </p>
          <p class="empty-state" *ngIf="categories.length && !filteredCategories.length">
            No hay categorías que coincidan con la búsqueda o el filtro.
          </p>

          <div class="table-scroll" *ngIf="filteredCategories.length">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th><span class="visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let category of filteredCategories">
                  <td><strong>{{ category.name }}</strong></td>
                  <td><code>{{ category.slug }}</code></td>
                  <td>{{ category.description || '—' }}</td>
                  <td>
                    <span class="status" [class.inactive]="!category.isActive">
                      {{ category.isActive ? 'Activa' : 'Inactiva' }}
                    </span>
                  </td>
                  <td class="actions">
                    <button type="button" class="secondary-button" (click)="openEditForm(category)">Editar</button>
                    <button *ngIf="category.isActive" type="button" class="danger-button"
                      [disabled]="busyCategoryId === category._id" (click)="deactivateCategory(category)">
                      {{ busyCategoryId === category._id ? 'Procesando…' : 'Desactivar' }}
                    </button>
                    <button *ngIf="!category.isActive" type="button" class="secondary-button"
                      [disabled]="busyCategoryId === category._id" (click)="reactivateCategory(category)">
                      {{ busyCategoryId === category._id ? 'Procesando…' : 'Reactivar' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>
      </section>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1100px; margin: 0 auto; padding: 2rem; }
      .page-heading, .form-heading, .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      h1, h2, p { margin-top: 0; }
      .page-heading p, .muted { color: #64748b; }
      .panel, .category-form { margin-top: 1.5rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      .category-form { display: grid; gap: 1rem; background: #f8fafc; }
      .form-heading h2 { margin: 0; }
      .form-grid { display: grid; grid-template-columns: minmax(200px, .7fr) 1.3fr; gap: 1rem; }
      label { display: grid; gap: .45rem; color: #334155; font-size: .9rem; font-weight: 600; }
      input, select, textarea { width: 100%; box-sizing: border-box; padding: .7rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font: inherit; }
      button { border: 0; border-radius: 8px; padding: .65rem .85rem; font: inherit; font-weight: 700; cursor: pointer; white-space: nowrap; }
      button:disabled { cursor: wait; opacity: .65; }
      .primary-button { background: #c2410c; color: white; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      .danger-button { background: #fee2e2; color: #991b1b; }
      .close-button { background: transparent; color: #475569; font-size: 1.5rem; }
      .filters { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(150px, .35fr); gap: 1rem; margin-bottom: 1.25rem; }
      .table-scroll { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; text-align: left; }
      th, td { padding: .9rem .75rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      th { color: #475569; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; }
      code { color: #475569; }
      .actions { display: flex; justify-content: flex-end; gap: .5rem; }
      .status { display: inline-block; padding: .25rem .6rem; border-radius: 999px; background: #dcfce7; color: #166534; font-size: .8rem; font-weight: 700; }
      .status.inactive { background: #f1f5f9; color: #475569; }
      .empty-state { padding: 2rem 1rem; color: #475569; text-align: center; }
      .error { color: #b91c1c; }
      .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
      @media (max-width: 700px) {
        .page { padding: 1.25rem; }
        .page-heading { align-items: flex-start; }
        .form-grid, .filters { grid-template-columns: 1fr; }
        .actions { align-items: flex-end; flex-direction: column; }
      }
    `],
})
export class CategoriesAdminComponent implements OnInit {
    categories: Category[] = [];
    loading = true;
    saving = false;
    showForm = false;
    loadError = '';
    formError = '';
    searchTerm = '';
    selectedStatus = 'all';
    busyCategoryId: string | null = null;
    editingCategory: Category | null = null;
    draft = this.emptyDraft();

    constructor(private readonly adminService: AdminService) { }

    ngOnInit(): void {
        this.loadCategories();
    }

    get filteredCategories(): Category[] {
        const term = this.searchTerm.trim().toLocaleLowerCase();
        return this.categories.filter((category) => {
            const matchesTerm = !term || [category.name, category.slug, category.description ?? '']
                .some((value) => value.toLocaleLowerCase().includes(term));
            const matchesStatus = this.selectedStatus === 'all'
                || (this.selectedStatus === 'active' ? category.isActive : !category.isActive);
            return matchesTerm && matchesStatus;
        });
    }

    openCreateForm(): void {
        this.editingCategory = null;
        this.draft = this.emptyDraft();
        this.formError = '';
        this.showForm = true;
    }

    openEditForm(category: Category): void {
        this.editingCategory = category;
        this.draft = { name: category.name, description: category.description ?? '' };
        this.formError = '';
        this.showForm = true;
    }

    closeForm(): void {
        if (this.saving) {
            return;
        }
        this.showForm = false;
        this.editingCategory = null;
    }

    saveCategory(): void {
        const name = this.draft.name.trim();
        if (!name) {
            this.formError = 'El nombre de la categoría es obligatorio.';
            return;
        }

        this.saving = true;
        this.formError = '';
        const payload = {
            name,
            description: this.draft.description?.trim() ?? '',
        };
        const request = this.editingCategory
            ? this.adminService.updateCategory(this.editingCategory._id, payload)
            : this.adminService.createCategory(payload);

        request.subscribe({
            next: (category) => {
                this.categories = this.editingCategory
                    ? this.categories.map((existing) => existing._id === category._id ? category : existing)
                    : [...this.categories, category].sort((left, right) => left.name.localeCompare(right.name));
                this.showForm = false;
                this.editingCategory = null;
                this.saving = false;
            },
            error: () => {
                this.formError = 'No se pudo guardar la categoría. Verifica el nombre y vuelve a intentarlo.';
                this.saving = false;
            },
        });
    }

    deactivateCategory(category: Category): void {
        if (!window.confirm(`¿Desactivar la categoría "${category.name}"?`)) {
            return;
        }

        this.busyCategoryId = category._id;
        this.adminService.deactivateCategory(category._id).subscribe({
            next: () => this.setCategoryActive(category, false),
            error: () => {
                this.loadError = 'No se pudo desactivar la categoría. Intenta nuevamente.';
                this.busyCategoryId = null;
            },
        });
    }

    reactivateCategory(category: Category): void {
        this.busyCategoryId = category._id;
        this.adminService.updateCategory(category._id, { isActive: true }).subscribe({
            next: (updatedCategory) => this.replaceCategory(updatedCategory),
            error: () => {
                this.loadError = 'No se pudo reactivar la categoría. Intenta nuevamente.';
                this.busyCategoryId = null;
            },
        });
    }

    private loadCategories(): void {
        this.loading = true;
        this.loadError = '';
        this.adminService.getAdminCategories().subscribe({
            next: (categories) => {
                this.categories = categories;
                this.loading = false;
            },
            error: () => {
                this.loadError = 'No se pudieron cargar las categorías. Verifica tu sesión e intenta nuevamente.';
                this.loading = false;
            },
        });
    }

    private setCategoryActive(category: Category, isActive: boolean): void {
        this.replaceCategory({ ...category, isActive });
    }

    private replaceCategory(category: Category): void {
        this.categories = this.categories
            .map((existing) => existing._id === category._id ? category : existing)
            .sort((left, right) => left.name.localeCompare(right.name));
        this.busyCategoryId = null;
        this.loadError = '';
    }

    private emptyDraft(): { name: string; description: string } {
        return { name: '', description: '' };
    }
}
