import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'app-orders-admin',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="page">
      <h1>Pedidos</h1>
      <p>Seguimiento de producción y cumplimiento de envíos.</p>
    </section>
  `,
    styles: [`.page { padding: 2rem; } p { color: #475569; }`],
})
export class OrdersAdminComponent { }
