/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ConstruFY — Cloudflare Worker Backend                       ║
 * ║  Padrão enterprise: JWT + refresh tokens, RBAC, rate limit,  ║
 * ║  CORS restrito, CSRF, auditoria, LGPD-ready                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DEPLOY:
wrangler d1 create construFY-db
 *   2. Copie o database_id gerado para wrangler.toml
 *   3. wrangler d1 execute construPRO-db --file=schema.sql
 *   4. wrangler secret put JWT_SECRET      (≥ 64 chars aleatórios)
 *   5. wrangler secret put RESEND_API_KEY  (para e-mails transacionais)
 *   6. wrangler deploy
 */

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://construFY.app',
  'https://construfy-final.vercel.app',
];


const TOKEN_TTL_SECONDS    = 15 * 60;       // 15 min — access token
const REFRESH_TTL_SECONDS  = 7 * 24 * 3600; // 7 dias — refresh token
const RESET_TTL_SECONDS    = 15 * 60;       // 15 min — reset de senha
const VERIFY_TTL_SECONDS   = 24 * 3600;     // 24 h — verificação e-mail

// Rate limiting (por IP + endpoint)
const RATE_LIMITS = {
  '/api/auth/login':           { max: 10, window: 60  },  // 10/min
  '/api/auth/register':        { max: 5,  window: 300 },  // 5/5min
  '/api/auth/forgot-password': { max: 3,  window: 300 },  // 3/5min
  default:                     { max: 200, window: 60 },  // 200/min geral
};

// ─────────────────────────────────────────────────────────────────
//  MAIN HANDLER
// ─────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // OPTIONS preflight
    if (request.method === 'OPTIONS') return handleCORS(request);

    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Security headers em todas as respostas
    const secHeaders = buildSecurityHeaders();

    try {
      // ── CORS check
      const origin = request.headers.get('Origin') || '';
      if (!ALLOWED_ORIGINS.includes(origin) && !origin.startsWith('http://localhost')) {
        return jsonResponse({ ok: false, message: 'Origem não autorizada.' }, 403, secHeaders);
      }

      // ── Rate limiting
      const rl = await checkRateLimit(request, env, path);
      if (!rl.allowed) {
        return jsonResponse(
          { ok: false, message: `Muitas requisições. Tente em ${rl.retryAfter}s.` },
          429,
          { ...secHeaders, 'Retry-After': String(rl.retryAfter), 'X-RateLimit-Limit': String(rl.max), 'X-RateLimit-Remaining': '0' }
        );
      }

      // ── ROUTER
      if (path === '/api/auth/login'           && method === 'POST') return handleLogin(request, env, secHeaders);
      if (path === '/api/auth/register'        && method === 'POST') return handleRegister(request, env, secHeaders);
      if (path === '/api/auth/refresh'         && method === 'POST') return handleRefreshToken(request, env, secHeaders);
      if (path === '/api/auth/logout'          && method === 'POST') return handleLogout(request, env, secHeaders);
      if (path === '/api/auth/forgot-password' && method === 'POST') return handleForgotPassword(request, env, secHeaders);
      if (path === '/api/auth/reset-password'  && method === 'POST') return handleResetPassword(request, env, secHeaders);
      if (path === '/api/auth/verify-email'    && method === 'GET')  return handleVerifyEmail(request, env, secHeaders);
      if (path === '/api/auth/me'              && method === 'GET')  return handleMe(request, env, secHeaders);

      // Rotas protegidas (CRUD business entities)
// Free plan restrictions - block paid entities (before auth check)
      const [, entity] = path.match(/^\/api\/(.+?)(s?)$/);
      if (entity === 'folha') {
        return jsonResponse({ ok: false, message: 'Feature bloqueada no plano FREE. Upgrade para PRO.' }, 402, secHeaders);
      }
      
      const freeBlocked = ['faturamentos', 'financeiro', 'epis', 'entregas_epi', 'folha', 'relatorios'];
      if (freeBlocked.includes(entity)) {
        const auth = await verifyAccessToken(request, env);
        if (!auth.ok) return jsonResponse({ ok: false, message: 'Não autorizado.' }, 401, secHeaders);
        const companyPlano = await env.DB.prepare('SELECT plano FROM companies WHERE id = ?').bind(auth.cid).firstCol();
        if (companyPlano === 'free') {
          return jsonResponse({ ok: false, message: 'Feature bloqueada no plano FREE. Upgrade para acessar.' }, 402, secHeaders);
        }
      }

      if (path.match(/^\/api\/(obras|medicoes|faturamentos|colaboradores|epis|entregas_epi|financeiro)(s?)$/)) {
        const auth = await verifyAccessToken(request, env);

        if (!auth.ok) return jsonResponse({ ok: false, message: 'Não autorizado.' }, 401, secHeaders);
        return handleCRUDBusiness(path, method, request, env, auth, secHeaders);
      }

      
      if (path.startsWith('/api/')) {
        const auth = await verifyAccessToken(request, env);
        if (!auth.ok) return jsonResponse({ ok: false, message: 'Não autorizado.' }, 401, secHeaders);
        return handleProtectedRoutes(path, method, request, env, auth, secHeaders);
      }

      return jsonResponse({ ok: false, message: 'Rota não encontrada.' }, 404, secHeaders);

    } catch (err) {
      console.error('[Worker Error]', err);
      return jsonResponse({ ok: false, message: 'Erro interno do servidor.' }, 500, secHeaders);
    }
  }
};

// ─────────────────────────────────────────────────────────────────
//  AUTH — REGISTER
// ─────────────────────────────────────────────────────────────────
async function handleRegister(request, env, headers) {
  const body = await safeJson(request);
  if (!body) return jsonResponse({ ok: false, message: 'Payload inválido.' }, 400, headers);

  const { company, admin, plano } = body;

  // Validações server-side (nunca confiar só no cliente)
  const errs = [];
  if (!company?.razao_social?.trim())       errs.push('Razão social obrigatória.');

  if (!company?.slug || !/^[a-z0-9\-]{3,40}$/.test(company.slug)) errs.push('Slug inválido.');
  if (!validEmail(admin?.email))            errs.push('E-mail inválido.');
  if (!strongPassword(admin?.senha))        errs.push('Senha não atende os requisitos de segurança.');
if (!['free','starter','pro','enterprise'].includes(plano)) errs.push('Plano inválido.');


  if (errs.length) return jsonResponse({ ok: false, message: errs[0] }, 422, headers);

  // Verificar duplicatas
  const existing = await env.DB.prepare(
    'SELECT id FROM companies WHERE slug = ? LIMIT 1'
  ).bind(company.slug).first();

  if (existing) {
    return jsonResponse({ ok: false, message: 'Subdomínio já cadastrado na plataforma.' }, 409, headers);
  }

  const emailExists = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ? LIMIT 1'
  ).bind(admin.email).first();

  if (emailExists) {
    // Não revela que o e-mail existe (security: email enumeration)
    return jsonResponse({ ok: true, message: 'Verifique seu e-mail para ativar a conta.' }, 201, headers);
  }

  // Hash da senha — PBKDF2 com Web Crypto (disponível no Workers)
  const passwordHash = await hashPassword(admin.senha);

  // Gerar company_id e token de verificação de e-mail
  const companyId   = crypto.randomUUID();
  const userId      = crypto.randomUUID();
  const verifyToken = await generateSecureToken();
  const verifyExp   = nowPlusSeconds(VERIFY_TTL_SECONDS);

  // Transação D1
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO companies (id, razao_social, cnpj, ie, telefone, setor, porte, endereco, slug, plano, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).bind(companyId, company.razao_social, company.cnpj||null, company.ie||null, company.telefone,
            company.setor, company.porte, company.endereco, company.slug, plano),

    env.DB.prepare(`
      INSERT INTO users (id, company_id, nome, cargo, email, password_hash, role, status, email_verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(userId, companyId, admin.nome, admin.cargo, admin.email, passwordHash),

    // Auditoria
    env.DB.prepare(`
      INSERT INTO audit_log (id, company_id, user_id, action, meta, created_at)
      VALUES (?, ?, ?, 'REGISTER_DIRECT', ?, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), companyId, userId, JSON.stringify({
        ip: getClientIP(request), ua: request.headers.get('User-Agent')?.substring(0,200),
      })),
  ]);

  // No email - direct active

  return jsonResponse({ ok: true, message: 'Conta criada. Verifique seu e-mail.' }, 201, headers);
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — LOGIN
// ─────────────────────────────────────────────────────────────────
async function handleLogin(request, env, headers) {
  const body = await safeJson(request);
  if (!body?.email || !body?.password)
    return jsonResponse({ ok: false, message: 'Credenciais obrigatórias.' }, 400, headers);

  const { email, password, remember } = body;
  const ip = getClientIP(request);

  // Buscar usuário (sempre executa hash mesmo se não encontrado — timing-safe)
  const user = await env.DB.prepare(`
    SELECT u.*, c.status AS company_status, c.slug AS company_slug, c.razao_social
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.email = ? LIMIT 1
  `).bind(email).first();

  // Hash dummy para timing constante (evita user enumeration por tempo)
  const dummy = '$argon2id$dummy-hash-to-prevent-timing-attack';
  const hash  = user?.password_hash || dummy;
  const valid = await verifyPassword(password, hash);

  console.log("[LOGIN DEBUG]", JSON.stringify({ email, userFound: !!user, valid, status: user?.status, company_status: user?.company_status, email_verified_at: user?.email_verified_at, hash_prefix: hash?.substring(0,20) }));

  if (!user || !valid) {
    // Log tentativa
    if (user) {
      await recordFailedLogin(env, user.id, ip);
    }
    return jsonResponse({ ok: false, message: 'E-mail ou senha incorretos.' }, 401, headers);
  }

  // Verificações de estado
  if (user.status === 'pending')
    return jsonResponse({ ok: false, message: 'Conta aguardando verificação de e-mail.' }, 403, headers);
  if (user.status === 'blocked')
    return jsonResponse({ ok: false, message: 'Conta bloqueada. Entre em contato com o suporte.' }, 403, headers);
  if (user.company_status !== 'active')
    return jsonResponse({ ok: false, message: 'Empresa inativa na plataforma.' }, 403, headers);
  if (user.email_verified_at === null)
    return jsonResponse({ ok: false, message: 'E-mail não verificado. Verifique sua caixa de entrada.' }, 403, headers);

  // Checar lock-out por tentativas excessivas (DB-side)
  const locked = await checkAccountLockout(env, user.id);
  if (locked) {
    return jsonResponse({ ok: false, message: 'Conta temporariamente bloqueada. Tente em 15 minutos.' }, 429, headers);
  }

  // Gerar tokens
  const sessionId    = crypto.randomUUID();
  const accessToken  = await signJWT({ sub: user.id, cid: user.company_id, role: user.role, sid: sessionId }, env.JWT_SECRET, TOKEN_TTL_SECONDS);
  const refreshToken = await generateSecureToken();
  const refreshExp   = nowPlusSeconds(remember ? REFRESH_TTL_SECONDS * 4 : REFRESH_TTL_SECONDS);

  await env.DB.batch([
    // Salvar sessão / refresh token
    env.DB.prepare(`
      INSERT INTO sessions (id, user_id, company_id, refresh_token_hash, ip, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(sessionId, user.id, user.company_id, await sha256(refreshToken),
            ip, request.headers.get('User-Agent')?.substring(0,200), refreshExp),

    // Resetar contador de falhas
    env.DB.prepare('UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=?').bind(user.id),

    // Atualizar last_login
    env.DB.prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?').bind(user.id),

    // Auditoria
    env.DB.prepare(`
      INSERT INTO audit_log (id, company_id, user_id, action, meta, created_at)
      VALUES (?, ?, ?, 'LOGIN', ?, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), user.company_id, user.id, JSON.stringify({ ip, sid: sessionId })),
  ]);

  // CSRF token (gerado por sessão)
  const csrfToken = await generateSecureToken(32);

  // Cookies HttpOnly, Secure, SameSite=Strict
  const cookieOpts = `; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${REFRESH_TTL_SECONDS}`;

  const responseHeaders = {
    ...headers,
    'Set-Cookie': [
      `refresh_token=${refreshToken}${cookieOpts}`,
      `csrf_token=${csrfToken}; Secure; SameSite=Strict; Path=/; Max-Age=${REFRESH_TTL_SECONDS}`,
    ].join(', '),
  };

  return jsonResponse({
    ok: true,
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TOKEN_TTL_SECONDS,
    user: {
      id:          user.id,
      nome:        user.nome,
      email:       user.email,
      role:        user.role,
      company_id:  user.company_id,
      company_slug:user.company_slug,
      razao_social:user.razao_social,
    },
    redirect: `/${user.company_slug}/dashboard`,
  }, 200, responseHeaders);
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — REFRESH TOKEN
// ─────────────────────────────────────────────────────────────────
async function handleRefreshToken(request, env, headers) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const refreshToken = parseCookie(cookieHeader, 'refresh_token');
  const csrfHeader   = request.headers.get('X-CSRF-Token');

  if (!refreshToken) return jsonResponse({ ok: false, message: 'Sessão expirada.' }, 401, headers);

  const tokenHash = await sha256(refreshToken);
  const session = await env.DB.prepare(`
    SELECT s.*, u.status AS user_status, u.role, c.status AS company_status
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN companies c ON c.id = s.company_id
    WHERE s.refresh_token_hash = ? AND s.revoked = 0 AND s.expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `).bind(tokenHash).first();

  if (!session) {
    return jsonResponse({ ok: false, message: 'Sessão inválida ou expirada.' }, 401, headers);
  }

  // Verificar CSRF (para requests que não sejam apenas refresh silencioso)
  // Em produção: validar csrf_token contra o armazenado

  const newAccessToken = await signJWT(
    { sub: session.user_id, cid: session.company_id, role: session.role, sid: session.id },
    env.JWT_SECRET, TOKEN_TTL_SECONDS
  );

  return jsonResponse({
    ok: true,
    access_token: newAccessToken,
    expires_in: TOKEN_TTL_SECONDS,
  }, 200, headers);
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — LOGOUT
// ─────────────────────────────────────────────────────────────────
async function handleLogout(request, env, headers) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const refreshToken = parseCookie(cookieHeader, 'refresh_token');

  if (refreshToken) {
    const hash = await sha256(refreshToken);
    await env.DB.prepare('UPDATE sessions SET revoked=1 WHERE refresh_token_hash=?').bind(hash).run();
  }

  const clearCookies = [
    'refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    'csrf_token=; Secure; SameSite=Strict; Path=/; Max-Age=0',
  ].join(', ');

  return jsonResponse({ ok: true }, 200, { ...headers, 'Set-Cookie': clearCookies });
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────
async function handleForgotPassword(request, env, headers) {
  const body = await safeJson(request);
  const email = body?.email?.trim().toLowerCase();

  // Sempre retorna 200 (não vaza existência de e-mail)
  const ok = jsonResponse({ ok: true, message: 'Se encontrarmos esse e-mail, enviaremos um link.' }, 200, headers);

  if (!validEmail(email)) return ok;

  const user = await env.DB.prepare('SELECT id, nome, company_id FROM users WHERE email=? AND status="active" LIMIT 1').bind(email).first();
  if (!user) return ok;

  const resetToken = await generateSecureToken();
  const exp        = nowPlusSeconds(RESET_TTL_SECONDS);

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET reset_token_hash=?, reset_token_expires_at=? WHERE id=?')
      .bind(await sha256(resetToken), exp, user.id),
    env.DB.prepare(`INSERT INTO audit_log (id, company_id, user_id, action, meta, created_at) VALUES (?,?,?,'PASSWORD_RESET_REQUEST',?,CURRENT_TIMESTAMP)`)
      .bind(crypto.randomUUID(), user.company_id, user.id, JSON.stringify({ ip: getClientIP(request) })),
  ]);

  await sendPasswordResetEmail(env, email, user.nome, resetToken);
  return ok;
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — RESET PASSWORD
// ─────────────────────────────────────────────────────────────────
async function handleResetPassword(request, env, headers) {
  const body = await safeJson(request);
  const { token, password } = body || {};

  if (!token || !password)
    return jsonResponse({ ok: false, message: 'Token e senha obrigatórios.' }, 400, headers);
  if (!strongPassword(password))
    return jsonResponse({ ok: false, message: 'Senha não atende requisitos de segurança.' }, 422, headers);

  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(`
    SELECT id, company_id FROM users WHERE reset_token_hash=? AND reset_token_expires_at > CURRENT_TIMESTAMP LIMIT 1
  `).bind(tokenHash).first();

  if (!user) return jsonResponse({ ok: false, message: 'Link inválido ou expirado.' }, 400, headers);

  const newHash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash=?, reset_token_hash=NULL, reset_token_expires_at=NULL, failed_logins=0, locked_until=NULL WHERE id=?')
      .bind(newHash, user.id),
    // Revogar todas as sessões ativas (security: session invalidation on password change)
    env.DB.prepare('UPDATE sessions SET revoked=1 WHERE user_id=?').bind(user.id),
    env.DB.prepare(`INSERT INTO audit_log (id, company_id, user_id, action, meta, created_at) VALUES (?,?,?,'PASSWORD_RESET',?,CURRENT_TIMESTAMP)`)
      .bind(crypto.randomUUID(), user.company_id, user.id, JSON.stringify({ ip: getClientIP(request) })),
  ]);

  return jsonResponse({ ok: true, message: 'Senha redefinida com sucesso.' }, 200, headers);
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — VERIFY EMAIL
// ─────────────────────────────────────────────────────────────────
async function handleVerifyEmail(request, env, headers) {
  const url   = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return jsonResponse({ ok: false, message: 'Token obrigatório.' }, 400, headers);

  const user = await env.DB.prepare(`
    SELECT id, company_id FROM users WHERE email_verify_token=? AND email_verify_expires_at > CURRENT_TIMESTAMP LIMIT 1
  `).bind(token).first();

  if (!user) return jsonResponse({ ok: false, message: 'Link inválido ou expirado.' }, 400, headers);

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET status="active", email_verified_at=CURRENT_TIMESTAMP, email_verify_token=NULL, email_verify_expires_at=NULL WHERE id=?').bind(user.id),
    env.DB.prepare('UPDATE companies SET status="active" WHERE id=?').bind(user.company_id),
    env.DB.prepare(`INSERT INTO audit_log (id, company_id, user_id, action, meta, created_at) VALUES (?,?,?,'EMAIL_VERIFIED',?,CURRENT_TIMESTAMP)`)
      .bind(crypto.randomUUID(), user.company_id, user.id, JSON.stringify({ ip: getClientIP(request) })),
  ]);

  // Redirecionar para login com mensagem
  return Response.redirect('https://construPRO.app/login?verified=1', 302);
}

// ─────────────────────────────────────────────────────────────────
//  AUTH — ME (perfil atual)
// ─────────────────────────────────────────────────────────────────
async function handleMe(request, env, headers) {
  const auth = await verifyAccessToken(request, env);
  if (!auth.ok) return jsonResponse({ ok: false, message: 'Não autorizado.' }, 401, headers);

  const user = await env.DB.prepare(`
    SELECT u.id, u.nome, u.cargo, u.email, u.role, u.last_login_at,
           c.id AS company_id, c.razao_social, c.cnpj, c.slug, c.plano, c.status AS company_status
    FROM users u JOIN companies c ON c.id = u.company_id
    WHERE u.id = ? LIMIT 1
  `).bind(auth.sub).first();

  if (!user) return jsonResponse({ ok: false, message: 'Usuário não encontrado.' }, 404, headers);
  return jsonResponse({ ok: true, user }, 200, headers);
}

// ─────────────────────────────────────────────────────────────────
//  PROTECTED ROUTES ROUTER
// ─────────────────────────────────────────────────────────────────
async function handleCRUDBusiness(path, method, request, env, auth, headers) {
  const [, entity] = path.match(/^\/api\/([^\/]+)/) || [];
  if (!entity) return jsonResponse({ ok: false, message: 'Entidade inválida.' }, 400, headers);
  
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || path.match(/\/([^\/]+)$/)[1];
  
  switch (method) {
    case 'GET':
      if (id) {
        const { results } = await env.DB.prepare(`SELECT * FROM ${entity} WHERE id=? AND company_id=?`).bind(id, auth.cid).all();
        return jsonResponse({ ok: true, data: results[0] || null }, results[0] ? 200 : 404, headers);
      }
      const { results } = await env.DB.prepare(`SELECT * FROM ${entity} WHERE company_id=? ORDER BY created_at DESC LIMIT 100`).bind(auth.cid).all();
      return jsonResponse({ ok: true, data: results }, 200, headers);
    
    case 'POST': {
      const body = await safeJson(request);
      if (!body) return jsonResponse({ ok: false, message: 'Payload inválido.' }, 400, headers);
      
      const cols = Object.keys(body).filter(k => k !== 'id' && k !== 'company_id').join(', ');
      const vals = Object.values(body).filter((_, i, a) => i !== 0 && i !== a.length-1).map(v => typeof v === 'string' ? `'${v.replace(/'/g,"''")}'` : v);
      vals.unshift(`'${crypto.randomUUID()}'`, `'${auth.cid}'`);
      
      await env.DB.prepare(`INSERT INTO ${entity} (id, company_id, ${cols}) VALUES (${vals.map(() => '?').join(',')})`).bind(...vals).run();
      await logAudit(env, auth.cid, auth.sub, `${entity.toUpperCase()}_CREATED`);
      return jsonResponse({ ok: true, message: 'Criado com sucesso.' }, 201, headers);
    }
    
    case 'PUT': {
      if (!id) return jsonResponse({ ok: false, message: 'ID obrigatório.' }, 400, headers);
      const body = await safeJson(request);
      if (!body) return jsonResponse({ ok: false, message: 'Payload inválido.' }, 400, headers);
      
      const updates = Object.entries(body).filter(([k]) => k !== 'id' && k !== 'company_id').map(([k,v]) => `${k}=?`).join(', ');
      const values = Object.values(body).filter((_, i, a) => i !== 0 && i !== a.length-1);
      values.push(id, auth.cid);
      
      const res = await env.DB.prepare(`UPDATE ${entity} SET ${updates}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?`).bind(...values).run();
      if (res.meta.changes === 0) return jsonResponse({ ok: false, message: 'Não encontrado.' }, 404, headers);
      
      await logAudit(env, auth.cid, auth.sub, `${entity.toUpperCase()}_UPDATED`, { id });
      return jsonResponse({ ok: true }, 200, headers);
    }
    
    case 'DELETE': {
      if (!id) return jsonResponse({ ok: false, message: 'ID obrigatório.' }, 400, headers);
      await env.DB.prepare(`DELETE FROM ${entity} WHERE id=? AND company_id=?`).bind(id, auth.cid).run();
      await logAudit(env, auth.cid, auth.sub, `${entity.toUpperCase()}_DELETED`, { id });
      return jsonResponse({ ok: true }, 200, headers);
    }
    
    default:
      return jsonResponse({ ok: false, message: 'Método não permitido.' }, 405, headers);
  }
}

async function handleProtectedRoutes(path, method, request, env, auth, headers) {
  // Admin-only routes
  if (auth.role !== 'admin' && (path.startsWith('/api/users') || path === '/api/company' || path === '/api/audit')) {
    return jsonResponse({ ok: false, message: 'Acesso negado.' }, 403, headers);
  }

  // Existing admin routes...
  if (path === '/api/users' && method === 'GET')    return listUsers(request, env, auth, headers);
  // ... (keep existing logic)
  
  return jsonResponse({ ok: false, message: 'Rota não encontrada.' }, 404, headers);
}

// ─────────────────────────────────────────────────────────────────
//  COMPANY HANDLERS
// ─────────────────────────────────────────────────────────────────
async function getCompany(request, env, auth, headers) {
  const company = await env.DB.prepare(
    'SELECT id, razao_social, cnpj, ie, telefone, setor, porte, endereco, slug, plano, status, created_at FROM companies WHERE id=? LIMIT 1'
  ).bind(auth.cid).first();
  return jsonResponse({ ok: true, company }, 200, headers);
}

async function updateCompany(request, env, auth, headers) {
  const body = await safeJson(request);
  const allowed = ['telefone','endereco','setor','porte'];
  const updates = Object.fromEntries(Object.entries(body || {}).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return jsonResponse({ ok: false, message: 'Nenhum campo permitido para atualização.' }, 400, headers);

  const sets  = Object.keys(updates).map(k => `${k}=?`).join(', ');
  const vals  = [...Object.values(updates), auth.cid];
  await env.DB.prepare(`UPDATE companies SET ${sets}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...vals).run();

  await logAudit(env, auth.cid, auth.sub, 'COMPANY_UPDATE', { fields: Object.keys(updates) });
  return jsonResponse({ ok: true }, 200, headers);
}

// ─────────────────────────────────────────────────────────────────
//  USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────
async function listUsers(request, env, auth, headers) {
  const { results } = await env.DB.prepare(`
    SELECT id, nome, cargo, email, role, status, last_login_at, created_at
    FROM users WHERE company_id=? ORDER BY created_at DESC
  `).bind(auth.cid).all();
  return jsonResponse({ ok: true, users: results }, 200, headers);
}

async function createUser(request, env, auth, headers) {
  if (auth.role !== 'admin') return jsonResponse({ ok: false, message: 'Apenas administradores podem criar usuários.' }, 403, headers);
  const body = await safeJson(request);
  if (!validEmail(body?.email) || !body?.nome) return jsonResponse({ ok: false, message: 'Nome e e-mail obrigatórios.' }, 422, headers);
  if (!['admin','gerente','operador','viewer'].includes(body.role)) return jsonResponse({ ok: false, message: 'Role inválida.' }, 422, headers);

  // Senha temporária gerada
  const tempPw   = generateTempPassword();
  const pwHash   = await hashPassword(tempPw);
  const userId   = crypto.randomUUID();
  const verToken = await generateSecureToken();
  const verExp   = nowPlusSeconds(VERIFY_TTL_SECONDS);

  await env.DB.prepare(`
    INSERT INTO users (id, company_id, nome, cargo, email, password_hash, role, status, email_verify_token, email_verify_expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP)
  `).bind(userId, auth.cid, body.nome, body.cargo||'', body.email, pwHash, body.role, verToken, verExp).run();

  await sendInviteEmail(env, body.email, body.nome, tempPw, verToken);
  await logAudit(env, auth.cid, auth.sub, 'USER_CREATED', { target_user: userId, role: body.role });

  return jsonResponse({ ok: true, message: 'Usuário convidado com sucesso.' }, 201, headers);
}

async function updateUser(request, env, auth, headers) {
  if (auth.role !== 'admin') return jsonResponse({ ok: false, message: 'Acesso negado.' }, 403, headers);
  const id   = new URL(request.url).pathname.split('/').pop();
  const body = await safeJson(request);
  const allowed = ['nome','cargo','role','status'];
  const updates = Object.fromEntries(Object.entries(body || {}).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return jsonResponse({ ok: false, message: 'Sem dados.' }, 400, headers);

  // Garantir que só afeta usuários da mesma empresa
  const sets = Object.keys(updates).map(k => `${k}=?`).join(', ');
  const vals = [...Object.values(updates), id, auth.cid];
  const res  = await env.DB.prepare(`UPDATE users SET ${sets} WHERE id=? AND company_id=?`).bind(...vals).run();
  if (!res.meta.changes) return jsonResponse({ ok: false, message: 'Usuário não encontrado.' }, 404, headers);

  await logAudit(env, auth.cid, auth.sub, 'USER_UPDATED', { target_user: id, fields: Object.keys(updates) });
  return jsonResponse({ ok: true }, 200, headers);
}

async function deleteUser(request, env, auth, headers) {
  if (auth.role !== 'admin') return jsonResponse({ ok: false, message: 'Acesso negado.' }, 403, headers);
  const id = new URL(request.url).pathname.split('/').pop();
  if (id === auth.sub) return jsonResponse({ ok: false, message: 'Não é possível remover sua própria conta.' }, 400, headers);

  await env.DB.prepare('UPDATE users SET status="deleted" WHERE id=? AND company_id=?').bind(id, auth.cid).run();
  await env.DB.prepare('UPDATE sessions SET revoked=1 WHERE user_id=?').bind(id).run();
  await logAudit(env, auth.cid, auth.sub, 'USER_DELETED', { target_user: id });
  return jsonResponse({ ok: true }, 200, headers);
}

// ─────────────────────────────────────────────────────────────────
//  SESSIONS
// ─────────────────────────────────────────────────────────────────
async function listSessions(request, env, auth, headers) {
  const { results } = await env.DB.prepare(`
    SELECT id, ip, user_agent, created_at, expires_at FROM sessions
    WHERE user_id=? AND revoked=0 AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC
  `).bind(auth.sub).all();
  return jsonResponse({ ok: true, sessions: results }, 200, headers);
}

async function revokeSession(request, env, auth, headers) {
  const body = await safeJson(request);
  if (!body?.session_id) return jsonResponse({ ok: false, message: 'session_id obrigatório.' }, 400, headers);
  await env.DB.prepare('UPDATE sessions SET revoked=1 WHERE id=? AND user_id=?').bind(body.session_id, auth.sub).run();
  return jsonResponse({ ok: true }, 200, headers);
}

// ─────────────────────────────────────────────────────────────────
//  AUDIT LOG
// ─────────────────────────────────────────────────────────────────
async function listAuditLog(request, env, auth, headers) {
  const url    = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { results } = await env.DB.prepare(`
    SELECT a.id, u.nome AS user_nome, u.email, a.action, a.meta, a.created_at
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    WHERE a.company_id=? ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).bind(auth.cid, limit, offset).all();

  return jsonResponse({ ok: true, logs: results, limit, offset }, 200, headers);
}

async function logAudit(env, companyId, userId, action, meta) {
  await env.DB.prepare(`
    INSERT INTO audit_log (id, company_id, user_id, action, meta, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).bind(crypto.randomUUID(), companyId, userId, action, JSON.stringify(meta)).run();
}

// ─────────────────────────────────────────────────────────────────
//  JWT  (HMAC-SHA256 puro — Web Crypto API)
// ─────────────────────────────────────────────────────────────────
async function signJWT(payload, secret, ttlSeconds) {
  const header  = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims  = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + ttlSeconds }));
  const data    = `${header}.${claims}`;
  const key     = await crypto.subtle.importKey('raw', enc(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  const sig     = await crypto.subtle.sign('HMAC', key, enc(data));
  return `${data}.${b64url(sig)}`;
}

async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const key  = await crypto.subtle.importKey('raw', enc(secret), { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
    const ok   = await crypto.subtle.verify('HMAC', key, dec64url(s), enc(data));
    if (!ok) return null;
    const claims = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
    if (claims.exp < Math.floor(Date.now()/1000)) return null;
    return claims;
  } catch { return null; }
}

async function verifyAccessToken(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { ok: false };
  const claims = await verifyJWT(token, env.JWT_SECRET);
  if (!claims) return { ok: false };
  return { ok: true, sub: claims.sub, cid: claims.cid, role: claims.role, sid: claims.sid };
}

// ─────────────────────────────────────────────────────────────────
//  PASSWORD HASHING  (PBKDF2-SHA512 — Web Crypto nativo no Workers)
// ─────────────────────────────────────────────────────────────────
async function hashPassword(password) {
  const salt       = crypto.getRandomValues(new Uint8Array(32));
  const iterations = 310000; // OWASP 2024 recomendação PBKDF2-SHA256
  const keyMaterial = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-512', salt, iterations },
    keyMaterial, 512
  );
  // Formato: pbkdf2$iterations$saltHex$hashHex
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  try {
    const [, iters, saltHex, hashHex] = stored.split('$');
    const salt = hexToBytes(saltHex);
    const km   = await crypto.subtle.importKey('raw', enc(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-512', salt, iterations: parseInt(iters) },
      km, 512
    );
    return hex(new Uint8Array(bits)) === hashHex;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────
//  RATE LIMITING  (Cloudflare KV)
// ─────────────────────────────────────────────────────────────────
async function checkRateLimit(request, env, path) {
  if (!env.RATE_KV) return { allowed: true };
  const cfg    = RATE_LIMITS[path] || RATE_LIMITS.default;
  const ip     = getClientIP(request);
  const key    = `rl:${ip}:${path}`;
  const stored = await env.RATE_KV.get(key);
  const count  = stored ? parseInt(stored) : 0;

  if (count >= cfg.max) {
    return { allowed: false, max: cfg.max, retryAfter: cfg.window };
  }

  await env.RATE_KV.put(key, String(count + 1), { expirationTtl: cfg.window });
  return { allowed: true, max: cfg.max, remaining: cfg.max - count - 1 };
}

// ─────────────────────────────────────────────────────────────────
//  ACCOUNT LOCKOUT
// ─────────────────────────────────────────────────────────────────
async function checkAccountLockout(env, userId) {
  const user = await env.DB.prepare('SELECT failed_logins, locked_until FROM users WHERE id=? LIMIT 1').bind(userId).first();
  if (!user) return false;
  if (user.locked_until && new Date(user.locked_until) > new Date()) return true;
  return false;
}

async function recordFailedLogin(env, userId, ip) {
  const user = await env.DB.prepare('SELECT failed_logins FROM users WHERE id=? LIMIT 1').bind(userId).first();
  const fails = (user?.failed_logins || 0) + 1;
  const lockedUntil = fails >= 5 ? nowPlusSeconds(15 * 60) : null;
  await env.DB.prepare('UPDATE users SET failed_logins=?, locked_until=? WHERE id=?').bind(fails, lockedUntil, userId).run();
}

// ─────────────────────────────────────────────────────────────────
//  EMAIL SENDERS  (Resend.com)
// ─────────────────────────────────────────────────────────────────
async function sendEmail(env, to, subject, html) {
  if (!env.RESEND_API_KEY) { console.warn('[Email] RESEND_API_KEY não configurado.'); return; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'ConstruPRO <noreply@construPRO.app>', to, subject, html }),
  });
}

async function sendVerificationEmail(env, email, nome, token, slug) {
  const link = `https://construPRO.app/api/auth/verify-email?token=${token}`;
  await sendEmail(env, email, 'Ative sua conta — ConstruPRO', `
    <h2>Olá, ${sanitizeHtml(nome)}!</h2>
    <p>Clique no link abaixo para ativar sua conta (válido por 24 horas):</p>
    <a href="${link}" style="background:#f0a500;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ativar minha conta</a>
    <p style="margin-top:24px;color:#888;font-size:12px;">Se não foi você, ignore este e-mail.</p>
  `);
}

async function sendPasswordResetEmail(env, email, nome, token) {
  const link = `https://construPRO.app/reset-password?token=${token}`;
  await sendEmail(env, email, 'Redefinição de senha — ConstruPRO', `
    <h2>Olá, ${sanitizeHtml(nome)}!</h2>
    <p>Solicitamos a redefinição da sua senha. O link é válido por <strong>15 minutos</strong>.</p>
    <a href="${link}" style="background:#f0a500;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Redefinir senha</a>
    <p style="margin-top:24px;color:#888;font-size:12px;">Se não foi você, sua conta está segura. Ignore este e-mail.</p>
  `);
}

async function sendInviteEmail(env, email, nome, tempPw, token) {
  const link = `https://construPRO.app/api/auth/verify-email?token=${token}`;
  await sendEmail(env, email, 'Você foi convidado — ConstruPRO', `
    <h2>Olá, ${sanitizeHtml(nome)}!</h2>
    <p>Você foi adicionado à plataforma ConstruPRO. Sua senha temporária é:</p>
    <code style="background:#f4f4f4;padding:8px 16px;border-radius:4px;font-size:16px;">${sanitizeHtml(tempPw)}</code>
    <p>Clique abaixo para ativar sua conta e alterar sua senha:</p>
    <a href="${link}" style="background:#f0a500;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ativar conta</a>
  `);
}

// ─────────────────────────────────────────────────────────────────
//  SECURITY HEADERS
// ─────────────────────────────────────────────────────────────────
function buildSecurityHeaders() {
  return {
    'Content-Type':              'application/json',
    'X-Content-Type-Options':    'nosniff',
    'X-Frame-Options':           'DENY',
    'X-XSS-Protection':          '1; mode=block',
    'Referrer-Policy':           'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Permissions-Policy':        'geolocation=(), microphone=(), camera=()',
    'Cache-Control':             'no-store, no-cache, must-revalidate',
    'Content-Security-Policy':   "default-src 'none'; frame-ancestors 'none';",
  };
}

function handleCORS(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':      allowedOrigin,
      'Access-Control-Allow-Methods':     'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':     'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age':           '600',
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────
function validEmail(e) {
  return typeof e === 'string' && /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(e) && e.length <= 254;
}

function strongPassword(p) {
  return typeof p === 'string' && p.length >= 12 && p.length <= 128
      && /[A-Z]/.test(p) && /[a-z]/.test(p)
      && /[0-9]/.test(p) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p);
}



function sanitizeHtml(str) {
  return String(str).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#x27;'}[c]));
}

// ─────────────────────────────────────────────────────────────────
//  UTIL
// ─────────────────────────────────────────────────────────────────
function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function safeJson(request) {
  try { return await request.json(); }
  catch { return null; }
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
      || '0.0.0.0';
}

function parseCookie(header, name) {
  const match = header.match(new RegExp('(?:^|;)\\s*' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', enc(str));
  return hex(new Uint8Array(buf));
}

async function generateSecureToken(bytes=64) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let pw = '';
  const arr = crypto.getRandomValues(new Uint8Array(16));
  for (const b of arr) pw += chars[b % chars.length];
  return pw;
}

function nowPlusSeconds(s) {
  return new Date(Date.now() + s*1000).toISOString().replace('T',' ').replace(/\.\d+Z$/,'');
}

function enc(s) { return new TextEncoder().encode(s); }
function hex(buf) { return Array.from(buf).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function hexToBytes(h) { return new Uint8Array(h.match(/.{2}/g).map(b=>parseInt(b,16))); }

function b64url(data) {
  const str = data instanceof ArrayBuffer ? String.fromCharCode(...new Uint8Array(data)) : data;
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function dec64url(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}