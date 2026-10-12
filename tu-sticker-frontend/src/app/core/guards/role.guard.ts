import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/api';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const requiredRoles = route.data['roles'] as UserRole[] | undefined;

    if (!requiredRoles?.length) {
        return true;
    }

    const hasAccess = requiredRoles.some((role) => authService.hasRole(role));
    return hasAccess ? true : router.createUrlTree(['/shop']);
};
