import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/api';

@Injectable({ providedIn: 'root' })
export class ProductService {
    private readonly apiUrl = `${environment.apiUrl}/products`;

    constructor(private readonly http: HttpClient) { }

    list(): Observable<Product[]> {
        return this.http.get<Product[]>(this.apiUrl);
    }

    getById(id: string): Observable<Product> {
        return this.http.get<Product>(`${this.apiUrl}/${id}`);
    }

    getBySlug(slug: string): Observable<Product> {
        return this.http.get<Product>(`${this.apiUrl}/slug/${encodeURIComponent(slug)}`);
    }

    getByCategory(category: string): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.apiUrl}/category/${category}`);
    }
}
