# Fruit Seas Online

Projeto estático pronto para Vercel.

## Deploy no Vercel
1. Extraia o ZIP.
2. Importe a pasta como um novo projeto no Vercel (ou envie para um repositório Git e importe o repositório).
3. Framework Preset: **Other**.
4. Não é necessário comando de build; o `index.html` está na raiz.
5. Faça o deploy.

## Backend
O frontend já aponta para o projeto Supabase `fruit-seas` criado nesta conversa. A chave incluída no `online.js` é uma **publishable key**, apropriada para frontend. Nunca substitua por `service_role`/secret key.

## Recursos desta versão
- Jogo 2D para celular e PC baseado no HTML original.
- Dois mares e 10 ilhas, com o 2º Sea mais espaçado.
- Catálogo expandido de frutas e progressão até nível 200.
- Cadastro/login com e-mail e senha via Supabase Auth.
- Save em nuvem por usuário com RLS.
- Multiplayer de presença/posição em tempo real via Supabase Realtime.
- Save local continua existindo como fallback.

Observação: dependendo da configuração de Auth do projeto, novos usuários podem precisar confirmar o e-mail antes do primeiro login.
