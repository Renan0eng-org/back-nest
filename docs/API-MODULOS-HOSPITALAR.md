# API — Módulos de Gestão Hospitalar (Web)

Documentação das rotas e payloads dos novos módulos do painel web: **Médicos**, **Escala de Plantão**, **Fila de Atendimento** e **Estoque de Insumos**.

> Extensão do sistema PVAI Sem Dor. Cada **Grupo** representa um **Hospital**. **Médico não é uma tabela nova**: é um `User` com `type = MEDICO` (com login próprio) e campos `crm`, `especialidade`, `cargaHoraria`, `medicoStatus`. Os models realmente novos são `Plantao`, `QueueTicket`, `Supply` e `SupplyMovement`.

---

## Convenções gerais

| Item | Valor |
|---|---|
| **Base URL** | `NEXT_PUBLIC_API_URL` (ex.: `https://semdor.paranavai.pr.gov.br/back`) |
| **Autenticação** | Cookie `refresh_token` (httpOnly) — `RefreshTokenGuard`. Enviar com `withCredentials: true`. |
| **Autorização** | Cada módulo exige a permissão (menu) correspondente: `medicos`, `escala`, `fila`, `estoque`. |
| **Formato** | JSON. Datas em ISO 8601 (`2026-07-18T10:30:00.000Z`). |
| **Erros** | `{ "statusCode": number, "message": string \| string[], "error": string }` |

**Códigos de status**
- `200` OK · `201` Criado · `400` Validação/regra de negócio · `401` Sem sessão · `403` Sem permissão · `404` Não encontrado

**Enums**
- `DoctorStatus`: `Ativo` · `Afastado` · `Ferias` · `Inativo`
- `PlantaoStatus`: `Aberto` (disponível no mercado) · `Agendado` (atribuído) · `EmAndamento` · `Concluido` · `Cancelado`
- `QueuePriority`: `Normal` · `Preferencial` · `Urgencia`
- `QueueStatus`: `Aguardando` · `Chamado` · `EmAtendimento` · `Concluido` · `Cancelado` · `Faltou`
- `SupplyMovementType`: `Entrada` · `Saida`

---

## 1. Médicos — `/admin/medicos` (menu `medicos`)

Médico = `User` com `type = MEDICO`. O `id` é o `idUser`. Cadastrar cria um usuário com login (nível de acesso "Médico", `active = true`, `emailVerified = true`), para que ele acesse o sistema (atendimentos, plantão, fila).

### `GET /admin/medicos`
Lista os usuários do tipo MEDICO (não deletados).

**200**
```json
[
  {
    "idUser": "clx_user",
    "name": "Ana Martins",
    "email": "ana@hospital.br",
    "cpf": "000.000.000-00",
    "phone": null,
    "avatar": null,
    "active": true,
    "crm": "PR-45231",
    "especialidade": "Clínica Geral",
    "cargaHoraria": 40,
    "medicoStatus": "Ativo",
    "nivelAcessoId": 5,
    "gruposMembro": [{ "grupo": { "idGrupo": 3, "nome": "Hospital Municipal" } }]
  }
]
```

### `GET /admin/medicos/:id`
Retorna o médico (por `idUser`) + últimos 20 plantões (`plantoes`).

### `POST /admin/medicos`
**Cria um usuário do tipo MEDICO com login.**

**Body**
```json
{
  "name": "Dra. Ana Martins",   // obrigatório
  "email": "ana@hospital.br",   // obrigatório (login)
  "cpf": "000.000.000-00",      // obrigatório
  "password": "senha123",       // obrigatório (mín. 6)
  "crm": "PR-45231",            // obrigatório
  "especialidade": "Ortopedia", // obrigatório
  "phone": "(44) 90000-0000",   // opcional
  "grupoId": 3,                 // opcional (vincula ao hospital via Grupo_Membro)
  "cargaHoraria": 40,           // opcional (h/semana)
  "status": "Ativo"             // opcional (default Ativo)
}
```
**201** — objeto do médico. **400** se já existir usuário com o mesmo e-mail ou CPF.

### `PUT /admin/medicos/:id`
**Body** (todos opcionais): `name`, `phone`, `crm`, `especialidade`, `grupoId`, `cargaHoraria`, `status`.

### `DELETE /admin/medicos/:id`
**Soft delete.** Marca `dt_delete`, `active = false`, `medicoStatus = Inativo` e **libera os campos únicos**: `email` e `cpf` recebem um sufixo `_del_<hash>` para que um novo cadastro com o mesmo e-mail/CPF não colida com o registro excluído. O médico some da listagem.
**200** `{ "message": "Médico removido." }`

---

## 2. Escala de Plantão — `/admin/escala` (menu `escala`)

### `GET /admin/escala`
Lista plantões (ordenados por início).

**Query:** `from?` (ISO), `to?` (ISO), `setor?` (string), `grupoId?` (number)

**200**
```json
[
  {
    "id": "clx...",
    "doctorId": "clx_user",
    "grupoId": 3,
    "setor": "Triagem",
    "startsAt": "2026-07-18T10:00:00.000Z",
    "endsAt": "2026-07-18T16:00:00.000Z",
    "status": "Agendado",
    "checkinAt": null,
    "checkoutAt": null,
    "doctor": { "idUser": "clx_user", "name": "Ana Martins", "avatar": null, "especialidade": "Clínica Geral" }
  }
]
```

### `POST /admin/escala`
Cria um plantão. **Sem `doctorId`** → plantão `Aberto` (mercado, qualquer médico do grupo pode pegar). **Com `doctorId`** → `Agendado` (atribuído; valida sobreposição). Valida `endsAt > startsAt`.

**Body**
```json
{
  "doctorId": "clx_user",                 // OPCIONAL — ausente = plantão aberto
  "setor": "Triagem",                    // obrigatório
  "startsAt": "2026-07-18T10:00:00.000Z", // obrigatório (ISO)
  "endsAt": "2026-07-18T16:00:00.000Z",   // obrigatório (ISO)
  "grupoId": 3                            // opcional
}
```

### `POST /admin/escala/:id/pegar`
O **médico logado** (User com `type = MEDICO`) assume um plantão `Aberto`. Valida disponibilidade e sobreposição. Seta `doctorId` = usuário logado e `status = Agendado`.
**400** se não for médico ou o plantão não estiver mais disponível.

### `POST /admin/escala/:id/liberar`
Devolve o plantão ao mercado: `doctorId = null`, `status = Aberto`, limpa check-in/out. (Não vale para `Concluido`/`Cancelado`.)
**400** — `"Este médico já tem um plantão nesse horário."`

### `PUT /admin/escala/:id`
**Body** (opcionais): `setor`, `startsAt`, `endsAt`, `grupoId`.

### `DELETE /admin/escala/:id`

### `POST /admin/escala/:id/checkin`
Marca `checkinAt = now` e `status = EmAndamento`.

### `POST /admin/escala/:id/checkout`
Marca `checkoutAt = now` e `status = Concluido`.

---

## 3. Fila de Atendimento — `/admin/fila` (menu `fila`)

Fluxo dos status: `Aguardando` → **chamar** → `Chamado` → **confirmar** → `EmAtendimento` → **concluir** → `Concluido`. Ramos: `cancelar` e `faltou`. A listagem e as estatísticas consideram apenas as senhas **do dia**.

### `GET /admin/fila`
**Query:** `status?` (QueueStatus), `grupoId?` (number). Ordenado por prioridade desc, depois emissão asc.

**200**
```json
[
  {
    "id": "clx...",
    "code": "A-102",
    "setor": "Triagem",
    "priority": "Urgencia",
    "status": "Aguardando",
    "patientId": null,
    "patientName": "Maria L.",
    "doctorId": null,
    "issuedAt": "2026-07-11T13:00:00.000Z",
    "calledAt": null,
    "confirmedAt": null,
    "closedAt": null,
    "patient": null,
    "doctor": null
  }
]
```

### `GET /admin/fila/stats`
**Query:** `grupoId?`

**200**
```json
{ "aguardando": 14, "chamado": 2, "emAtendimento": 3, "concluidos": 27, "avgWaitSeconds": 1080 }
```
`avgWaitSeconds` = média (emissão → chamada) das senhas concluídas hoje.

### `POST /admin/fila`
Emite uma senha. O `code` é gerado por prioridade (`A-` urgência, `P-` preferencial, `N-` normal). Informe `patientId` **ou** `patientName`.

**Body**
```json
{
  "setor": "Triagem",         // obrigatório
  "patientId": "clx_user",    // opcional (paciente cadastrado)
  "patientName": "Maria L.",  // opcional (sem cadastro)
  "priority": "Urgencia",     // opcional (default Normal)
  "grupoId": 3                // opcional
}
```

### `POST /admin/fila/:id/chamar`
**Body:** `{ "doctorId": "clx_user" }` (opcional). Só funciona se status = `Aguardando`. Seta `calledAt` e `status = Chamado`.

### `POST /admin/fila/:id/confirmar`
Só funciona se status = `Chamado`. Seta `confirmedAt` e `status = EmAtendimento`.

### `POST /admin/fila/:id/concluir`
`status = Concluido`, `closedAt = now`.

### `POST /admin/fila/:id/cancelar`
`status = Cancelado`, `closedAt = now`.

### `POST /admin/fila/:id/faltou`
`status = Faltou`, `closedAt = now`.

---

## 4. Estoque de Insumos — `/admin/estoque` (menu `estoque`)

Cada item traz um `status` derivado do saldo: `OK`, `Baixo` (saldo ≤ 1,5× mínimo) ou `Critico` (saldo = 0).

### `GET /admin/estoque`
**Query:** `grupoId?`

**200**
```json
[
  {
    "id": "clx...",
    "name": "Dipirona 500mg",
    "unit": "cx",
    "balance": 12,
    "minStock": 20,
    "lot": "DP-4410",
    "expiresAt": "2026-06-30T00:00:00.000Z",
    "grupoId": 3,
    "status": "Critico"
  }
]
```

### `GET /admin/estoque/:id`
Insumo + últimas 50 movimentações (`movements`).

### `GET /admin/estoque/:id/movimentacoes`
Lista completa de movimentações do insumo.

### `POST /admin/estoque`
**Body**
```json
{
  "name": "Luva nitrílica M", // obrigatório
  "unit": "un",               // obrigatório
  "balance": 1240,            // opcional (saldo inicial, default 0)
  "minStock": 200,            // opcional
  "lot": "LN-2291",           // opcional
  "expiresAt": "2027-03-01",  // opcional (ISO date)
  "grupoId": 3                // opcional
}
```

### `PUT /admin/estoque/:id`
**Body** (opcionais): `name`, `unit`, `minStock`, `lot`, `expiresAt`. *(o saldo só muda por movimentação)*

### `DELETE /admin/estoque/:id`
Remove o insumo e o histórico (cascade).

### `POST /admin/estoque/:id/movimentar`
Registra entrada/saída e ajusta o saldo **transacionalmente**. `Saida` não pode deixar o saldo negativo.

**Body**
```json
{
  "type": "Saida",              // "Entrada" | "Saida"
  "quantity": 5,                // > 0
  "reason": "Consumo atendimento", // opcional
  "attendanceId": "clx_atend"   // opcional (vincula ao atendimento)
}
```
**400** — `"Saldo insuficiente. Disponível: 12 cx."`

---

## Migração & permissões

1. **Schema:** já adicionado em `prisma/schema.prisma` — campos de médico em `User` (`crm`, `especialidade`, `cargaHoraria`, `medicoStatus`) e models `Plantao`, `QueueTicket`, `Supply`, `SupplyMovement`.
2. **Migração:** `npx prisma migrate dev --name hospital_modules` (dev) — em produção o container roda `prisma migrate deploy` no start.
3. **Menus/permissões:** os slugs `medicos`, `escala`, `fila`, `estoque` são criados pelo `prisma/seed.ts` e liberados para os níveis Admin (2) e Admin Prefeitura (3). Rode o seed após a migração.
