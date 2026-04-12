// ══════════════════════════════════════════════════════════════
//  ConstruFY — Worker: Rotas RDO
//  Cole dentro do seu router principal (onde ficam obras, pontos etc.)
//  Padrão: já usa a função requireAuth(request, env) existente
// ══════════════════════════════════════════════════════════════

// ── Utilitário: gera UUID v4 simples ─────────────────────────
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
}

// ── GET /api/data/rdos ────────────────────────────────────────
// Retorna todos os RDOs da empresa, opcionalmente filtrado por obra_id
async function getRdos(request, env, company_id) {
  const url = new URL(request.url);
  const obraId = url.searchParams.get('obra_id');

  let query, params;

  if (obraId) {
    query = `
      SELECT r.*, o.nome AS obra_nome
      FROM rdos r
      LEFT JOIN obras o ON o.id = r.obra_id
      WHERE r.company_id = ? AND r.obra_id = ?
      ORDER BY r.data DESC, r.created_at DESC
    `;
    params = [company_id, obraId];
  } else {
    query = `
      SELECT r.*, o.nome AS obra_nome
      FROM rdos r
      LEFT JOIN obras o ON o.id = r.obra_id
      WHERE r.company_id = ?
      ORDER BY r.data DESC, r.created_at DESC
    `;
    params = [company_id];
  }

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ ok: true, data: results });
}

// ── POST /api/data/rdos ───────────────────────────────────────
async function createRdo(request, env, company_id) {
  const body = await request.json();
  const {
    obra_id,
    data,
    clima          = 'Ensolarado',
    equipe_presente = 0,
    avanco_dia      = 0,
    descricao,
    ocorrencias    = '',
    observacoes    = '',
  } = body;

  if (!obra_id)   return Response.json({ ok: false, error: 'obra_id obrigatório' }, { status: 400 });
  if (!data)      return Response.json({ ok: false, error: 'data obrigatória' },    { status: 400 });
  if (!descricao) return Response.json({ ok: false, error: 'descricao obrigatória' }, { status: 400 });

  const id = uuid();
  await env.DB.prepare(`
    INSERT INTO rdos (id, company_id, obra_id, data, clima, equipe_presente, avanco_dia, descricao, ocorrencias, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, company_id, obra_id, data, clima, equipe_presente, avanco_dia, descricao, ocorrencias, observacoes).run();

  return Response.json({ ok: true, id });
}

// ── PUT /api/data/rdos/:id ────────────────────────────────────
async function updateRdo(request, env, company_id, id) {
  const body = await request.json();
  const {
    obra_id,
    data,
    clima,
    equipe_presente,
    avanco_dia,
    descricao,
    ocorrencias,
    observacoes,
  } = body;

  // Verifica que o RDO pertence à empresa (segurança multi-tenant)
  const existing = await env.DB.prepare(
    'SELECT id FROM rdos WHERE id = ? AND company_id = ?'
  ).bind(id, company_id).first();
  if (!existing) return Response.json({ ok: false, error: 'Not found' }, { status: 404 });

  await env.DB.prepare(`
    UPDATE rdos SET
      obra_id         = ?,
      data            = ?,
      clima           = ?,
      equipe_presente = ?,
      avanco_dia      = ?,
      descricao       = ?,
      ocorrencias     = ?,
      observacoes     = ?
    WHERE id = ? AND company_id = ?
  `).bind(
    obra_id, data, clima, equipe_presente, avanco_dia,
    descricao, ocorrencias, observacoes,
    id, company_id
  ).run();

  return Response.json({ ok: true });
}

// ── DELETE /api/data/rdos/:id ─────────────────────────────────
async function deleteRdo(request, env, company_id, id) {
  const existing = await env.DB.prepare(
    'SELECT id FROM rdos WHERE id = ? AND company_id = ?'
  ).bind(id, company_id).first();
  if (!existing) return Response.json({ ok: false, error: 'Not found' }, { status: 404 });

  await env.DB.prepare('DELETE FROM rdos WHERE id = ? AND company_id = ?')
    .bind(id, company_id).run();

  return Response.json({ ok: true });
}

// ══════════════════════════════════════════════════════════════
//  COMO INTEGRAR NO SEU ROUTER PRINCIPAL
//  Adicione isso dentro do bloco de rotas /api/data/*
// ══════════════════════════════════════════════════════════════

/*
  // Dentro do seu fetch handler, onde já tem:
  // if (pathname === '/api/data/obras') { ... }
  // if (pathname === '/api/data/pontos') { ... }
  // Adicione:

  if (pathname === '/api/data/rdos') {
    if (method === 'GET')  return getRdos(request, env, company_id);
    if (method === 'POST') return createRdo(request, env, company_id);
  }

  const rdoMatch = pathname.match(/^\/api\/data\/rdos\/([^/]+)$/);
  if (rdoMatch) {
    const rdoId = rdoMatch[1];
    if (method === 'PUT')    return updateRdo(request, env, company_id, rdoId);
    if (method === 'DELETE') return deleteRdo(request, env, company_id, rdoId);
  }
*/

// ══════════════════════════════════════════════════════════════
//  ADICIONE rdos AO ENDPOINT /api/data/all
//  Para carregar junto com os outros dados no loadAll()
// ══════════════════════════════════════════════════════════════

/*
  // No seu handler do /api/data/all, adicione:
  const rdosResult = await env.DB.prepare(
    'SELECT r.*, o.nome AS obra_nome FROM rdos r LEFT JOIN obras o ON o.id = r.obra_id WHERE r.company_id = ? ORDER BY r.data DESC'
  ).bind(company_id).all();

  // E inclua no objeto de resposta:
  return Response.json({
    ok: true,
    obras:         obrasResult.results,
    medicoes:      medicoesResult.results,
    faturamentos:  faturamentosResult.results,
    colaboradores: colaboradoresResult.results,
    epis:          episResult.results,
    entregasEPI:   entregasResult.results,
    financeiro:    financeiroResult.results,
    pontos:        pontosResult.results,
    rdos:          rdosResult.results,   // <-- adicione esta linha
  });
*/