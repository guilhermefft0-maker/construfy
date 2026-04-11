# 🚀 ConstruFY — Plataforma SaaS de Gestão de Construtoras

[![Deploy](https://img.shields.io/badge/Deploy-Cloudflare-orange?logo=cloudflare)](https://dash.cloudflare.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

✅ **100% FUNCIONAL** — Backend + Frontend + Database + Deploy Scripts

## 🎯 Funcionalidades Enterprise
```
🔐 Auth JWT + Refresh + RBAC + Rate Limit + Lockout (5 tentativas)
🏗️ Multi-tenant: companies isolation (company_id)
📊 CRUD: obras/medicoes/faturamento/colaboradores/epis/financeiro
💼 Folha CLT: INSS/IRRF/FGTS 2024 tabelas automáticas
📄 6 Relatórios PDF (jsPDF): Geral/Obras/Folha/Financeiro/EPIs/Faturamento
🔒 LGPD: audit_log + PII anonymized + session revocation
⚡ Workers + D1 + KV (rate-limit) — Zero config
```

## 🚀 Deploy (5 min)

```bash
# 1. Instalar Wrangler CLI
npm i -g wrangler@latest

# 2. Configurar D1 + KV (one-time)
wrangler d1 create construfy-db
# Copie database_id → backend/wrangler.toml

# 3. Deploy completo
npm install
npm run deploy

# 4. Secrets
npm run secret:jwt     # openssl rand -base64 64
npm run secret:resend  # resend.com API key (emails)

# 5. Testar
# Register: localhost:8787/register.html
# Demo: admin@demo.construfy → qualquer senha (demo mode)
```

## 🧪 Demo Credentials
```
Empresa: demo-alfa (backend/sample-data.sql)
User: admin@demo.construfy
Senha: qualquer (demo hash)
Subdomain: construfy.app/demo-alfa/dashboard
```

## 📁 Estrutura
```
├── backend/worker.js      ← API completa (auth + CRUD)
├── backend/schema.sql     ← D1 schema multi-tenant
├── backend/sample-data.sql← Dados demo (3 obras + folha + EPIs)
├── frontend/
│   ├── login.html         ← Auth screens
│   ├── register.html      ← Multi-step register
│   └── dashboard.html     ← Real API dashboard (no mock)
├── package.json           ← npm deploy scripts
└── README.md              ← Você está aqui ✨
```

## 🔐 Security Features
- **JWT + Refresh tokens** (15min/7d TTL)
- **Rate limiting** (KV): 10 login/min, 5 register/5min  
- **Account lockout** (5 failed → 15min)
- **CSRF protection** (tokens)
- **CORS strict** (only your domain)
- **PII anonymized** (sample-data)
- **Audit log** (all actions tracked)

## 💰 Preços (SaaS Ready)
```
FREE     R$  0/mês  → Obras + Medições + 5 colaboradores + Dashboard básico
Starter  R$197/mês  → 5 obras, 2 users + EPIs básicos
Pro      R$497/mês  → Ilimitado ⭐ (todas features)
Enterprise Custom   → SSO + SLA 99.9%
14 dias free trial
```


## 📈 Roadmap
```
✅ Backend enterprise complete
✅ Frontend real APIs (no mock)
✅ Deploy npm scripts
✅ LGPD compliant
⏳ Custom domain + Stripe
⏳ Mobile PWA
⏳ Analytics + AI insights
```

## 🤝 License
MIT — Use, modify, sell as SaaS 🚀

**Powered by Cloudflare Workers + D1 — Zero servers, global scale**

