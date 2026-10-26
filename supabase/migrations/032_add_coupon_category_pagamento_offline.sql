-- Migration 032: adiciona PAGAMENTO_OFFLINE como valor real do enum
-- coupon_category. Até aqui "Pagamento Offline" era só um rótulo derivado do
-- nome do código (ver isOfflinePaymentCoupon em lib/data.ts) — mas encontramos
-- códigos de pagamento offline que escapam do padrão de nome reconhecido
-- automaticamente. Com isso virando um valor de verdade, dá pra atribuir
-- manualmente via o mesmo seletor usado pelas outras categorias — a
-- atribuição manual passa a ter prioridade sobre a detecção automática por
-- nome (ver lib/data.ts).

ALTER TYPE coupon_category ADD VALUE 'PAGAMENTO_OFFLINE';
