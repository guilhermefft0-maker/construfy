@echo off
echo Deploying ConstruPRO Worker...
wrangler deploy --dry-run
echo.
echo Use: wrangler deploy
echo Secrets: wrangler secret put JWT_SECRET "your-64-char-secret-here"
echo Email: wrangler secret put RESEND_API_KEY "re_xxx"
