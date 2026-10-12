import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthResponse, UserPublic } from '../models/api';

@Injectable({ providedIn: 'root' })
export class SessionService {
    private readonly tokenKey = 'tu-sticker-token';
    private readonly userKey = 'tu-sticker-user';
    private readonly userSubject = new BehaviorSubject<UserPublic | null>(this.readUser());

    readonly user$ = this.userSubject.asObservable();

    setSession(authResponse: AuthResponse): void {
        localStorage.setItem(this.tokenKey, authResponse.token);
        localStorage.setItem(this.userKey, JSON.stringify(authResponse.user));
        this.userSubject.next(authResponse.user);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    getCurrentUser(): UserPublic | null {
        return this.readUser();
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    hasRole(role: UserPublic['role'] | UserPublic['role'][]): boolean {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            return false;
        }

        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(currentUser.role);
    }

    clearSession(): void {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.userSubject.next(null);
    }

    private readUser(): UserPublic | null {
        const raw = localStorage.getItem(this.userKey);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as UserPublic;
        } catch {
            localStorage.removeItem(this.userKey);
            return null;
        }
    }
}
