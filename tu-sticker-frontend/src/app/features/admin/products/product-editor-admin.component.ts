import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Category, Product, ProductCustomization, ProductUpdateRequest } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';
import { finalize, map, of, switchMap } from 'rxjs';

@Component({
    selector: 'app-product-editor-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <a class="back-link" routerLink="/admin/products">← Volver a productos</a>
      <p class="muted" *ngIf="loading">Cargando producto…</p>
      <p class="error" *ngIf="loadError">{{ loadError }}</p>

      <form *ngIf="!loading && product" class="editor" (ngSubmit)="saveProduct()">
        <div class="page-heading">
          <div>
            <p class="eyebrow">Administración de productos</p>
            <h1>Editar producto</h1>
            <p class="muted">Slug actual: <code>{{ product.slug }}</code></p>
          </div>
          <span class="status" [class.inactive]="!draft.isActive">
            {{ draft.isActive ? 'Activo' : 'Inactivo' }}
          </span>
        </div>

        <p class="error" *ngIf="formError">{{ formError }}</p>

        <section class="section">
          <h2>Información general</h2>
          <div class="form-grid">
            <label>
              Nombre
              <input name="name" [(ngModel)]="draft.name" maxlength="120" required />
            </label>
            <label>
              Categoría
              <select name="category" [(ngModel)]="draft.category" required>
                <option value="" disabled>Selecciona una categoría</option>
                <option *ngFor="let category of categories" [value]="category.slug">
                  {{ category.name }}{{ category.isActive ? '' : ' (inactiva)' }}
                </option>
              </select>
            </label>
            <label>
              Precio base (COP)
              <input name="price" type="number" [(ngModel)]="draft.price" min="1" step="1" required />
            </label>
            <label class="checkbox-label">
              <input name="isActive" type="checkbox" [(ngModel)]="draft.isActive" />
              Producto activo y visible en la tienda
            </label>
            <label class="full-width">
              Descripción
              <textarea name="description" [(ngModel)]="draft.description" rows="4" required></textarea>
            </label>
            <label class="full-width">
              Añadir imágenes al producto
              <input name="productImages" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                multiple (change)="selectImages($event)" />
              <small>Imágenes JPG, PNG, WEBP o GIF; máximo 8 MB cada una y hasta 8 por producto.</small>
            </label>
          </div>
          <div class="image-gallery" *ngIf="imageUrls.length">
            <article class="image-card" *ngFor="let image of imageUrls">
              <img [src]="image" [alt]="product.name + ' imagen de producto'" />
              <button type="button" class="danger-button" (click)="removeExistingImage(image)">Quitar</button>
            </article>
          </div>
          <div class="selected-images" *ngIf="selectedImages.length">
            <div class="selected-image" *ngFor="let image of selectedImages; let i = index">
              <span>{{ image.name }} <small>({{ formatFileSize(image.size) }})</small></span>
              <button type="button" class="danger-button" (click)="removeSelectedImage(i)">Quitar</button>
            </div>
          </div>
          <p class="muted" *ngIf="!imageUrls.length && !selectedImages.length">Este producto todavía no tiene imágenes.</p>
        </section>

        <section class="section">
          <h2>Inventario y abastecimiento</h2>
          <div class="form-grid">
            <label class="checkbox-label">
              <input name="inventoryManaged" type="checkbox" [(ngModel)]="draft.inventoryManaged" />
              Gestionar inventario
            </label>
            <label>
              Umbral de alerta de inventario
              <input name="stockAlertThreshold" type="number" [(ngModel)]="draft.stockAlertThreshold" min="0" step="1" />
            </label>
            <label class="checkbox-label">
              <input name="requiresSupplierFallback" type="checkbox" [(ngModel)]="draft.requiresSupplierFallback" />
              Permitir abastecimiento de proveedor cuando no haya existencias
            </label>
            <div class="read-only-field">
              <span>Existencias actuales</span>
              <strong>{{ product.stock ?? 0 }}</strong>
              <small>Las existencias se modifican desde el módulo de inventario.</small>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="section-heading">
            <div>
              <h2>Personalizaciones</h2>
              <p class="muted">Cada valor es un incremento al precio base en COP.</p>
            </div>
            <label class="checkbox-label">
              <input name="isCustomizable" type="checkbox" [(ngModel)]="draft.isCustomizable" />
              Producto personalizable
            </label>
          </div>

          <ng-container *ngIf="draft.isCustomizable">
            <label>
              Forma de seleccionar las opciones
              <select name="customizationSelectionMode" [(ngModel)]="draft.customizationSelectionMode">
                <option value="single">Elegir una sola opción</option>
                <option value="multiple">Combinar varias opciones</option>
              </select>
              <small *ngIf="draft.customizationSelectionMode === 'single'">
                Para opciones excluyentes, como los tamaños de un cuadro. Si una opción está marcada como obligatoria,
                el cliente deberá elegir una del grupo.
              </small>
              <small *ngIf="draft.customizationSelectionMode !== 'single'">
                Para opciones que se pueden combinar, como laminado y asistencia de diseño.
              </small>
            </label>
            <div class="section-actions">
              <button type="button" class="secondary-button" (click)="addCustomization()">Añadir opción</button>
            </div>
            <div *ngFor="let customization of customizations; let i = index" class="customization-row">
              <label>
                Nombre
                <input [name]="'customization-name-' + i" [(ngModel)]="customization.name" required />
              </label>
              <label>
                Incremento (COP)
                <input [name]="'customization-value-' + i" type="number" [(ngModel)]="customization.value" min="0" step="1" required />
              </label>
              <label>
                Dato solicitado
                <select [name]="'customization-type-' + i" [(ngModel)]="customization.inputType">
                  <option value="none">Ninguno</option>
                  <option value="text">Texto</option>
                  <option value="file">Archivo</option>
                </select>
              </label>
              <label class="checkbox-label">
                <input [name]="'customization-required-' + i" type="checkbox" [(ngModel)]="customization.required" />
                Obligatorio
              </label>
              <button type="button" class="danger-button remove-button" (click)="removeCustomization(i)">Quitar opción</button>
            </div>
            <p class="muted" *ngIf="!customizations.length">Añade por lo menos una opción personalizable.</p>
          </ng-container>
        </section>

        <div class="form-actions">
          <button type="button" class="secondary-button" routerLink="/admin/products">Cancelar</button>
          <button type="submit" class="primary-button" [disabled]="saving">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1000px; margin: 0 auto; padding: 2rem; }
      .back-link { display: inline-block; margin-bottom: 1rem; color: #9a3412; font-weight: 700; text-decoration: none; }
      .editor { display: grid; gap: 1.25rem; }
      .page-heading, .section-heading, .form-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      h1, h2, p { margin-top: 0; }
      h1 { margin-bottom: .4rem; }
      h2 { margin-bottom: 1rem; font-size: 1.15rem; }
      .eyebrow { margin-bottom: .4rem; color: #c2410c; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .muted { color: #64748b; }
      .section { display: grid; gap: 1rem; padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; }
      .form-grid, .customization-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      .customization-row { padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
      .image-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .75rem; }
      .image-card { display: grid; gap: .5rem; padding: .5rem; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; }
      .image-card img { width: 100%; height: 120px; border-radius: 7px; object-fit: cover; }
      .selected-images { display: grid; gap: .5rem; }
      .selected-image { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .6rem .75rem; border: 1px solid #e2e8f0; border-radius: 8px; }
      .selected-image small, label small { color: #64748b; font-weight: 400; }
      label { display: grid; gap: .45rem; color: #334155; font-size: .9rem; font-weight: 600; }
      input, select, textarea { width: 100%; box-sizing: border-box; padding: .7rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font: inherit; }
      .checkbox-label { display: flex; align-items: center; align-self: end; min-height: 42px; }
      .checkbox-label input { width: auto; }
      .full-width { grid-column: 1 / -1; }
      .read-only-field { display: grid; align-content: center; gap: .25rem; color: #475569; }
      .read-only-field strong { color: #0f172a; font-size: 1.1rem; }
      .read-only-field small { color: #64748b; }
      .section-actions { display: flex; justify-content: flex-end; }
      button { border: 0; border-radius: 8px; padding: .7rem 1rem; font: inherit; font-weight: 700; cursor: pointer; }
      button:disabled { cursor: wait; opacity: .65; }
      .primary-button { background: #c2410c; color: white; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      .danger-button { justify-self: start; background: #fee2e2; color: #991b1b; }
      .form-actions { padding: 1rem 0; }
      .status { display: inline-block; padding: .3rem .7rem; border-radius: 999px; background: #dcfce7; color: #166534; font-size: .8rem; font-weight: 700; }
      .status.inactive { background: #f1f5f9; color: #475569; }
      .error { color: #b91c1c; }
      code { color: #475569; }
      @media (max-width: 700px) {
        .page { padding: 1.25rem; }
        .page-heading, .section-heading { align-items: flex-start; flex-direction: column; }
        .form-grid, .customization-row { grid-template-columns: 1fr; }
        .full-width { grid-column: auto; }
      }
    `],
})
export class ProductEditorAdminComponent implements OnInit {
    product: Product | null = null;
    categories: Category[] = [];
    customizations: ProductCustomization[] = [];
    draft: ProductUpdateRequest = {};
    imagesText = '';
    selectedImages: File[] = [];
    loading = true;
    saving = false;
    loadError = '';
    formError = '';

    get imageUrls(): string[] {
        return this.imagesText.split(/\r?\n/).map((image) => image.trim()).filter(Boolean);
    }

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly adminService: AdminService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug');
        if (!slug) {
            this.loadError = 'No se especificó el producto que se desea editar.';
            this.loading = false;
            return;
        }

        this.adminService.getAdminCategories().subscribe({
            next: (categories) => {
                this.categories = categories;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudieron cargar las categorías para editar el producto.';
                this.changeDetector.markForCheck();
            },
        });

        this.adminService.getProductBySlug(slug).subscribe({
            next: (product) => {
                this.product = product;
                this.draft = {
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    category: product.category,
                    images: [...product.images],
                    isActive: product.isActive,
                    isCustomizable: product.isCustomizable,
                    customizationSelectionMode: product.customizationSelectionMode ?? 'multiple',
                    inventoryManaged: product.inventoryManaged ?? false,
                    stockAlertThreshold: product.stockAlertThreshold ?? 0,
                    requiresSupplierFallback: product.requiresSupplierFallback ?? false,
                };
                this.imagesText = product.images.join('\n');
                this.customizations = (product.customizations ?? []).map((item) => ({ ...item }));
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudo encontrar el producto solicitado.';
                this.loading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    addCustomization(): void {
        this.customizations.push({ name: '', value: 0, inputType: 'none', required: false });
    }

    removeCustomization(index: number): void {
        this.customizations.splice(index, 1);
    }

    selectImages(event: Event): void {
        const input = event.target as HTMLInputElement;
        const combined = [...this.selectedImages, ...Array.from(input.files ?? [])];
        if (this.imageUrls.length + combined.length > 8) {
            this.formError = 'Un producto puede tener hasta 8 imágenes en total.';
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

    removeExistingImage(image: string): void {
        this.imagesText = this.imageUrls.filter((current) => current !== image).join('\n');
    }

    removeSelectedImage(index: number): void {
        this.selectedImages.splice(index, 1);
    }

    formatFileSize(size: number): string {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    saveProduct(): void {
        if (!this.product) {
            return;
        }
        const productId = this.product._id;
        const existingImages = this.imageUrls;
        if (!this.isDraftValid(existingImages) || existingImages.length + this.selectedImages.length > 8) {
            this.formError = 'Revisa los campos obligatorios, el precio y las personalizaciones.';
            return;
        }

        this.saving = true;
        this.formError = '';
        const uploadedImages = this.selectedImages.length
            ? this.adminService.uploadProductImages(this.selectedImages).pipe(map((response) => response.images))
            : of([]);
        uploadedImages.pipe(
            switchMap((newImages) => {
                const changes: ProductUpdateRequest = {
                    ...this.draft,
                    name: this.draft.name?.trim(),
                    description: this.draft.description?.trim(),
                    images: [...existingImages, ...newImages],
                    customizations: this.draft.isCustomizable ? this.customizations : [],
                };
                return this.adminService.updateProduct(productId, changes);
            }),
            finalize(() => {
                this.saving = false;
                this.changeDetector.markForCheck();
            }),
        ).subscribe({
            next: (product) => {
                this.product = product;
                this.draft = {
                    ...this.draft,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    price: product.price,
                };
                this.customizations = (product.customizations ?? []).map((item) => ({ ...item }));
                this.imagesText = product.images.join('\n');
                this.selectedImages = [];
                if (this.route.snapshot.paramMap.get('slug') !== product.slug) {
                    void this.router.navigate(['/admin/products', product.slug], { replaceUrl: true });
                }
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.formError = 'No se pudieron subir las imágenes o guardar los cambios. Verifica el formato, el tamaño y los permisos de tu cuenta.';
                this.changeDetector.markForCheck();
            },
        });
    }

    private isDraftValid(images: string[]): boolean {
        const customizationIsValid = !this.draft.isCustomizable || (
            this.customizations.length > 0
            && this.customizations.every((customization) =>
                customization.name.trim().length > 0
                && Number.isFinite(customization.value)
                && customization.value >= 0
                && typeof customization.required === 'boolean'
                && ['none', 'text', 'file'].includes(customization.inputType)
            )
        );

        return Boolean(
            this.draft.name?.trim()
            && this.draft.description?.trim()
            && this.draft.category
            && Number.isFinite(this.draft.price)
            && (this.draft.price ?? 0) > 0
            && Number.isFinite(this.draft.stockAlertThreshold)
            && (this.draft.stockAlertThreshold ?? -1) >= 0
            && images.every((image) => image.length > 0)
            && customizationIsValid
        );
    }
}
