import { studyPathSchema } from '@core/content/models/study-schema';

export const study = studyPathSchema.parse({
  id: 'estudo-valor-marx',
  slug: 'estudo-valor-marx',
  title: 'Ler conceitos em contraste',
  objectives: ['Distinguir duas formulações de valor.'],
  prerequisites: ['Ler as duas teses.'],
  lessons: [
    {
      id: 'licao-valor',
      title: 'Valor e trabalho',
      entityId: 'concept-trabalho-socialmente-necessario',
      exercises: [
        {
          id: 'exercicio-valor',
          prompt: 'No trecho de O capital, que tempo é usado na análise da grandeza do valor?',
          options: [
            { id: 'social', text: 'O tempo socialmente necessário' },
            { id: 'individual', text: 'Qualquer tempo individual gasto' },
          ],
          correctOptionId: 'social',
          feedback: {
            explanation:
              'O texto distingue o tempo socialmente necessário do tempo individual de cada produtor.',
            sourceId: 'source-marx-capital',
          },
        },
      ],
    },
  ],
});
