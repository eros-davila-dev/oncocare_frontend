import { configuracionAplicacion } from '../core/config/proveedores';
import { rutasPortal } from './portal.routes';

export const configuracionPortal = configuracionAplicacion(rutasPortal, 'portal');
