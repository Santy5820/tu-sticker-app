import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../../core/models/api';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
    selector: 'app-product-detail',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <main class="page">
      <p class="state" *ngIf="loading">Cargando producto…</p>
      <section class="state error" *ngIf="!loading && loadError">
        {{ loadError }}
      </section>

      <section class="product-layout" *ngIf="!loading && product">
        <div class="gallery">
          <div class="main-image">
            <img [src]="activeImage || fallbackImage" [alt]="product.name" />
          </div>
          <div class="thumbnails" *ngIf="product.images.length > 1" aria-label="Galería de imágenes">
            <button *ngFor="let image of product.images; let i = index"
              type="button" class="thumbnail" [class.selected]="selectedImageIndex === i"
              [attr.aria-label]="'Ver imagen ' + (i + 1)" [attr.aria-pressed]="selectedImageIndex === i"
              (click)="selectImage(i)">
              <img [src]="image" [alt]="product.name + ' imagen ' + (i + 1)" />
            </button>
          </div>
        </div>

        <div class="details">
          <p class="category">{{ product.category }}</p>
          <h1>{{ product.name }}</h1>
          <p class="description">{{ product.description }}</p>
          <p class="base-price">{{ product.price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>

          <section class="options" *ngIf="product.isCustomizable && product.customizations?.length">
            <h2>Personaliza tu producto</h2>
            <p class="muted" *ngIf="product.customizationSelectionMode === 'single'">
              Elige una opción. Los adicionales se suman al precio.
            </p>
            <p class="muted" *ngIf="product.customizationSelectionMode !== 'single'">
              Selecciona las opciones que quieres combinar. Los adicionales se suman al precio.
            </p>
            <article class="option" *ngFor="let customization of product.customizations; let i = index">
              <label class="option-heading">
                <input *ngIf="product.customizationSelectionMode === 'single'; else multipleChoice"
                  type="radio" [name]="'product-customization-' + product._id"
                  [checked]="isCustomizationSelected(i)"
                  (change)="toggleCustomization(i, $event)" />
                <ng-template #multipleChoice>
                  <input type="checkbox" [checked]="isCustomizationSelected(i)"
                    [disabled]="customization.required"
                    (change)="toggleCustomization(i, $event)" />
                </ng-template>
                <span class="option-name">{{ customization.name }}</span>
                <span class="option-price">
                  {{ customization.value === 0 ? 'Sin costo' : '+' + (customization.value | currency:'COP':'symbol-narrow':'1.0-0') }}
                </span>
                <span class="required" *ngIf="customization.required">Obligatorio</span>
              </label>

              <label class="custom-input" *ngIf="isCustomizationSelected(i) && customization.inputType === 'text'">
                {{ customization.required ? 'Información requerida' : 'Información adicional (opcional)' }}
                <input type="text" [required]="customization.required"
                  [placeholder]="'Indica los detalles para ' + customization.name" />
              </label>
              <label class="custom-input" *ngIf="isCustomizationSelected(i) && customization.inputType === 'file'">
                {{ customization.required ? 'Adjunta tu diseño (obligatorio)' : 'Adjunta un archivo (opcional)' }}
                <input type="file" [required]="customization.required" accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf" />
              </label>
            </article>
          </section>

          <div class="purchase-summary">
            <label class="quantity-field">
              Cantidad
              <input name="quantity" type="number" min="1" step="1" [(ngModel)]="quantity" (ngModelChange)="normalizeQuantity()" />
            </label>
            <div class="total">
              <span>Total estimado</span>
              <strong>{{ total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
            </div>
          </div>

          <button type="button" class="cart-button" [disabled]="addingToCart" (click)="addToCart()">
            {{ addingToCart ? 'Agregando…' : 'Añadir al carrito' }}
          </button>
          <p class="cart-feedback" *ngIf="cartMessage" role="status">{{ cartMessage }}</p>
          <p class="error" *ngIf="cartError" role="alert">{{ cartError }}</p>
        </div>
      </section>
    </main>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      .product-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr); align-items: start; gap: clamp(2rem, 5vw, 4rem); }
      .gallery { min-width: 0; }
      .main-image { display: grid; min-height: 360px; place-items: center; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc; }
      .main-image img { width: 100%; max-height: 660px; aspect-ratio: 1 / 1; object-fit: contain; }
      .thumbnails { display: flex; gap: .75rem; overflow-x: auto; margin-top: .9rem; padding: .15rem .1rem .45rem; }
      .thumbnail { flex: 0 0 76px; width: 76px; height: 76px; padding: 0; overflow: hidden; border: 2px solid transparent; border-radius: 10px; background: #f1f5f9; cursor: pointer; }
      .thumbnail.selected { border-color: #c2410c; }
      .thumbnail img { width: 100%; height: 100%; object-fit: cover; }
      .details { display: grid; gap: 1rem; }
      .category { margin: 0; color: #c2410c; font-size: .78rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
      h1 { margin: 0; color: #0f172a; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; }
      h2 { margin: 0; font-size: 1.15rem; }
      .description { margin: 0; color: #475569; line-height: 1.7; white-space: pre-line; }
      .base-price { margin: 0; color: #0f172a; font-size: 1.7rem; font-weight: 800; }
      .options { display: grid; gap: .8rem; margin-top: .35rem; }
      .muted { margin: 0; color: #64748b; font-size: .9rem; line-height: 1.5; }
      .option { display: grid; gap: .75rem; padding: .9rem; border: 1px solid #e2e8f0; border-radius: 12px; background: white; }
      .option-heading { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .6rem; cursor: pointer; }
      .option-heading input { width: 1.05rem; height: 1.05rem; accent-color: #c2410c; }
      .option-name { color: #1e293b; font-weight: 700; }
      .option-price { color: #475569; font-size: .9rem; white-space: nowrap; }
      .required { grid-column: 2 / -1; color: #9a3412; font-size: .75rem; font-weight: 700; }
      .custom-input, .quantity-field { display: grid; gap: .4rem; color: #334155; font-size: .85rem; font-weight: 600; }
      .custom-input input, .quantity-field input { width: 100%; box-sizing: border-box; padding: .7rem .8rem; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font: inherit; }
      .purchase-summary { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; padding: 1rem 0; border-top: 1px solid #e2e8f0; }
      .quantity-field { width: 110px; }
      .total { display: grid; gap: .2rem; text-align: right; color: #475569; }
      .total strong { color: #0f172a; font-size: 1.6rem; }
      .cart-button { width: 100%; border: 0; border-radius: 10px; padding: 1rem 1.25rem; background: #c2410c; color: white; font: inherit; font-weight: 800; }
      .cart-button:disabled { cursor: wait; opacity: .65; }
      .cart-feedback { margin: 0; color: #166534; text-align: center; }
      .error { margin: 0; color: #b91c1c; text-align: center; }
      .state { padding: 2rem 0; color: #475569; }
      .error { color: #b91c1c; }
      @media (max-width: 760px) {
        .page { padding: 1.25rem; }
        .product-layout { grid-template-columns: 1fr; gap: 2rem; }
        .main-image { min-height: 260px; }
      }
    `],
})
export class ProductDetailComponent implements OnInit {
    readonly fallbackImage = 'https://placehold.co/800x600?text=Tu+Sticker';
    product: Product | null = null;
    loading = true;
    loadError = '';
    cartError = '';
    cartMessage = '';
    addingToCart = false;
    selectedImageIndex = 0;
    quantity = 1;
    private readonly selectedCustomizationIndexes = new Set<number>();

    constructor(
        private readonly route: ActivatedRoute,
        private readonly productService: ProductService,
        private readonly cartService: CartService,
        private readonly router: Router,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            const slug = params.get('slug');
            if (!slug) {
                this.product = null;
                this.loadError = 'No se especificó el producto que se desea visualizar.';
                this.loading = false;
                this.changeDetector.markForCheck();
                return;
            }

            this.loading = true;
            this.loadError = '';
            this.product = null;
            this.selectedImageIndex = 0;
            this.quantity = 1;
            this.selectedCustomizationIndexes.clear();

            this.productService.getBySlug(slug).subscribe({
                next: (product) => {
                    this.product = product;
                const requiredIndex = (product.customizations ?? []).findIndex((customization) => customization.required);
                if (product.customizationSelectionMode === 'single') {
                    if (requiredIndex >= 0) {
                        this.selectedCustomizationIndexes.add(requiredIndex);
                    }
                } else {
                    (product.customizations ?? []).forEach((customization, index) => {
                        if (customization.required) {
                            this.selectedCustomizationIndexes.add(index);
                        }
                    });
                }
                    this.loading = false;
                    this.changeDetector.markForCheck();
                },
                error: () => {
                    this.loadError = 'No se pudo cargar este producto. Verifica el enlace o intenta de nuevo.';
                    this.loading = false;
                    this.changeDetector.markForCheck();
                },
            });
        });
    }

    get activeImage(): string {
        return this.product?.images[this.selectedImageIndex] ?? '';
    }

    get total(): number {
        if (!this.product) {
            return 0;
        }
        const quantity = Number.isFinite(this.quantity) && this.quantity > 0 ? Math.floor(this.quantity) : 1;
        const selectedAdditions = (this.product.customizations ?? []).reduce(
            (sum, customization, index) =>
                sum + (this.selectedCustomizationIndexes.has(index) ? customization.value : 0),
            0,
        );
        return (this.product.price + selectedAdditions) * quantity;
    }

    selectImage(index: number): void {
        this.selectedImageIndex = index;
    }

    isCustomizationSelected(index: number): boolean {
        return this.selectedCustomizationIndexes.has(index);
    }

    toggleCustomization(index: number, event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        if (checked) {
            if (this.product?.customizationSelectionMode === 'single') {
                this.selectedCustomizationIndexes.clear();
            }
            this.selectedCustomizationIndexes.add(index);
        } else {
            this.selectedCustomizationIndexes.delete(index);
        }
    }

    normalizeQuantity(): void {
        if (!Number.isFinite(this.quantity) || this.quantity < 1) {
            this.quantity = 1;
            return;
        }
        this.quantity = Math.floor(this.quantity);
    }

    addToCart(): void {
        if (!this.product || this.addingToCart) return;
        this.addingToCart = true;
        this.cartError = '';
        this.cartMessage = '';
        this.cartService.addItem(
            this.product._id,
            this.quantity,
            [...this.selectedCustomizationIndexes].sort((left, right) => left - right),
        ).subscribe({
            next: () => {
                this.addingToCart = false;
                this.cartMessage = 'Producto agregado al carrito.';
                this.changeDetector.markForCheck();
            },
            error: (error: { error?: { message?: string } }) => {
                this.addingToCart = false;
                this.cartError = error.error?.message ?? 'No se pudo agregar el producto al carrito. Intenta nuevamente.';
                this.changeDetector.markForCheck();
            },
        });
    }
}
