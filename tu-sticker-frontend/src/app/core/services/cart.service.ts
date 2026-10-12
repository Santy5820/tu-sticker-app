import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cart } from '../models/api';

@Injectable({ providedIn: 'root' })
export class CartService {
    private readonly apiUrl = `${environment.apiUrl}/cart`;

    constructor(private readonly http: HttpClient) { }

    getCart(): Observable<Cart> {
        return this.http.get<Cart>(this.apiUrl);
    }

    addItem(productId: string, quantity: number): Observable<Cart> {
        return this.http.post<Cart>(`${this.apiUrl}/items`, { productId, quantity });
    }

    updateItem(productId: string, quantity: number): Observable<Cart> {
        return this.http.patch<Cart>(`${this.apiUrl}/items/${productId}`, { quantity });
    }

    removeItem(productId: string): Observable<Cart> {
        return this.http.delete<Cart>(`${this.apiUrl}/items/${productId}`);
    }

    clearCart(): Observable<Cart> {
        return this.http.delete<Cart>(this.apiUrl);
    }

    claimCart(): Observable<Cart> {
        return this.http.post<Cart>(`${this.apiUrl}/claim`, {});
    }
}
