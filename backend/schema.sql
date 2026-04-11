-- Adicionar tabela pontos após colaboradores

CREATE TABLE IF NOT EXISTS pontos (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  colaborador_id  TEXT NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data            TEXT NOT NULL,
  hora_entrada    TEXT,
  hora_saida      TEXT,
  status          TEXT NOT NULL DEFAULT 'presente', -- presente, ausente, ferias, afastado
  obs             TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now')),
  updated_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_pontos_company_data ON pontos(company_id, data);
CREATE INDEX IF NOT EXISTS idx_pontos_colaborador ON pontos(colaborador_id);

-- View resumo ponto hoje
CREATE VIEW IF NOT EXISTS vw_ponto_hoje AS
SELECT 
  p.*,
  c.nome as colaborador_nome,
  c.cargo
FROM pontos p
JOIN colaboradores c ON c.id = p.colaborador_id
WHERE DATE(p.data) = DATE('now')
ORDER BY p.hora_entrada;
