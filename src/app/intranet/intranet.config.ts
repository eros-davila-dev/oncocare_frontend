import { configuracionAplicacion } from '../core/config/proveedores';
import { rutasIntranet } from './intranet.routes';

export const configuracionIntranet = configuracionAplicacion(rutasIntranet, 'intranet');
