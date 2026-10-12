import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserPublic, UserRole } from '../models/api';
import { SessionService } from '../auth/session.service';
import { environment } from '../../../environments/environment';
import { CartService } from './cart.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
    constructor(
        private readonly http: HttpClient,
        private readonly sessionService: SessionService,
        private readonly cartService: CartService,
    ) { }

    login(payload: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
            switchMap((response) => this.completeAuthentication(response)),
        );
    }

    register(payload: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
            switchMap((response) => this.completeAuthentication(response)),
        );
    }

    logout(): void {
        this.sessionService.clearSession();
    }

    currentUser(): UserPublic | null {
        return this.sessionService.getCurrentUser();
    }

    isAuthenticated(): boolean {
        return this.sessionService.isAuthenticated();
    }

    hasRole(role: UserRole | UserRole[]): boolean {
        return this.sessionService.hasRole(role);
    }

    private completeAuthentication(response: AuthResponse): Observable<AuthResponse> {
        this.sessionService.setSession(response);

        if (response.user.role !== 'CUSTOMER' || !this.sessionService.getCartId()) {
            return of(response);
        }

        return this.cartService.claimCart().pipe(
            tap(() => this.sessionService.clearCartId()),
            map(() => response),
        );
    }
}
