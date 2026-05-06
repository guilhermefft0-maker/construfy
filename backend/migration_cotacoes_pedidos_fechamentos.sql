-- ─────────────────────────────────────────────────────────────────
-- ConstruPRO — Migration: Cotações, Pedidos de Compra, Fechamentos
-- Rodar com:
--   wrangler d1 execute construpro-db --remote --file=migration_cotacoes_pedidos_fechamentos.sql
-- ─────────────────────────────────────────────────────────────────

-- ── COTAÇÕES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotacoes (
  id          TEXT      PRIMARY KEY,
  company_id  TEXT      NOT NULL,
  obra_id     TEXT      NULL,
  titulo      TEXT      NOT NULL,
  status      TEXT      NOT NULL DEFAULT 'Aberta',   -- 'Aberta' | 'Aprovada' | 'Cancelada'
  observacoes TEXT      NOT NULL DEFAULT '',
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (obra_id)    REFERENCES obras(id)     ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_company ON cotacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_obra    ON cotacoes(obra_id);

-- ── COTAÇÃO ITENS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotacao_itens (
  id            TEXT      PRIMARY KEY,
  company_id    TEXT      NOT NULL,
  cotacao_id    TEXT      NOT NULL,
  material      TEXT      NOT NULL,
  unidade       TEXT      NOT NULL DEFAULT 'un',
  quantidade    REAL      NOT NULL DEFAULT 1,
  forn1_nome    TEXT      NOT NULL DEFAULT '',
  forn1_preco   REAL      NOT NULL DEFAULT 0,
  forn2_nome    TEXT      NOT NULL DEFAULT '',
  forn2_preco   REAL      NOT NULL DEFAULT 0,
  forn3_nome    TEXT      NOT NULL DEFAULT '',
  forn3_preco   REAL      NOT NULL DEFAULT 0,
  forn_vencedor INTEGER   NOT NULL DEFAULT 0,         -- 0=nenhum, 1=F1, 2=F2, 3=F3
  created_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cotacao_itens_company  ON cotacao_itens(company_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cotacao  ON cotacao_itens(cotacao_id);

-- ── PEDIDOS DE COMPRA ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id           TEXT      PRIMARY KEY,
  company_id   TEXT      NOT NULL,
  cotacao_id   TEXT      NULL,                        -- nullable: pedidos manuais não têm cotação
  obra_id      TEXT      NULL,
  fornecedor   TEXT      NOT NULL,
  titulo       TEXT      NOT NULL,
  status       TEXT      NOT NULL DEFAULT 'Pendente', -- 'Pendente' | 'Aprovado' | 'Entregue' | 'Cancelado'
  total        REAL      NOT NULL DEFAULT 0,
  observacoes  TEXT      NOT NULL DEFAULT '',
  data_pedido  TEXT      NOT NULL DEFAULT '',
  data_entrega TEXT      NOT NULL DEFAULT '',
  created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (obra_id)    REFERENCES obras(id)     ON DELETE SET NULL,
  FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id)  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidos_compra_company  ON pedidos_compra(company_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_obra     ON pedidos_compra(obra_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_compra_cotacao  ON pedidos_compra(cotacao_id);

-- ── PEDIDO ITENS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_itens (
  id          TEXT      PRIMARY KEY,
  company_id  TEXT      NOT NULL,
  pedido_id   TEXT      NOT NULL,
  material    TEXT      NOT NULL,
  unidade     TEXT      NOT NULL DEFAULT 'un',
  quantidade  REAL      NOT NULL DEFAULT 1,
  preco_unit  REAL      NOT NULL DEFAULT 0,
  total       REAL      NOT NULL DEFAULT 0,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)      ON DELETE CASCADE,
  FOREIGN KEY (pedido_id)  REFERENCES pedidos_compra(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedido_itens_company ON pedido_itens(company_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido  ON pedido_itens(pedido_id);

-- ── FECHAMENTOS DE MÊS (Financeiro) ──────────────────────────────
CREATE TABLE IF NOT EXISTS fechamentos (
  id          TEXT      PRIMARY KEY,
  company_id  TEXT      NOT NULL,
  mes         INTEGER   NOT NULL,                     -- 0-11 (JavaScript month index)
  ano         INTEGER   NOT NULL,
  nome_mes    TEXT      NOT NULL DEFAULT '',
  receitas    REAL      NOT NULL DEFAULT 0,
  despesas    REAL      NOT NULL DEFAULT 0,
  resultado   REAL      NOT NULL DEFAULT 0,
  por_cat_desp TEXT     NOT NULL DEFAULT '{}',        -- JSON
  por_cat_rec  TEXT     NOT NULL DEFAULT '{}',        -- JSON
  lancamentos  TEXT     NOT NULL DEFAULT '[]',        -- JSON array snapshot
  fechado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, mes, ano),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fechamentos_company ON fechamentos(company_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_mes_ano ON fechamentos(company_id, ano, mes);