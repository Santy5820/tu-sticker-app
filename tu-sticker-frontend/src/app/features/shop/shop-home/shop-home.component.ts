import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/api';

@Component({
    selector: 'app-shop-home',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <section class="hero">
      <div>
        <p class="eyebrow">Tu Sticker</p>
        <h1>Personaliza tus stickers con estilo.</h1>
        <p class="lead">Productos premium para branding, regalos y detalles personalizados.</p>
      </div>
    </section>

    <section class="catalog">
      <div class="section-head">
        <h2>Productos destacados</h2>
        <a routerLink="/products">Ver todos</a>
      </div>

      <div class="grid" *ngIf="products.length; else emptyState">
        <article class="card" *ngFor="let product of products">
          <img [src]="product.images[0] || 'https://placehold.co/600x400?text=Tu+Sticker'" [alt]="product.name" />
          <div class="card-body">
            <span class="tag">{{ product.category }}</span>
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
        <p class="empty">No hay productos disponibles por el momento.</p>
      </ng-template>
    </section>
  `,
    styles: [
        `
      .hero { padding: 3rem 2rem 1.5rem; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.15em; color: #c2410c; font-size: 0.75rem; font-weight: 700; }
      h1 { font-size: clamp(2.3rem, 4vw, 4rem); margin: 0.5rem 0; }
      .lead { max-width: 700px; font-size: 1.1rem; color: #475569; }
      .catalog { padding: 2rem; }
      .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
      .section-head a { color: #c2410c; text-decoration: none; font-weight: 700; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; }
      .card { background: white; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 25px rgba(15, 23, 42, 0.04); }
      .card img { width: 100%; height: 220px; object-fit: cover; }
      .card-body { padding: 1rem; }
      .tag { display: inline-block; background: #fff7ed; color: #c2410c; border-radius: 999px; padding: 0.35rem 0.7rem; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; }
      h3 { margin: 0.8rem 0 0.5rem; }
      p { color: #475569; }
      .meta { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; }
      .meta a { color: #1d4ed8; font-weight: 700; text-decoration: none; }
      .empty { padding: 1rem 0; color: #475569; }
    `,
    ],
})
export class ShopHomeComponent implements OnInit {
    products: Product[] = [];

    constructor(private readonly productService: ProductService) { }

    ngOnInit(): void {
        this.productService.list().subscribe((products) => {
            this.products = products.slice(0, 6);
        });
    }
}
