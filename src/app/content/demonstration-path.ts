import { studyPathSchema } from '../core/study-schema';

export const demonstrationPath = studyPathSchema.parse({
  id: 'metodo-e-evidencia', slug: 'metodo-e-evidencia', title: 'Prática: evidência em contexto',
  objectives: ['Identificar como conferir uma afirmação.'], prerequisites: ['Nenhum.'],
  lessons: [{ id: 'evidencia-em-contexto', title: 'Evidência e contexto', entityId: 'concept-methodology', exercises: [{
    id: 'verificar-afirmacao', prompt: 'Como conferir uma afirmação histórica?',
    options: [{ id: 'source', text: 'Examinar sua evidência e seu contexto' }, { id: 'popularity', text: 'Aceitá-la apenas por ser popular' }],
    correctOptionId: 'source', feedback: { explanation: 'Fontes e contexto permitem conferir a afirmação; popularidade não substitui evidência.', sourceId: 'source-editorial-rules' },
  }] }],
});
