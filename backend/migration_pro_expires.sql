-- ─────────────────────────────────────────────────────────────────
--  MIGRATION: Adiciona controle de expiração de assinatura PRO
--  Executar: wrangler d1 execute construpro-db --remote --file=migration_pro_expires.sql
-- ─────────────────────────────────────────────────────────────────

-- 1. Adiciona coluna pro_expires_at na tabela companies
ALTER TABLE companies ADD COLUMN pro_expires_at DATETIME;

-- 2. Usuários PRO existentes (que já pagaram) recebem expiração de 30 dias a partir de hoje
--    Ajuste esta data conforme necessário para refletir a última cobrança real.
UPDATE companies
SET pro_expires_at = datetime('now', '+30 days')
WHERE plano = 'pro';