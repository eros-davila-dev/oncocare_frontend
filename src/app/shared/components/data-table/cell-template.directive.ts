import { Directive, Input, TemplateRef } from '@angular/core';

/**
 * Permite proyectar una plantilla custom para una columna especifica de
 * ui-data-table (avatar, badge, etc.) sin romper las columnas de texto plano
 * existentes: una columna sin `clave` sigue usando `columna.valor(fila)` tal
 * cual. Uso: <ng-template uiCellTemplate="estado" let-fila>...</ng-template>
 */
@Directive({
  selector: '[uiCellTemplate]',
})
export class CellTemplateDirective {
  @Input('uiCellTemplate') clave = '';

  constructor(public readonly template: TemplateRef<{ $implicit: unknown }>) {}
}
