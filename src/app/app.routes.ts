import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { perfilCompletoGuard, perfilPendienteGuard } from './core/guards/paciente-perfil.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.RegistroComponent),
  },
  {
    path: 'auth/verificar-email',
    loadComponent: () => import('./features/auth/verificar-email/verificar-email').then((m) => m.VerificarEmailComponent),
  },
  {
    path: 'auth/recuperar-password',
    loadComponent: () => import('./features/auth/recuperar-password/recuperar-password').then((m) => m.RecuperarPasswordComponent),
  },
  {
    path: 'auth/restablecer-password',
    loadComponent: () =>
      import('./features/auth/restablecer-password/restablecer-password').then((m) => m.RestablecerPasswordComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA', 'INVESTIGADOR')],
        loadComponent: () =>
          import('./features/dashboard/dashboard-indicadores/dashboard-indicadores').then((m) => m.DashboardIndicadoresComponent),
      },
      {
        path: 'pacientes',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () => import('./features/pacientes/pacientes-list/pacientes-list').then((m) => m.PacientesListComponent),
      },
      {
        path: 'citas',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () => import('./features/citas/citas-list/citas-list').then((m) => m.CitasListComponent),
      },
      {
        path: 'tratamientos',
        canActivate: [roleGuard('ADMIN', 'MEDICO', 'RECEPCIONISTA')],
        loadComponent: () =>
          import('./features/tratamientos/tratamientos-list/tratamientos-list').then((m) => m.TratamientosListComponent),
      },
      {
        path: 'estudio',
        canActivate: [roleGuard('ADMIN', 'INVESTIGADOR')],
        loadComponent: () => import('./features/estudio/estudio-layout/estudio-layout').then((m) => m.EstudioLayoutComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'resumen' },
          {
            path: 'resumen',
            loadComponent: () => import('./features/estudio/estudio-resumen/estudio-resumen').then((m) => m.EstudioResumenComponent),
          },
          {
            path: 'muestra',
            loadComponent: () => import('./features/estudio/estudio-muestra/estudio-muestra').then((m) => m.EstudioMuestraComponent),
          },
          {
            path: 'fichas',
            loadComponent: () => import('./features/estudio/estudio-fichas/estudio-fichas').then((m) => m.EstudioFichasComponent),
          },
          {
            path: 'datos',
            loadComponent: () => import('./features/estudio/estudio-datos/estudio-datos').then((m) => m.EstudioDatosComponent),
          },
        ],
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/auditoria/auditoria-list/auditoria-list').then((m) => m.AuditoriaListComponent),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/usuarios/usuarios-list/usuarios-list').then((m) => m.UsuariosListComponent),
      },
      {
        path: 'dispositivos',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/dispositivos/dispositivos-list/dispositivos-list').then((m) => m.DispositivosListComponent),
      },
      {
        path: 'completar-perfil',
        canActivate: [roleGuard('PACIENTE'), perfilPendienteGuard],
        loadComponent: () =>
          import('./features/paciente-portal/completar-perfil/completar-perfil').then((m) => m.CompletarPerfilComponent),
      },
      {
        path: 'mis-citas',
        canActivate: [roleGuard('PACIENTE'), perfilCompletoGuard],
        loadComponent: () => import('./features/paciente-portal/mis-citas/mis-citas').then((m) => m.MisCitasComponent),
      },
      {
        path: 'mi-perfil',
        canActivate: [roleGuard('PACIENTE'), perfilCompletoGuard],
        loadComponent: () => import('./features/paciente-portal/mi-perfil/mi-perfil').then((m) => m.MiPerfilComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
