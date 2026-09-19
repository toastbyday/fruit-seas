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
4. Faça o deploy.

A URL e a **publishable key** do Supabase ficam no cliente, como recomendado para aplicações web públicas. Nunca coloque uma `service_role` ou secret key no frontend.

## Supabase
O arquivo `supabase.sql` documenta a estrutura de save e as policies de segurança. O backend está no projeto Supabase separado `fruit-seas`.
