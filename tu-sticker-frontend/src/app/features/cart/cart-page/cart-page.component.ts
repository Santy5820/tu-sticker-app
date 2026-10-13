import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Cart } from '../../../core/models/api';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';

@Component({
    selector: 'app-cart-page',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <section class="page">
      <h1>Carrito</h1>

      <div *ngIf="cart && cart.items.length; else emptyState" class="cart-shell">
        <div class="items">
          <div class="item" *ngFor="let item of cart.items">
            <div>
              <h3>{{ item.productName }}</h3>
              <p>{{ item.quantity }} x {{ item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            </div>
            <strong>{{ item.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
          </div>
        </div>

        <aside class="summary">
          <h2>Resumen</h2>
          <div class="row"><span>Subtotal</span><strong>{{ cart.subtotal | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></div>
          <div class="row"><span>Total</span><strong>{{ cart.total | currency:'COP':'symbol-narrow':'1.0-0' }}</strong></div>
          <ng-container *ngIf="authService.isAuthenticated(); else accountRequired">
            <button type="button" (click)="checkout()">Confirmar pedido</button>
          </ng-container>

          <ng-template #accountRequired>
            <p>Para procesar tu pedido, inicia sesión o crea una cuenta.</p>
            <a [routerLink]="['/login']" [queryParams]="{ returnUrl: '/cart' }">Iniciar sesión</a>
            <a [routerLink]="['/register']" [queryParams]="{ returnUrl: '/cart' }">Crear cuenta</a>
          </ng-template>
        </aside>
      </div>

      <ng-template #emptyState>
        <p class="empty">Tu carrito está vacío.</p>
      </ng-template>
    </section>
  `,
    styles: [
        `.page { padding: 2rem; } .cart-shell { display: grid; grid-template-columns: 1.5fr .8fr; gap: 1.5rem; margin-top: 1.5rem; } .items { display: grid; gap: 1rem; } .item { display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 1rem; } .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 1.2rem; height: fit-content; } .row { display: flex; justify-content: space-between; margin: 0.75rem 0; } button { width: 100%; margin-top: 1rem; background: #111827; color: white; border:none; border-radius: 10px; padding: 0.9rem; font-weight: 700; cursor: pointer; } .empty { color: #475569; } @media(max-width: 760px) { .cart-shell { grid-template-columns: 1fr; } }`],
})
export class CartPageComponent implements OnInit {
    cart: Cart | null = null;

    constructor(
        private readonly cartService: CartService,
        private readonly orderService: OrderService,
        private readonly router: Router,
        public readonly authService: AuthService,
        private readonly changeDetector: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.cartService.getCart().subscribe((cart) => {
            this.cart = cart;
            this.changeDetector.markForCheck();
        });
    }

    checkout(): void {
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
            return;
        }

        this.orderService.create({}).subscribe(() => {
            this.router.navigate(['/orders']);
        });
    }
}
