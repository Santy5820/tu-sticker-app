import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'app-products-admin',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="page">
      <h1>Productos</h1>
      <p>Gestión de catálogo, inventario y precios.</p>
    </section>
  `,
    styles: [`.page { padding: 2rem; } p { color: #475569; }`],
})
export class ProductsAdminComponent { }
