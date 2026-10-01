import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { configuracionPortal } from './app/portal/portal.config';

bootstrapApplication(App, configuracionPortal).catch((err) => console.error(err));
