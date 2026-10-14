import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Order } from '../../../core/models/api';
import { OrderService } from '../../../core/services/order.service';

type AdminOrderStatus = Order['status'] | '';

@Component({
    selector: 'app-orders-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <header class="page-header">
        <div>
          <h1>Pedidos</h1>
          <p>Consulta y filtra los pedidos de tus clientes.</p>
        </div>
        <span class="result-count" *ngIf="!loading">{{ orders.length }} pedidos</span>
      </header>

      <form class="filters" (ngSubmit)="applyFilters()">
        <label class="name-filter">
          Nombre del cliente
          <input type="search" name="name" [(ngModel)]="filters.name"
            placeholder="Buscar por nombre o apellido" maxlength="100" />
        </label>
        <label>
          Mes
          <input type="month" name="month" [(ngModel)]="filters.month" />
        </label>
        <label>
          Desde
          <input type="date" name="from" [(ngModel)]="filters.from" />
        </label>
        <label>
          Hasta
          <input type="date" name="to" [(ngModel)]="filters.to" />
        </label>
        <label>
          Estado
          <select name="status" [(ngModel)]="filters.status">
            <option value="">Todos los estados</option>
            <option *ngFor="let status of statuses" [value]="status">{{ statusLabel(status) }}</option>
          </select>
        </label>
        <div class="filter-actions">
          <button class="apply-button" type="submit" [disabled]="loading">
            {{ loading ? 'Buscando…' : 'Filtrar' }}
          </button>
          <button class="clear-button" type="button" [disabled]="loading" (click)="clearFilters()">Limpiar</button>
        </div>
      </form>

      <p class="error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>
      <p class="loading" *ngIf="loading" role="status">Cargando pedidos…</p>

      <div class="table-container" *ngIf="!loading && orders.length">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let order of orders">
              <td>
                <strong>{{ order.orderNumber }}</strong>
                <small>{{ order._id }}</small>
              </td>
              <td>
                <strong>{{ customerName(order) }}</strong>
                <small>{{ order.address.email }}</small>
                <small *ngIf="order.address.phone">{{ order.address.phone }}</small>
              </td>
              <td>{{ order.createdAt | date:'medium' }}</td>
              <td>{{ itemCount(order) }}</td>
              <td class="money">{{ order.total | currency:'COP':'symbol-narrow':'1.0-0' }}</td>
              <td><span class="status" [attr.data-status]="order.status">{{ statusLabel(order.status) }}</span></td>
              <td>{{ paymentStatusLabel(order.paymentStatus) }}</td>
              <td><a class="edit-link" [routerLink]="['/admin/orders', order._id]">Editar pedido</a></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty" *ngIf="!loading && !orders.length && !errorMessage">
        <strong>No se encontraron pedidos</strong>
        <span>Prueba cambiando o limpiando los filtros.</span>
      </div>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1500px; padding: 2rem; }
      .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
      h1 { margin: 0; color: #0f172a; font-size: 1.8rem; }
      .page-header p { margin: .4rem 0 0; color: #64748b; }
      .result-count { color: #475569; font-size: .88rem; font-weight: 700; }
      .filters { display: grid; grid-template-columns: minmax(200px, 1.5fr) repeat(4, minmax(130px, 1fr)) auto; align-items: end; gap: .8rem; margin: 1.5rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
      label { display: grid; gap: .35rem; color: #475569; font-size: .78rem; font-weight: 700; }
      input, select { box-sizing: border-box; width: 100%; min-height: 40px; padding: .55rem .65rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: .85rem; }
      .filter-actions { display: flex; gap: .45rem; }
      button { min-height: 40px; padding: .55rem .8rem; border: 0; border-radius: 8px; font: inherit; font-size: .82rem; font-weight: 750; cursor: pointer; white-space: nowrap; }
      button:disabled { cursor: wait; opacity: .6; }
      .apply-button { background: #c2410c; color: #fff; }
      .clear-button { background: #f1f5f9; color: #334155; }
      .table-container { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
      table { width: 100%; border-collapse: collapse; text-align: left; }
      th, td { padding: .9rem 1rem; border-bottom: 1px solid #eef2f6; vertical-align: middle; }
      th { background: #f8fafc; color: #64748b; font-size: .7rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
      td { color: #334155; font-size: .85rem; }
      tbody tr:last-child td { border-bottom: 0; }
      td strong, td small { display: block; }
      td strong { color: #0f172a; }
      td small { max-width: 240px; margin-top: .2rem; overflow: hidden; color: #64748b; font-size: .75rem; text-overflow: ellipsis; }
      .money { font-weight: 750; white-space: nowrap; }
      .edit-link { color: #9a3412; font-size: .8rem; font-weight: 750; text-decoration: none; white-space: nowrap; }
      .edit-link:hover { text-decoration: underline; }
      .status { display: inline-block; padding: .32rem .55rem; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: .72rem; font-weight: 750; white-space: nowrap; }
      .status[data-status="PENDING_PAYMENT"] { background: #fff7ed; color: #9a3412; }
      .status[data-status="CONFIRMED"] { background: #eff6ff; color: #1d4ed8; }
      .status[data-status="IN_PRODUCTION"] { background: #f5f3ff; color: #6d28d9; }
      .status[data-status="READY"] { background: #ecfdf5; color: #047857; }
      .status[data-status="DELIVERED"] { background: #f0fdf4; color: #15803d; }
      .status[data-status="CANCELLED"] { background: #fef2f2; color: #b91c1c; }
      .empty { display: grid; justify-items: center; gap: .4rem; padding: 3rem 1rem; border: 1px dashed #cbd5e1; border-radius: 14px; color: #64748b; text-align: center; }
      .empty strong { color: #334155; }
      .loading { color: #64748b; }
      .error { color: #b91c1c; }
      @media (max-width: 1100px) { .filters { grid-template-columns: repeat(3, minmax(130px, 1fr)); } .name-filter { grid-column: span 2; } }
      @media (max-width: 700px) { .page { padding: 1.2rem; } .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .name-filter { grid-column: span 2; } .filter-actions { grid-column: span 2; } .page-header { align-items: flex-start; } }
    `],
})
export class OrdersAdminComponent implements OnInit {
    readonly statuses: Order['status'][] = [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'IN_PRODUCTION',
        'READY',
        'DELIVERED',
        'CANCELLED',
    ];
    filters: {
        name: string;
        month: string;
        from: string;
        to: string;
        status: AdminOrderStatus;
    } = this.emptyFilters();
    orders: Order[] = [];
    loading = false;
    errorMessage = '';

    constructor(
        private readonly orderService: OrderService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.loadOrders();
    }

    applyFilters(): void {
        this.loadOrders();
    }

    clearFilters(): void {
        this.filters = this.emptyFilters();
        this.loadOrders();
    }

    customerName(order: Order): string {
        return `${order.address.firstName} ${order.address.lastName}`.trim() || 'Cliente sin nombre';
    }

    itemCount(order: Order): number {
        return order.items.reduce((total, item) => total + item.quantity, 0);
    }

    statusLabel(status: Order['status']): string {
        const labels: Record<Order['status'], string> = {
            PENDING_PAYMENT: 'Pendiente de pago',
            CONFIRMED: 'Confirmado',
            IN_PRODUCTION: 'En producción',
            READY: 'Listo',
            DELIVERED: 'Entregado',
            CANCELLED: 'Cancelado',
        };
        return labels[status];
    }

    paymentStatusLabel(status: Order['paymentStatus']): string {
        const labels: Record<Order['paymentStatus'], string> = {
            PENDING: 'Pendiente',
            PAID: 'Pagado',
            CANCELLED: 'Cancelado',
        };
        return labels[status];
    }

    private emptyFilters(): {
        name: string;
        month: string;
        from: string;
        to: string;
        status: AdminOrderStatus;
    } {
        return { name: '', month: '', from: '', to: '', status: '' };
    }

    private loadOrders(): void {
        this.loading = true;
        this.errorMessage = '';
        this.orderService.listAdmin(this.filters).subscribe({
            next: (orders) => {
                this.orders = orders;
                this.loading = false;
                this.changeDetector.markForCheck();
            },
            error: (error: { error?: { message?: string } }) => {
                this.orders = [];
                this.loading = false;
                this.errorMessage = error.error?.message ?? 'No se pudieron cargar los pedidos. Intenta nuevamente.';
                this.changeDetector.markForCheck();
            },
        });
    }
}
