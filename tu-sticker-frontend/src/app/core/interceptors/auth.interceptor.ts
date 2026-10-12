import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const sessionService = inject(SessionService);
    const token = sessionService.getToken();
    const isCartRequest = req.url.startsWith(`${environment.apiUrl}/cart`);
    const cartId = isCartRequest ? sessionService.getCartId() : null;

    let headers = req.headers;
    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (cartId) {
        headers = headers.set('X-Cart-Id', cartId);
    }

    const authReq = headers === req.headers ? req : req.clone({ headers });
    return next(authReq).pipe(
        tap((event) => {
            if (isCartRequest && event instanceof HttpResponse) {
                const responseCartId = event.headers.get('X-Cart-Id');
                if (responseCartId) {
                    sessionService.setCartId(responseCartId);
                }
            }
        }),
    );
};
