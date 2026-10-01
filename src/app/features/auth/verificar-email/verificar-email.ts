import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { AuthLayoutComponent } from '../auth-layout/auth-layout';

type EstadoVerificacion = 'verificando' | 'exito' | 'error';

/** Destino del enlace enviado por correo (seccion 7): ?token=... */
@Component({
  selector: 'app-verificar-email',
  imports: [RouterLink, IconComponent, LoadingSpinnerComponent, AuthLayoutComponent],
  templateUrl: './verificar-email.html',
})
export class VerificarEmailComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly estado = signal<EstadoVerificacion>('verificando');
  protected readonly mensajeError = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado.set('error');
      this.mensajeError.set('El enlace de verificación no es válido.');
      return;
    }

    this.authService.verificarEmail(token).subscribe({
      next: () => this.estado.set('exito'),
      error: (error: HttpErrorResponse) => {
        const cuerpo = error.error as ErrorResponse | undefined;
        this.mensajeError.set(cuerpo?.message ?? 'El enlace no es válido o ha expirado.');
        this.estado.set('error');
      },
    });
  }
}
