import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CustomerProfile } from '../models/api';

@Injectable({ providedIn: 'root' })
export class CustomerService {
    constructor(private readonly http: HttpClient) { }

    getMe(): Observable<CustomerProfile> {
        return this.http.get<CustomerProfile>(`${environment.apiUrl}/customers/me`);
    }
}
