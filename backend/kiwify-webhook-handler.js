// ═══════════════════════════════════════════════════════════════════
//  KIWIFY WEBHOOK HANDLER — adicionar ao seu worker.js
//  Endpoint: POST /webhooks/kiwify
// ═══════════════════════════════════════════════════════════════════
//
//  Pré-requisitos:
//    1. wrangler secret put KIWIFY_CLIENT_SECRET   ← cole o novo secret após revogar o exposto
//
//  No seu router principal (worker.js), registre:
//    if (method === 'POST' && path === '/webhooks/kiwify') return handleKiwifyWebhook(request, env);
//
// ═══════════════════════════════════════════════════════════════════

/**
 * Verifica a assinatura HMAC-SHA1 enviada pela Kiwify.
 * Header: x-kiwify-signature  (hex lowercase)
 */
async function verifyKiwifySignature(rawBody, signature, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

/**
 * Handler principal do webhook Kiwify.
 * Registre no seu router como:
 *   if (method === 'POST' && path === '/webhooks/kiwify') return handleKiwifyWebhook(request, env);
 */
export async function handleKiwifyWebhook(request, env) {
  // ── 1. Lê o body bruto (necessário para verificar a assinatura)
  const rawBody = await request.text();

  // ── 2. Verifica assinatura
  const signature = request.headers.get('x-kiwify-signature') ?? '';
  const valid = await verifyKiwifySignature(rawBody, signature, env.KIWIFY_CLIENT_SECRET);
  if (!valid) {
    console.error('[Kiwify] Assinatura inválida');
    return new Response('Unauthorized', { status: 401 });
  }

  // ── 3. Parseia o payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const orderStatus        = payload.order_status;          // "paid" | "refunded" | "chargedback" | "waiting_payment"
  const subscriptionStatus = payload.Subscription?.status;  // "active" | "cancelled" | "overdue"
  const email              = payload.Customer?.email?.toLowerCase()?.trim();

  if (!email) {
    console.error('[Kiwify] Email ausente no payload');
    return new Response('Missing email', { status: 400 });
  }

  // ── 4. Decide a ação com base no evento
  if (orderStatus === 'paid') {
    // Pagamento confirmado → ativa plano Pro
    await env.DB.prepare(
      `UPDATE usuarios SET plano = 'pro', plano_atualizado_em = CURRENT_TIMESTAMP WHERE email = ?`
    ).bind(email).run();

    console.log(`[Kiwify] Plano Pro ativado para: ${email}`);

  } else if (
    orderStatus === 'refunded' ||
    orderStatus === 'chargedback' ||
    subscriptionStatus === 'cancelled'
  ) {
    // Reembolso / cancelamento → volta para free
    await env.DB.prepare(
      `UPDATE usuarios SET plano = 'free', plano_atualizado_em = CURRENT_TIMESTAMP WHERE email = ?`
    ).bind(email).run();

    console.log(`[Kiwify] Plano revertido para Free: ${email} (motivo: ${orderStatus ?? subscriptionStatus})`);
  }

  // Kiwify espera 200 OK para não reenviar o webhook
  return new Response('OK', { status: 200 });
}


// ═══════════════════════════════════════════════════════════════════
//  MIGRATION SQL — rode no D1 para garantir a coluna
//  wrangler d1 execute construpro-db --command "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'free'; ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano_atualizado_em TEXT;"
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
//  EXEMPLO: como integrar no seu worker.js existente
// ═══════════════════════════════════════════════════════════════════
/*

import { handleKiwifyWebhook } from './kiwify-webhook-handler.js';

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;

    // Webhook público (sem autenticação JWT)
    if (method === 'POST' && path === '/webhooks/kiwify') {
      return handleKiwifyWebhook(request, env);
    }

    // ... restante do seu router
  }
};

*/