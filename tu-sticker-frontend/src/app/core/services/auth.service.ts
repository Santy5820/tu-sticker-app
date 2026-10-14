import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserPublic, UserRole } from '../models/api';
import { SessionService } from '../auth/session.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    constructor(
        private readonly http: HttpClient,
        private readonly sessionService: SessionService,
    ) { }

    login(payload: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
            tap((response) => this.sessionService.setSession(response)),
        );
    }

    register(payload: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
            tap((response) => this.sessionService.setSession(response)),
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

}
