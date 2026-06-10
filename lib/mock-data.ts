import type { Participant, OverviewStats } from './database.types'
import type { TicketMembershipSummary } from './data'

// ─── Visão Geral ─────────────────────────────────────────────────────────────

export const MOCK_STATS: OverviewStats = {
  total: 342,
  membro: 198,
  nao_membro: 144,
  total_revenue: 892500,
  avg_ticket: 2609,
  unique_companies: 180,
  states_represented: 15,
}

// ─── Gráfico: inscrições por dia (maio 2025) ─────────────────────────────────

export const MOCK_REGISTRATIONS_BY_DAY = [
  { date: '01/05', count: 8 },
  { date: '02/05', count: 12 },
  { date: '03/05', count: 11 },
  { date: '04/05', count: 14 },
  { date: '05/05', count: 16 },
  { date: '06/05', count: 9 },
  { date: '07/05', count: 7 },
  { date: '08/05', count: 18 },
  { date: '09/05', count: 22 },
  { date: '10/05', count: 19 },
  { date: '11/05', count: 21 },
  { date: '12/05', count: 16 },
  { date: '13/05', count: 12 },
  { date: '14/05', count: 10 },
  { date: '15/05', count: 25 },
  { date: '16/05', count: 28 },
  { date: '17/05', count: 22 },
  { date: '18/05', count: 19 },
  { date: '19/05', count: 24 },
  { date: '20/05', count: 29 },
]

// ─── Gráfico: por tipo de ingresso ────────────────────────────────────────────

export const MOCK_BY_TICKET_TYPE = [
  { type: 'Membro', count: 198 },
  { type: 'Não Membro', count: 144 },
]

// ─── Gráfico: por segmento (para OverviewCharts — labels já traduzidos) ───────

export const MOCK_BY_COMPANY_TYPE_DISPLAY = [
  { type: 'Gestora (GP)', count: 94 },
  { type: 'Investidor (LP)', count: 72 },
  { type: 'Fundo', count: 58 },
  { type: 'Corporativo', count: 46 },
  { type: 'Governo', count: 31 },
  { type: 'Academia', count: 24 },
  { type: 'Outro', count: 17 },
]

// ─── Gráfico: por segmento (para PublicoCharts — chaves de enum) ──────────────

export const MOCK_BY_COMPANY_TYPE_ENUM = [
  { type: 'GP', count: 94 },
  { type: 'LP', count: 72 },
  { type: 'FUNDO', count: 58 },
  { type: 'CORPORATIVO', count: 46 },
  { type: 'GOVERNO', count: 31 },
  { type: 'ACADEMIA', count: 24 },
  { type: 'OUTRO', count: 17 },
]

// ─── Resumo de ingressos ─────────────────────────────────────────────────────

export const MOCK_TICKET_SUMMARY: TicketMembershipSummary[] = [
  { ticket_membership: 'MEMBRO', count: 198 },
  { ticket_membership: 'NAO_MEMBRO', count: 144 },
]

// ─── Lista de participantes ──────────────────────────────────────────────────

const EDITION_ID = '00000000-0000-0000-0000-000000000001'

// Campos adicionados em Phase 2 — todos nulos no mock (dados reais virão via import)
const PHASE2_NULLS = {
  job_title: null,
  cpf: null,
  phone: null,
  payment_status: null,
  is_company_member: null,
  company_segment_raw: null,
  company_segment_normalized: null,
  ticket_name: null,
  coupon_code: null,
  registered_at: null,
} as const

export const MOCK_PARTICIPANTS: Participant[] = [
  { ...PHASE2_NULLS, id: '1', full_name: 'Carlos Eduardo Mendonça', email: 'c.mendonca@patriainvestimentos.com.br', company: 'Pátria Investimentos', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-02T09:14:00Z' },
  { ...PHASE2_NULLS, id: '2', full_name: 'Ana Paula Ribeiro', email: 'ana.ribeiro@vincipartners.com', company: 'Vinci Partners', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-03T10:30:00Z' },
  { ...PHASE2_NULLS, id: '3', full_name: 'Rodrigo Figueiredo', email: 'rfigueiredo@btgpactual.com', company: 'BTG Pactual Asset Management', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-04T14:22:00Z' },
  { ...PHASE2_NULLS, id: '4', full_name: 'Fernanda Castilho', email: 'fcastilho@kinea.com.br', company: 'Kinea Investimentos', ticket_membership: 'MEMBRO', ticket_value: 1980, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-05T11:05:00Z' },
  { ...PHASE2_NULLS, id: '5', full_name: 'Marcelo Augusto Teixeira', email: 'marcelo.teixeira@generalatlantic.com', company: 'General Atlantic', ticket_membership: 'NAO_MEMBRO', ticket_value: 3800, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-06T08:45:00Z' },
  { ...PHASE2_NULLS, id: '6', full_name: 'Juliana Marques', email: 'jmarques@previ.com.br', company: 'Previ', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-07T16:00:00Z' },
  { ...PHASE2_NULLS, id: '7', full_name: 'Paulo Henrique Alves', email: 'paulo.alves@bndespar.com.br', company: 'BNDESPAR', ticket_membership: 'MEMBRO', ticket_value: 1980, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-08T09:50:00Z' },
  { ...PHASE2_NULLS, id: '8', full_name: 'Beatriz Nunes', email: 'bnunes@advent.com', company: 'Advent International', ticket_membership: 'NAO_MEMBRO', ticket_value: 4200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-09T13:10:00Z' },
  { ...PHASE2_NULLS, id: '9', full_name: 'Gustavo Pirani', email: 'gpirani@softbank.com', company: 'SoftBank Latin America', ticket_membership: 'NAO_MEMBRO', ticket_value: 4200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-10T10:20:00Z' },
  { ...PHASE2_NULLS, id: '10', full_name: 'Luciana Ferraz', email: 'l.ferraz@kaszek.com', company: 'Kaszek Ventures', ticket_membership: 'NAO_MEMBRO', ticket_value: 3800, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-11T15:35:00Z' },
  { ...PHASE2_NULLS, id: '11', full_name: 'Rafael Drummond', email: 'rafael.drummond@monashees.com.br', company: 'Monashees', ticket_membership: 'NAO_MEMBRO', ticket_value: 3800, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-12T11:00:00Z' },
  { ...PHASE2_NULLS, id: '12', full_name: 'Camila Esteves', email: 'cesteves@petros.com.br', company: 'Petros', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-13T09:00:00Z' },
  { ...PHASE2_NULLS, id: '13', full_name: 'Diego Novaes', email: 'd.novaes@funcef.com.br', company: 'Funcef', ticket_membership: 'MEMBRO', ticket_value: 1980, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-14T14:45:00Z' },
  { ...PHASE2_NULLS, id: '14', full_name: 'Isabela Monteiro', email: 'imonteiro@vale.com.br', company: 'Vale', ticket_membership: 'NAO_MEMBRO', ticket_value: 4500, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-15T10:15:00Z' },
  { ...PHASE2_NULLS, id: '15', full_name: 'Thiago Roquette', email: 't.roquette@redpoint.vc', company: 'Redpoint eventures', ticket_membership: 'NAO_MEMBRO', ticket_value: 3800, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-16T08:30:00Z' },
  { ...PHASE2_NULLS, id: '16', full_name: 'Mariana Bittencourt', email: 'mbittencourt@itauasset.com.br', company: 'Itaú Asset Management', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-17T13:20:00Z' },
  { ...PHASE2_NULLS, id: '17', full_name: 'Bruno Lacerda', email: 'blacerda@finep.gov.br', company: 'Finep', ticket_membership: 'MEMBRO', ticket_value: 1980, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-17T16:40:00Z' },
  { ...PHASE2_NULLS, id: '18', full_name: 'Priscila Andrade', email: 'p.andrade@fea.usp.br', company: 'FEA-USP', ticket_membership: 'MEMBRO', ticket_value: 1500, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-18T09:10:00Z' },
  { ...PHASE2_NULLS, id: '19', full_name: 'Eduardo Sá Motta', email: 'eduardo.motta@actis.com', company: 'Actis', ticket_membership: 'NAO_MEMBRO', ticket_value: 4200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-18T11:55:00Z' },
  { ...PHASE2_NULLS, id: '20', full_name: 'Natalia Couto', email: 'ncouto@warburg.com', company: 'Warburg Pincus', ticket_membership: 'NAO_MEMBRO', ticket_value: 4200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-19T10:00:00Z' },
  { ...PHASE2_NULLS, id: '21', full_name: 'Alexandre Borges', email: 'a.borges@embraer.com.br', company: 'Embraer', ticket_membership: 'NAO_MEMBRO', ticket_value: 4500, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-19T14:30:00Z' },
  { ...PHASE2_NULLS, id: '22', full_name: 'Leticia Zanetti', email: 'lzanetti@sebrae.com.br', company: 'Sebrae Nacional', ticket_membership: 'MEMBRO', ticket_value: 1980, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-20T08:20:00Z' },
  { ...PHASE2_NULLS, id: '23', full_name: 'Fábio Ventura', email: 'fabio.ventura@weg.net', company: 'WEG', ticket_membership: 'NAO_MEMBRO', ticket_value: 4500, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-20T12:00:00Z' },
  { ...PHASE2_NULLS, id: '24', full_name: 'Renata Lopes', email: 'rlopes@valia.com.br', company: 'Valia', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-20T15:10:00Z' },
  { ...PHASE2_NULLS, id: '25', full_name: 'Henrique Saad', email: 'hsaad@gavekal.com.br', company: 'Gávea Investimentos', ticket_membership: 'MEMBRO', ticket_value: 2200, edition_id: EDITION_ID, import_job_id: null, created_at: '2025-05-21T09:05:00Z' },
]
