// A plataforma de Q&A/avaliação de painéis (vcday_panels/questions/evaluations)
// é compartilhada entre o VC Day e o Congresso — não é exclusiva do VC Day apesar
// do nome das tabelas. Só faz sentido consultar depois que o evento acontece
// (perguntas/notas só chegam durante e após o evento). "Fechado" aqui é:
// event_date já passou.
export function isClosedEventWithQaPlatform(edition: { event_date: string | null }): boolean {
  if (!edition.event_date) return false
  return new Date(edition.event_date) < new Date()
}
