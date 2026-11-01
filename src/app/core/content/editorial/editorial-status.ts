export const editorialStatusLabels: Readonly<Record<string, string>> = {
  draft: 'Rascunho',
  pending: 'Revisão editorial pendente',
  verified: 'Verificada após revisão humana',
  contested: 'Contestada',
  'needs-update': 'Precisa de atualização',
  registered: 'Registro cadastrado',
  exemplar: 'Exemplar de metodologia',
  previsto: 'Formato previsto',
  mixed: 'Estados editoriais variados',
};
export const editorialStatusLabel = (status = '') =>
  editorialStatusLabels[status] ?? 'Situação editorial não informada';
