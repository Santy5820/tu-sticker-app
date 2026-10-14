import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CustomerAdmin, Order, OrderAddress, OrderAdminUpdateRequest, Product } from '../../../core/models/api';
import { AdminService } from '../../../core/services/admin.service';
import { OrderService } from '../../../core/services/order.service';

interface EditableOrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
    customizations: Array<{ name: string; value: number }>;
}

@Component({
    selector: 'app-order-editor-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page" *ngIf="order">
      <header class="page-header">
        <div>
          <a routerLink="/admin/orders" class="back-link">← Volver a pedidos</a>
          <h1>Editar pedido</h1>
          <p>{{ order.orderNumber }}</p>
        </div>
      </header>

      <p class="error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>
      <p class="success" *ngIf="successMessage" role="status">{{ successMessage }}</p>
      <p class="warning">
        Los cambios en productos y cantidades ajustan el inventario automáticamente.
        Al editar el estado del pago, confirma que el pago se haya verificado por fuera del sistema.
      </p>

      <form (ngSubmit)="save()" #orderForm="ngForm">
        <section class="form-section">
          <h2>Cliente</h2>
          <label>
            Cuenta asociada
            <select name="customerId" [(ngModel)]="customerId" required (ngModelChange)="selectCustomer($event)">
              <option *ngFor="let customer of customers" [value]="customer._id">
                {{ customer.firstName }} {{ customer.lastName }} · {{ customer.email }}
                {{ customer.isActive ? '' : '(inactivo; pedido actual)' }}
              </option>
            </select>
          </label>
          <div class="form-grid">
            <label>Nombre<input name="firstName" [(ngModel)]="address.firstName" required maxlength="100" /></label>
            <label>Apellido<input name="lastName" [(ngModel)]="address.lastName" required maxlength="100" /></label>
            <label>Correo<input name="email" type="email" [(ngModel)]="address.email" required maxlength="200" /></label>
            <label>Teléfono<input name="phone" [(ngModel)]="address.phone" maxlength="40" /></label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-heading">
            <h2>Productos y precios</h2>
            <button type="button" class="secondary-button" (click)="addItem()">Añadir producto</button>
          </div>
          <p class="muted" *ngIf="!items.length">Agrega al menos un producto para guardar el pedido.</p>
          <article class="item-card" *ngFor="let item of items; let itemIndex = index">
            <div class="item-heading">
              <strong>Producto {{ itemIndex + 1 }}</strong>
              <button type="button" class="remove-button" (click)="removeItem(itemIndex)">Eliminar</button>
            </div>
            <div class="form-grid item-fields">
              <label class="wide-field">
                Producto
                <select [name]="'product-' + itemIndex" [(ngModel)]="item.productId"
                  (ngModelChange)="selectProduct(item, $event)" required>
                  <option value="" disabled>Selecciona un producto</option>
                  <option *ngFor="let product of products" [value]="product._id">
                    {{ product.name }}{{ product.isActive ? '' : ' (inactivo)' }}
                  </option>
                </select>
              </label>
              <label>Cantidad
                <input [name]="'quantity-' + itemIndex" type="number" min="1" step="1"
                  [(ngModel)]="item.quantity" required />
              </label>
              <label>Precio unitario (COP)
                <input [name]="'price-' + itemIndex" type="number" min="0" step="1"
                  [(ngModel)]="item.unitPrice" required />
              </label>
            </div>

            <div class="customizations">
              <div class="section-heading">
                <h3>Personalizaciones</h3>
                <button type="button" class="text-button" (click)="addCustomization(item)">Añadir</button>
              </div>
              <div class="customization-row" *ngFor="let customization of item.customizations; let customizationIndex = index">
                <label>Nombre
                  <input [name]="'custom-name-' + itemIndex + '-' + customizationIndex"
                    [(ngModel)]="customization.name" required maxlength="100" />
                </label>
                <label>Valor (COP)
                  <input [name]="'custom-value-' + itemIndex + '-' + customizationIndex" type="number"
                    min="0" step="1" [(ngModel)]="customization.value" required />
                </label>
                <button type="button" class="remove-button" (click)="removeCustomization(item, customizationIndex)">Quitar</button>
              </div>
            </div>
            <p class="line-total">Subtotal de línea: {{ lineTotal(item) | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
          </article>
          <div class="total-row"><span>Total calculado</span><strong>{{ total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></div>
        </section>

        <section class="form-section">
          <h2>Dirección de entrega</h2>
          <label>Dirección<input name="street" [(ngModel)]="address.street" required maxlength="200" /></label>
          <div class="form-grid">
            <label>Ciudad<input name="city" [(ngModel)]="address.city" required maxlength="100" /></label>
            <label>Departamento / Estado<input name="state" [(ngModel)]="address.state" required maxlength="100" /></label>
            <label>Código postal<input name="postalCode" [(ngModel)]="address.postalCode" maxlength="20" /></label>
            <label>País<input name="country" [(ngModel)]="address.country" required maxlength="80" /></label>
          </div>
        </section>

        <section class="form-section">
          <h2>Estado y pago</h2>
          <div class="form-grid">
            <label>Estado del pedido
              <select name="status" [(ngModel)]="status" required>
                <option *ngFor="let value of statuses" [value]="value">{{ statusLabel(value) }}</option>
              </select>
            </label>
            <label>Estado del pago
              <select name="paymentStatus" [(ngModel)]="paymentStatus" required>
                <option value="PENDING">Pendiente</option>
                <option value="PAID">Pagado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
            <label>Método de pago
              <select name="paymentMethod" [(ngModel)]="paymentMethod" required>
                <option value="WOMPI">Wompi</option>
                <option value="WHATSAPP_DEPOSIT">Abono por WhatsApp</option>
              </select>
            </label>
            <label>Valor por cobrar ahora (COP)
              <input name="amountDueNow" type="number" min="0" [max]="total" step="1"
                [(ngModel)]="amountDueNow" required />
            </label>
          </div>
        </section>

        <footer class="form-actions">
          <a routerLink="/admin/orders" class="cancel-link">Cancelar</a>
          <button type="submit" class="save-button" [disabled]="saving || !orderForm.valid || !items.length || amountDueNow > total">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </footer>
      </form>
    </section>

    <p class="loading" *ngIf="!order && !errorMessage">Cargando pedido…</p>
    <p class="error page-error" *ngIf="!order && errorMessage" role="alert">{{ errorMessage }}</p>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1000px; padding: 2rem; }
      .page-header { margin-bottom: 1.2rem; }
      h1 { margin: .6rem 0 .2rem; color: #0f172a; font-size: 1.8rem; }
      .page-header p { margin: 0; color: #64748b; }
      .back-link, .cancel-link { color: #9a3412; font-size: .86rem; font-weight: 700; text-decoration: none; }
      .warning { padding: .85rem 1rem; border: 1px solid #fed7aa; border-radius: 10px; background: #fff7ed; color: #9a3412; font-size: .86rem; line-height: 1.5; }
      .form-section { display: grid; gap: 1rem; margin-top: 1rem; padding: 1.2rem; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; }
      h2 { margin: 0; color: #0f172a; font-size: 1.1rem; }
      h3 { margin: 0; color: #334155; font-size: .92rem; }
      label { display: grid; gap: .35rem; color: #475569; font-size: .78rem; font-weight: 700; }
      input, select { box-sizing: border-box; width: 100%; min-height: 40px; padding: .55rem .65rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: .85rem; }
      .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
      .section-heading, .item-heading, .form-actions, .total-row { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
      .item-card { display: grid; gap: 1rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; }
      .wide-field { grid-column: span 2; }
      .customizations { display: grid; gap: .7rem; }
      .customization-row { display: grid; grid-template-columns: 1fr 1fr auto; align-items: end; gap: .7rem; }
      .line-total { margin: 0; color: #475569; font-size: .85rem; font-weight: 700; text-align: right; }
      .total-row { padding-top: .3rem; border-top: 1px solid #e2e8f0; color: #0f172a; }
      .total-row strong { font-size: 1.15rem; }
      button { min-height: 38px; padding: .5rem .75rem; border: 0; border-radius: 8px; font: inherit; font-size: .8rem; font-weight: 750; cursor: pointer; }
      button:disabled { opacity: .55; cursor: not-allowed; }
      .secondary-button { background: #ffedd5; color: #9a3412; }
      .remove-button { background: #fee2e2; color: #b91c1c; }
      .text-button { min-height: auto; padding: .3rem .45rem; background: transparent; color: #9a3412; }
      .form-actions { justify-content: flex-end; margin-top: 1rem; padding: 1rem 0 2rem; }
      .save-button { min-width: 150px; background: #c2410c; color: #fff; }
      .muted, .loading { color: #64748b; }
      .error { margin: .8rem 0; color: #b91c1c; }
      .success { color: #166534; }
      @media (max-width: 650px) { .page { padding: 1.2rem; } .form-grid { grid-template-columns: 1fr; } .wide-field { grid-column: auto; } .customization-row { grid-template-columns: 1fr; } }
    `],
})
export class OrderEditorAdminComponent implements OnInit {
    readonly statuses: Order['status'][] = [
        'PENDING_PAYMENT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED',
    ];
    order: Order | null = null;
    customers: CustomerAdmin[] = [];
    products: Product[] = [];
    customerId = '';
    address: OrderAddress = {
        firstName: '', lastName: '', email: '', street: '', city: '', state: '', country: '',
    };
    items: EditableOrderItem[] = [];
    status: Order['status'] = 'PENDING_PAYMENT';
    paymentStatus: Order['paymentStatus'] = 'PENDING';
    paymentMethod: NonNullable<Order['paymentMethod']> = 'WOMPI';
    amountDueNow = 0;
    saving = false;
    errorMessage = '';
    successMessage = '';

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly adminService: AdminService,
        private readonly orderService: OrderService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        const order = this.route.snapshot.data['order'] as Order | undefined;
        if (!order) {
            this.errorMessage = 'No se encontró el pedido solicitado.';
            return;
        }
        this.order = order;
        this.customerId = order.customerId;
        this.address = { ...order.address };
        this.items = order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            customizations: (item.customizations ?? []).map((customization) => ({ ...customization })),
        }));
        this.status = order.status;
        this.paymentStatus = order.paymentStatus;
        this.paymentMethod = order.paymentMethod ?? 'WOMPI';
        this.amountDueNow = order.amountDueNow ?? order.total;

        forkJoin({
            customers: this.adminService.getActiveCustomers(),
            products: this.adminService.getProducts(),
        }).subscribe({
            next: ({ customers, products }) => {
                this.customers = customers.filter((customer) => Boolean(customer.userId));
                if (!this.customers.some((customer) => customer._id === order.customerId)) {
                    this.customers.unshift({
                        _id: order.customerId,
                        userId: order.userId,
                        firstName: order.address.firstName,
                        lastName: order.address.lastName,
                        email: order.address.email,
                        isActive: false,
                    });
                }
                this.products = products;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.errorMessage = 'No se pudieron cargar los clientes y productos para editar el pedido.';
                this.changeDetector.markForCheck();
            },
        });
    }

    get total(): number {
        return this.items.reduce((sum, item) => sum + this.lineTotal(item), 0);
    }

    lineTotal(item: EditableOrderItem): number {
        return item.quantity * item.unitPrice;
    }

    addItem(): void {
        const product = this.products.find((item) => item.isActive) ?? this.products[0];
        this.items.push({
            productId: product?._id ?? '',
            quantity: 1,
            unitPrice: product?.price ?? 0,
            customizations: [],
        });
    }

    removeItem(index: number): void {
        this.items.splice(index, 1);
    }

    selectProduct(item: EditableOrderItem, productId: string): void {
        const product = this.products.find((candidate) => candidate._id === productId);
        if (product) {
            item.unitPrice = product.price;
        }
    }

    addCustomization(item: EditableOrderItem): void {
        item.customizations.push({ name: '', value: 0 });
    }

    removeCustomization(item: EditableOrderItem, index: number): void {
        item.customizations.splice(index, 1);
    }

    selectCustomer(id: string): void {
        const customer = this.customers.find((item) => item._id === id);
        if (!customer) return;
        this.address = {
            ...this.address,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
        };
        this.changeDetector.markForCheck();
    }

    statusLabel(value: Order['status']): string {
        const labels: Record<Order['status'], string> = {
            PENDING_PAYMENT: 'Pendiente de pago',
            CONFIRMED: 'Confirmado',
            IN_PRODUCTION: 'En producción',
            READY: 'Listo',
            DELIVERED: 'Entregado',
            CANCELLED: 'Cancelado',
        };
        return labels[value];
    }

    save(): void {
        if (!this.order || this.saving) return;
        const payload: OrderAdminUpdateRequest = {
            customerId: this.customerId,
            items: this.items.map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                customizations: item.customizations.map((customization) => ({
                    name: customization.name,
                    value: Number(customization.value),
                })),
            })),
            address: this.address,
            paymentMethod: this.paymentMethod,
            amountDueNow: Number(this.amountDueNow),
            status: this.status,
            paymentStatus: this.paymentStatus,
        };
        this.saving = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.orderService.updateAdmin(this.order._id, payload).subscribe({
            next: () => {
                this.saving = false;
                this.successMessage = 'El pedido se actualizó correctamente.';
                this.changeDetector.markForCheck();
                void this.router.navigate(['/admin/orders']);
            },
            error: (error: { error?: { message?: string } }) => {
                this.saving = false;
                this.errorMessage = error.error?.message ?? 'No se pudo guardar el pedido. Revisa los datos e inténtalo nuevamente.';
                this.changeDetector.markForCheck();
            },
        });
    }
}
