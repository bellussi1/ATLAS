export const editorialStatusLabels: Readonly<Record<string, string>> = {
  draft: 'Versão preliminar',
  pending: 'Revisão editorial pendente',
  verified: 'Verificada após revisão registrada',
  contested: 'Contestada',
  'needs-update': 'Precisa de atualização',
  registered: 'Registro cadastrado',
  exemplar: 'Exemplar de metodologia',
  previsto: 'Formato previsto',
  mixed: 'Estados editoriais variados',
};
export const editorialStatusLabel = (status = '') =>
  editorialStatusLabels[status] ?? 'Situação editorial não informada';
