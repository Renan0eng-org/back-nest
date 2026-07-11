# Solicitação de Funcionalidades — App (PVAI Sem Dor)

Documento de pedido para o desenvolvimento das novas telas do **aplicativo**, integradas ao módulo hospitalar já criado no painel web. Base visual: o design atual do app (tema escuro, header em gradiente azul, cards navy, acento ciano). As telas “Em breve” do **Acesso Rápido** passam a ter conteúdo.

> **Escopo deste doc:** app do **Paciente** e app do **Médico**. Cada item traz objetivo, telas, fluxo, critérios de aceite e os **endpoints** que o backend precisa expor para o app (a maioria reaproveita os models já criados).

---

## Convenções para o app

- **Auth:** login já existente. As rotas do app são autenticadas pelo usuário logado (paciente ou médico). Sugestão: prefixo `/app/*` para o que é consumido pelo aplicativo, separando do `/admin/*` (painel).
- **Escopo de dados:** o paciente só vê os próprios dados; o médico vê a fila/plantão do hospital (Grupo) a que pertence.
- **Notificações:** reutilizar o sistema de **push** já existente (`PushSubscription` / `Notification`).

---

# App do Paciente

## 1. Registrar Queixa
**Objetivo:** o paciente registra um sintoma/dor que alimenta a triagem e pode gerar entrada na fila.

**Tela:** campo de descrição, escala de intensidade (0–10), seletor de local do corpo (chips), anexo de foto opcional, botão “Enviar queixa”.

**Fluxo:** paciente descreve → escolhe intensidade e local → (opcional) foto → envia → recebe confirmação.

**Critérios de aceite**
- Descrição obrigatória; intensidade obrigatória.
- Foto opcional (upload reaproveitando o storage atual).
- Queixa fica visível no histórico do paciente e para a equipe (esteira).

**Endpoints sugeridos**
| Método | Rota | Body / Retorno |
|---|---|---|
| `POST` | `/app/queixas` | `{ descricao, intensidade (0-10), local?, fotoUrl? }` → queixa criada |
| `GET` | `/app/queixas` | histórico do paciente logado |

---

## 2. Pedir Agendamento de Consulta
**Objetivo:** o paciente solicita uma consulta escolhendo especialidade, unidade e horário preferido; recebe push quando o hospital confirmar.

**Tela:** chips de especialidade, seletor de unidade, chips de horários sugeridos, botão “Solicitar agendamento”. Aviso: “Você recebe uma notificação quando o hospital confirmar.”

**Fluxo:** paciente escolhe → solicita (status `Pendente`) → gestor confirma no painel → push `Confirmado` → aparece em “Retorno/Consultas”.

**Critérios de aceite**
- Especialidade e horário preferido obrigatórios.
- Estado da solicitação visível: `Pendente`, `Confirmado`, `Cancelado`.
- Push ao confirmar/cancelar.

**Endpoints sugeridos**
| Método | Rota | Body / Retorno |
|---|---|---|
| `POST` | `/app/agendamentos` | `{ especialidade, unidade, dataSolicitada, observacao? }` |
| `GET` | `/app/agendamentos` | solicitações do paciente com status |
| `POST` | `/app/agendamentos/:id/cancelar` | cancela a própria solicitação |

> Reaproveita/estende o model `Appointment` já existente (adicionar `especialidade`, `unidade`, `dataSolicitada`, `dataConfirmada`).

---

## 3. Fila em Tempo Real (senha)
**Objetivo:** no dia da consulta, o paciente acompanha sua senha e posição na fila.

**Tela:** cartão grande com o código da senha, setor, posição na fila e estimativa de espera; atualização automática.

**Critérios de aceite**
- Mostra a senha ativa do paciente e a posição.
- Atualiza sozinho (polling ou push) quando é chamado.
- Push “Sua senha foi chamada” ao mudar para `Chamado`.

**Endpoints sugeridos**
| Método | Rota | Retorno |
|---|---|---|
| `GET` | `/app/fila/minha-senha` | senha ativa do paciente + posição + espera estimada |

> Consome o model `QueueTicket` (já criado). A emissão pode ocorrer no check-in presencial (painel) ou automaticamente ao confirmar a consulta.

---

## 4. Controle de Retorno
**Objetivo:** o paciente vê a próxima data de retorno e recebe lembrete.

**Tela:** cartão “Próximo retorno” com data, especialidade, médico e unidade.

**Critérios de aceite**
- Lista retornos futuros do paciente.
- Push de lembrete (ex.: 24h antes).

**Endpoints sugeridos**
| Método | Rota | Retorno |
|---|---|---|
| `GET` | `/app/retornos` | retornos do paciente (data, especialidade, médico, unidade, status) |

> Novo model `Retorno` (ligado a `Attendance`) — ver seção “Models sugeridos”.

---

## 5. Agenda de Remédios
**Objetivo:** o paciente cadastra medicamentos com horários e recebe notificação.

**Tela:** lista de medicamentos com horário; item traz nome, dose e horário; botão “+ Adicionar lembrete”.

**Critérios de aceite**
- CRUD de lembretes (nome, dose, horários, período).
- Notificação push nos horários definidos.
- Pode ser pré-preenchida a partir da **prescrição** de um atendimento.

**Endpoints sugeridos**
| Método | Rota | Body / Retorno |
|---|---|---|
| `GET` | `/app/remedios` | lembretes do paciente |
| `POST` | `/app/remedios` | `{ medicamento, dose, horarios: ["08:00","22:00"], inicio, fim? }` |
| `PUT` | `/app/remedios/:id` | edita |
| `DELETE` | `/app/remedios/:id` | remove |

> Novo model `AgendaMedicamento` — ver seção “Models sugeridos”.

---

# App do Médico

## 6. Meu Plantão (check-in/out)
**Objetivo:** o médico assume e encerra o plantão pelo celular.

**Tela:** cartão do plantão do dia (setor, horário), botão de check-in/check-out, status.

**Critérios de aceite**
- Mostra o plantão atual do médico logado.
- Botão de check-in muda o status para `EmAndamento`; check-out para `Concluido`.

**Endpoints sugeridos**
| Método | Rota | Retorno |
|---|---|---|
| `GET` | `/app/medico/plantao-atual` | plantão do dia do médico logado |
| `POST` | `/app/medico/plantao/:id/checkin` | reusa a lógica de `/admin/escala/:id/checkin` |
| `POST` | `/app/medico/plantao/:id/checkout` | idem checkout |

---

## 7. Fila do Setor & Chamar Próximo
**Objetivo:** o médico vê a fila do seu setor e chama o próximo por prioridade.

**Tela:** contador da fila, lista das próximas senhas (prioridade destacada), botão “Chamar próximo”.

**Critérios de aceite**
- Lista senhas `Aguardando` do setor, ordenadas por prioridade.
- “Chamar próximo” atribui a senha ao médico (`doctorId`) e muda para `Chamado`.

**Endpoints sugeridos**
| Método | Rota | Retorno |
|---|---|---|
| `GET` | `/app/medico/fila?setor=` | senhas aguardando do setor |
| `POST` | `/app/medico/fila/proximo` | chama a próxima senha e atribui ao médico |

> Consome `QueueTicket` (já criado).

---

## 8. Ficha de Atendimento & Prescrição
**Objetivo:** o médico abre/gera a ficha do paciente chamado e registra conduta/prescrição.

**Tela:** dados do paciente + queixa, campos de anamnese/conduta, lista de prescrição (medicamento, dose, frequência, duração), botão “Solicitar retorno” e “Encaminhar”.

**Critérios de aceite**
- Cria/edita `Attendance` (model já existente) vinculado ao paciente e ao médico.
- Adiciona itens de `AttendancePrescription` (já existente).
- Pode gerar um `Retorno` e uma `AgendaMedicamento` para o paciente a partir da prescrição.

**Endpoints sugeridos** (a maioria já existe no módulo `attendances`)
| Método | Rota | Observação |
|---|---|---|
| `POST` | `/app/medico/atendimentos` | cria ficha a partir da senha/paciente |
| `POST` | `/app/medico/atendimentos/:id/prescricao` | adiciona itens |
| `POST` | `/app/medico/atendimentos/:id/retorno` | gera retorno |

---

# Models sugeridos (novos, para o app)

Já criados no módulo web: `Medico`, `Plantao`, `QueueTicket`, `Supply`, `SupplyMovement`.
Para o app, sugerimos adicionar:

```prisma
model Queixa {
  id          String   @id @default(cuid())
  pacienteId  String
  descricao   String
  intensidade Int      // 0-10
  local       String?
  fotoUrl     String?
  createdAt   DateTime @default(now())
}

model Retorno {
  id            String   @id @default(cuid())
  atendimentoId String?
  pacienteId    String
  dataPrevista  DateTime
  status        String   @default("Agendado")
  createdAt     DateTime @default(now())
}

model AgendaMedicamento {
  id          String   @id @default(cuid())
  pacienteId  String
  medicamento String
  dose        String
  horarios    String[] // ["08:00","22:00"]
  inicio      DateTime
  fim         DateTime?
  createdAt   DateTime @default(now())
}
```
E estender `Appointment` com `especialidade`, `unidade`, `dataSolicitada`, `dataConfirmada` para cobrir o pedido de agendamento pelo app.

---

# Resumo dos endpoints a criar para o app

| Área | Rotas |
|---|---|
| Queixa | `POST/GET /app/queixas` |
| Agendamento | `POST/GET /app/agendamentos`, `POST /app/agendamentos/:id/cancelar` |
| Fila (paciente) | `GET /app/fila/minha-senha` |
| Retorno | `GET /app/retornos` |
| Remédios | `GET/POST/PUT/DELETE /app/remedios` |
| Médico — plantão | `GET /app/medico/plantao-atual`, `POST .../checkin`, `.../checkout` |
| Médico — fila | `GET /app/medico/fila`, `POST /app/medico/fila/proximo` |
| Médico — ficha | `POST /app/medico/atendimentos`, `.../prescricao`, `.../retorno` |

**Prioridade sugerida:** (1) Queixa + Agendamento, (2) Fila do paciente, (3) Remédios + Retorno, (4) App do médico.
