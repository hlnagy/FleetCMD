import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY } from './roles.decorator';
import { verifyJwt } from './crypto.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Verificăm dacă ruta este marcată ca publică (@Public)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Autentificare necesară. Vă rugăm să transmiteți antetul Authorization cu Bearer token.');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formatul token-ului este invalid. Formatul așteptat este: Bearer <token>.');
    }

    // 2. Validăm semnătura criptografică HMAC-SHA256 și expirarea
    const payload = verifyJwt(token);
    if (!payload) {
      throw new UnauthorizedException('Sesiune invalidă, coruptă sau expirată. Vă rugăm să vă autentificați din nou.');
    }

    // 3. Atașăm identitatea autentificată pe obiectul Request
    request.user = payload;
    // Suprascriem antetele interne cu identitatea verificată criptografic pentru a preveni header-spoofing
    request.headers['x-user-id'] = payload.sub;
    request.headers['x-user-role'] = payload.rol;
    request.headers['x-user-name'] = encodeURIComponent(payload.nume);

    // 4. Verificare RBAC pentru rutele cu restricție explicită de rol (@Roles)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(payload.rol);
      if (!hasRole) {
        throw new ForbiddenException('Acces interzis. Nu aveți permisiunea necesară pentru a accesa această resursă.');
      }
    }

    // 5. Restricționare globală pentru utilizatorii cu rol VIEWER: nu pot modifica sau șterge date
    const method = request.method;
    if (payload.rol === 'VIEWER' && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      throw new ForbiddenException('Utilizatorii cu rolul Vizualizator nu au permisiunea de a efectua modificări în sistem.');
    }

    return true;
  }
}
