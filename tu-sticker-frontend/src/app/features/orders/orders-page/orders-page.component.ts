import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Order } from '../../../core/models/api';
import { OrderService } from '../../../core/services/order.service';

@Component({
    selector: 'app-orders-page',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="page">
      <h1>Mis pedidos</h1>

      <div class="list" *ngIf="orders.length; else emptyState">
        <article class="order-item" *ngFor="let order of orders">
          <div>
            <p class="label">Pedido #{{ order.orderNumber }}</p>
            <h3>{{ order.status }}</h3>
          </div>
          <div class="meta">
            <span>{{ order.items.length }} productos</span>
            <strong>{{ order.total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
          </div>
        </article>
      </div>

      <ng-template #emptyState>
        <p class="empty">Aún no has realizado ningún pedido.</p>
      </ng-template>
    </section>
  `,
    styles: [
        `.page { padding: 2rem; } .list { display: grid; gap: 1rem; margin-top: 1.5rem; } .order-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 14px; background: white; } .label { color: #6b7280; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; font-size: .7rem; } .meta { display: grid; text-align: right; } .empty { color: #475569; }`],
})
export class OrdersPageComponent implements OnInit {
    orders: Order[] = [];

    constructor(
        private readonly orderService: OrderService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.orderService.list().subscribe((orders) => {
            this.orders = orders;
            this.changeDetector.markForCheck();
        });
    }
}
