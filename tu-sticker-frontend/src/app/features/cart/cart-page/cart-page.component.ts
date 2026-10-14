import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Cart, CartItem, CustomerAddress, CustomerProfile, OrderPaymentMethod, PaymentAvailability } from '../../../core/models/api';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { CustomerService } from '../../../core/services/customer.service';
import { OrderService } from '../../../core/services/order.service';

@Component({
    selector: 'app-cart-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <section class="page">
      <h1>Carrito</h1>
      <p class="error" *ngIf="loadError" role="alert">{{ loadError }}</p>
      <button *ngIf="loadError && authService.hasRole('CUSTOMER')" type="button"
        class="retry-button" (click)="retryCartLoad()">Reintentar recuperación del carrito</button>
      <p class="success" *ngIf="successMessage" role="status">{{ successMessage }}</p>
      <div *ngIf="cartLoading" class="empty">Cargando carrito…</div>
      <div *ngIf="!cartLoading && cart && cart.items.length; else emptyState" class="cart-shell">
        <section class="items" aria-label="Productos en el carrito">
          <article class="item" *ngFor="let item of cart.items">
            <div class="item-info">
              <a [routerLink]="['/products', item.productSlug]"><h2>{{ item.productName }}</h2></a>
              <p class="customizations" *ngIf="item.customizations?.length">
                <span *ngFor="let customization of item.customizations">
                  {{ customization.name }} (+{{ customization.value | currency:'COP':'symbol-narrow':'1.0-0' }})
                </span>
              </p>
              <p>{{ item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }} por unidad</p>
              <div class="quantity-control">
                <button type="button" [disabled]="busyItemId === itemId(item) || item.quantity <= 1"
                  (click)="changeQuantity(item, item.quantity - 1)" [attr.aria-label]="'Reducir cantidad de ' + item.productName">−</button>
                <span>{{ item.quantity }}</span>
                <button type="button" [disabled]="busyItemId === itemId(item)"
                  (click)="changeQuantity(item, item.quantity + 1)" [attr.aria-label]="'Aumentar cantidad de ' + item.productName">+</button>
              </div>
            </div>
            <div class="item-total">
              <strong>{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
              <button type="button" class="remove-button" [disabled]="busyItemId === itemId(item)"
                (click)="removeItem(item)">Quitar</button>
            </div>
          </article>
        </section>

        <aside class="summary">
          <h2>Resumen</h2>
          <div class="row"><span>Productos ({{ itemCount }})</span><strong>{{ cart.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></div>
          <div class="row total-row"><span>Total</span><strong>{{ cart.total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></div>

          <ng-container *ngIf="authService.hasRole('CUSTOMER'); else accountRequired">
            <form (ngSubmit)="checkout()">
              <h3>Dirección de entrega</h3>
              <p class="muted" *ngIf="addressesLoading">Cargando tus direcciones guardadas…</p>
              <p class="error" *ngIf="addressError" role="alert">{{ addressError }}</p>
              <label *ngIf="savedAddresses.length">
                Selecciona una dirección guardada
                <select name="addressSelection" [ngModel]="selectedAddressIndex"
                  (ngModelChange)="selectAddress($event)">
                  <option *ngFor="let savedAddress of savedAddresses; let i = index" [ngValue]="i">
                    {{ savedAddress.alias || (savedAddress.street + ', ' + savedAddress.city) }}
                    {{ savedAddress.isDefault ? '(Principal)' : '' }}
                  </option>
                  <option [ngValue]="-1">Ingresar otra dirección</option>
                </select>
              </label>
              <div class="selected-address" *ngIf="selectedAddressIndex !== null">
                <strong>{{ savedAddresses[selectedAddressIndex]?.alias || 'Dirección guardada' }}</strong>
                <span>{{ savedAddresses[selectedAddressIndex]?.street }}</span>
                <span>{{ savedAddresses[selectedAddressIndex]?.city }}, {{ savedAddresses[selectedAddressIndex]?.state }}</span>
                <span *ngIf="savedAddresses[selectedAddressIndex]?.postalCode">{{ savedAddresses[selectedAddressIndex]?.postalCode }}</span>
                <span>{{ savedAddresses[selectedAddressIndex]?.country }}</span>
              </div>
              <ng-container *ngIf="selectedAddressIndex === null">
                <label>
                  Dirección
                  <input name="street" [(ngModel)]="address.street" required maxlength="200" autocomplete="street-address" />
                </label>
                <div class="address-grid">
                  <label>Ciudad<input name="city" [(ngModel)]="address.city" required maxlength="100" autocomplete="address-level2" /></label>
                  <label>Departamento / Estado<input name="state" [(ngModel)]="address.state" required maxlength="100" autocomplete="address-level1" /></label>
                </div>
                <div class="address-grid">
                  <label>Código postal (opcional)<input name="postalCode" [(ngModel)]="address.postalCode" maxlength="20" autocomplete="postal-code" /></label>
                  <label>País<input name="country" [(ngModel)]="address.country" required maxlength="80" autocomplete="country-name" /></label>
                </div>
                <label class="checkbox-field">
                  <input name="saveAddress" [(ngModel)]="saveAddress" type="checkbox" />
                  Guardar esta dirección en mi cuenta
                </label>
              </ng-container>

              <h3 class="payment-heading">Método de pago</h3>
              <p class="muted" *ngIf="availabilityLoading">Cargando métodos de pago…</p>
              <p class="error" *ngIf="availabilityError" role="alert">{{ availabilityError }}</p>
              <label class="payment-option" [class.disabled]="!availability?.wompi">
                <input type="radio" name="paymentMethod" [(ngModel)]="paymentMethod" value="WOMPI"
                  [disabled]="!availability?.wompi" />
                <span><strong>Wompi</strong><small *ngIf="!availability?.wompi">No disponible por el momento</small></span>
              </label>
              <label class="payment-option" [class.disabled]="!availability?.whatsappDeposit">
                <input type="radio" name="paymentMethod" [(ngModel)]="paymentMethod" value="WHATSAPP_DEPOSIT"
                  [disabled]="!availability?.whatsappDeposit" />
                <span><strong>Abono del 50% por WhatsApp</strong><small>Un asesor te ayudará a coordinar el pago del abono.</small></span>
              </label>
              <p class="deposit-note" *ngIf="paymentMethod === 'WHATSAPP_DEPOSIT'">
                Abono inicial: {{ depositAmount | currency:'COP':'symbol-narrow':'1.0-0' }} (50% del total).
              </p>
              <button type="submit" [disabled]="checkoutBusy || availabilityLoading || !canCheckout">
                {{ checkoutBusy ? 'Procesando pedido…' : 'Crear pedido y continuar' }}
              </button>
            </form>
          </ng-container>

          <ng-template #accountRequired>
            <div class="account-required">
              <p *ngIf="!authService.isAuthenticated()">Para guardar y recuperar tu carrito como cliente, crea una cuenta o inicia sesión antes de continuar con el pedido.</p>
              <p *ngIf="authService.isAuthenticated()">El checkout requiere una cuenta con rol de cliente. Cierra la sesión actual para continuar con una cuenta de cliente.</p>
              <a *ngIf="!authService.isAuthenticated()" class="checkout-link" [routerLink]="['/register']" [queryParams]="{ returnUrl: '/cart' }">Crear cuenta y continuar</a>
              <a *ngIf="!authService.isAuthenticated()" class="login-link" [routerLink]="['/login']" [queryParams]="{ returnUrl: '/cart' }">Ya tengo una cuenta</a>
              <button *ngIf="authService.isAuthenticated()" type="button" class="checkout-link" (click)="logoutForCheckout()">Cerrar sesión</button>
            </div>
          </ng-template>
        </aside>
      </div>

      <ng-template #emptyState>
        <p *ngIf="!cartLoading && (!cart || cart.items.length === 0)" class="empty">
          Tu carrito está vacío. <a routerLink="/products">Explorar productos</a>
        </p>
      </ng-template>
    </section>
  `,
    styles: [`
      :host { display: block; }
      .page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
      h1 { margin: 0; color: #0f172a; }
      .cart-shell { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, .8fr); align-items: start; gap: 1.5rem; margin-top: 1.5rem; }
      .items { display: grid; gap: 1rem; }
      .item { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; }
      .item-info { min-width: 0; }
      .item a { color: #0f172a; text-decoration: none; }
      .item h2 { margin: 0; font-size: 1.05rem; }
      .item p { margin: .4rem 0; color: #64748b; font-size: .9rem; }
      .item .customizations { display: grid; gap: .2rem; color: #9a3412; font-size: .82rem; }
      .item-total { display: grid; justify-items: end; gap: .5rem; white-space: nowrap; }
      .quantity-control { display: flex; align-items: center; gap: .8rem; }
      .quantity-control button { width: 32px; height: 32px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: 1.1rem; cursor: pointer; }
      button:disabled { cursor: wait; opacity: .55; }
      .remove-button { border: 0; background: transparent; color: #b91c1c; font: inherit; font-size: .82rem; cursor: pointer; }
      .summary { display: grid; gap: .85rem; height: fit-content; padding: 1.2rem; border: 1px solid #e5e7eb; border-radius: 16px; background: #f9fafb; }
      .summary h2 { margin: 0; font-size: 1.2rem; }
      .summary form { display: grid; gap: .8rem; }
      .summary h3 { margin: .5rem 0 0; font-size: 1rem; }
      .row { display: flex; justify-content: space-between; gap: 1rem; color: #475569; }
      .total-row { padding-top: .85rem; border-top: 1px solid #d1d5db; color: #0f172a; font-size: 1.05rem; }
      label { display: grid; gap: .35rem; color: #334155; font-size: .82rem; font-weight: 650; }
      input:not([type="checkbox"]):not([type="radio"]) { width: 100%; box-sizing: border-box; min-height: 40px; padding: .6rem .7rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; font: inherit; }
      .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
      .checkbox-field { display: flex; align-items: center; gap: .55rem; }
      .checkbox-field input { width: 16px; height: 16px; accent-color: #c2410c; }
      .payment-heading { margin-top: .7rem !important; }
      .payment-option { display: flex; align-items: flex-start; gap: .6rem; padding: .7rem; border: 1px solid #dbe1e8; border-radius: 10px; background: #fff; cursor: pointer; }
      .payment-option input { margin-top: .2rem; accent-color: #c2410c; }
      .payment-option span, .payment-option small { display: block; }
      .payment-option small { margin-top: .2rem; color: #64748b; font-weight: 400; }
      .payment-option.disabled { color: #94a3b8; cursor: not-allowed; }
      .deposit-note { margin: 0; color: #9a3412; font-size: .9rem; font-weight: 700; }
      .summary button, .checkout-link { display: block; width: 100%; box-sizing: border-box; margin-top: .25rem; border: 0; border-radius: 10px; padding: .9rem; background: #c2410c; color: #fff; font: inherit; font-weight: 700; text-align: center; text-decoration: none; cursor: pointer; }
      .retry-button { margin: .75rem 0; padding: .65rem .8rem; border: 0; border-radius: 8px; background: #9a3412; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      .summary button:disabled { cursor: wait; opacity: .6; }
      .account-required { display: grid; gap: .65rem; }
      .account-required p { margin: 0; color: #475569; line-height: 1.5; }
      .login-link { color: #9a3412; font-size: .9rem; font-weight: 700; text-align: center; text-decoration: none; }
      .muted { margin: 0; color: #64748b; font-size: .88rem; }
      .empty { margin-top: 1.5rem; color: #475569; }
      .empty a { color: #9a3412; font-weight: 700; }
      .error { color: #b91c1c; }
      .success { color: #166534; }
      .selected-address { display: grid; gap: .25rem; padding: .8rem; border: 1px solid #cbd5e1; border-radius: .5rem; color: #334155; }
      @media (max-width: 800px) { .page { padding: 1.25rem; } .cart-shell { grid-template-columns: 1fr; } }
      @media (max-width: 480px) { .address-grid { grid-template-columns: 1fr; } .item { align-items: flex-start; } }
    `],
})
export class CartPageComponent implements OnInit {
    cart: Cart | null = null;
    availability: PaymentAvailability | null = null;
    address = { street: '', city: '', state: '', postalCode: '', country: 'Colombia' };
    savedAddresses: CustomerAddress[] = [];
    selectedAddressIndex: number | null = null;
    paymentMethod: OrderPaymentMethod = 'WOMPI';
    saveAddress = false;
    cartLoading = true;
    availabilityLoading = true;
    addressesLoading = false;
    checkoutBusy = false;
    loadError = '';
    addressError = '';
    availabilityError = '';
    successMessage = '';
    busyItemId: string | null = null;

    constructor(
        private readonly cartService: CartService,
        private readonly customerService: CustomerService,
        private readonly orderService: OrderService,
        private readonly router: Router,
        public readonly authService: AuthService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.loadCart();
        if (this.authService.hasRole('CUSTOMER')) {
            this.loadCustomerAddresses();
        }
        this.cartService.getPaymentAvailability().subscribe({
            next: (availability) => {
                this.availability = availability;
                this.paymentMethod = availability.wompi ? 'WOMPI' : 'WHATSAPP_DEPOSIT';
                this.availabilityLoading = false;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.availabilityError = 'No se pudieron consultar los métodos de pago. Intenta recargar la página.';
                this.availabilityLoading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    get itemCount(): number {
        return this.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    }

    itemId(item: CartItem): string {
        return item.lineId ?? item.productId;
    }

    get depositAmount(): number {
        return Math.ceil((this.cart?.total ?? 0) / 2);
    }

    get canCheckout(): boolean {
        if (!this.cart?.items.length || !this.availability || this.availabilityError) return false;
        return this.paymentMethod === 'WOMPI' ? this.availability.wompi : this.availability.whatsappDeposit;
    }

    selectAddress(index: number): void {
        if (index < 0) {
            this.selectedAddressIndex = null;
            this.address = { street: '', city: '', state: '', postalCode: '', country: 'Colombia' };
            this.saveAddress = false;
            return;
        }
        if (!this.savedAddresses[index]) return;
        this.selectedAddressIndex = index;
        this.saveAddress = false;
    }

    private loadCustomerAddresses(): void {
        this.addressesLoading = true;
        this.customerService.getMe().subscribe({
            next: (customer: CustomerProfile) => {
                this.savedAddresses = customer.addresses ?? [];
                const defaultIndex = this.savedAddresses.findIndex((savedAddress) => savedAddress.isDefault);
                const initialIndex = defaultIndex >= 0 ? defaultIndex : this.savedAddresses.length ? 0 : -1;
                if (initialIndex >= 0) {
                    this.selectAddress(initialIndex);
                } else {
                    this.selectedAddressIndex = null;
                }
                this.addressesLoading = false;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.addressError = 'No se pudieron cargar tus direcciones guardadas. Puedes ingresar una nueva dirección para continuar.';
                this.addressesLoading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    changeQuantity(item: CartItem, quantity: number): void {
        const itemId = this.itemId(item);
        this.busyItemId = itemId;
        this.loadError = '';
        this.cartService.updateItem(itemId, quantity).subscribe({
            next: (cart) => {
                this.cart = cart;
                this.busyItemId = null;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudo actualizar la cantidad. Verifica el inventario disponible e intenta de nuevo.';
                this.busyItemId = null;
                this.changeDetector.markForCheck();
            },
        });
    }

    removeItem(item: CartItem): void {
        const itemId = this.itemId(item);
        this.busyItemId = itemId;
        this.loadError = '';
        this.cartService.removeItem(itemId).subscribe({
            next: (cart) => {
                this.cart = cart;
                this.busyItemId = null;
                this.changeDetector.markForCheck();
            },
            error: () => {
                this.loadError = 'No se pudo quitar el producto del carrito.';
                this.busyItemId = null;
                this.changeDetector.markForCheck();
            },
        });
    }

    checkout(): void {
        if (!this.authService.hasRole('CUSTOMER')) {
            if (!this.authService.isAuthenticated()) {
            void this.router.navigate(['/register'], { queryParams: { returnUrl: '/cart' } });
            }
            return;
        }
        if (!this.cart?.items.length || !this.canCheckout) return;

        this.checkoutBusy = true;
        this.loadError = '';
        this.successMessage = '';
        this.orderService.create({
            ...(this.selectedAddressIndex !== null
                ? { addressIndex: this.selectedAddressIndex }
                : {
                    address: {
                        street: this.address.street,
                        city: this.address.city,
                        state: this.address.state,
                        postalCode: this.address.postalCode || undefined,
                        country: this.address.country,
                    },
                    saveAddress: this.saveAddress,
                }),
            paymentMethod: this.paymentMethod,
        }).subscribe({
            next: (order) => {
                if (this.paymentMethod === 'WHATSAPP_DEPOSIT') {
                    this.redirectToWhatsApp(order.orderNumber, order.amountDueNow ?? Math.ceil(order.total / 2), order.total);
                    return;
                }
                this.cartService.createWompiCheckout(order._id).subscribe({
                    next: (response) => this.redirectToWompi(response.checkout),
                    error: () => {
                        this.checkoutBusy = false;
                        this.cart = { ...this.cart!, items: [], subtotal: 0, total: 0 };
                        this.loadError = `El pedido ${order.orderNumber} fue creado, pero no se pudo iniciar el pago con Wompi. Consulta tus pedidos o contacta a un asesor.`;
                        this.changeDetector.markForCheck();
                    },
                });
            },
            error: (error: { error?: { message?: string } }) => {
                this.loadError = error.error?.message ?? 'No se pudo crear el pedido. Verifica la dirección y el carrito.';
                this.checkoutBusy = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    logoutForCheckout(): void {
        this.authService.logout();
        void this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
    }

    private loadCart(): void {
        this.cartLoading = true;
        this.loadError = '';
        const recoverGuestCart = this.authService.hasRole('CUSTOMER')
            ? this.cartService.claimGuestCartIfPresent()
            : of(null);
        recoverGuestCart.pipe(
            switchMap((claimedCart) => claimedCart ? of(claimedCart) : this.cartService.getCart()),
        ).subscribe({
            next: (cart) => {
                this.cart = cart;
                this.cartLoading = false;
                this.changeDetector.markForCheck();
            },
            error: (error: { error?: { message?: string } }) => {
                this.loadError = error.error?.message
                    ? `No se pudo recuperar el carrito: ${error.error.message}`
                    : 'No se pudo cargar el carrito. Intenta nuevamente.';
                this.cartLoading = false;
                this.changeDetector.markForCheck();
            },
        });
    }

    retryCartLoad(): void {
        this.loadCart();
    }

    private redirectToWhatsApp(orderNumber: string, amountDueNow: number, total: number): void {
        const number = this.availability?.whatsappNumber;
        if (!number) {
            this.checkoutBusy = false;
            this.loadError = `El pedido ${orderNumber} fue creado, pero no hay un número de WhatsApp configurado para gestionar el abono.`;
            this.changeDetector.markForCheck();
            return;
        }
        const message = `Hola, quiero coordinar el abono del 50% de mi pedido ${orderNumber}. Abono: ${this.formatCurrency(amountDueNow)}. Total del pedido: ${this.formatCurrency(total)}.`;
        window.location.assign(`https://wa.me/${number}?text=${encodeURIComponent(message)}`);
    }

    private redirectToWompi(checkout: { url: string; method: 'GET'; fields: Record<string, string> }): void {
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
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    }
}
