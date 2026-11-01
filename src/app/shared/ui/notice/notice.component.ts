import { Component, input } from '@angular/core';

@Component({
  selector: 'app-notice',
  standalone: true,
  templateUrl: './notice.component.html',
})
export class AtlasNoticeComponent {
  readonly tone = input<'info' | 'success' | 'warning' | 'critical'>('info');
  readonly accessibleRole = input<'status' | 'alert'>('status');
}
