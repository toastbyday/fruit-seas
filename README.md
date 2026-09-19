# Fruit Seas Online

Jogo pirata 2D para celular e PC, pronto para deploy no Vercel.

## Recursos
- 1º Sea e 2º Sea com 10 ilhas.
- Ilhas maiores e mais distantes no 2º Sea.
- Bosses, espadas e equipamentos com boosts.
- Haki do Armamento e Haki da Observação.
- Sistema de giro de frutas.
- Catálogo amplo de frutas inspirado em Blox Fruits.
- Contas com e-mail/senha via Supabase Auth.
- Save em nuvem com RLS.
- Multiplayer de posição/presença via Supabase Realtime.
- Controles para PC e celular.

## Deploy no Vercel
1. Importe este repositório no Vercel.
2. Framework Preset: **Other**.
3. Não configure Build Command.
4. Adicione as variáveis de ambiente:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
5. Faça o deploy.

O endpoint `/api/config` entrega apenas a configuração pública necessária ao navegador. Nunca use uma `service_role` ou secret key no frontend.

## Supabase
O arquivo `supabase.sql` documenta a estrutura de save e as policies de segurança necessárias. O backend desta versão foi criado no projeto Supabase separado `fruit-seas`.
