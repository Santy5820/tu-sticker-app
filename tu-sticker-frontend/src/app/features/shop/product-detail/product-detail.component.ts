import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/api';

@Component({
    selector: 'app-product-detail',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="page" *ngIf="product; else loading">
      <div class="image-column">
        <img [src]="product.images[0] || 'https://placehold.co/800x600?text=Tu+Sticker'" [alt]="product.name" />
      </div>

      <div class="details-column">
        <p class="tag">{{ product.category }}</p>
        <h1>{{ product.name }}</h1>
        <p class="price">{{ product.price | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
        <p>{{ product.description }}</p>

        <button type="button" (click)="addToCart()">Agregar al carrito</button>
      </div>
    </section>

    <ng-template #loading>
      <p class="state">Cargando producto…</p>
    </ng-template>
  `,
    styles: [
        `.page { display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem; padding: 2rem; } img { width: 100%; border-radius: 20px; object-fit: cover; max-height: 540px; } .tag { color: #c2410c; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; } .price { font-size: 2rem; font-weight: 800; margin: 0; } button { margin-top: 1rem; background: #f97316; color: white; border: none; border-radius: 10px; padding: 1rem 1.5rem; font-size: 1rem; font-weight: 700; cursor: pointer; } .state { padding: 2rem; color: #475569; } @media (max-width: 720px) { .page { grid-template-columns: 1fr; } }`],
})
export class ProductDetailComponent implements OnInit {
    product: Product | null = null;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly productService: ProductService,
        private readonly cartService: CartService,
        private readonly router: Router,
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }

        this.productService.getById(id).subscribe((product) => {
            this.product = product;
        });
    }

    addToCart(): void {
        if (!this.product) {
            return;
        }

        this.cartService.addItem(this.product._id, 1).subscribe(() => {
            this.router.navigate(['/cart']);
        });
    }
}
