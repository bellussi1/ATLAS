import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AtlasEditorialLinkDirective,
  AtlasHeadingDirective,
  AtlasTextFieldComponent,
} from '../shared/ui-primitives';

@Component({
  selector: 'app-home-page',
  imports: [AtlasEditorialLinkDirective, AtlasHeadingDirective, AtlasTextFieldComponent, RouterLink],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {}
