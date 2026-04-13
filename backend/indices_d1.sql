-- ─────────────────────────────────────────────────────────────────
--  ConstruPRO — Índices para performance no Cloudflare D1
--  Execute via: wrangler d1 execute construpro-db --remote --file=indices_d1.sql
-- ─────────────────────────────────────────────────────────────────

-- Tabelas principais — company_id é o filtro em toda query
CREATE INDEX IF NOT EXISTS idx_obras_cid         ON obras(company_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_cid       ON medicoes(company_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_cid   ON faturamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_cid  ON colaboradores(company_id);
CREATE INDEX IF NOT EXISTS idx_epis_cid           ON epis(company_id);
CREATE INDEX IF NOT EXISTS idx_entregas_epi_cid   ON entregas_epi(company_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_cid     ON financeiro(company_id);
CREATE INDEX IF NOT EXISTS idx_pontos_cid         ON pontos(company_id);
CREATE INDEX IF NOT EXISTS idx_rdos_cid           ON rdos(company_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_cid       ON cotacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cid  ON cotacao_itens(company_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cid        ON pedidos_compra(company_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_cid   ON pedido_itens(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_cid          ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_uid       ON sessions(user_id);

-- Índices de JOIN e filtros frequentes
CREATE INDEX IF NOT EXISTS idx_obras_cid_status   ON obras(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pontos_cid_data     ON pontos(company_id, data);
CREATE INDEX IF NOT EXISTS idx_pontos_colab        ON pontos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_obra       ON medicoes(obra_id);
CREATE INDEX IF NOT EXISTS idx_rdos_obra           ON rdos(obra_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cot   ON cotacao_itens(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_ped    ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_cid           ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires    ON sessions(expires_at);