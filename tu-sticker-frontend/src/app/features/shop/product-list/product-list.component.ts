import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/api';
import { ProductService } from '../../../core/services/product.service';

@Component({
    selector: 'app-product-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <section class="page">
      <h1>Catálogo</h1>

      <div class="grid" *ngIf="products.length; else emptyState">
        <article class="card" *ngFor="let product of products">
          <img [src]="product.images[0] || 'https://placehold.co/600x400?text=Sticker'" [alt]="product.name" />
          <div class="card-body">
            <h3>{{ product.name }}</h3>
            <p>{{ product.description }}</p>
            <div class="meta">
              <strong>{{ product.price | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
              <a [routerLink]="['/products', product._id]">Ver detalle</a>
            </div>
          </div>
        </article>
      </div>

      <ng-template #emptyState>
        <p class="empty">No hay productos para mostrar.</p>
      </ng-template>
    </section>
  `,
    styles: [
        `.page { padding: 2rem; } .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; } .card { background: white; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; } .card img { width: 100%; height: 200px; object-fit: cover; } .card-body { padding: 1rem; } h1 { margin: 0; } .meta { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; } .meta a { color: #1d4ed8; font-weight: 700; text-decoration: none; } .empty { color: #475569; }`],
})
export class ProductListComponent implements OnInit {
    products: Product[] = [];

    constructor(private readonly productService: ProductService) { }

    ngOnInit(): void {
        this.productService.list().subscribe((products) => {
            this.products = products;
        });
    }
}
