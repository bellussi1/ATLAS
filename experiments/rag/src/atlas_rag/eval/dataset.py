"""Construção e validação do conjunto de avaliação (100 perguntas estratificadas) da Fase 1."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from atlas_rag.ingest.bundle import load_pinned_bundle
from atlas_rag.paths import eval_dir, gold_set_dir, repo_root
from atlas_rag.units.builder import (
    CorpusArtifacts,
    classify_relation_tier,
    extract_deduplicated_corpus,
)

EXPECTED_COUNTS: dict[str, tuple[int, int]] = {
    "factual": (17, 7),
    "multi_hop": (13, 5),
    "comparativa": (10, 4),
    "contestada": (11, 5),
    "so_link_de_descoberta": (10, 4),
    "sem_resposta": (9, 5),
}

_STOP_TITLE_TOKENS = {
    "de",
    "do",
    "da",
    "dos",
    "das",
    "e",
    "o",
    "a",
    "os",
    "as",
    "em",
    "no",
    "na",
    "sobre",
    "para",
    "por",
    "com",
    # Generic qualifier: "social" alone in a country text is not a mention of "Liberalismo social".
    "social",
}


def normalize_text(text: str) -> str:
    """Normaliza para minúsculas sem acentos (NFD)."""
    decomposed = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def _sig_title_tokens(title: str) -> list[str]:
    return [
        tok
        for tok in re.findall(r"[a-z0-9]+", normalize_text(title))
        if len(tok) >= 4 and tok not in _STOP_TITLE_TOKENS
    ]


@dataclass(frozen=True)
class QuestionSpec:
    id: str
    split: str
    type: str
    question: str
    gold_unit_ids: list[str]
    must_refuse: bool
    expected_epistemic: str | None
    origin: str
    reused_from_gold_set: bool = False
    bridge_relation_ids: list[str] | None = None
    discovery_relation_id: str | None = None
    entity_ids: list[str] | None = None
    oov_keywords: list[str] | None = None


def _build_question_specs() -> list[QuestionSpec]:
    """Especificação determinística das 100 perguntas (70 dev, 30 test)."""
    specs: list[QuestionSpec] = [
        # =====================================================================
        # FACTUAL (24: 17 dev, 7 test)
        # =====================================================================
        QuestionSpec(
            id="q-fac-001",
            split="dev",
            type="factual",
            question="Onde Adam Smith nasceu e em que data foi batizado segundo o acervo?",
            gold_unit_ids=["claim-wiki-topic-adam-smith-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-adam-smith-001",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-002",
            split="dev",
            type="factual",
            question="Em que cidade e data ocorreu a morte de Friedrich Engels?",
            gold_unit_ids=["claim-wiki-topic-friedrich-engels-009"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-friedrich-engels-009",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-003",
            split="dev",
            type="factual",
            question="Qual é a medida de valor de troca proposta por Adam Smith na obra A Riqueza das Nações?",
            gold_unit_ids=["claim-work-wealth-of-nations"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-work-wealth-of-nations",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-004",
            split="dev",
            type="factual",
            question="Em que cidade e ano foi publicado originalmente o Manifesto Comunista?",
            gold_unit_ids=["claim-wiki-topic-manifesto-comunista-001", "claim-wiki-topic-manifesto-comunista-006"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-manifesto-comunista-006",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-005",
            split="dev",
            type="factual",
            question="Quem introduziu o termo liberalismo verde em estudos acadêmicos segundo o acervo?",
            gold_unit_ids=["claim-wiki-ideology-green-liberalism-005"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-ideology-green-liberalism-005",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-006",
            split="dev",
            type="factual",
            question="Quem foi o principal promotor das Leis Antissocialistas na Alemanha?",
            gold_unit_ids=["claim-wiki-topic-leis-antissocialistas-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-leis-antissocialistas-002",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-007",
            split="dev",
            type="factual",
            question="Em que período o Partido Comunista do Chile esteve proibido de participar de eleições com seu próprio nome?",
            gold_unit_ids=["claim-wiki-topic-partido-comunista-do-chile-004"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-comunista-do-chile-004",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-008",
            split="dev",
            type="factual",
            question="Que concepção sobre poder constituinte era sustentada por Emmanuel Joseph Sieyès?",
            gold_unit_ids=["claim-wiki-person-emmanuel-joseph-sieyes-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-person-emmanuel-joseph-sieyes-002",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-009",
            split="dev",
            type="factual",
            question="Em que ano Trótski formulou a teoria da revolução permanente?",
            gold_unit_ids=["claim-wiki-topic-trotskismo-005"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-trotskismo-005",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-fac-010",
            split="dev",
            type="factual",
            question="Quando e onde foi fundado o Partido dos Trabalhadores (PT) no Brasil?",
            gold_unit_ids=["claim-wiki-topic-partido-dos-trabalhadores-001", "claim-wiki-topic-partido-dos-trabalhadores-003"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-dos-trabalhadores-001",
        ),
        QuestionSpec(
            id="q-fac-011",
            split="dev",
            type="factual",
            question="Qual medida provisória deu início ao Plano Real em fevereiro de 1994 e qual era seu objetivo principal?",
            gold_unit_ids=["claim-wiki-topic-plano-real-001", "claim-wiki-topic-plano-real-002"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-plano-real-001",
        ),
        QuestionSpec(
            id="q-fac-012",
            split="dev",
            type="factual",
            question="Como o Estado brasileiro é identificado pela Constituição de 1988?",
            gold_unit_ids=["claim-country-brazil"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-country-brazil",
        ),
        QuestionSpec(
            id="q-fac-013",
            split="dev",
            type="factual",
            question="Quando e onde foi fundado o Partido Democrático Trabalhista (PDT)?",
            gold_unit_ids=["claim-wiki-topic-partido-democratico-trabalhista-003"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-democratico-trabalhista-003",
        ),
        QuestionSpec(
            id="q-fac-014",
            split="dev",
            type="factual",
            question="Qual jornal anarquista foi fundado por Emma Goldman em 1906 nos Estados Unidos?",
            gold_unit_ids=["claim-wiki-topic-emma-goldman-002"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-emma-goldman-002",
        ),
        QuestionSpec(
            id="q-fac-015",
            split="dev",
            type="factual",
            question="A quem e a qual década é creditada a criação do Estado de bem-estar social moderno na Alemanha?",
            gold_unit_ids=["claim-wiki-topic-estado-de-bem-estar-social-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-estado-de-bem-estar-social-001",
        ),
        QuestionSpec(
            id="q-fac-016",
            split="dev",
            type="factual",
            question="Em que cidade nasceu Getúlio Vargas e quando instaurou o Estado Novo?",
            gold_unit_ids=["claim-wiki-topic-getulio-vargas-001", "claim-wiki-topic-getulio-vargas-002"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-getulio-vargas-002",
        ),
        QuestionSpec(
            id="q-fac-017",
            split="dev",
            type="factual",
            question="Qual é a tese central de Antonio Gramsci pela qual ele é mais reconhecido segundo o acervo?",
            gold_unit_ids=["claim-wiki-topic-antonio-gramsci-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-antonio-gramsci-002",
        ),
        # factual - test (7)
        QuestionSpec(
            id="q-fac-018",
            split="test",
            type="factual",
            question="Em que país e data a Operação Condor foi formalmente estabelecida segundo os documentos do acervo?",
            gold_unit_ids=["claim-wiki-topic-operacao-condor-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-operacao-condor-001",
        ),
        QuestionSpec(
            id="q-fac-019",
            split="test",
            type="factual",
            question="Por quais dois partidos alemães foi fundado o SPD em 1875?",
            gold_unit_ids=["claim-wiki-topic-partido-social-democrata-da-alemanha-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-social-democrata-da-alemanha-001",
        ),
        QuestionSpec(
            id="q-fac-020",
            split="test",
            type="factual",
            question="Qual economista cunhou o termo ordoliberalismo em 1950 e a qual periódico o nome se refere?",
            gold_unit_ids=["claim-wiki-topic-ordoliberalismo-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-ordoliberalismo-001",
        ),
        QuestionSpec(
            id="q-fac-021",
            split="test",
            type="factual",
            question="Quando o termo liberalismo social foi utilizado pela primeira vez e por quem?",
            gold_unit_ids=["claim-wiki-topic-liberalismo-social-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-liberalismo-social-001",
        ),
        QuestionSpec(
            id="q-fac-022",
            split="test",
            type="factual",
            question="Em qual obra de 1840 Pierre-Joseph Proudhon se declara explicitamente anarquista?",
            gold_unit_ids=["claim-wiki-topic-anarquismo-003"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-anarquismo-003",
        ),
        QuestionSpec(
            id="q-fac-023",
            split="test",
            type="factual",
            question="Do que depende o nível de atividade econômica e o emprego segundo a tese de John Maynard Keynes?",
            gold_unit_ids=["claim-wiki-topic-john-maynard-keynes-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-john-maynard-keynes-001",
        ),
        QuestionSpec(
            id="q-fac-024",
            split="test",
            type="factual",
            question="Em que data foi instalada a Assembleia Nacional Constituinte de 1987 no Congresso Nacional?",
            gold_unit_ids=["claim-wiki-topic-constituicao-brasileira-de-1988-003"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-constituicao-brasileira-de-1988-003",
        ),
        # =====================================================================
        # MULTI_HOP (18: 13 dev, 5 test)
        # =====================================================================
        QuestionSpec(
            id="q-mh-001",
            split="dev",
            type="multi_hop",
            question="Qual obra escrita por Adam Smith é examinada criticamente por Karl Marx ao distinguir trabalho contido e trabalho comandado?",
            gold_unit_ids=["claim-person-adam-smith", "claim-marx-critica-smith"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-marx-critica-smith",
            reused_from_gold_set=True,
            bridge_relation_ids=["relation-smith-wealth", "relation-marx-criticizes-smith"],
        ),
        QuestionSpec(
            id="q-mh-002",
            split="dev",
            type="multi_hop",
            question="Que livro publicado por Marx em 1867 analisa a relação entre tempo de trabalho socialmente necessário e valor?",
            gold_unit_ids=["claim-person-karl-marx", "claim-work-capital-volume-i"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-work-capital-volume-i",
            reused_from_gold_set=True,
            bridge_relation_ids=["relation-marx-capital"],
        ),
        QuestionSpec(
            id="q-mh-003",
            split="dev",
            type="multi_hop",
            question="Que teórico alemão do revisionismo inspirou a definição de socialismo usada no desenvolvimento do socialismo liberal?",
            gold_unit_ids=["claim-wiki-topic-eduard-bernstein-001", "claim-wiki-ideology-liberal-socialism-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-ideology-liberal-socialism-001",
            bridge_relation_ids=["rel-wiki-ideology-liberal-socialism-001"],
        ),
        QuestionSpec(
            id="q-mh-004",
            split="dev",
            type="multi_hop",
            question="Qual filósofo inglês do empirismo influenciou os escritos de Thomas Jefferson e Jean-Jacques Rousseau sobre liberdade?",
            gold_unit_ids=["claim-wiki-topic-john-locke-001", "claim-wiki-topic-jean-jacques-rousseau-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-john-locke-001",
            bridge_relation_ids=["rel-wiki-topic-john-locke-001", "rel-wiki-topic-john-locke-003"],
        ),
        QuestionSpec(
            id="q-mh-005",
            split="dev",
            type="multi_hop",
            question="Que panfleto foi escrito por Emmanuel Joseph Sieyès em 1788 em resposta ao convite de Jacques Necker sobre os Estados Gerais?",
            gold_unit_ids=["claim-wiki-person-emmanuel-joseph-sieyes-001", "claim-wiki-obra-o-que-e-o-terceiro-estado-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-obra-o-que-e-o-terceiro-estado-001",
            bridge_relation_ids=["rel-wiki-person-emmanuel-joseph-sieyes-002"],
        ),
        QuestionSpec(
            id="q-mh-006",
            split="dev",
            type="multi_hop",
            question="Em qual conflito de 1876–1878 contra o Império Otomano participou Ion C. Brătianu liderando o lado romeno?",
            gold_unit_ids=["claim-wiki-person-ion-c-bratianu-001", "claim-wiki-acontecimento-guerra-servio-otomana-1876-1878-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-acontecimento-guerra-servio-otomana-1876-1878-001",
            bridge_relation_ids=["rel-wiki-person-ion-c-bratianu-001"],
        ),
        QuestionSpec(
            id="q-mh-007",
            split="dev",
            type="multi_hop",
            question="Em qual evento revolucionário de 1848 participou Lorenz von Stein, defensor da combinação entre Estado liberal e bem-estar social?",
            gold_unit_ids=["claim-wiki-person-lorenz-von-stein-001", "claim-wiki-acontecimento-revolucoes-de-1848-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-person-lorenz-von-stein-001",
            bridge_relation_ids=["rel-wiki-person-lorenz-von-stein-001"],
        ),
        QuestionSpec(
            id="q-mh-008",
            split="dev",
            type="multi_hop",
            question="Que revista fundada por Karl Kautsky contou com textos fundamentais de Karl Marx e Friedrich Engels?",
            gold_unit_ids=["claim-wiki-topic-karl-kautsky-001", "claim-wiki-topic-die-neue-zeit-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-die-neue-zeit-001",
            bridge_relation_ids=["rel-wiki-topic-karl-kautsky-001"],
        ),
        QuestionSpec(
            id="q-mh-009",
            split="dev",
            type="multi_hop",
            question="Em qual organização fundada em 1938 na França se desenvolveu posteriormente a Oposição de Esquerda associada a Trótski?",
            gold_unit_ids=["claim-wiki-topic-oposicao-de-esquerda-001", "claim-wiki-topic-quarta-internacional-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-quarta-internacional-001",
            bridge_relation_ids=["rel-wiki-topic-leon-trotski-003", "rel-wiki-topic-oposicao-de-esquerda-004"],
        ),
        QuestionSpec(
            id="q-mh-010",
            split="dev",
            type="multi_hop",
            question="Qual dirigente soviético sucedeu Josef Stalin e denunciou seus expurgos no Discurso Secreto de 1956?",
            gold_unit_ids=["claim-wiki-topic-nikita-khrushchov-001", "claim-wiki-topic-josef-stalin-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-nikita-khrushchov-001",
            bridge_relation_ids=["rel-wiki-topic-josef-stalin-001"],
        ),
        QuestionSpec(
            id="q-mh-011",
            split="dev",
            type="multi_hop",
            question="Que organização fundada por Ferdinand Lassalle atuou na política eleitoral alemã antes da fusão que originou o SPD?",
            gold_unit_ids=["claim-wiki-topic-associacao-geral-dos-trabalhadores-alemaes-001", "claim-wiki-topic-partido-social-democrata-da-alemanha-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-associacao-geral-dos-trabalhadores-alemaes-001",
            bridge_relation_ids=["rel-wiki-topic-ferdinand-lassalle-001"],
        ),
        QuestionSpec(
            id="q-mh-012",
            split="dev",
            type="multi_hop",
            question="Qual partido inglês fundado em 1834 por Robert Peel teve origem no Partido Tory?",
            gold_unit_ids=["claim-wiki-topic-tory-001", "claim-wiki-topic-partido-conservador-reino-unido-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-conservador-reino-unido-001",
            bridge_relation_ids=["rel-wiki-topic-partido-conservador-reino-unido-001"],
        ),
        QuestionSpec(
            id="q-mh-013",
            split="dev",
            type="multi_hop",
            question="Que livro escrito por Friedrich Engels em 1878 saiu originalmente em série num jornal alemão?",
            gold_unit_ids=["claim-wiki-topic-friedrich-engels-001", "claim-wiki-work-anti-duhring-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-work-anti-duhring-001",
            bridge_relation_ids=["rel-wiki-work-anti-duhring-001"],
        ),
        # multi_hop - test (5)
        QuestionSpec(
            id="q-mh-014",
            split="test",
            type="multi_hop",
            question="Que jornal socialista francês foi fundado em 1904 por Jean Jaurès?",
            gold_unit_ids=["claim-wiki-topic-jean-jaures-001", "claim-wiki-topic-l-humanite-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-l-humanite-001",
            bridge_relation_ids=["rel-wiki-topic-jean-jaures-002"],
        ),
        QuestionSpec(
            id="q-mh-015",
            split="test",
            type="multi_hop",
            question="Que organização política foi fundada por José Martí em abril de 1892 visando a independência de Cuba e Porto Rico?",
            gold_unit_ids=["claim-wiki-topic-jose-marti-001", "claim-wiki-topic-partido-revolucionario-cubano-1892-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-revolucionario-cubano-1892-001",
            bridge_relation_ids=["rel-wiki-topic-jose-marti-002"],
        ),
        QuestionSpec(
            id="q-mh-016",
            split="test",
            type="multi_hop",
            question="Qual obra de John Rawls publicada em 1971 aborda os princípios de justiça sob o véu da ignorância?",
            gold_unit_ids=["claim-wiki-person-john-rawls-002", "claim-wiki-obra-a-theory-of-justice-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-obra-a-theory-of-justice-001",
            bridge_relation_ids=["rel-wiki-person-john-rawls-001"],
        ),
        QuestionSpec(
            id="q-mh-017",
            split="test",
            type="multi_hop",
            question="Qual corrente russa derivada do POSDR defendia que a sociedade chegaria ao socialismo por desenvolvimento natural?",
            gold_unit_ids=["claim-wiki-topic-partido-operario-social-democrata-russo-001", "claim-wiki-topic-menchevique-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-menchevique-001",
            bridge_relation_ids=["rel-wiki-topic-menchevique-001"],
        ),
        QuestionSpec(
            id="q-mh-018",
            split="test",
            type="multi_hop",
            question="Que filósofo da Antiguidade influenciou o ordoliberalismo e é creditado pelo primeiro estudo sistemático da lógica?",
            gold_unit_ids=["claim-wiki-topic-aristoteles-001", "claim-wiki-topic-ordoliberalismo-002"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-aristoteles-001",
            bridge_relation_ids=["rel-wiki-topic-ordoliberalismo-002"],
        ),
        # =====================================================================
        # COMPARATIVA (14: 10 dev, 4 test)
        # =====================================================================
        QuestionSpec(
            id="q-cmp-001",
            split="dev",
            type="comparativa",
            question="Qual é a diferença entre a definição de medida de valor de troca em Adam Smith e a distinção feita por Marx entre trabalho contido e trabalho comandado?",
            gold_unit_ids=["claim-work-wealth-of-nations", "claim-marx-critica-smith"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-marx-critica-smith",
        ),
        QuestionSpec(
            id="q-cmp-002",
            split="dev",
            type="comparativa",
            question="Como a social-democracia se distingue do marxismo ortodoxo quanto ao papel da ação política e do determinismo econômico?",
            gold_unit_ids=["claim-wiki-topic-social-democracia-001", "claim-wiki-topic-karl-kautsky-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-social-democracia-001",
        ),
        QuestionSpec(
            id="q-cmp-003",
            split="dev",
            type="comparativa",
            question="Como o papel do Estado no liberalismo clássico difere da concepção regulatória defendida pelo ordoliberalismo?",
            gold_unit_ids=["claim-wiki-topic-liberalismo-classico-003", "claim-wiki-topic-ordoliberalismo-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-ordoliberalismo-002",
        ),
        QuestionSpec(
            id="q-cmp-004",
            split="dev",
            type="comparativa",
            question="Em que o reformismo de Eduard Bernstein divergiu da estratégia revolucionária defendida pelo trotskismo?",
            gold_unit_ids=["claim-wiki-topic-eduard-bernstein-001", "claim-wiki-topic-trotskismo-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-eduard-bernstein-001",
        ),
        QuestionSpec(
            id="q-cmp-005",
            split="dev",
            type="comparativa",
            question="Como a posição de Bakunin sobre a ditadura do proletariado contrastava com a dos seguidores de Karl Marx?",
            gold_unit_ids=["claim-wiki-topic-mikhail-bakunin-001", "claim-wiki-topic-karl-marx-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-mikhail-bakunin-001",
        ),
        QuestionSpec(
            id="q-cmp-006",
            split="dev",
            type="comparativa",
            question="Qual a diferença entre a defesa do anarcocapitalismo por Rothbard quanto à propriedade privada e a visão de Proudhon sobre bens de capital?",
            gold_unit_ids=["claim-wiki-topic-pierre-joseph-proudhon-001", "claim-wiki-topic-anarcocapitalismo-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-pierre-joseph-proudhon-001",
        ),
        QuestionSpec(
            id="q-cmp-007",
            split="dev",
            type="comparativa",
            question="Em que diferem as datas de fundação e perfis estatutários iniciais do PT e do PDT no Brasil pós-1979?",
            gold_unit_ids=["claim-wiki-topic-partido-dos-trabalhadores-001", "claim-wiki-topic-partido-democratico-trabalhista-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-partido-democratico-trabalhista-001",
        ),
        QuestionSpec(
            id="q-cmp-008",
            split="dev",
            type="comparativa",
            question="Como o acervo caracteriza o regime da Ditadura Militar instaurada em 1964 em contraste com o caráter dirigente da Constituição de 1988?",
            gold_unit_ids=["claim-wiki-topic-ditadura-militar-brasileira-001", "claim-wiki-topic-constituicao-brasileira-de-1988-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-ditadura-militar-brasileira-001",
        ),
        QuestionSpec(
            id="q-cmp-009",
            split="dev",
            type="comparativa",
            question="Em que divergem a concepção de soberania popular direta de Rousseau e o governo baseado no consentimento com direito de revolta de Locke?",
            gold_unit_ids=["claim-wiki-topic-jean-jacques-rousseau-001", "claim-wiki-topic-john-locke-002"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-john-locke-002",
        ),
        QuestionSpec(
            id="q-cmp-010",
            split="dev",
            type="comparativa",
            question="Como o socialismo liberal compatibiliza livre mercado e monopólios em comparação com o receituário de privatização e austeridade do neoliberalismo?",
            gold_unit_ids=["claim-wiki-ideology-liberal-socialism-001", "claim-wiki-topic-neoliberalismo-003"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-neoliberalismo-003",
        ),
        # comparativa - test (4)
        QuestionSpec(
            id="q-cmp-011",
            split="test",
            type="comparativa",
            question="Como o uso dos termos socialismo e comunismo passou a ser distinguido após a Revolução Russa em contraste com a definição do Manifesto de 1848?",
            gold_unit_ids=["claim-wiki-topic-comunismo-001", "claim-wiki-topic-socialismo-002"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-socialismo-002",
        ),
        QuestionSpec(
            id="q-cmp-012",
            split="test",
            type="comparativa",
            question="Como o leninismo é diferenciado pelo acervo da formalização posterior do marxismo-leninismo sob Stálin?",
            gold_unit_ids=["claim-wiki-topic-leninismo-001", "claim-wiki-topic-marxismo-leninismo-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-marxismo-leninismo-001",
        ),
        QuestionSpec(
            id="q-cmp-013",
            split="test",
            type="comparativa",
            question="Em que diferem a visão utilitarista ligada a John Stuart Mill e o pluralismo de valores defendido por Isaiah Berlin?",
            gold_unit_ids=["claim-wiki-topic-john-stuart-mill-001", "claim-wiki-topic-isaiah-berlin-001"],
            must_refuse=False,
            expected_epistemic="attributed-thesis",
            origin="gerada-de:claim-wiki-topic-isaiah-berlin-001",
        ),
        QuestionSpec(
            id="q-cmp-014",
            split="test",
            type="comparativa",
            question="Como os regimes do Estado Novo em 1937 sob Getúlio Vargas e a Revolução Francesa de 1789 são datados nos eventos centrais do acervo?",
            gold_unit_ids=["claim-wiki-topic-getulio-vargas-002", "claim-wiki-topic-revolucao-francesa-001"],
            must_refuse=False,
            expected_epistemic="documented-fact",
            origin="gerada-de:claim-wiki-topic-getulio-vargas-002",
        ),
        # =====================================================================
        # CONTESTADA (16: 11 dev, 5 test)
        # =====================================================================
        QuestionSpec(
            id="q-cnt-001",
            split="dev",
            type="contestada",
            question="A influência imediata de A Riqueza das Nações nas decisões de governo é consenso historiográfico?",
            gold_unit_ids=["claim-wiki-topic-adam-smith-011"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-adam-smith-011",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-cnt-002",
            split="dev",
            type="contestada",
            question="Existe consenso entre historiadores econômicos de que o padrão de vida da maioria cresceu durante a Revolução Industrial?",
            gold_unit_ids=["claim-wiki-topic-revolucao-industrial-002"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-revolucao-industrial-002",
            reused_from_gold_set=True,
        ),
        QuestionSpec(
            id="q-cnt-003",
            split="dev",
            type="contestada",
            question="Há consenso historiográfico sobre se os Dois Tratados de John Locke foram escritos para defender a Revolução Gloriosa?",
            gold_unit_ids=["claim-wiki-topic-john-locke-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-john-locke-003",
        ),
        QuestionSpec(
            id="q-cnt-004",
            split="dev",
            type="contestada",
            question="O anarcocapitalismo é unanimemente reconhecido pela tradição anarquista como parte do anarquismo?",
            gold_unit_ids=["claim-wiki-topic-anarcocapitalismo-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-anarcocapitalismo-003",
        ),
        QuestionSpec(
            id="q-cnt-005",
            split="dev",
            type="contestada",
            question="Como o acervo registra a controvérsia em torno da passagem do leninismo para o stalinismo?",
            gold_unit_ids=["claim-wiki-topic-leninismo-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-leninismo-003",
        ),
        QuestionSpec(
            id="q-cnt-006",
            split="dev",
            type="contestada",
            question="A fidelidade de partidos e revolucionários à obra de Karl Marx é consensual ou objeto de disputa?",
            gold_unit_ids=["claim-wiki-topic-marxismo-004"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-marxismo-004",
        ),
        QuestionSpec(
            id="q-cnt-007",
            split="dev",
            type="contestada",
            question="Qual controvérsia o acervo aponta sobre os efeitos da defesa da revolução violenta em Mikhail Bakunin?",
            gold_unit_ids=["claim-wiki-topic-mikhail-bakunin-002"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-mikhail-bakunin-002",
        ),
        QuestionSpec(
            id="q-cnt-008",
            split="dev",
            type="contestada",
            question="O termo 'populismo' aplicado a Getúlio Vargas na Era Vargas possui consenso entre os estudiosos?",
            gold_unit_ids=["claim-wiki-topic-era-vargas-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-era-vargas-003",
        ),
        QuestionSpec(
            id="q-cnt-009",
            split="dev",
            type="contestada",
            question="Que críticas doutrinárias são registradas quanto à extensão e prolixidade da Constituição Brasileira de 1988?",
            gold_unit_ids=["claim-wiki-topic-constituicao-brasileira-de-1988-002"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-constituicao-brasileira-de-1988-002",
        ),
        QuestionSpec(
            id="q-cnt-010",
            split="dev",
            type="contestada",
            question="Qual tensão sobre o Estado de bem-estar social é formulada por Hayek e por críticos do modelo nórdico?",
            gold_unit_ids=["claim-wiki-topic-estado-de-bem-estar-social-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-estado-de-bem-estar-social-003",
        ),
        QuestionSpec(
            id="q-cnt-011",
            split="dev",
            type="contestada",
            question="Como o texto contrapõe a justificativa oficial da CIA para a Operação Condor e os questionamentos registrados?",
            gold_unit_ids=["claim-wiki-topic-operacao-condor-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-operacao-condor-003",
        ),
        # contestada - test (5)
        QuestionSpec(
            id="q-cnt-012",
            split="test",
            type="contestada",
            question="Há unanimidade sobre o significado e alcance cronológico da expressão 'liberalismo clássico'?",
            gold_unit_ids=["claim-wiki-topic-liberalismo-classico-005"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-liberalismo-classico-005",
        ),
        QuestionSpec(
            id="q-cnt-013",
            split="test",
            type="contestada",
            question="A avaliação sobre os efeitos da desigualdade ligados ao neoliberalismo ou ao texto do FMI de 2016 aparece como tema consensual?",
            gold_unit_ids=["claim-wiki-topic-neoliberalismo-005"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-neoliberalismo-005",
        ),
        QuestionSpec(
            id="q-cnt-014",
            split="test",
            type="contestada",
            question="Como historiadores e críticos divergem sobre o papel de Lenin e Trótski na execução da Revolução de Outubro?",
            gold_unit_ids=["claim-wiki-topic-revolucao-russa-de-1917-001"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-revolucao-russa-de-1917-001",
        ),
        QuestionSpec(
            id="q-cnt-015",
            split="test",
            type="contestada",
            question="Os socialistas concordam sobre se o governo existente é o veículo adequado para promover a transformação social?",
            gold_unit_ids=["claim-wiki-topic-socialismo-001"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-socialismo-001",
        ),
        QuestionSpec(
            id="q-cnt-016",
            split="test",
            type="contestada",
            question="O revisionismo de Eduard Bernstein recebe avaliação uniforme na história do pensamento socialista?",
            gold_unit_ids=["claim-wiki-topic-eduard-bernstein-003"],
            must_refuse=False,
            expected_epistemic="contested-claim",
            origin="gerada-de:claim-wiki-topic-eduard-bernstein-003",
        ),
        # =====================================================================
        # SO_LINK_DE_DESCOBERTA (14: 10 dev, 4 test)
        # Pares ligados EXCLUSIVAMENTE por encyclopedic-link sem relação editorial nem menção cruzada
        # =====================================================================
        QuestionSpec(
            id="q-disc-001",
            split="dev",
            type="so_link_de_descoberta",
            question="O acervo documenta alguma relação de influência direta entre Immanuel Kant e Adam Smith além de um link de navegação?",
            gold_unit_ids=["claim-wiki-person-immanuel-kant-001", "claim-person-adam-smith"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-person-immanuel-kant-person-adam-smith",
            discovery_relation_id="liberalism-discovery-person-immanuel-kant-person-adam-smith",
            entity_ids=["person-immanuel-kant", "person-adam-smith"],
        ),
        QuestionSpec(
            id="q-disc-002",
            split="dev",
            type="so_link_de_descoberta",
            question="Há alguma relação historiográfica editorial documentando influência direta de John Rawls sobre a história constitucional do Brasil?",
            gold_unit_ids=["claim-wiki-person-john-rawls-001", "claim-country-brazil"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-person-john-rawls-country-brazil",
            discovery_relation_id="liberalism-discovery-person-john-rawls-country-brazil",
            entity_ids=["person-john-rawls", "country-brazil"],
        ),
        QuestionSpec(
            id="q-disc-003",
            split="dev",
            type="so_link_de_descoberta",
            question="O acervo registra uma relação editorial de filiação ou influência entre Isaiah Berlin e o Comunismo além da conexão de navegação?",
            gold_unit_ids=["claim-wiki-topic-isaiah-berlin-001", "claim-wiki-topic-comunismo-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-person-isaiah-berlin-ideology-communism",
            discovery_relation_id="liberalism-discovery-person-isaiah-berlin-ideology-communism",
            entity_ids=["person-isaiah-berlin", "ideology-communism"],
        ),
        QuestionSpec(
            id="q-disc-004",
            split="dev",
            type="so_link_de_descoberta",
            question="Existe evidência textual no acervo de que Mao Tsé-Tung foi influenciado diretamente por Adam Smith?",
            gold_unit_ids=["claim-wiki-topic-mao-tse-tung-001", "claim-person-adam-smith"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:marxism-discovery-person-mao-zedong-person-adam-smith",
            discovery_relation_id="marxism-discovery-person-mao-zedong-person-adam-smith",
            entity_ids=["person-mao-zedong", "person-adam-smith"],
        ),
        QuestionSpec(
            id="q-disc-005",
            split="dev",
            type="so_link_de_descoberta",
            question="Os documentos do acervo sustentam afirmação de influência direta entre Karl Kautsky e Antonio Gramsci?",
            gold_unit_ids=["claim-wiki-topic-karl-kautsky-001", "claim-wiki-topic-antonio-gramsci-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:marxism-discovery-person-karl-kautsky-person-antonio-gramsci",
            discovery_relation_id="marxism-discovery-person-karl-kautsky-person-antonio-gramsci",
            entity_ids=["person-karl-kautsky", "person-antonio-gramsci"],
        ),
        QuestionSpec(
            id="q-disc-006",
            split="dev",
            type="so_link_de_descoberta",
            question="Há alguma relação editorial documentando influência direta ou debate entre Eduard Bernstein e Friedrich Engels no acervo?",
            gold_unit_ids=["claim-wiki-topic-eduard-bernstein-001", "claim-wiki-topic-friedrich-engels-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:marxism-discovery-person-eduard-bernstein-person-friedrich-engels",
            discovery_relation_id="marxism-discovery-person-eduard-bernstein-person-friedrich-engels",
            entity_ids=["person-eduard-bernstein", "person-friedrich-engels"],
        ),
        QuestionSpec(
            id="q-disc-007",
            split="dev",
            type="so_link_de_descoberta",
            question="O acervo documenta influência histórica direta de Montesquieu sobre a criação do Liberalismo verde?",
            gold_unit_ids=["claim-wiki-ideology-green-liberalism-005", "claim-wiki-topic-montesquieu-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-ideology-green-liberalism-person-montesquieu",
            discovery_relation_id="liberalism-discovery-ideology-green-liberalism-person-montesquieu",
            entity_ids=["ideology-green-liberalism", "person-montesquieu"],
        ),
        QuestionSpec(
            id="q-disc-008",
            split="dev",
            type="so_link_de_descoberta",
            question="Existe evidência documentada no acervo de relação causal ou colaboração entre Anton Pannekoek e Antonio Gramsci?",
            gold_unit_ids=["claim-wiki-person-anton-pannekoek-001", "claim-wiki-topic-antonio-gramsci-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:marxism-discovery-person-anton-pannekoek-person-antonio-gramsci",
            discovery_relation_id="marxism-discovery-person-anton-pannekoek-person-antonio-gramsci",
            entity_ids=["person-anton-pannekoek", "person-antonio-gramsci"],
        ),
        QuestionSpec(
            id="q-disc-009",
            split="dev",
            type="so_link_de_descoberta",
            question="O acervo apresenta afirmações históricas relacionando diretamente o Ordoliberalismo à filosofia de Immanuel Kant?",
            gold_unit_ids=["claim-wiki-topic-ordoliberalismo-001", "claim-wiki-person-immanuel-kant-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-ideology-ordoliberalism-person-immanuel-kant",
            discovery_relation_id="liberalism-discovery-ideology-ordoliberalism-person-immanuel-kant",
            entity_ids=["ideology-ordoliberalism", "person-immanuel-kant"],
        ),
        QuestionSpec(
            id="q-disc-010",
            split="dev",
            type="so_link_de_descoberta",
            question="Há relação historiográfica documentada no acervo afirmando atuação direta de Antonio Gramsci na Revolução Russa de 1917?",
            gold_unit_ids=["claim-wiki-topic-revolucao-russa-de-1917-001", "claim-wiki-topic-antonio-gramsci-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:marxism-discovery-event-russian-revolution-person-antonio-gramsci",
            discovery_relation_id="marxism-discovery-event-russian-revolution-person-antonio-gramsci",
            entity_ids=["event-russian-revolution", "person-antonio-gramsci"],
        ),
        # so_link_de_descoberta - test (4)
        QuestionSpec(
            id="q-disc-011",
            split="test",
            type="so_link_de_descoberta",
            question="O acervo documenta alguma relação editorial de influência entre Josef Stalin e Antonio Gramsci além do link de descoberta?",
            gold_unit_ids=["claim-wiki-topic-josef-stalin-001", "claim-wiki-topic-antonio-gramsci-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:marxism-discovery-person-joseph-stalin-person-antonio-gramsci",
            discovery_relation_id="marxism-discovery-person-joseph-stalin-person-antonio-gramsci",
            entity_ids=["person-joseph-stalin", "person-antonio-gramsci"],
        ),
        QuestionSpec(
            id="q-disc-012",
            split="test",
            type="so_link_de_descoberta",
            question="Há alguma relação historiográfica editorial no acervo ligando diretamente o Liberalismo conservador a Adam Smith?",
            gold_unit_ids=["claim-wiki-ideology-conservative-liberalism-001", "claim-person-adam-smith"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-ideology-conservative-liberalism-person-adam-smith",
            discovery_relation_id="liberalism-discovery-ideology-conservative-liberalism-person-adam-smith",
            entity_ids=["ideology-conservative-liberalism", "person-adam-smith"],
        ),
        QuestionSpec(
            id="q-disc-013",
            split="test",
            type="so_link_de_descoberta",
            question="O acervo registra influência editorial direta de John Stuart Mill nos escritos de Isaiah Berlin?",
            gold_unit_ids=["claim-wiki-topic-isaiah-berlin-001", "claim-wiki-topic-john-stuart-mill-001"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-person-isaiah-berlin-person-john-stuart-mill",
            discovery_relation_id="liberalism-discovery-person-isaiah-berlin-person-john-stuart-mill",
            entity_ids=["person-isaiah-berlin", "person-john-stuart-mill"],
        ),
        QuestionSpec(
            id="q-disc-014",
            split="test",
            type="so_link_de_descoberta",
            question="Os documentos do acervo vinculam editorialmente o Liberalismo social diretamente às instituições do Brasil?",
            gold_unit_ids=["claim-wiki-topic-liberalismo-social-001", "claim-country-brazil"],
            must_refuse=True,
            expected_epistemic=None,
            origin="gerada-de:liberalism-discovery-ideology-social-liberalism-country-brazil",
            discovery_relation_id="liberalism-discovery-ideology-social-liberalism-country-brazil",
            entity_ids=["ideology-social-liberalism", "country-brazil"],
        ),
        # =====================================================================
        # SEM_RESPOSTA (14: 9 dev, 5 test)
        # Palavras-chave OOV com 0 ocorrências em títulos, resumos, parágrafos e afirmações
        # =====================================================================
        QuestionSpec(
            id="q-oov-001",
            split="dev",
            type="sem_resposta",
            question="Quais direitos sociais do artigo 123 foram inaugurados pela Constituição Mexicana de 1917 em Querétaro segundo o acervo?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["queretaro", "constituicao mexicana"],
        ),
        QuestionSpec(
            id="q-oov-002",
            split="dev",
            type="sem_resposta",
            question="Como o acervo analisa o conceito de equilíbrio de Nash formulado por John Nash na teoria dos jogos?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["john nash", "equilibrio de nash"],
        ),
        QuestionSpec(
            id="q-oov-003",
            split="dev",
            type="sem_resposta",
            question="O que propunha a Doutrina Drago formulada pelo chanceler Luis María Drago em 1902 sobre cobrança armada de dívidas?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["doutrina drago", "luis maria drago"],
        ),
        QuestionSpec(
            id="q-oov-004",
            split="dev",
            type="sem_resposta",
            question="Quais dez recomendações econômicas compõem o Consenso de Washington proposto por John Williamson em 1989?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["consenso de washington", "john williamson"],
        ),
        QuestionSpec(
            id="q-oov-005",
            split="dev",
            type="sem_resposta",
            question="Como a Carta del Lavoro italiana inspirou a estrutura sindical corporativista de outros países segundo o acervo?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["carta del lavoro"],
        ),
        QuestionSpec(
            id="q-oov-006",
            split="dev",
            type="sem_resposta",
            question="Como o Zollverein unificou tarifas aduaneiras entre Estados alemães no século XIX segundo o acervo?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["zollverein"],
        ),
        QuestionSpec(
            id="q-oov-007",
            split="dev",
            type="sem_resposta",
            question="Quais argumentos Stephanie Kelton apresenta na Teoria Monetária Moderna sobre déficits fiscais?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["teoria monetaria moderna", "stephanie kelton"],
        ),
        QuestionSpec(
            id="q-oov-008",
            split="dev",
            type="sem_resposta",
            question="Por que o Tratado de Methuen de panos e vinhos de 1703 é citado na história econômica luso-britânica?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["methuen", "panos e vinhos"],
        ),
        QuestionSpec(
            id="q-oov-009",
            split="dev",
            type="sem_resposta",
            question="O que determinava a Magna Carta assinada por João Sem Terra na Inglaterra em 1215?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["joao sem terra"],
        ),
        # sem_resposta - test (5)
        QuestionSpec(
            id="q-oov-010",
            split="test",
            type="sem_resposta",
            question="Como surgiu a Lei das Doze Tábuas a partir dos conflitos entre patrícios e plebeus na Roma Antiga?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["lei das doze tabuas", "doze tabuas"],
        ),
        QuestionSpec(
            id="q-oov-011",
            split="test",
            type="sem_resposta",
            question="Quais critérios de produtividade fundiária definiu o Estatuto da Terra promulgado no Brasil em 1964?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["estatuto da terra"],
        ),
        QuestionSpec(
            id="q-oov-012",
            split="test",
            type="sem_resposta",
            question="Por que o Plano Cruzado conduzido por Dilson Funaro em 1986 adotou o congelamento geral de preços?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["plano cruzado", "dilson funaro"],
        ),
        QuestionSpec(
            id="q-oov-013",
            split="test",
            type="sem_resposta",
            question="Como Arthur Pigou formulou a teoria do imposto pigouviano para internalizar externalidades econômicas?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["arthur pigou", "imposto pigouviano"],
        ),
        QuestionSpec(
            id="q-oov-014",
            split="test",
            type="sem_resposta",
            question="Qual foi a contribuição monetária de Francisco de Vitoria e da Escola de Salamanca no século XVI?",
            gold_unit_ids=[],
            must_refuse=True,
            expected_epistemic=None,
            origin="manual",
            oov_keywords=["escola de salamanca", "francisco de vitoria"],
        ),
    ]
    return specs


def _corpus_full_text_normalized(corpus: CorpusArtifacts) -> str:
    parts: list[str] = []
    for ent in corpus.entities.values():
        parts.append(ent.get("title") or "")
        parts.append(ent.get("summary") or "")
        parts.extend(ent.get("paragraphs") or [])
    for claim in corpus.claims.values():
        parts.append(claim.get("text") or "")
    return normalize_text(" ".join(parts))


def _entity_text_normalized_map(corpus: CorpusArtifacts) -> dict[str, str]:
    by_ent: dict[str, list[str]] = {}
    for eid, ent in corpus.entities.items():
        by_ent[eid] = [ent.get("summary") or ""] + list(ent.get("paragraphs") or [])
    for claim in corpus.claims.values():
        eid = claim.get("entityId")
        if eid in by_ent:
            by_ent[eid].append(claim.get("text") or "")
    return {eid: normalize_text(" ".join(chunks)) for eid, chunks in by_ent.items()}


# Revisao enviada explicitamente pelo mantenedor (15/11/2026): sugestao_ok -> human_ok + nota_revisao
MAINTAINER_REVIEW_2026_11: dict[str, tuple[bool | None, str]] = {
    'q-fac-001': (True, 'Kirkcaldy; batismo 16/06/1723 (5/06 no calendário juliano). Conferir qual data o claim usa.'),
    'q-fac-002': (True, 'Londres, 5/08/1895.'),
    'q-fac-003': (True, 'Trabalho comandado. attributed-thesis correto.'),
    'q-fac-004': (True, 'Londres, 1848.'),
    'q-fac-005': (None, 'Provável Marcel Wissenburg (Green Liberalism, 1998), mas depende do texto exato do claim.'),
    'q-fac-006': (False, 'Resposta (Bismarck) ok, mas é fato documentado: expected_epistemic deveria ser documented-fact.'),
    'q-fac-007': (None, 'Ambígua: há dois períodos de proscrição (1948–1958, Ley Maldita; 1973–1990). Confirmar se o claim cobre um só ou especificar na pergunta.'),
    'q-fac-008': (True, 'Poder constituinte pertence à nação. attributed-thesis ok.'),
    'q-fac-009': (None, "Formulação vai de 1904 a 1906 (Resultados e Perspectivas, 1906); 'em que ano' só funciona se o claim fixar um ano."),
    'q-fac-010': (True, '10/02/1980, Colégio Sion, São Paulo.'),
    'q-fac-011': (True, 'MP 434/1994 (URV); estabilização/combate à inflação.'),
    'q-fac-012': (True, "Pergunta vaga ('identificado'), mas respondível: República Federativa / Estado Democrático de Direito."),
    'q-fac-013': (None, 'Data contestável: Encontro/Carta de Lisboa (jun/1979) vs. fundação formal após perder a sigla PTB (1980). Conferir o claim.'),
    'q-fac-014': (True, 'Mother Earth (era revista mensal, não jornal; detalhe menor).'),
    'q-fac-015': (True, 'Bismarck, década de 1880.'),
    'q-fac-016': (True, 'São Borja; 10/11/1937.'),
    'q-fac-017': (True, 'Hegemonia cultural.'),
    'q-fac-018': (True, 'Santiago do Chile, nov/1975.'),
    'q-fac-019': (True, 'ADAV (lassalleanos) e SDAP (Eisenach), em Gotha.'),
    'q-fac-020': (True, 'Hero Moeller; revista ORDO.'),
    'q-fac-021': (None, "Não há atribuição consensual de 'primeiro uso'; depende inteiramente do claim."),
    'q-fac-022': (True, 'O que é a propriedade? (1840).'),
    'q-fac-023': (True, 'Demanda efetiva/agregada. attributed-thesis ok.'),
    'q-fac-024': (True, '1/02/1987.'),
    'q-mh-001': (True, 'A Riqueza das Nações.'),
    'q-mh-002': (True, 'O Capital, Livro I.'),
    'q-mh-003': (True, 'Bernstein. Conferir se o claim de socialismo liberal cita Bernstein explicitamente.'),
    'q-mh-004': (True, 'Locke. Conferir se rousseau-001 sustenta a ligação (hop 2).'),
    'q-mh-005': (True, 'O que é o Terceiro Estado? (redigido em 1788, publicado em jan/1789).'),
    'q-mh-006': (False, 'Erro factual: a Romênia de Brătianu lutou na Guerra Russo-Turca de 1877–1878 (Independência), não na Guerra Sérvio-Otomana. Gold e pergunta inválidos.'),
    'q-mh-007': (True, 'Revoluções de 1848 (Stein participou do movimento de Schleswig-Holstein e perdeu a cátedra em Kiel).'),
    'q-mh-008': (True, 'Die Neue Zeit (1883).'),
    'q-mh-009': (True, 'Quarta Internacional (Périgny, 1938).'),
    'q-mh-010': (False, "Khrushchov ok, mas 'sucedeu Stalin' é impreciso (Malenkov chefiou o governo primeiro) e o epistemic deveria ser documented-fact."),
    'q-mh-011': (True, 'ADAV (1863).'),
    'q-mh-012': (True, "Partido Conservador (Manifesto de Tamworth). 'Inglês' → 'britânico'."),
    'q-mh-013': (True, 'Anti-Dühring, em série no Vorwärts (1877–1878).'),
    'q-mh-014': (True, "L'Humanité."),
    'q-mh-015': (True, 'Partido Revolucionário Cubano (10/04/1892).'),
    'q-mh-016': (True, 'Uma Teoria da Justiça.'),
    'q-mh-017': (True, 'Mencheviques.'),
    'q-mh-018': (False, 'Premissa duvidosa (Aristóteles como influência do ordoliberalismo, como fato documentado) e conflita com q-disc-009. Verificar ordoliberalismo-002; se o claim não disser isso, descartar.'),
    'q-cmp-001': (True, 'Ok; reaproveita os claims de q-fac-003 e q-mh-001.'),
    'q-cmp-002': (None, 'karl-kautsky-001 também é gold de q-mh-008 (fundação da Neue Zeit); confirmar se o claim trata do marxismo ortodoxo/determinismo.'),
    'q-cmp-003': (True, 'Ok.'),
    'q-cmp-004': (True, 'Comparação um tanto artificial (contextos diferentes), mas respondível.'),
    'q-cmp-005': (True, 'Ok.'),
    'q-cmp-006': (True, 'Ok.'),
    'q-cmp-007': (True, "'Perfis estatutários' é vago; aceitável."),
    'q-cmp-008': (True, 'Ok.'),
    'q-cmp-009': (True, 'Ok.'),
    'q-cmp-010': (False, "Premissa enviesada: o socialismo liberal não 'compatibiliza' monopólios; costuma defender a propriedade social deles. Reformular."),
    'q-cmp-011': (True, 'Ok.'),
    'q-cmp-012': (True, 'Ok.'),
    'q-cmp-013': (True, 'Ok. Observe que contradiz o espírito de q-disc-013.'),
    'q-cmp-014': (False, "Não é comparação substantiva: só justapõe duas datas, e a Revolução Francesa não é um 'regime'. Descartar."),
    'q-cnt-001': (True, 'Ok.'),
    'q-cnt-002': (True, 'Ok (debate otimistas × pessimistas).'),
    'q-cnt-003': (True, 'Ok (Laslett: redigidos antes de 1688).'),
    'q-cnt-004': (True, 'Ok.'),
    'q-cnt-005': (True, 'Ok.'),
    'q-cnt-006': (True, 'Ok.'),
    'q-cnt-007': (True, 'Ok.'),
    'q-cnt-008': (True, 'Ok.'),
    'q-cnt-009': (True, 'Ok.'),
    'q-cnt-010': (True, 'Ok.'),
    'q-cnt-011': (True, "Ok; conferir se o claim fala mesmo de 'justificativa oficial da CIA'."),
    'q-cnt-012': (True, 'Ok.'),
    'q-cnt-013': (False, "Redação confusa ('ligados ao neoliberalismo ou ao texto do FMI'). Reformular, por exemplo: 'O artigo do FMI de 2016 sobre neoliberalismo e desigualdade é tratado como consenso?'"),
    'q-cnt-014': (None, 'revolucao-russa-001 parece claim genérico de abertura; confirmar se registra divergência sobre Lenin/Trótski.'),
    'q-cnt-015': (True, 'Ok.'),
    'q-cnt-016': (True, 'Ok.'),
    'q-disc-001': (None, 'Kant leu e citou Smith (Metafísica dos Costumes); a recusa só é correta se o acervo não registrar isso. Conferir.'),
    'q-disc-002': (True, 'Recusa correta.'),
    'q-disc-003': (True, 'Recusa correta (Berlin foi crítico, não filiado).'),
    'q-disc-004': (True, 'Recusa correta.'),
    'q-disc-005': (None, 'Gramsci polemizou com o marxismo da II Internacional; verificar se algum claim liga os dois.'),
    'q-disc-006': (False, 'Relação histórica forte e central (Bernstein foi colaborador próximo e executor literário de Engels). Recusar aqui ensina o modelo a negar fato real; descartar ou trocar o par.'),
    'q-disc-007': (True, 'Recusa correta.'),
    'q-disc-008': (True, 'Recusa correta.'),
    'q-disc-009': (True, 'Recusa aceitável; ver o conflito com q-mh-018.'),
    'q-disc-010': (True, 'Recusa correta (Gramsci estava na Itália em 1917).'),
    'q-disc-011': (True, 'Recusa correta.'),
    'q-disc-012': (True, 'Recusa aceitável.'),
    'q-disc-013': (False, "Influência real e documentada (Berlin, 'John Stuart Mill and the Ends of Life', 1959). Descartar ou trocar o par."),
    'q-disc-014': (True, 'Recusa correta.'),
    'q-oov-001': (True, 'Fora do acervo (provável).'),
    'q-oov-002': (True, 'Fora do acervo.'),
    'q-oov-003': (True, 'Fora do acervo.'),
    'q-oov-004': (None, 'Risco alto: a página de neoliberalismo provavelmente cita o Consenso de Washington (cf. neoliberalismo-003). Buscar no acervo.'),
    'q-oov-005': (None, 'Risco alto: a Era Vargas/CLT costuma citar a Carta del Lavoro. Buscar no acervo.'),
    'q-oov-006': (None, 'Risco médio: o Zollverein pode aparecer em páginas sobre a Alemanha/liberalismo. Buscar.'),
    'q-oov-007': (True, 'Fora do acervo (provável).'),
    'q-oov-008': (None, "Risco médio: Smith discute o Tratado de Methuen n'A Riqueza das Nações. Buscar."),
    'q-oov-009': (None, 'Risco médio: o liberalismo clássico costuma citar a Magna Carta. Buscar.'),
    'q-oov-010': (True, 'Fora do acervo (provável).'),
    'q-oov-011': (None, 'Risco médio: as páginas da Ditadura Militar podem citar o Estatuto da Terra. Buscar.'),
    'q-oov-012': (None, 'Risco alto: a página do Plano Real costuma narrar os planos anteriores (Cruzado). Buscar.'),
    'q-oov-013': (True, 'Fora do acervo (provável).'),
    'q-oov-014': (None, 'Risco médio: anarcocapitalismo/Escola Austríaca às vezes citam Salamanca. Buscar.'),
}


def validate_specs(specs: list[QuestionSpec], corpus: CorpusArtifacts) -> dict[str, Any]:
    """Valida invariantes estritas de cada pergunta contra o bundle pinado."""
    if len(specs) != 100:
        raise ValueError(f"Esperadas 100 perguntas, obtido {len(specs)}")

    seen_ids: set[str] = set()
    counts_by_type: dict[str, dict[str, int]] = {}
    split_counts = {"dev": 0, "test": 0}
    reused_gold_set = 0

    full_text = _corpus_full_text_normalized(corpus)
    ent_text_map = _entity_text_normalized_map(corpus)

    non_discovery_pairs = {
        tuple(sorted([r.get("fromEntityId"), r.get("toEntityId")]))
        for r in corpus.relations.values()
        if classify_relation_tier(r) != "discovery"
        and r.get("fromEntityId")
        and r.get("toEntityId")
    }

    for q in specs:
        if q.id in seen_ids:
            raise ValueError(f"ID duplicado: {q.id}")
        seen_ids.add(q.id)
        if q.split not in ("dev", "test"):
            raise ValueError(f"Split inválido em {q.id}: {q.split}")
        split_counts[q.split] += 1
        bucket = counts_by_type.setdefault(q.type, {"dev": 0, "test": 0, "total": 0})
        bucket[q.split] += 1
        bucket["total"] += 1
        if q.reused_from_gold_set:
            reused_gold_set += 1

        # Validação de gold_unit_ids
        if q.type == "sem_resposta":
            if q.gold_unit_ids or not q.must_refuse:
                raise ValueError(f"{q.id} sem_resposta precisa gold_unit_ids=[] e must_refuse=True")
            for kw in q.oov_keywords or []:
                kw_norm = normalize_text(kw)
                if kw_norm in full_text:
                    raise ValueError(f"Keyword OOV '{kw}' encontrada no corpus para {q.id}!")
        else:
            if not q.gold_unit_ids:
                raise ValueError(f"{q.id} requer gold_unit_ids não vazios")
            for cid in q.gold_unit_ids:
                if cid not in corpus.claims:
                    raise ValueError(f"Claim gold inexistente em {q.id}: {cid}")
                claim = corpus.claims[cid]
                if not (claim.get("text") or "").strip():
                    raise ValueError(f"Claim vazia em {q.id}: {cid}")

        if q.type == "contestada":
            if q.expected_epistemic != "contested-claim":
                raise ValueError(f"{q.id} contestada deve esperar 'contested-claim'")
            for cid in q.gold_unit_ids:
                cls = corpus.claims[cid].get("classification")
                if cls != "contested-claim":
                    raise ValueError(f"{q.id} aponta para {cid} com classificação '{cls}', não contested-claim")

        if q.type == "multi_hop":
            if not q.bridge_relation_ids:
                raise ValueError(f"{q.id} multi_hop requer bridge_relation_ids")
            for rid in q.bridge_relation_ids:
                rel = corpus.relations.get(rid)
                if rel is None:
                    raise ValueError(f"Relação ponte ausente em {q.id}: {rid}")
                if classify_relation_tier(rel) != "editorial":
                    raise ValueError(f"Relação ponte {rid} em {q.id} não é editorial!")

        if q.type == "so_link_de_descoberta":
            if not q.must_refuse:
                raise ValueError(f"{q.id} so_link_de_descoberta exige must_refuse=True")
            rid = q.discovery_relation_id
            if not rid or rid not in corpus.relations:
                raise ValueError(f"Relação discovery ausente em {q.id}: {rid}")
            rel = corpus.relations[rid]
            if rel.get("type") != "encyclopedic-link" or classify_relation_tier(rel) != "discovery":
                raise ValueError(f"{rid} em {q.id} não é encyclopedic-link")
            e1, e2 = rel["fromEntityId"], rel["toEntityId"]
            pair = tuple(sorted([e1, e2]))
            if pair in non_discovery_pairs:
                raise ValueError(f"Par {pair} em {q.id} possui relação editorial/catálogo oculta!")
            t1, t2 = corpus.entities[e1]["title"], corpus.entities[e2]["title"]
            for tok in _sig_title_tokens(t1):
                if re.search(rf"\b{tok}\b", ent_text_map[e2]):
                    raise ValueError(f"Menção cruzada '{tok}' de {t1} encontrada em {t2} ({q.id})")
            for tok in _sig_title_tokens(t2):
                if re.search(rf"\b{tok}\b", ent_text_map[e1]):
                    raise ValueError(f"Menção cruzada '{tok}' de {t2} encontrada em {t1} ({q.id})")

    for qtype, (exp_dev, exp_test) in EXPECTED_COUNTS.items():
        got = counts_by_type.get(qtype, {})
        if got.get("dev") != exp_dev or got.get("test") != exp_test:
            raise ValueError(f"Contagem divergente para {qtype}: esperado ({exp_dev},{exp_test}), obtido {got}")

    missing_review = [q.id for q in specs if q.id not in MAINTAINER_REVIEW_2026_11]
    if missing_review:
        raise ValueError(f"Perguntas sem registro em MAINTAINER_REVIEW_2026_11: {missing_review}")
    review_values = [MAINTAINER_REVIEW_2026_11[q.id][0] for q in specs]
    return {
        "total": len(specs),
        "splits": split_counts,
        "by_type": counts_by_type,
        "reused_from_gold_set_count": reused_gold_set,
        "human_ok_true_count": sum(1 for v in review_values if v is True),
        "human_ok_false_count": sum(1 for v in review_values if v is False),
        "human_ok_null_count": sum(1 for v in review_values if v is None),
    }


def load_questions(path: Path | None = None) -> list[dict[str, Any]]:
    """Carrega eval/questions.jsonl."""
    qpath = path or (eval_dir() / "questions.jsonl")
    lines = qpath.read_text(encoding="utf-8").splitlines()
    return [json.loads(line) for line in lines if line.strip()]


def build_and_write_dataset(root: Path | None = None) -> dict[str, Any]:
    """Gera questions.jsonl, labels/questions-context.json e labels/review-queue.md."""
    base = root or repo_root()
    loaded = load_pinned_bundle(base)
    corpus = extract_deduplicated_corpus(loaded)
    specs = _build_question_specs()
    stats = validate_specs(specs, corpus)

    # Verifica que gold-set-2026-11 existe e possui itens não marcados
    def _count_items(path: Path) -> int:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, list):
            return len(raw)
        return len(raw.get("items", []))

    gdir = gold_set_dir(base)
    af_count = _count_items(gdir / "afirmacoes.json")
    pa_count = _count_items(gdir / "pares-fonte-afirmacao.json")
    rel_count = _count_items(gdir / "relacoes.json")

    edir = eval_dir(base)
    labels_dir = edir / "labels"
    labels_dir.mkdir(parents=True, exist_ok=True)
    runs_dir = edir / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)

    q_path = edir / "questions.jsonl"
    jsonl_lines: list[str] = []
    context_items: list[dict[str, Any]] = []
    md_lines: list[str] = [
        "# Fila de Revisão Humana — Conjunto de Avaliação ATLAS RAG (Fase 1)",
        "",
        (
            "> **Licença:** derivado do acervo ATLAS (CC BY-SA 4.0). "
            f"**Revisão humana aplicada (mantenedor 2026-11):** `{stats['human_ok_true_count']} true`, "
            f"`{stats['human_ok_false_count']} false`, `{stats['human_ok_null_count']} null`."
        ),
        f"> **Bundle de origem:** release `{loaded.release}` (`{loaded.bundle_sha256[:12]}...`). Total: **{len(specs)} perguntas** (`{stats['splits']['dev']} dev`, `{stats['splits']['test']} test`).",
        f"> **Referência gold-set-2026-11:** {af_count} afirmações, {pa_count} pares fonte-afirmação, {rel_count} relações (reaproveitados {stats['reused_from_gold_set_count']} itens em rascunho).",
        "",
        "| ID | Split | Tipo | Recusa? | Epistêmica esperada | Pergunta | Claims Gold (`id`) | human_ok | Nota de revisão |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]

    for q in specs:
        human_ok, nota_revisao = MAINTAINER_REVIEW_2026_11[q.id]
        row = {
            "id": q.id,
            "split": q.split,
            "type": q.type,
            "question": q.question,
            "gold_unit_ids": q.gold_unit_ids,
            "must_refuse": q.must_refuse,
            "expected_epistemic": q.expected_epistemic,
            "human_ok": human_ok,
            "nota_revisao": nota_revisao,
            "origin": q.origin,
        }
        jsonl_lines.append(json.dumps(row, ensure_ascii=False))

        claims_preview = []
        for cid in q.gold_unit_ids:
            c = corpus.claims[cid]
            eid = c.get("entityId")
            claims_preview.append(
                {
                    "claim_id": cid,
                    "entity_id": eid,
                    "entity_title": corpus.entities.get(eid, {}).get("title"),
                    "classification": c.get("classification"),
                    "text": c.get("text"),
                }
            )
        context_items.append(
            {
                **row,
                "reused_from_gold_set": q.reused_from_gold_set,
                "bridge_relation_ids": q.bridge_relation_ids or [],
                "discovery_relation_id": q.discovery_relation_id,
                "entity_ids": q.entity_ids or [],
                "oov_keywords": q.oov_keywords or [],
                "gold_claims_preview": claims_preview,
            }
        )
        cids_str = ", ".join(f"`{cid}`" for cid in q.gold_unit_ids) if q.gold_unit_ids else "`—`"
        ep = f"`{q.expected_epistemic}`" if q.expected_epistemic else "`—`"
        human_label = "true" if human_ok is True else ("false" if human_ok is False else "null")
        nota_clean = nota_revisao.replace("|", "/")
        md_lines.append(
            f"| `{q.id}` | {q.split} | `{q.type}` | {'sim' if q.must_refuse else 'não'} | {ep} | {q.question} | {cids_str} | `{human_label}` | {nota_clean} |"
        )

    q_path.write_text("\n".join(jsonl_lines) + "\n", encoding="utf-8")

    summary = {
        "release": loaded.release,
        "bundle_sha256": loaded.bundle_sha256,
        "gold_set_2026_11": {"afirmacoes": af_count, "pares_fonte_afirmacao": pa_count, "relacoes": rel_count},
        **stats,
    }
    ctx_path = labels_dir / "questions-context.json"
    ctx_path.write_text(json.dumps({"summary": summary, "items": context_items}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    review_md_path = labels_dir / "review-queue.md"
    review_md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    phase1_run_path = runs_dir / "phase1_evalset.json"
    phase1_run_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return summary


if __name__ == "__main__":
    print(json.dumps(build_and_write_dataset(), indent=2, ensure_ascii=False))
