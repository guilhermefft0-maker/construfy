# 🔒 ConstruFY Security & Compliance

## OWASP Top 10 Mitigations

| Risk | Status | Implementation |
|------|--------|----------------|
| A01:2021 - Broken Access Control | ✅ | RBAC + company_id isolation |
| A02:2021 - Crypto Failures | ✅ | PBKDF2-SHA512 + JWT HMAC256 |
| A03:2021 - Injection | ✅ | D1 params + CSP strict |
| A05:2021 - Security Misconfig | ✅ | Security headers + CORS strict |
| A07:2021 - Ident. & Auth Failures | ✅ | Rate limit + lockout + timing safe |

## Authentication
```
- JWT Access: 15min TTL
- Refresh tokens: 7 days (SHA256 hashed)
- Passwords: PBKDF2 310k iterations SHA512
- Failed login tracking + 5→15min lockout
- Session revocation (password change)
```

## Data Protection (LGPD)
```
- Multi-tenant isolation (company_id)
- Audit log: ALL actions tracked
- PII anonymized in sample-data
- No logs of passwords/emails
- Consent checkboxes (register flow)
```

## Rate Limiting (KV)
```
Login:    10/min per IP
Register: 5/5min per IP  
Forgot:   3/5min per IP
CRUD:     200/min default
```

## Deploy Checklist
```
✅ [ ] wrangler secret JWT_SECRET (64+ chars)
✅ [ ] wrangler secret RESEND_API_KEY  
✅ [ ] Custom domain in wrangler.toml
✅ [ ] HTTPS-only (Cloudflare auto)
```

**Production-ready security out-of-box 🚀**

