-- ══════════════════════════════════════════════════════
--  ConstruFY — Migração: Tabela RDO (Diário de Obra)
--  Execute no painel Cloudflare D1 > Console
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rdos (
  id               TEXT    PRIMARY KEY,        -- UUID gerado no Worker
  company_id       TEXT    NOT NULL,           -- multi-tenant
  obra_id          TEXT    NOT NULL,
  data             TEXT    NOT NULL,           -- YYYY-MM-DD
  clima            TEXT    NOT NULL DEFAULT 'Ensolarado',
  equipe_presente  INTEGER NOT NULL DEFAULT 0,
  avanco_dia       INTEGER NOT NULL DEFAULT 0, -- % do dia
  descricao        TEXT    NOT NULL,           -- atividades executadas
  ocorrencias      TEXT    NOT NULL DEFAULT '',
  observacoes      TEXT    NOT NULL DEFAULT '',
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE CASCADE
);

-- Índices para performance nas queries mais comuns
CREATE INDEX IF NOT EXISTS idx_rdos_company    ON rdos (company_id);
CREATE INDEX IF NOT EXISTS idx_rdos_obra       ON rdos (company_id, obra_id);
CREATE INDEX IF NOT EXISTS idx_rdos_data       ON rdos (company_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_rdos_obra_data  ON rdos (company_id, obra_id, data DESC);