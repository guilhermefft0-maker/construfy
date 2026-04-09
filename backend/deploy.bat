@echo off
echo =================================================================
echo  🚀 ConstruPRO Backend Deploy - Cloudflare Workers + D1
echo =================================================================
echo.

echo [1/6] Check wrangler CLI...
wrangler --version

echo [2/6] Create D1 Database (if not exists)...
wrangler d1 create construPRO-db || echo "DB already exists"

echo [3/6] Get your database_id:
wrangler d1 list | findstr construPRO
echo ^^^ Copy database_id to wrangler.toml [[d1_databases]] section! ^^^
echo.

echo [4/6] Migrate Schema + Sample Data:
wrangler d1 execute construPRO-db --file=./backend/schema.sql
wrangler d1 execute construPRO-db --file=./backend/sample-data.sql
echo.

echo [5/6] Set Secrets ^(REQUIRED^):
echo wrangler secret put JWT_SECRET      ^(openssl rand -base64 64^)
echo wrangler secret put RESEND_API_KEY  ^(optional for emails^)
echo.

echo [6/6] Deploy Worker:
wrangler deploy

echo =================================================================
echo  ✅ Backend Deploy Complete!
echo  Worker URL: https://construpro-[hash].workers.dev
echo  Test login: admin@alfa.construpro / demo123
echo  Demo slug: alfa ^(https://construpro.app/alfa/dashboard^)
echo =================================================================
pause
