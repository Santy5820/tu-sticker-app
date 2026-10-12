import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/api';

@Injectable({ providedIn: 'root' })
export class OrderService {
    private readonly apiUrl = `${environment.apiUrl}/orders`;

    constructor(private readonly http: HttpClient) { }

    list(): Observable<Order[]> {
        return this.http.get<Order[]>(this.apiUrl);
    }

    getById(id: string): Observable<Order> {
        return this.http.get<Order>(`${this.apiUrl}/${id}`);
    }

    create(payload: Record<string, unknown>): Observable<Order> {
        return this.http.post<Order>(this.apiUrl, payload);
    }

    cancel(id: string): Observable<Order> {
        return this.http.post<Order>(`${this.apiUrl}/${id}/cancel`, {});
    }
}
