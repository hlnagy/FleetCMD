import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const method = req.method;

    // We only automatically audit state-modifying actions
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const url = req.url || '';
    // Skip noisy or internal polling routes if any
    if (url.includes('/auth/login') || url.includes('/audit')) {
      return next.handle();
    }

    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    const userNume = req.headers['x-user-name'];
    const userRol = req.headers['x-user-role'];
    const ipAdresa = req.ip || req.connection?.remoteAddress;

    // Infer module & action from URL and method
    let modul = 'GENERAL';
    if (url.includes('/vehicule')) modul = 'VEHICULE';
    else if (url.includes('/mentenanta') || url.includes('/comanda-lucru')) modul = 'MENTENANTA';
    else if (url.includes('/anomalii') || url.includes('/alerte') || url.includes('/fluide')) modul = 'ALERTE_FLUIDE';
    else if (url.includes('/anvelope')) modul = 'ANVELOPE';
    else if (url.includes('/stocuri') || url.includes('/depozite')) modul = 'STOCURI';
    else if (url.includes('/efactura')) modul = 'EFACTURA';
    else if (url.includes('/auth') || url.includes('/users')) modul = 'UTILIZATORI';

    let actiune = `${method} ${url.split('?')[0]}`;
    if (method === 'POST') actiune = 'CREARE / INREGISTRARE';
    if (method === 'PATCH' || method === 'PUT') actiune = 'MODIFICARE / ACTUALIZARE';
    if (method === 'DELETE') actiune = 'STERGERE / ELIMINARE';

    if (url.includes('/rezolva')) actiune = 'REZOLVARE_ALERTA';
    else if (url.includes('/finalizeaza')) actiune = 'FINALIZARE_COMANDA';
    else if (url.includes('/anuleaza')) actiune = 'ANULARE_COMANDA';

    const reqBodySummary = req.body
      ? JSON.stringify(req.body).slice(0, 500)
      : null;

    return next.handle().pipe(
      tap({
        next: (resData) => {
          this.auditService.logAction({
            userId,
            userEmail,
            userNume: userNume || (userEmail ? userEmail.split('@')[0] : 'Sistem / Anonim'),
            userRol: userRol || 'OPERATOR',
            actiune,
            modul,
            entitateTip: modul,
            entitateId: req.params?.id || resData?.id || null,
            detalii: reqBodySummary ? `Parametri: ${reqBodySummary}` : `Executat ${method} pe ${url}`,
            ipAdresa,
          });
        },
        error: () => {},
      })
    );
  }
}
