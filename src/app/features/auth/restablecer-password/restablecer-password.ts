import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { InputComponent } from '../../../shared/ui/input/input';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { AuthLayoutComponent } from '../auth-layout/auth-layout';
import { confirmacionPasswordValidator, passwordSeguroValidator } from '../../../shared/validators/password.validator';

@Component({
  selector: 'app-restablecer-password',
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent],
  templateUrl: './restablecer-password.html',
})
export class RestablecerPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('token');

  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal('');
  protected readonly restablecido = signal(false);
  protected readonly tokenAusente = signal(!this.token);

  protected readonly form = new FormGroup({
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

  protected restablecer(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorGeneral.set('');

    this.authService.restablecerPassword({ token: this.token, nuevaPassword: this.form.getRawValue().password }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.restablecido.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const cuerpo = error.error as ErrorResponse | undefined;
        this.errorGeneral.set(cuerpo?.message ?? 'No se pudo restablecer la contraseña.');
      },
    });
  }
}
