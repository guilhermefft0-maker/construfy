-- ══════════════════════════════════════════════════════
--  ConstruPRO — Migração: Cotações e Pedidos de Compra
--  Execute: wrangler d1 execute construpro-db --remote --file=cotacao_migration.sql
-- ══════════════════════════════════════════════════════

-- Cabeçalho da cotação
CREATE TABLE IF NOT EXISTS cotacoes (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL,
  obra_id     TEXT,                          -- opcional
  titulo      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Aberta', -- Aberta | Aprovada | Cancelada
  observacoes TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL
);

-- Itens da cotação (cada material)
CREATE TABLE IF NOT EXISTS cotacao_itens (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL,
  cotacao_id   TEXT NOT NULL,
  material     TEXT NOT NULL,               -- ex: "Cimento CP-II 50kg"
  unidade      TEXT NOT NULL DEFAULT 'un',  -- un, kg, m², m³, m, l, saco, cx
  quantidade   REAL NOT NULL DEFAULT 1,
  -- Até 3 fornecedores por item
  forn1_nome   TEXT NOT NULL DEFAULT '',
  forn1_preco  REAL NOT NULL DEFAULT 0,
  forn2_nome   TEXT NOT NULL DEFAULT '',
  forn2_preco  REAL NOT NULL DEFAULT 0,
  forn3_nome   TEXT NOT NULL DEFAULT '',
  forn3_preco  REAL NOT NULL DEFAULT 0,
  -- Fornecedor vencedor (escolhido pelo usuário)
  forn_vencedor INTEGER NOT NULL DEFAULT 0,  -- 0=nenhum, 1, 2 ou 3
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE CASCADE
);

-- Pedidos de compra (gerados a partir de cotações aprovadas)
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL,
  cotacao_id   TEXT,                         -- vínculo com a cotação origem
  obra_id      TEXT,
  fornecedor   TEXT NOT NULL,
  titulo       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Pendente', -- Pendente | Aprovado | Entregue | Cancelado
  total        REAL NOT NULL DEFAULT 0,
  observacoes  TEXT NOT NULL DEFAULT '',
  data_pedido  TEXT NOT NULL DEFAULT (date('now')),
  data_entrega TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cotacao_id) REFERENCES cotacoes(id) ON DELETE SET NULL,
  FOREIGN KEY (obra_id)    REFERENCES obras(id)    ON DELETE SET NULL
);

-- Itens do pedido de compra
CREATE TABLE IF NOT EXISTS pedido_itens (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL,
  pedido_id   TEXT NOT NULL,
  material    TEXT NOT NULL,
  unidade     TEXT NOT NULL DEFAULT 'un',
  quantidade  REAL NOT NULL DEFAULT 1,
  preco_unit  REAL NOT NULL DEFAULT 0,
  total       REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cotacoes_company    ON cotacoes (company_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_obra       ON cotacoes (company_id, obra_id);
CREATE INDEX IF NOT EXISTS idx_cotacao_itens_cot   ON cotacao_itens (cotacao_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_company     ON pedidos_compra (company_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_obra        ON pedidos_compra (company_id, obra_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_ped    ON pedido_itens (pedido_id);