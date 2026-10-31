import { Component, computed, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

type ProposalId = 'a' | 'b' | 'c';
type LabPage = 'inicio' | 'artigo' | 'perfil';

interface Proposal {
  id: ProposalId;
  name: string;
  shortName: string;
  direction: string;
  surface: string;
}

const proposals: Record<ProposalId, Proposal> = {
  a: {
    id: 'a',
    name: 'Editorial modernista',
    shortName: 'Editorial',
    direction: 'Um cartaz abre a porta para o acervo.',
    surface: 'surface-paper',
  },
  b: {
    id: 'b',
    name: 'Atlas cartográfico',
    shortName: 'Atlas',
    direction: 'O mapa organiza a leitura e convida à exploração.',
    surface: 'surface-map',
  },
  c: {
    id: 'c',
    name: 'Museu digital',
    shortName: 'Museu',
    direction: 'Documentos em camadas aproximam o leitor das fontes.',
    surface: 'surface-archive',
  },
};

const validPages: LabPage[] = ['inicio', 'artigo', 'perfil'];

@Component({
  selector: 'app-visual-lab-page',
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './visual-lab-page.html',
  styleUrl: './visual-lab-page.scss',
})
export class VisualLabPage {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly proposal = computed(() => {
    const id = this.params().get('proposta') as ProposalId | null;
    return id ? (proposals[id] ?? null) : null;
  });
  readonly page = computed<LabPage | null>(() => {
    const page = this.params().get('pagina') as LabPage | null;
    return page && validPages.includes(page) ? page : null;
  });
  readonly alternatives = Object.values(proposals);
}
