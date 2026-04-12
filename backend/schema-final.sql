-- ═══════════════════════════════════════════════════════════════
--  ConstruPRO — Schema FINAL (limpo, sem conflitos)
--  INSTRUÇÕES:
--  1. wrangler d1 execute construpro-db --remote --file=schema-FINAL.sql
--  2. (opcional) wrangler d1 execute construpro-db --remote --file=sample-data.sql
-- ═══════════════════════════════════════════════════════════════

-- ─── LIMPAR TUDO (ordem importa por FK) ──────────────────────────
DROP TABLE IF EXISTS entregas_epi;
DROP TABLE IF EXISTS pontos;
DROP TABLE IF EXISTS financeiro;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS colaboradores;
DROP TABLE IF EXISTS epis;
DROP TABLE IF EXISTS medicoes;
DROP TABLE IF EXISTS faturamentos;
DROP TABLE IF EXISTS obras;
DROP TABLE IF EXISTS companies;

-- ─── COMPANIES ───────────────────────────────────────────────────
CREATE TABLE companies (
  id           TEXT PRIMARY KEY,
  razao_social TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  cnpj         TEXT DEFAULT '',
  ie           TEXT DEFAULT '',
  telefone     TEXT NOT NULL DEFAULT '',
  setor        TEXT DEFAULT 'residencial',
  porte        TEXT DEFAULT 'epp',
  endereco     TEXT DEFAULT '',
  slug         TEXT NOT NULL UNIQUE,
  plano        TEXT NOT NULL DEFAULT 'free',
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT NULL
);

-- ─── USERS ───────────────────────────────────────────────────────
CREATE TABLE users (
  id                      TEXT PRIMARY KEY,
  company_id              TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome                    TEXT NOT NULL,
  name                    TEXT NOT NULL DEFAULT '',
  cargo                   TEXT NOT NULL DEFAULT 'Administrador',
  email                   TEXT NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  role                    TEXT NOT NULL DEFAULT 'admin',
  status                  TEXT NOT NULL DEFAULT 'active',
  email_verified_at       TEXT DEFAULT (datetime('now')),
  last_login_at           TEXT,
  failed_logins           INTEGER DEFAULT 0,
  locked_until            TEXT,
  reset_token_hash        TEXT,
  reset_token_expires_at  TEXT,
  email_verify_token      TEXT,
  email_verify_expires_at TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── SESSIONS ────────────────────────────────────────────────────
CREATE TABLE sessions (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id         TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  ip                 TEXT DEFAULT '',
  user_agent         TEXT DEFAULT '',
  revoked            INTEGER DEFAULT 0,
  expires_at         TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── AUDIT LOG ───────────────────────────────────────────────────
CREATE TABLE audit_log (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  meta       TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── OBRAS ───────────────────────────────────────────────────────
CREATE TABLE obras (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  cliente        TEXT NOT NULL DEFAULT '',
  contrato       TEXT NOT NULL DEFAULT '',
  valor          REAL NOT NULL DEFAULT 0,
  valor_contrato REAL NOT NULL DEFAULT 0,
  inicio         TEXT NOT NULL DEFAULT '',
  prev_fim       TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'Em andamento',
  avanco         REAL NOT NULL DEFAULT 0,
  medicoes_count INTEGER NOT NULL DEFAULT 0,
  faturado       REAL NOT NULL DEFAULT 0,
  despesas       REAL NOT NULL DEFAULT 0,
  responsavel    TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── MEDIÇÕES ────────────────────────────────────────────────────
CREATE TABLE medicoes (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obra_id     TEXT REFERENCES obras(id) ON DELETE SET NULL,
  numero      TEXT NOT NULL DEFAULT '1',
  data        TEXT NOT NULL DEFAULT '',
  valor       REAL NOT NULL DEFAULT 0,
  responsavel TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Pendente',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── FATURAMENTOS ────────────────────────────────────────────────
CREATE TABLE faturamentos (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obra_id    TEXT REFERENCES obras(id) ON DELETE SET NULL,
  numero     TEXT NOT NULL DEFAULT '',
  data       TEXT NOT NULL DEFAULT '',
  vencimento TEXT NOT NULL DEFAULT '',
  valor      REAL NOT NULL DEFAULT 0,
  forma_pgto TEXT NOT NULL DEFAULT 'TED',
  status     TEXT NOT NULL DEFAULT 'Pendente',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── COLABORADORES ───────────────────────────────────────────────
CREATE TABLE colaboradores (
  id               TEXT PRIMARY KEY,
  company_id       TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  cpf              TEXT NOT NULL DEFAULT '',
  cargo            TEXT NOT NULL DEFAULT '',
  tipo             TEXT NOT NULL DEFAULT 'CLT',
  salario          REAL NOT NULL DEFAULT 0,
  obra_id          TEXT REFERENCES obras(id) ON DELETE SET NULL,
  admissao         TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'Ativo',
  dias_trabalhados INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── PONTOS ──────────────────────────────────────────────────────
CREATE TABLE pontos (
  id               TEXT PRIMARY KEY,
  company_id       TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  colaborador_id   TEXT NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  colaborador_nome TEXT NOT NULL DEFAULT '',
  cargo            TEXT NOT NULL DEFAULT '',
  data             TEXT NOT NULL,
  hora_entrada     TEXT,
  hora_saida       TEXT,
  status           TEXT NOT NULL DEFAULT 'presente',
  obs              TEXT NOT NULL DEFAULT '',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── EPIs ────────────────────────────────────────────────────────
CREATE TABLE epis (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  categoria  TEXT NOT NULL DEFAULT '',
  estoque    INTEGER NOT NULL DEFAULT 0,
  minimo     INTEGER NOT NULL DEFAULT 0,
  validade   TEXT NOT NULL DEFAULT '',
  ca         TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── ENTREGAS EPI ────────────────────────────────────────────────
CREATE TABLE entregas_epi (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  epi_id         TEXT NOT NULL REFERENCES epis(id) ON DELETE CASCADE,
  colaborador_id TEXT NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data           TEXT NOT NULL DEFAULT '',
  quantidade     INTEGER NOT NULL DEFAULT 1,
  devolvida      INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── FINANCEIRO ──────────────────────────────────────────────────
CREATE TABLE financeiro (
  id         TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL DEFAULT 'Despesa',
  descricao  TEXT NOT NULL DEFAULT '',
  valor      REAL NOT NULL DEFAULT 0,
  data       TEXT NOT NULL DEFAULT '',
  categoria  TEXT NOT NULL DEFAULT 'Outros',
  obra_id    TEXT REFERENCES obras(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── ÍNDICES ─────────────────────────────────────────────────────
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_company_email ON users(company_id, email);
CREATE INDEX idx_sessions_token      ON sessions(refresh_token_hash);
CREATE INDEX idx_sessions_user       ON sessions(user_id);
CREATE INDEX idx_obras_company       ON obras(company_id);
CREATE INDEX idx_pontos_company_data ON pontos(company_id, data);
CREATE INDEX idx_financeiro_company  ON financeiro(company_id, data);

-- ✅ Schema pronto!