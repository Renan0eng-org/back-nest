# Documentação das Rotas — API Prefeitura (back-nest)

> Documento gerado a partir da análise do código-fonte dos controllers (NestJS 11).
> Reflete o estado atual do código em `src/**/*.controller.ts`.

## Informações gerais

| Item | Valor |
|------|-------|
| Framework | NestJS 11 (`@nestjs/platform-express`) |
| Prefixo global | **Nenhum** (`main.ts` não usa `setGlobalPrefix`) |
| Porta | `process.env.PORT` ou **4000** |
| Base URL (produção) | `https://prefeitura.back.renannardi.com` |
| Base URL (local) | `http://localhost:4000` |
| CORS | origem padrão `https://prefeitura.renannardi.com` (configurável via env `CORS`, separado por vírgula), `credentials: true` |
| Cookies | `cookie-parser` habilitado; refresh token em cookie httpOnly `refresh_token` |
| ORM | Prisma (`@prisma/client`) |
| Filtro global | `AllExceptionsFilter` (persiste erros no banco) |

## Modelo de autenticação / autorização

A API combina **JWT** (access token via header `Authorization: Bearer`) e **refresh token** (cookie httpOnly `refresh_token`). Existem três guards principais:

| Guard | Onde aplica | Comportamento |
|-------|-------------|---------------|
| `MenuPermissionGuard` | **Global** (registrado em `main.ts`) | Pula rotas com `@Public()`. Se a rota tem `@Menu('slug')`, exige token válido **e** que o slug esteja entre os menus do nível de acesso do usuário (`nivel_acesso.menus`). Caso contrário → `403`. |
| `RefreshTokenGuard` | `@UseGuards(...)` em rotas/controllers | Exige o cookie `refresh_token` válido e usuário **ativo**. |
| `AppTokenGuard` | `@UseGuards(...)` em controllers | Aceita `Bearer` token **ou** cookie `refresh_token`; exige usuário ativo. |

Decorators relevantes:
- `@Public()` — ignora o `MenuPermissionGuard` (rota aberta).
- `@Menu('slug')` — exige o menu/permissão `slug`. `@Menu('')` (string vazia) = **sem exigência de permissão** no guard global (slug vazio é "falsy" → o guard libera).
- `@GetUser()` — injeta o usuário autenticado no handler.

> **Observação:** `@Public()` só afeta o `MenuPermissionGuard` global. Se a rota também tiver um `@UseGuards(RefreshTokenGuard)` em nível de classe (ex.: `POST /patients/public`), esse guard de classe **continua exigindo token** — ponto de atenção.

---

## 1. Auth — `auth.controller.ts` (`/auth`)

Sem `@Menu` no controller → não exige permissão no guard global.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/register` | `@Public` | Cadastro mobile de usuário |
| POST | `/auth/register-web` | `@Public` | Cadastro web (tipo `USUARIO`) |
| POST | `/auth/login` | `@Public` | Login por **CPF** (mobile). Body: `{ cpf, password }`. Retorna `access_token` + `user` |
| POST | `/auth/login-web` | — | Login por **email**. Body: `{ email, password }`. Seta cookie `refresh_token`, retorna `accessToken` + `user` |
| POST | `/auth/logout-web` | — | Limpa o cookie `refresh_token` |
| POST | `/auth/refresh` | cookie `refresh_token` | Rotaciona tokens; renova `accessToken` e o cookie |
| GET | `/auth/me` | cookie `refresh_token` | Retorna o usuário autenticado |
| POST | `/auth/validate` | — | Valida um token enviado no body (`{ token }`) |

---

## 2. Usuários (admin) — `user.controller.ts` (`/admin/users`)

Controller: `@Menu('gerenciar-usuarios')`. Cada rota: `@UseGuards(RefreshTokenGuard)`.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/admin/users` | Cria usuário |
| GET | `/admin/users` | Lista usuários. Query: `page`, `pageSize`, `name`, `accessLevel`, `type`, `active` |
| GET | `/admin/users/:id` | Detalhe de usuário |
| PUT | `/admin/users/:id` | Atualiza usuário |
| DELETE | `/admin/users/:id` | Remove usuário (`204 No Content`) |

---

## 3. Controle de acesso — `acesso.controller.ts` (`/admin/acesso`)

Controller: `@Menu('acesso')`. Cada rota: `@UseGuards(RefreshTokenGuard)`.

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/admin/acesso/niveis` | `acesso` | Lista níveis de acesso (com menus). Query: `page`, `pageSize` |
| POST | `/admin/acesso/niveis` | `acesso` | Cria nível de acesso |
| PUT | `/admin/acesso/niveis/:id` | `acesso` | Atualiza nível |
| DELETE | `/admin/acesso/niveis/:id` | `acesso` | Remove nível (`204`) |
| PUT | `/admin/acesso/niveis/:id/menus` | `acesso` | Define menus do nível (body `{ menuIds }`) |
| GET | `/admin/acesso/menus` | `acesso` | Lista menus. Query: `page`, `pageSize` |
| POST | `/admin/acesso/menus` | `acesso` | Cria menu |
| PUT | `/admin/acesso/menus/:id` | `acesso` | Atualiza menu |
| DELETE | `/admin/acesso/menus/:id` | `acesso` | Remove menu (`204`) |
| GET | `/admin/acesso/users` | `acesso` | Lista usuários. Query: `page`, `pageSize`, `type`, `name`, `accessLevel`, `active` |
| PATCH | `/admin/acesso/users/:id/nivel` | `acesso` | Define nível de acesso do usuário (body `{ nivelAcessoId }`) |
| PATCH | `/admin/acesso/users/:id/status` | `ativacao-usuarios` | Ativa/desativa usuário (body `{ active }`) |

---

## 4. Pacientes — `patients.controller.ts` (`/patients`)

Controller: `@UseGuards(RefreshTokenGuard)` + `@Menu('paciente')`.

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/patients` | `paciente` | Lista pacientes. Query: `page`, `pageSize`, `name`, `email`, `cpf`, `birthDateFrom`, `birthDateTo`, `sexo`, `unidadeSaude`, `medicamentos`, `exames`, `examesDetalhes`, `alergias`, `active`, `alta` |
| GET | `/patients/:id` | `paciente` | Detalhe do paciente |
| POST | `/patients` | `paciente` | Cria paciente |
| POST | `/patients/public` | `@Public`* | Auto-cadastro público de paciente (*atenção: guard de classe `RefreshTokenGuard` ainda se aplica) |
| PUT | `/patients/:id` | `paciente` | Atualiza paciente (trata `alta`/`altaAt`) |
| DELETE | `/patients/:id` | token (Bearer ou cookie) | Remove paciente (registra `deleterId`) |
| PATCH | `/patients/:id/accept-registration` | `paciente` | Aceita cadastro pendente |
| PATCH | `/patients/:id/alta` | `paciente` | Dá alta ao paciente |
| PATCH | `/patients/:id/reverter-alta` | `paciente` | Reverte a alta |

---

## 5. Agendamentos / Encaminhamentos — `appointments.controller.ts` (`/appointments`)

Controller: `@Menu('agendamento')`.

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/appointments` | `agendamento` | Cria agendamento |
| GET | `/appointments` | `agendamento` | Lista agendamentos. Query: `page`, `pageSize`, `patientName`, `doctorName`, `scheduledFrom`, `scheduledTo`, `createdFrom`, `createdTo`, `status` |
| GET | `/appointments/referrals` | `encaminhamento` | Lista encaminhamentos. Query: `page`, `pageSize`, `patientName`, `professionalName`, `scheduledFrom`, `scheduledTo`, `createdFrom`, `createdTo`, `status` |
| GET | `/appointments/:id` | `agendamento` | Detalhe do agendamento |
| PUT | `/appointments/:id` | `agendamento` | Atualiza agendamento |
| PUT | `/appointments/:id/status` | `agendamento` | Atualiza status (body `{ status }`) |
| DELETE | `/appointments/:id` | `agendamento` | Remove agendamento |
| GET | `/appointments/users/professional` | `@Menu('')` (sem perm) | Lista usuários profissionais. Query: `page`, `pageSize` |

---

## 6. Atendimentos — `attendances.controller.ts` (`/attendances`)

Controller: `@Menu('atendimento')`.

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/attendances` | `atendimento` | Cria atendimento |
| POST | `/attendances/from-appointment/:appointmentId` | `atendimento` | Cria atendimento a partir de um agendamento |
| GET | `/attendances` | `atendimento` | Lista atendimentos. Query: `page`, `pageSize`, `patientName`, `professionalName`, `status`, `attendanceFrom`, `attendanceTo`, `createdFrom`, `createdTo`, `appointmentId` |
| GET | `/attendances/:id` | `atendimento` | Detalhe do atendimento |
| PUT | `/attendances/:id` | `atendimento` | Atualiza atendimento |
| PUT | `/attendances/:id/status` | `atendimento` | Atualiza status (body `{ status }`) |
| DELETE | `/attendances/:id` | `atendimento` | Remove atendimento |
| **Prescrições** | | | |
| POST | `/attendances/:attendanceId/prescriptions` | `atendimento` | Cria prescrição |
| PUT | `/attendances/:attendanceId/prescriptions/:prescriptionId` | `atendimento` | Atualiza prescrição |
| DELETE | `/attendances/:attendanceId/prescriptions/:prescriptionId` | `atendimento` | Remove prescrição |
| **Anexos** | | | |
| DELETE | `/attendances/:attendanceId/attachments/:attachmentId` | `atendimento` | Remove anexo |
| **Formulários & Respostas** | | | |
| GET | `/attendances/forms/available` | `@Menu('')` (sem perm) | Formulários disponíveis. Query: `isScreening` |
| POST | `/attendances/:attendanceId/assign-forms` | `atendimento` | Atribui formulários (body `{ formIds }`) |
| POST | `/attendances/:attendanceId/unassign-forms` | `atendimento` | Remove atribuição de formulários |
| GET | `/attendances/:attendanceId/assigned-forms` | `atendimento` | Lista formulários atribuídos |
| POST | `/attendances/:attendanceId/link-response` | `atendimento` | Vincula resposta (body `{ responseId }`) |
| DELETE | `/attendances/:attendanceId/responses/:responseId` | `atendimento` | Desvincula resposta |
| GET | `/attendances/:attendanceId/responses` | `atendimento` | Lista respostas do atendimento |

---

## 7. Formulários — `form.controller.ts` (`/forms`)

Controller: `@UseGuards(AppTokenGuard)` + `@Menu('formulario')`.

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/forms` | `formulario` | Lista formulários. Query: `page`, `pageSize`, `title`, `description`, `from`, `to`, `createdAt`, `createdFrom`, `createdTo`, `isScreening`, `responsesMin`, `responsesMax` |
| GET | `/forms/screenings` | `formulario` | Lista formulários de triagem. Query: `page`, `pageSize` |
| POST | `/forms` | `formulario` | Cria formulário |
| GET | `/forms/:id` | `@Menu('')` (sem perm) | Detalhe do formulário |
| PUT | `/forms/:id` | `formulario` | Atualiza formulário |
| DELETE | `/forms/:id` | `formulario` | Remove formulário |
| POST | `/forms/:id/activate-screening` | `formulario` | Marca como triagem |
| POST | `/forms/:id/deactivate-screening` | `formulario` | Desmarca triagem |
| POST | `/forms/:id/toggle-screening` | `formulario` | Alterna flag de triagem |
| POST | `/forms/:id/responses` | `@Menu('')` (sem perm) | Envia resposta (valida token se `userId` ausente) |
| PUT | `/forms/:id/responses/:responseId` | `formulario` | Atualiza resposta |
| DELETE | `/forms/:id/responses/:responseId` | `formulario` | Remove resposta |
| GET | `/forms/:id/responses` | `respostas` | Lista respostas do formulário. Query: `page`, `pageSize` |
| GET | `/forms/:id/responses/:responseId` | `respostas` | Detalhe de resposta |
| GET | `/forms/responses/list` | `respostas` | Lista todas as respostas. Query: `page`, `pageSize`, `formTitle`, `patientName`, `from`, `to`, `isScreening`, `scoreMin`, `scoreMax` |
| GET | `/forms/response/:responseId` | `respostas` | Detalhe de resposta (por id da resposta) |
| GET | `/forms/users/toAssign` | `atribuir-usuarios` | Usuários elegíveis para atribuição. Query: `name`, `email`, `sexo`, `unidadeSaude`, `medicamentos`, `exames`, `alergias`, `birthDateFrom`, `birthDateTo`, `ageMin`, `ageMax` |
| GET | `/forms/:id/assigned` | `atribuir-usuarios` | Usuários atribuídos ao formulário. Query: `page`, `pageSize` |
| POST | `/forms/:id/assign` | `atribuir-usuarios` | Atribui usuários (body `{ userIds }`) |
| POST | `/forms/:id/unassign` | `atribuir-usuarios` | Remove atribuição (body `{ userIds }`) |
| GET | `/forms/user/my` | `@Menu('')` (sem perm) | Formulários atribuídos ao usuário logado |

---

## 8. Logs — `logs.controller.ts` (`/logs`)

Controller: `@UseGuards(AppTokenGuard)` + `@Menu('log')`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/logs` | Lista logs. Query: `page`, `pageSize`, `userId`, `route`, `statusCode`, `createdFrom`, `createdTo`, `seen` |
| GET | `/logs/:id` | Detalhe do log |
| POST | `/logs/:id/seen` | Marca log como visto |

---

## 9. Notificações — `notifications.controller.ts` (`/notifications`)

Controller: `@Menu('notifications')`. Usa `@GetUser()` (usuário injetado pelo guard global).

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/notifications` | Cria notificação |
| GET | `/notifications` | Lista notificações do usuário (query `ListNotificationsQuery`) |
| GET | `/notifications/unread-count` | Conta não lidas → `{ count }` |
| PATCH | `/notifications/:id/read` | Marca como lida/não lida (body `{ read? }`) |
| PATCH | `/notifications/read-all` | Marca todas como lidas (body `{ category?, before? }`) |
| DELETE | `/notifications/:id` | Arquiva notificação |

---

## 10. Push (FCM) — `push.controller.ts` (`/push`)

Controller: `@Menu('')` → **sem exigência de permissão no guard global** (cada handler valida token manualmente quando necessário).

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/push/subscribe` | Registra dispositivo (token FCM). Valida token (Bearer/cookie) |
| DELETE | `/push/subscribe` | Remove dispositivo (body `{ deviceToken }`) |
| POST | `/push/send` | Envia notificação ao usuário atual |
| POST | `/push/send-multiple` | Envia para múltiplos usuários (body `{ userIds, title, body, ... }`) |
| POST | `/push/send-topic` | Envia para um tópico (body `{ topic, title, body, ... }`) |
| POST | `/push/subscribe-topic` | Inscreve usuários em tópico (body `{ userIds, topic }`) |
| DELETE | `/push/subscribe-topic` | Remove usuários do tópico |

---

## 11. Dashboard Admin — `admin-dashboard.controller.ts` (`/admin-dash`)

Controller: `@UseGuards(AppTokenGuard, MenuPermissionGuard)` + `@Menu('dash-admin')`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin-dash/forms/responses/statistics` | Estatísticas de respostas por formulário. Query: `page`, `pageSize`, `from`, `to`, `formId` |
| GET | `/admin-dash/forms/statistics/by-origin` | Distribuição por origem (Web/Mobile/API). Query: `from`, `to` |
| GET | `/admin-dash/forms/statistics/top-forms` | Top N formulários mais respondidos. Query: `limit`, `from`, `to` |
| GET | `/admin-dash/forms/statistics/average-scores` | Média de scores por formulário. Query: `from`, `to` |
| GET | `/admin-dash/forms/responses/timeline` | Série temporal de respostas. Query: `groupBy` (day/week/month), `from`, `to` |
| GET | `/admin-dash/referrals/by-destination` | Encaminhamentos por destino. Query: `scheduledFrom/To`, `createdFrom/To`, `status`, `patientName`, `professionalName`, `doctorName` |
| GET | `/admin-dash/referrals/timeline` | Série temporal de encaminhamentos. Query: `groupBy`, `from`, `to` |

---

## 12. Chat (IA) — `chat.controller.ts` (`/chats`)

Controller: `@Menu('chat-ai')` + `@UseGuards(AppTokenGuard)`. Cada handler resolve o `userId` a partir do Bearer token.

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/chats` | Cria chat |
| GET | `/chats` | Lista chats do usuário |
| GET | `/chats/:chatId` | Detalhe do chat |
| POST | `/chats/:chatId/messages` | Adiciona mensagem |
| DELETE | `/chats/:chatId` | Remove chat |
| POST | `/chats/:chatId/clear` | Limpa mensagens do chat |

---

## 13. Triggers / Agentes IA — `chat/triggers/trigger.controller.ts` (`/triggers`)

Controller: `@UseGuards(AppTokenGuard)` + `@Menu('chat-ai-admin')`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/triggers/agents` | Lista agentes |
| GET | `/triggers/agents/default` | Agente padrão (`404` se não houver) |
| GET | `/triggers/agents/:id` | Detalhe do agente |
| POST | `/triggers/agents` | Cria agente |
| PATCH | `/triggers/agents/:id` | Atualiza agente |
| DELETE | `/triggers/agents/:id` | Remove agente |
| GET | `/triggers` | Lista triggers. Query: `agentId` |
| GET | `/triggers/stats` | Estatísticas. Query: `agentId` |
| GET | `/triggers/:id` | Detalhe do trigger |
| POST | `/triggers` | Cria trigger |
| PATCH | `/triggers/:id` | Atualiza trigger |
| POST | `/triggers/:id/toggle` | Ativa/desativa trigger |
| DELETE | `/triggers/:id` | Remove trigger |
| POST | `/triggers/generate-keywords` | Gera keywords via IA (body `GenerateKeywordsDto`) |
| POST | `/triggers/test` | Testa detecção de trigger (body `{ message, history?, agentId? }`) |
| GET (SSE) | `/triggers/logs/stream` | Stream de logs em tempo real (Server-Sent Events) |

---

## Resumo por permissão (`@Menu` slug)

| Slug de menu | Controllers/Rotas |
|--------------|-------------------|
| `gerenciar-usuarios` | `/admin/users/*` |
| `acesso` | `/admin/acesso/*` |
| `ativacao-usuarios` | `PATCH /admin/acesso/users/:id/status` |
| `paciente` | `/patients/*` |
| `agendamento` | `/appointments/*` |
| `encaminhamento` | `GET /appointments/referrals` |
| `atendimento` | `/attendances/*` |
| `formulario` | `/forms/*` (criação/edição) |
| `respostas` | `/forms/.../responses*` (consulta) |
| `atribuir-usuarios` | `/forms/.../assign*`, `/forms/users/toAssign` |
| `log` | `/logs/*` |
| `notifications` | `/notifications/*` |
| `dash-admin` | `/admin-dash/*` |
| `chat-ai` | `/chats/*` |
| `chat-ai-admin` | `/triggers/*` |
| `''` (vazio = sem permissão) | `GET /appointments/users/professional`, `GET /attendances/forms/available`, `GET /forms/:id`, `POST /forms/:id/responses`, `GET /forms/user/my`, `/push/*` |
| _(nenhum)_ | `/auth/*` |

---

### Total: ~90 rotas em 13 controllers.
</content>
</invoke>
