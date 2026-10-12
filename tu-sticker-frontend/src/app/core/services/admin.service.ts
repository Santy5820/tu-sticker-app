import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
    private readonly apiUrl = `${environment.apiUrl}`;

    constructor(private readonly http: HttpClient) { }

    getDashboardSummary(): Observable<Record<string, unknown>> {
        return this.http.get<Record<string, unknown>>(`${this.apiUrl}/products`);
    }
}
