import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtlasRevealDirective } from '@shared/directives/reveal/reveal.directive';

@Component({
  selector: 'app-exploration-tools',
  imports: [RouterLink, AtlasRevealDirective],
  templateUrl: './exploration-tools.component.html',
  styleUrl: './exploration-tools.component.scss',
})
export class ExplorationToolsComponent {}
