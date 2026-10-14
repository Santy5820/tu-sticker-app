import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CartService } from '../../../core/services/cart.service';
import { Order } from '../../../core/models/api';
import { OrderService } from '../../../core/services/order.service';

@Component({
    selector: 'app-orders-page',
    standalone: true,
    imports: [CommonModule],
    template: `
    <section class="page">
      <h1>Mis pedidos</h1>
      <p class="error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>

      <div class="list" *ngIf="orders.length; else emptyState">
        <article class="order-item" *ngFor="let order of orders">
          <div class="order-details">
            <p class="label">Pedido #{{ order.orderNumber }}</p>
            <h3>{{ order.status }}</h3>
            <ul>
              <li *ngFor="let item of order.items">
                {{ item.quantity }} × {{ item.productName }} — {{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}
                <ul *ngIf="item.customizations?.length">
                  <li *ngFor="let customization of item.customizations">
                    {{ customization.name }} (+{{ customization.value | currency:'COP':'symbol-narrow':'1.0-0' }})
                  </li>
                </ul>
              </li>
            </ul>
            <p class="address">{{ order.address.street }}, {{ order.address.city }}, {{ order.address.state }}, {{ order.address.country }}</p>
          </div>
          <div class="meta">
            <span>{{ order.items.length }} productos · {{ paymentMethodLabel(order) }}</span>
            <strong>{{ order.total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
            <span *ngIf="order.paymentMethod === 'WHATSAPP_DEPOSIT' && order.paymentStatus !== 'PAID'">
              Abono inicial: {{ order.amountDueNow ?? (order.total / 2) | currency:'COP':'symbol-narrow':'1.0-0' }}
            </span>
            <button *ngIf="order.status === 'PENDING_PAYMENT' && (order.paymentMethod || 'WOMPI') === 'WOMPI'"
              type="button" [disabled]="busyOrderId === order._id" (click)="continuePayment(order)">
              {{ busyOrderId === order._id ? 'Abriendo pago…' : 'Continuar pago' }}
            </button>
          </div>
        </article>
      </div>

      <ng-template #emptyState>
        <p class="empty">Aún no has realizado ningún pedido.</p>
      </ng-template>
    </section>
  `,
    styles: [
        `.page { max-width: 1000px; margin: 0 auto; padding: 2rem; } .list { display: grid; gap: 1rem; margin-top: 1.5rem; } .order-item { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; padding: 1.2rem; border: 1px solid #e5e7eb; border-radius: 14px; background: white; } .order-details { min-width: 0; } .label { color: #6b7280; margin: 0; text-transform: uppercase; letter-spacing: 0.08em; font-size: .7rem; } h3 { margin: .35rem 0; } ul { padding-left: 1.1rem; color: #475569; font-size: .9rem; } li + li { margin-top: .3rem; } .address { color: #64748b; font-size: .85rem; } .meta { display: grid; justify-items: end; gap: .5rem; text-align: right; white-space: nowrap; } .meta > span { color: #64748b; font-size: .85rem; } button { border: 0; border-radius: 8px; padding: .65rem .8rem; background: #c2410c; color: #fff; font: inherit; font-weight: 700; cursor: pointer; } button:disabled { opacity: .6; cursor: wait; } .error { color: #b91c1c; } .empty { color: #475569; } @media(max-width: 650px) { .page { padding: 1.25rem; } .order-item { flex-direction: column; } .meta { justify-items: start; text-align: left; } }`],
})
export class OrdersPageComponent implements OnInit {
    orders: Order[] = [];
    errorMessage = '';
    busyOrderId: string | null = null;

    constructor(
        private readonly orderService: OrderService,
        private readonly cartService: CartService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.orderService.list().subscribe({
            next: (orders) => {
                this.orders = orders;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.errorMessage = 'No se pudieron cargar tus pedidos. Intenta nuevamente.';
                this.changeDetector.markForCheck();
            },
        });
    }

    paymentMethodLabel(order: Order): string {
        return (order.paymentMethod ?? 'WOMPI') === 'WHATSAPP_DEPOSIT' ? 'Abono por WhatsApp' : 'Wompi';
    }

    continuePayment(order: Order): void {
        this.busyOrderId = order._id;
        this.errorMessage = '';
        this.cartService.createWompiCheckout(order._id).subscribe({
            next: ({ checkout }) => {
                const form = document.createElement('form');
                form.method = checkout.method;
                form.action = checkout.url;
                Object.entries(checkout.fields).forEach(([name, value]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = value;
                    form.appendChild(input);
                });
                document.body.appendChild(form);
                form.submit();
            },
            error: (error: { error?: { message?: string } }) => {
                this.errorMessage = error.error?.message ?? 'No se pudo iniciar el pago con Wompi.';
                this.busyOrderId = null;
                this.changeDetector.markForCheck();
            },
        });
    }
}
