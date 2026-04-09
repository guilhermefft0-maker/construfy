-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ConstruPRO — Schema D1 (Cloudflare SQLite)                  ║
-- ║  Multi-tenant · LGPD-ready · Auditoria completa              ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. EMPRESAS (tenant raiz)
CREATE TABLE IF NOT EXISTS companies (
  id              TEXT PRIMARY KEY,
  razao_social    TEXT NOT NULL,
  cnpj            TEXT NOT NULL UNIQUE,
  ie              TEXT,
  telefone        TEXT NOT NULL,
  setor           TEXT NOT NULL,
  porte           TEXT NOT NULL,
  endereco        TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  plano           TEXT NOT NULL DEFAULT 'starter',
  status          TEXT NOT NULL DEFAULT 'pending',
  trial_ends_at   TEXT,
  plan_expires_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now')),
  updated_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_companies_cnpj   ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_slug   ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- 2. USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id                        TEXT PRIMARY KEY,
  company_id                TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome                      TEXT NOT NULL,
  cargo                     TEXT,
  email                     TEXT NOT NULL UNIQUE,
  password_hash             TEXT NOT NULL,
  role                      TEXT NOT NULL DEFAULT 'operador',
  status                    TEXT NOT NULL DEFAULT 'pending',
  email_verified_at         TEXT,
  email_verify_token        TEXT,
  email_verify_expires_at   TEXT,
  reset_token_hash          TEXT,
  reset_token_expires_at    TEXT,
  failed_logins             INTEGER NOT NULL DEFAULT 0,
  locked_until              TEXT,
  last_login_at             TEXT,
  data_consent_at           TEXT,
  created_at                TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now')),
  updated_at                TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company    ON users(company_id);

-- 3. SESSÕES
CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id          TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT NOT NULL UNIQUE,
  ip                  TEXT,
  user_agent          TEXT,
  revoked             INTEGER NOT NULL DEFAULT 0,
  expires_at          TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- 4. LOG DE AUDITORIA
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,
  meta        TEXT,
  created_at  TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- 5. OBRAS
CREATE TABLE IF NOT EXISTS obras (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  cliente      TEXT NOT NULL,
  contrato     TEXT,
  valor        REAL NOT NULL DEFAULT 0,
  inicio       TEXT,
  prev_fim     TEXT,
  status       TEXT NOT NULL DEFAULT 'Em andamento',
  avanco       INTEGER NOT NULL DEFAULT 0,
  faturado     REAL NOT NULL DEFAULT 0,
  despesas     REAL NOT NULL DEFAULT 0,
  responsavel  TEXT,
  obs          TEXT,
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now')),
  updated_at   TEXT
);

-- 6. MEDIÇÕES
CREATE TABLE IF NOT EXISTS medicoes (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obra_id      TEXT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero       INTEGER NOT NULL,
  data         TEXT NOT NULL,
  valor        REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'Pendente',
  responsavel  TEXT,
  obs          TEXT,
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- 7. FATURAMENTOS / NFS
CREATE TABLE IF NOT EXISTS faturamentos (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obra_id      TEXT REFERENCES obras(id),
  numero       TEXT NOT NULL,
  data         TEXT NOT NULL,
  vencimento   TEXT NOT NULL,
  valor        REAL NOT NULL DEFAULT 0,
  forma_pgto   TEXT,
  status       TEXT NOT NULL DEFAULT 'Pendente',
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- 8. COLABORADORES
CREATE TABLE IF NOT EXISTS colaboradores (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obra_id      TEXT REFERENCES obras(id),
  nome         TEXT NOT NULL,
  cpf          TEXT,
  cargo        TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'CLT',
  salario      REAL NOT NULL DEFAULT 0,
  admissao     TEXT,
  demissao     TEXT,
  status       TEXT NOT NULL DEFAULT 'Ativo',
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now')),
  updated_at   TEXT
);

-- 9. EPIs E ENTREGAS
CREATE TABLE IF NOT EXISTS epis (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  categoria  TEXT NOT NULL,
  ca         TEXT,
  estoque    INTEGER NOT NULL DEFAULT 0,
  minimo     INTEGER NOT NULL DEFAULT 0,
  validade   TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS entregas_epi (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  epi_id          TEXT NOT NULL REFERENCES epis(id),
  colaborador_id  TEXT NOT NULL REFERENCES colaboradores(id),
  data            TEXT NOT NULL,
  quantidade      INTEGER NOT NULL DEFAULT 1,
  devolvida       INTEGER NOT NULL DEFAULT 0,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- 10. FINANCEIRO
CREATE TABLE IF NOT EXISTS financeiro (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obra_id     TEXT REFERENCES obras(id),
  tipo        TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  valor       REAL NOT NULL DEFAULT 0,
  data        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Realizado',
  created_by  TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- 11. CONFIGURAÇÕES E PLANOS
CREATE TABLE IF NOT EXISTS company_settings (
  company_id   TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  logo_url     TEXT,
  cor_primaria TEXT DEFAULT '#f0a500',
  timezone     TEXT DEFAULT 'America/Sao_Paulo',
  moeda        TEXT DEFAULT 'BRL',
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS plans (
  id               TEXT PRIMARY KEY,
  nome             TEXT NOT NULL,
  max_users        INTEGER NOT NULL DEFAULT 2,
  max_obras        INTEGER NOT NULL DEFAULT 5,
  features         TEXT NOT NULL DEFAULT '[]',
  preco_mensal     REAL NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S','now'))
);

-- DATA INICIAL
INSERT OR IGNORE INTO plans (id, nome, max_users, max_obras, features, preco_mensal) VALUES
  ('starter',    'Starter',    2,   5,   '["obras","medicoes","faturamento","epis"]',                    197.00),
  ('pro',        'Pro',        10,  -1,  '["obras","medicoes","faturamento","epis","colaboradores"]',   497.00),
  ('enterprise', 'Enterprise', -1,  -1,  '["all"]',                                                     0.00);

-- 12. VIEWS
CREATE VIEW IF NOT EXISTS vw_financeiro_resumo AS
SELECT
  company_id,
  SUM(CASE WHEN tipo='Receita' THEN valor ELSE 0 END) AS total_receitas,
  SUM(CASE WHEN tipo='Despesa' THEN valor ELSE 0 END) AS total_despesas
FROM financeiro
GROUP BY company_id;

-- 13. TRIGGERS PERMITIDOS (CROSS-TABLE)
CREATE TRIGGER IF NOT EXISTS trg_medicao_aprovada
AFTER UPDATE ON medicoes
WHEN NEW.status = 'Faturada' AND OLD.status != 'Faturada'
BEGIN
  UPDATE obras SET faturado = faturado + NEW.valor WHERE id = NEW.obra_id;
END;