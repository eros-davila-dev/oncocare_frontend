import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { configuracionIntranet } from './app/intranet/intranet.config';

bootstrapApplication(App, configuracionIntranet).catch((err) => console.error(err));
