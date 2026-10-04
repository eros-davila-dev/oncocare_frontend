import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { authGuard } from '../core/guards/auth.guard';
import { roleGuard } from '../core/guards/role.guard';

/**
 * Intranet del personal: agenda, pacientes, citas, consultas derivadas,
 * panel de indicadores. Las pantallas del paciente viven en el
 * portal (otra aplicacion, otro dominio).
 */
export const rutasIntranet: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('../features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/recuperar-password',
    loadComponent: () => import('../features/auth/recuperar-password/recuperar-password').then((m) => m.RecuperarPasswordComponent),
  },
  {
    path: 'auth/restablecer-password',
    loadComponent: () =>
      import('../features/auth/restablecer-password/restablecer-password').then((m) => m.RestablecerPasswordComponent),
  },
  {
    path: '',
    loadComponent: () => import('../layout/shell/shell').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).rutaInicio() },
      {
        path: 'dashboard',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA', 'INVESTIGADOR')],
        loadComponent: () =>
          import('../features/dashboard/dashboard-indicadores/dashboard-indicadores').then((m) => m.DashboardIndicadoresComponent),
      },
      {
        path: 'agenda',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () => import('../features/agenda/agenda-dia/agenda-dia').then((m) => m.AgendaDiaComponent),
      },
      {
        path: 'consultas',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () =>
          import('../features/consultas/bandeja-consultas/bandeja-consultas').then((m) => m.BandejaConsultasComponent),
      },
      {
        path: 'preguntas-frecuentes',
        canActivate: [roleGuard('ADMIN', 'RECEPCIONISTA')],
        loadComponent: () =>
          import('../features/consultas/preguntas-frecuentes/preguntas-frecuentes').then((m) => m.PreguntasFrecuentesComponent),
      },
      {
        path: 'pacientes',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () => import('../features/pacientes/pacientes-list/pacientes-list').then((m) => m.PacientesListComponent),
      },
      {
        path: 'citas',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () => import('../features/citas/citas-list/citas-list').then((m) => m.CitasListComponent),
      },
      {
        path: 'tratamientos',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () =>
          import('../features/tratamientos/tratamientos-list/tratamientos-list').then((m) => m.TratamientosListComponent),
      },
      {
        path: 'asistente-ia',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('../features/configuracion/configuracion-gemini/configuracion-gemini').then((m) => m.ConfiguracionGeminiComponent),
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('../features/auditoria/auditoria-list/auditoria-list').then((m) => m.AuditoriaListComponent),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('../features/usuarios/usuarios-list/usuarios-list').then((m) => m.UsuariosListComponent),
      },
      {
        path: 'dispositivos',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('../features/dispositivos/dispositivos-list/dispositivos-list').then((m) => m.DispositivosListComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
