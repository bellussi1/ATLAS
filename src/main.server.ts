import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';

import { config } from './app/app.config.server';
import { AppComponent } from './app/layouts/app-shell/app-shell.component';

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
