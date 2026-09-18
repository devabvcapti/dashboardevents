// A plataforma de Q&A/avaliação de painéis só existe para o VC Day, e só faz
// sentido consultar depois que o evento acontece (perguntas/notas só chegam
// durante e após o evento). "Fechado" aqui é: event_date já passou.
export function isClosedVcDayEdition(edition: { name: string; event_date: string | null }): boolean {
  if (!edition.event_date) return false
  if (!/vc day/i.test(edition.name)) return false
  return new Date(edition.event_date) < new Date()
}
