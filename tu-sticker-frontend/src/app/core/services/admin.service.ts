import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CategoryWriteRequest, Product, ProductCreateRequest } from '../models/api';

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly apiUrl = `${environment.apiUrl}`;

    constructor(private readonly http: HttpClient) { }

    getDashboardSummary(): Observable<Record<string, unknown>> {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}/products`);
    }

    getProducts(): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.apiUrl}/products`);
    }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}/categories`);
    }

    getAdminCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}/categories/all`);
    }

    createCategory(category: CategoryWriteRequest): Observable<Category> {
        return this.http.post<Category>(`${this.apiUrl}/categories`, category);
    }

    updateCategory(id: string, category: Partial<CategoryWriteRequest>): Observable<Category> {
        return this.http.patch<Category>(`${this.apiUrl}/categories/${id}`, category);
    }

    deactivateCategory(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/categories/${id}`);
    }

    createProduct(product: ProductCreateRequest): Observable<Product> {
        return this.http.post<Product>(`${this.apiUrl}/products`, product);
    }
}
