import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PacienteService } from '../../pacientes/paciente.service';
import { Paciente } from '../../../core/models/paciente.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { CardComponent } from '../../../shared/ui/card/card';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

/** Ficha clinica de solo lectura del paciente autenticado (seccion 31). */
@Component({
  selector: 'app-mi-perfil',
  imports: [DatePipe, PageHeaderComponent, CardComponent, LoadingSpinnerComponent],
  templateUrl: './mi-perfil.html',
})
export class MiPerfilComponent {
  private readonly pacienteService = inject(PacienteService);

  protected readonly cargando = signal(true);
  protected readonly paciente = signal<Paciente | null>(null);

  constructor() {
    this.pacienteService.miPerfil().subscribe({
      next: (paciente) => {
        this.paciente.set(paciente);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }
}
