# Escalada

App pessoal para criar e monitorar treinos de escalada.

## Features

- **Disposição diária** — log de energia, sono e dor muscular para ajustar o treino do dia.
- **Avaliações periódicas** — registro de critérios (força, mobilidade, técnica, resistência) ao longo do tempo.
- **Treinos** — biblioteca de planos por categoria (técnica, mobilidade, força, preparação física) e diário de sessões.
- **Viagens** — agenda de escaladas na rocha para organizar tapering e descanso.
- **Dashboard** — recomendação do treino do dia combinando energia + proximidade da próxima viagem.

## Stack

- Next.js 16 (App Router) + React 19
- MongoDB driver oficial (sem ORM)
- NextAuth v5 com Google
- Tailwind v4
- TypeScript

## Setup

1. `npm install`
2. Preencha `.env.local`:
   - `MONGODB_URI` — URI do Atlas
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — credenciais OAuth do Google Cloud Console
3. `npm run dev` → http://localhost:3000

Login restrito ao email cadastrado em `src/lib/members.ts`.
