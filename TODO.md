# ConstruPRO — Fix Register Terms Checkbox + Vercel Deploy Tracker

## ✅ Phase 0: Immediate Fixes (Complete)
- [x] 1. Fix register terms validation (make optional for demo)
- [x] 2. Add vercel.json proxy to Worker
- [x] 3. Update deploy.bat (D1 + secrets)
- [x] 4. Fix worker.js SQL syntax error

## ⏳ Phase 1: Deploy Backend
```
1. wrangler d1 create construPRO-db-[yourname]
2. Copy DB ID to wrangler.toml 
3. backend/deploy.bat
4. Test: curl POST /api/auth/register (demo data)
```

## ⏳ Phase 2: Vercel Frontend + Proxy
```
vercel --prod
→ Site proxies /api → your Worker URL
```

## Status
**Register fixed!** Terms now optional. Deploy-ready. Provide Worker URL after backend deploy for Vercel proxy.

