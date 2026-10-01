import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { InputComponent } from '../../../shared/ui/input/input';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { AuthLayoutComponent } from '../auth-layout/auth-layout';
import { confirmacionPasswordValidator, passwordSeguroValidator } from '../../../shared/validators/password.validator';

/**
 * Paso 1 del autoservicio de pacientes (seccion 7): crea la cuenta y deja
 * pendiente la verificacion por correo. Nunca informa si el email ya estaba
 * registrado (seccion 9): el backend responde siempre el mismo mensaje.
 */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent],
  templateUrl: './registro.html',
})
export class RegistroComponent {
  private readonly authService = inject(AuthService);

  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal('');
  protected readonly registroCompletado = signal(false);

  protected readonly form = new FormGroup({
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordSeguroValidator] }),
    confirmacion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, confirmacionPasswordValidator()],
    }),
  });

  constructor() {
    this.form.controls.password.valueChanges.subscribe(() =>
      this.form.controls.confirmacion.updateValueAndValidity({ onlySelf: true }),
    );
  }

  protected registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorGeneral.set('');
    const { nombres, email, password } = this.form.getRawValue();

    this.authService.registrar({ nombres, email, password }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.registroCompletado.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const cuerpo = error.error as ErrorResponse | undefined;
        this.errorGeneral.set(cuerpo?.message ?? 'No se pudo completar el registro. Intenta nuevamente.');
      },
    });
  }
}
