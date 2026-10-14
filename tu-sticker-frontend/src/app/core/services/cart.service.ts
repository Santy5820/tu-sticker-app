import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart, PaymentAvailability, WompiCheckoutResponse } from '../models/api';
import { SessionService } from '../auth/session.service';

@Injectable({ providedIn: 'root' })
export class CartService {
    private readonly apiUrl = `${environment.apiUrl}/cart`;

    constructor(
        private readonly http: HttpClient,
        private readonly sessionService: SessionService,
    ) { }

    getCart(): Observable<Cart> {
        return this.http.get<Cart>(this.apiUrl);
    }

    addItem(productId: string, quantity: number, customizationIds: number[] = []): Observable<Cart> {
        return this.http.post<Cart>(`${this.apiUrl}/items`, { productId, quantity, customizationIds });
    }

    updateItem(itemId: string, quantity: number): Observable<Cart> {
        return this.http.patch<Cart>(`${this.apiUrl}/items/${encodeURIComponent(itemId)}`, { quantity });
    }

    removeItem(itemId: string): Observable<Cart> {
        return this.http.delete<Cart>(`${this.apiUrl}/items/${encodeURIComponent(itemId)}`);
    }

    clearCart(): Observable<Cart> {
        return this.http.delete<Cart>(this.apiUrl);
    }

    claimCart(): Observable<Cart> {
        return this.http.post<Cart>(`${this.apiUrl}/claim`, {});
    }

    claimGuestCartIfPresent(): Observable<Cart | null> {
        if (!this.sessionService.getCartId()) {
            return of(null);
        }
        return this.claimCart().pipe(
            tap(() => this.sessionService.clearCartId()),
        );
    }

    getPaymentAvailability(): Observable<PaymentAvailability> {
        return this.http.get<PaymentAvailability>(`${environment.apiUrl}/payments/availability`);
    }

    createWompiCheckout(orderId: string): Observable<WompiCheckoutResponse> {
        return this.http.post<WompiCheckoutResponse>(`${environment.apiUrl}/payments/orders/${orderId}/checkout`, {});
    }
}
