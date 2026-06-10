import { z } from 'zod'

export const ParticipantRowSchema = z.object({
  excel_row: z.number().int().positive(),
  ticket_id: z.string().nullable(),
  full_name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  company: z.string().nullable(),
  job_title: z.string().nullable(),
  cpf: z.string().regex(/^\d{11,14}$/, 'CPF/CNPJ deve ter 11 a 14 dígitos').nullable(),
  phone: z.string().nullable(),
  company_segment_raw: z.string().nullable(),
  company_segment_normalized: z.enum(['GP', 'LP', 'FUNDO', 'CORPORATIVO', 'GOVERNO', 'ACADEMIA', 'OUTRO']).nullable(),
  is_company_member: z.boolean().nullable(),
  ticket_membership: z.enum(['MEMBRO', 'NAO_MEMBRO']),
  ticket_name: z.string().nullable(),
  coupon_code: z.string().nullable(),
  ticket_value: z.number().nonnegative('Valor do ingresso não pode ser negativo').nullable(),
  payment_status: z.string().nullable(),
  topics_of_interest: z.array(z.string()),
  interested_in_events: z.array(z.string()),
  preferred_channels: z.array(z.string()),
  content_interests: z.array(z.string()),
  vc_day_topics: z.array(z.string()),
  dietary_restrictions: z.enum(['Sim', 'Não']).nullable(),
  dietary_details: z.string().nullable(),
  registered_at: z.date().nullable(),
})

export type ParticipantRowValidated = z.infer<typeof ParticipantRowSchema>
