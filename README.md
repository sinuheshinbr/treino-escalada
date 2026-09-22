# Fingerboard

App pessoal para treinar e acompanhar **força máxima de dedos**. Um módulo só,
feito direito.

## O protocolo

Implementa o **MaxHangs** de Eva López, na periodização MAW → MED, em ciclos de
10 semanas com duas sessões por semana:

| Semanas | Fase | O que muda |
|---|---|---|
| 1–4 | **MAW** (*Maximum Added Weight*) | Reglete fixo de 20mm, carga no cinto. Séries 3-4-4-5. |
| 5 | Deload | Obrigatório. |
| 6–9 | **MED** (*Minimum Edge Depth*) | Peso corporal, reglete diminuindo. Séries 3-4-4-5. |
| 10 | Deload | Fecha o ciclo; testa a força máxima. |

Suspensões de 10s com **3–5s de margem até a falha** — nunca até a falha — e 3
minutos entre séries, sempre no início da sessão e depois de aquecer.

A progressão dentro do bloco é por **número de séries**, não por carga. A carga
(ou o reglete) só muda quando a margem registrada se afasta do alvo.

### Autorregulação

A sessão é abortada quando o protocolo manda abortar:

- **MAW** — carga do dia mais de **25%** abaixo da última sessão.
- **MED** — reglete do dia mais de **2mm** mais fundo que o da última sessão.
- **Disposição vermelha** na checagem pré-sessão (escala Green Day).

## Os três módulos da navegação

- **Hoje** — a prescrição da sessão do dia, a checagem pré-sessão e o registro
  série a série. Em dia de descanso, mostra qual é a próxima sessão.
- **Força** — medições de força máxima com célula de carga (pico por mão no
  20mm), evolução em kg ou % do peso corporal, e assimetria entre as mãos.
- **Ciclo** — configuração do ciclo, o plano das 10 semanas e o histórico de
  sessões.

## Medição de força máxima

Puxada máxima de **7 segundos** na célula de carga (Tindeq, WH-C06…), uma mão
por vez, no reglete de 20mm, 2 minutos entre as mãos. Registra-se o pico de cada
mão e o peso corporal do dia — daí saem o % do PC e a assimetria.

Testar no início do ciclo, na virada entre os blocos e no fim.

## Stack

- Next.js 16 (App Router) + React 19 (React Compiler ligado)
- MongoDB driver oficial (sem ORM)
- NextAuth v5 com Google
- Tailwind v4
- TypeScript

Cache Components está **desligado** de propósito: é um app pessoal, autenticado
e inteiramente dinâmico, onde `revalidatePath` já resolve.

## Rodando

```bash
npm install
npm run dev
```

Precisa de `.env.local` com `MONGODB_URI`, `AUTH_SECRET` e as credenciais do
Google OAuth.

## Referências

- Eva López — [Fingerboard Training Guide II](https://en-eva-lopez.blogspot.com/2018/05/fingerboard-training-guide-II-Maxhangs-SubHangs-and-Inthangs-methodology.html) (metodologia) e [III](http://en-eva-lopez.blogspot.com/2018/07/fingerboard-training-guide-iii-periodization-samples-of-maxhangs-training-programs-.html) (periodização)
- Charlie Schreiber — *5 Key Principles of Climbing Training* (`assets/treino.pdf`), de onde vem a escala Green Day
