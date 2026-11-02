import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Shared "not found" content for unknown routes and for records that do not exist. */
@Component({
  selector: 'app-not-found-message',
  imports: [RouterLink],
  templateUrl: './not-found-message.component.html',
  styleUrl: './not-found-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundMessageComponent {
  readonly heading = input('Página não encontrada');
  readonly message = input('Este endereço não existe no ATLAS. Escolha um dos caminhos abaixo.');
}
