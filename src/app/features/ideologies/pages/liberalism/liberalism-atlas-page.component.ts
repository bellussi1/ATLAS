import { Component } from '@angular/core';
import { IdeologyAtlasComponent } from '@ideologies/components/ideology-atlas/ideology-atlas.component';
import { liberalismAtlas } from '@ideologies/data/liberalism-atlas';

@Component({
  selector: 'app-liberalism-atlas-page',
  imports: [IdeologyAtlasComponent],
  templateUrl: './liberalism-atlas-page.component.html',
  styleUrl: './liberalism-atlas-page.component.scss',
})
export class LiberalismAtlasPage {
  readonly config = liberalismAtlas;
}
