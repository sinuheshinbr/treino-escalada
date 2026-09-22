# Fingerboard

App pessoal para treinar e acompanhar **força máxima de dedos**. Um módulo só,
feito direito.

## O protocolo

Puxadas isométricas máximas medidas por **célula de carga** — as *isolated active
recruitment pulls* de Tyler Nelson (Camp4 Human Performance). A força é produzida
contra uma borda portátil fixa e medida, em vez de suspensa com lastro.

Ciclos de 10 semanas, geral → específico, duas sessões por semana:

| Semanas | Fase | O que é |
|---|---|---|
| 1–4 | **Célula** | Puxadas máximas de 3s, mão a mão, no reglete de 20mm. Séries 3-4-4-5. |
| 5 | Deload | Puxadas a ~70%, só para manter o padrão motor. |
| 6–9 | **Board** | Recrutamento ativo na parede: séries de 45–50s, 6–12 movimentos curtos e controlados. |
| 10 | Deload | Fecha o ciclo e reteste de MVC. |

Não há carga-alvo nas puxadas: a intenção é máxima em toda repetição e o aparelho
registra o que saiu. A intensidade se autorregula.

### Por que não MaxHangs

A escolha original era o MAW → MED da Eva López. Ela não sobreviveu ao
equipamento disponível: uma prancha portátil que não dá para pendurar com lastro
e nenhum reglete abaixo de 20mm — o que inviabiliza tanto o bloco de peso
adicional quanto o de reglete mínimo. O protocolo de puxadas resolve os dois,
porque a intensidade se controla por força, não por lastro nem profundidade.

O custo é real e vale saber: escalar é isometria de **cedência** (resistir a uma
carga), puxar contra uma célula é de **sobreposição**. Mecanicamente não é a
mesma coisa. O bloco de board nas semanas 6–9 existe em parte para recuperar essa
especificidade.

### Autorregulação

O corte é objetivo, não por sensação. Depois do aquecimento, uma puxada de teste
precisa atingir **85% do MVC de referência**. Abaixo disso, não se treina dedo no
dia — independente de como a pessoa se sente. A escala Green Day complementa,
mas não substitui o número.

O app também lê a tendência de pico entre sessões: duas sessões seguidas sem
progresso sinalizam deload ou troca de estímulo.

## Os três módulos da navegação

- **Hoje** — a prescrição da sessão do dia, a checagem pré-sessão com o corte de
  85%, e o registro série a série (pico por mão na célula, duração e movimentos
  no board). Em dia de descanso, mostra qual é a próxima sessão.
- **Força** — medições de força máxima com célula de carga (pico por mão no
  20mm), evolução em kg ou % do peso corporal, e assimetria entre as mãos.
- **Ciclo** — configuração do ciclo, o plano das 10 semanas e o histórico de
  sessões.

## Medição de força máxima

Puxada máxima de **7 segundos** na célula de carga, uma mão por vez, no reglete
de 20mm, 3 minutos entre as mãos, até 3 tentativas. Registra-se o pico de cada
mão e o peso corporal do dia — daí saem o % do PC, a assimetria e o MVC que
ancora o corte de prontidão.

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

- Tyler Nelson — [Program Auto-Regulation and Its Implications on Finger Training](https://www.camp4humanperformance.com/blog/2018/9/20/program-auto-regulation-and-its-implications-on-finger-training-tyler-nelson-dc-ms-cscs-camp4-human-performance) (o corte de 85%) e os [protocolos de recrutamento ativo](https://strengthclimbing.com/dr-tyler-nelsons-new-active-finger-strength-training-protocols/) (séries e repetições)
- Eva López — [Fingerboard Training Guide II](https://en-eva-lopez.blogspot.com/2018/05/fingerboard-training-guide-II-Maxhangs-SubHangs-and-Inthangs-methodology.html) e [III](http://en-eva-lopez.blogspot.com/2018/07/fingerboard-training-guide-iii-periodization-samples-of-maxhangs-training-programs-.html), do MaxHangs que originou o desenho
- Charlie Schreiber — *5 Key Principles of Climbing Training* (`assets/treino.pdf`), de onde vem a escala Green Day
