import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderAdminUpdateRequest, OrderCreateRequest } from '../models/api';

@Injectable({ providedIn: 'root' })
export class OrderService {
    private readonly apiUrl = `${environment.apiUrl}/orders`;

    constructor(private readonly http: HttpClient) { }

    list(): Observable<Order[]> {
        return this.http.get<Order[]>(this.apiUrl);
    }

    listAdmin(filters: {
        status?: string;
        name?: string;
        month?: string;
        from?: string;
        to?: string;
    }): Observable<Order[]> {
        let params = new HttpParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value?.trim()) {
                params = params.set(key, value.trim());
            }
        });
        return this.http.get<Order[]>(`${this.apiUrl}/admin`, { params });
    }

    getById(id: string): Observable<Order> {
        return this.http.get<Order>(`${this.apiUrl}/${id}`);
    }

    updateAdmin(id: string, payload: OrderAdminUpdateRequest): Observable<Order> {
        return this.http.patch<Order>(`${this.apiUrl}/admin/${id}`, payload);
    }

    create(payload: OrderCreateRequest): Observable<Order> {
        return this.http.post<Order>(this.apiUrl, payload);
    }

    cancel(id: string): Observable<Order> {
        return this.http.post<Order>(`${this.apiUrl}/${id}/cancel`, {});
    }
}
