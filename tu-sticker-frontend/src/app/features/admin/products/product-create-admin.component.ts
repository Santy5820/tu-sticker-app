import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { Category, ProductCreateRequest, ProductCustomization } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';

@Component({
    selector: 'app-product-create-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <a class="back-link" routerLink="/admin/products">← Volver a productos</a>
      <header class="page-heading">
        <div>
          <p class="eyebrow">Catálogo</p>
          <h1>Crear producto</h1>
          <p class="muted">Completa la información del producto. Podrás editarla después.</p>
        </div>
      </header>

      <form class="editor" (ngSubmit)="createProduct()">
        <p class="error" *ngIf="formError">{{ formError }}</p>
        <p class="error" *ngIf="categoriesError">{{ categoriesError }}</p>

        <section class="section">
          <div class="section-heading">
            <div>
              <span class="step">1</span>
              <h2>Información del producto</h2>
            </div>
            <p class="muted">Los campos marcados con * son obligatorios.</p>
          </div>
          <div class="form-grid">
            <label>
              Nombre *
              <input name="name" [(ngModel)]="draft.name" maxlength="120" required
                placeholder="Ej. Impresión de calcomanías" />
            </label>
            <label>
              Categoría *
              <select name="category" [(ngModel)]="draft.category" required>
                <option value="" disabled>Selecciona una categoría</option>
                <option *ngFor="let category of categories" [value]="category.slug">{{ category.name }}</option>
              </select>
            </label>
            <label>
              Precio base (COP) *
              <input name="price" type="number" [(ngModel)]="draft.price" min="1" step="1" required />
            </label>
            <label class="checkbox-card">
              <input name="isCustomizable" type="checkbox" [(ngModel)]="draft.isCustomizable" />
              <span>
                <strong>Producto personalizable</strong>
                <small>Permite definir opciones con valores adicionales.</small>
              </span>
            </label>
            <label class="full-width">
              Descripción *
              <textarea name="description" [(ngModel)]="draft.description" rows="5" required
                placeholder="Describe las características del producto"></textarea>
            </label>
          </div>
        </section>

        <section class="section">
          <div class="section-heading">
            <div>
              <span class="step">2</span>
              <h2>Imágenes</h2>
            </div>
            <p class="muted">Opcional · Hasta 8 imágenes.</p>
          </div>
          <label>
            Seleccionar imágenes del producto
            <input name="productImages" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              multiple (change)="selectImages($event)" />
            <small>JPG, PNG, WEBP o GIF · máximo 8 MB por imagen.</small>
          </label>
          <div class="selected-images" *ngIf="selectedImages.length">
            <div class="selected-image" *ngFor="let image of selectedImages; let i = index">
              <span>{{ image.name }} <small>({{ formatFileSize(image.size) }})</small></span>
              <button type="button" class="remove-button" (click)="removeSelectedImage(i)">Quitar</button>
            </div>
          </div>
        </section>

        <section class="section" *ngIf="draft.isCustomizable">
          <div class="section-heading">
            <div>
              <span class="step">3</span>
              <h2>Opciones personalizables</h2>
            </div>
            <button type="button" class="secondary-button" (click)="addCustomization()">Añadir opción</button>
          </div>
          <label>
            Forma de seleccionar las opciones
            <select name="customizationSelectionMode" [(ngModel)]="draft.customizationSelectionMode">
              <option value="single">Elegir una sola opción</option>
              <option value="multiple">Combinar varias opciones</option>
            </select>
            <small *ngIf="draft.customizationSelectionMode === 'single'">
              Úsalo cuando las opciones sean excluyentes, por ejemplo, los tamaños de un cuadro.
              Si una opción está marcada como obligatoria, el cliente deberá elegir una del grupo.
            </small>
            <small *ngIf="draft.customizationSelectionMode !== 'single'">
              Úsalo cuando se puedan combinar opciones, por ejemplo laminado y asistencia de diseño.
            </small>
          </label>
          <p class="muted">Configura el nombre, el incremento de precio y el dato que debe proporcionar el cliente.</p>
          <p class="empty-state" *ngIf="!draft.customizations?.length">
            Añade una opción para que este producto pueda personalizarse.
          </p>
          <div *ngFor="let customization of draft.customizations; let i = index" class="customization-row">
            <label>
              Nombre de la opción *
              <input [name]="'customization-name-' + i" [(ngModel)]="customization.name" required
                placeholder="Ej. Laminación" />
            </label>
            <label>
              Incremento (COP) *
              <input [name]="'customization-value-' + i" type="number" [(ngModel)]="customization.value"
                min="0" step="1" required />
            </label>
            <label>
              Dato solicitado
              <select [name]="'customization-type-' + i" [(ngModel)]="customization.inputType">
                <option value="none">Ninguno</option>
                <option value="text">Texto</option>
                <option value="file">Archivo</option>
              </select>
            </label>
            <label class="checkbox-card compact">
              <input [name]="'customization-required-' + i" type="checkbox" [(ngModel)]="customization.required" />
              <span><strong>Dato obligatorio</strong></span>
            </label>
            <button type="button" class="remove-button" (click)="removeCustomization(i)">Quitar opción</button>
          </div>
        </section>

        <footer class="form-actions">
          <button type="button" class="secondary-button" routerLink="/admin/products">Cancelar</button>
          <button type="submit" class="primary-button" [disabled]="saving || categoriesLoading || !categories.length">
            {{ saving ? 'Guardando producto…' : 'Crear producto' }}
          </button>
        </footer>
      </form>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 960px; margin: 0 auto; padding: 2rem; }
      .back-link { display: inline-block; margin-bottom: 1.25rem; color: #9a3412; font-weight: 700; text-decoration: none; }
      .page-heading { margin-bottom: 1.5rem; }
      h1, h2, p { margin-top: 0; }
      h1 { margin-bottom: .4rem; font-size: 1.8rem; }
      h2 { margin: 0; font-size: 1.15rem; }
      .eyebrow { margin-bottom: .45rem; color: #c2410c; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .muted, label small { color: #64748b; }
      .editor { display: grid; gap: 1.1rem; }
      .section { display: grid; gap: 1.15rem; padding: 1.4rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .section-heading > div { display: flex; align-items: center; gap: .7rem; }
      .section-heading p { margin: 0; text-align: right; }
      .step { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: #ffedd5; color: #9a3412; font-weight: 800; }
      .form-grid, .customization-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      .customization-row { padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
      label { display: grid; gap: .45rem; color: #334155; font-size: .9rem; font-weight: 650; }
      label small { font-size: .8rem; font-weight: 400; }
      input, select, textarea { width: 100%; box-sizing: border-box; padding: .75rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font: inherit; }
      .full-width { grid-column: 1 / -1; }
      .checkbox-card { display: flex; align-items: center; gap: .75rem; min-height: 48px; padding: .55rem .75rem; border: 1px solid #e2e8f0; border-radius: 9px; background: #f8fafc; }
      .checkbox-card input { width: auto; }
      .checkbox-card span { display: grid; gap: .2rem; }
      .checkbox-card small { font-size: .78rem; font-weight: 400; }
      .checkbox-card.compact { align-self: end; }
      .selected-images { display: grid; gap: .5rem; }
      .selected-image { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .65rem .8rem; border: 1px solid #e2e8f0; border-radius: 8px; }
      .selected-image small { color: #64748b; }
      .form-actions { display: flex; justify-content: flex-end; gap: .75rem; padding: .5rem 0 1rem; }
      button { border: 0; border-radius: 8px; padding: .75rem 1rem; font: inherit; font-weight: 700; cursor: pointer; }
      button:disabled { cursor: wait; opacity: .65; }
      .primary-button { background: #c2410c; color: white; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      .remove-button { justify-self: start; background: #fee2e2; color: #991b1b; font-size: .82rem; }
      .empty-state { margin: 0; padding: 1rem; border: 1px dashed #cbd5e1; border-radius: 9px; color: #64748b; text-align: center; }
      .error { margin: 0; color: #b91c1c; }
      @media (max-width: 700px) {
        .page { padding: 1.25rem; }
        .section { padding: 1rem; }
        .section-heading { align-items: flex-start; flex-direction: column; }
        .section-heading p { text-align: left; }
        .form-grid, .customization-row { grid-template-columns: 1fr; }
        .full-width { grid-column: auto; }
        .form-actions { flex-direction: column-reverse; }
        .form-actions button { width: 100%; }
      }
    `],
})
export class ProductCreateAdminComponent implements OnInit {
    categories: Category[] = [];
    categoriesLoading = true;
    categoriesError = '';
    saving = false;
    formError = '';
    selectedImages: File[] = [];
    draft: ProductCreateRequest = {
        name: '',
        description: '',
        price: 1,
        category: '',
        isCustomizable: false,
        customizationSelectionMode: 'multiple',
        customizations: [],
    };

    constructor(
        private readonly adminService: AdminService,
        private readonly router: Router,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.adminService.getCategories().subscribe({
            next: (categories) => {
                this.categories = categories.filter((category) => category.isActive);
                this.categoriesLoading = false;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.categoriesError = 'No se pudieron cargar las categorías. Recarga la página e inténtalo de nuevo.';
                this.categoriesLoading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    addCustomization(): void {
        this.draft.customizations ??= [];
        this.draft.customizations.push({ name: '', value: 0, inputType: 'none', required: false });
    }

    removeCustomization(index: number): void {
        this.draft.customizations?.splice(index, 1);
    }

    selectImages(event: Event): void {
        const input = event.target as HTMLInputElement;
        const combined = [...this.selectedImages, ...Array.from(input.files ?? [])];
        if (combined.length > 8) {
            this.formError = 'Puedes seleccionar hasta 8 imágenes.';
            input.value = '';
            return;
        }
        const oversized = combined.find((file) => file.size > 8 * 1024 * 1024);
        if (oversized) {
            this.formError = `La imagen '${oversized.name}' supera el límite de 8 MB.`;
            input.value = '';
            return;
        }
        if (combined.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) {
            this.formError = 'Solo se permiten imágenes JPG, PNG, WEBP o GIF.';
            input.value = '';
            return;
        }
        this.selectedImages = combined;
        this.formError = '';
        input.value = '';
        this.changeDetector.markForCheck();
    }

    removeSelectedImage(index: number): void {
        this.selectedImages.splice(index, 1);
    }

    formatFileSize(size: number): string {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    createProduct(): void {
        const customizations = this.draft.customizations ?? [];
        const validCustomizations = !this.draft.isCustomizable || (
            customizations.length > 0
            && customizations.every((customization: ProductCustomization) =>
                customization.name.trim().length > 0
                && Number.isFinite(customization.value)
                && customization.value >= 0
            )
        );
        if (!this.draft.name.trim() || !this.draft.description.trim() || !this.draft.category
            || !Number.isFinite(this.draft.price) || this.draft.price <= 0 || !validCustomizations) {
            this.formError = 'Revisa los campos obligatorios, el precio y las opciones personalizables.';
            return;
        }

        this.saving = true;
        this.formError = '';
        const uploadedImages = this.selectedImages.length
            ? this.adminService.uploadProductImages(this.selectedImages).pipe(map((response) => response.images))
            : of([]);
        uploadedImages.pipe(
            switchMap((images) => this.adminService.createProduct({
                ...this.draft,
                name: this.draft.name.trim(),
                description: this.draft.description.trim(),
                images,
            })),
            finalize(() => {
                this.saving = false;
                this.changeDetector.markForCheck();
            }),
        ).subscribe({
            next: (product) => {
                void this.router.navigate(['/admin/products', product.slug]);
            },
            error: () => {
                this.formError = 'No se pudieron subir las imágenes o crear el producto. Verifica los datos y los permisos de tu cuenta.';
                this.changeDetector.markForCheck();
            },
        });
    }
}
