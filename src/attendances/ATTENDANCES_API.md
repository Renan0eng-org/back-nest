**Atendimentos — API**

**Resumo**: Documentação das rotas do módulo de atendimentos (backend).

**Base URL**: `/attendances`

**Formato de data**: usar ISO 8601 (ex.: `2025-12-24T10:00:00Z`).

**Enum de status**: `EmAndamento`, `Concluido`, `Cancelado` (representados no Prisma como `AttendanceStatus`).

**Campos comuns (respostas)**: objetos de `patient` e `professional` retornam `idUser`, `name`, `email`, `cpf` quando aplicável.

**Rotas**

- **GET /attendances**: Listar atendimentos.
  - Query params: `page`, `pageSize`, `patientName`, `professionalName`, `status`, `attendanceFrom`, `attendanceTo`, `createdFrom`, `createdTo`, `appointmentId`.
  - Exemplo request: `GET /attendances?page=1&pageSize=10&status=EmAndamento`
  - Exemplo response:
  ```json
  {
    "total": 123,
    "page": 1,
    "pageSize": 10,
    "data": [{
      "id": "uuid",
      "appointmentId": "uuid|null",
      "patient": { "idUser": "uuid", "name": "Nome" },
      "professional": { "idUser": "uuid", "name": "Dr. Fulano" },
      "attendanceDate": "2025-12-24T10:00:00Z",
      "chiefComplaint": "Queixa principal",
      "diagnosis": "Diagnóstico",
      "status": "EmAndamento",
      "createdAt": "2025-12-24T09:00:00Z"
    }]
  }
  ```

- **GET /attendances/:id**: Obter atendimento por id.
  - Exemplo response (resumo): inclui `patient`, `professional`, `appointment`, `prescriptions`, `attachments`, `assignedForms`, `responses`:
  ```json
  {
    "id": "uuid",
    "appointmentId": "uuid|null",
    "patientId": "uuid",
    "professionalId": "uuid",
    "attendanceDate": "2025-12-24T10:00:00Z",
    "chiefComplaint": "Queixa principal",
    "presentingIllness": "...",
    "medicalHistory": "...",
    "physicalExamination": "...",
    "diagnosis": "...",
    "treatment": "...",
    "bloodPressure": "120/80",
    "heartRate": 72,
    "temperature": 36.8,
    "respiratoryRate": 16,
    "status": "EmAndamento",
    "patient": { "idUser": "uuid", "name": "Nome" },
    "professional": { "idUser": "uuid", "name": "Dr. Fulano" },
    "prescriptions": [ { "id": "uuid", "medication": "X", "dosage": "500mg" } ],
    "attachments": [ { "id": "uuid", "fileName": "exame.pdf", "fileUrl": "https://..." } ],
    "assignedForms": [ { "idForm": "uuid", "title": "Triagem" } ],
    "responses": [ { "idResponse": "uuid", "submittedAt": "...", "form": { "idForm": "uuid" } } ]
  }
  ```

- **POST /attendances**: Criar atendimento do zero.
  - Payload:
  ```json
  {
    "appointmentId": "uuid (opcional)",
    "patientId": "uuid",
    "professionalId": "uuid",
    "attendanceDate": "2025-12-24T10:00:00Z",
    "chiefComplaint": "Queixa principal",
    "presentingIllness": "... (opcional)",
    "medicalHistory": "... (opcional)",
    "physicalExamination": "... (opcional)",
    "diagnosis": "... (opcional)",
    "treatment": "... (opcional)",
    "bloodPressure": "120/80 (opcional)",
    "heartRate": 72 (opcional),
    "temperature": 36.8 (opcional),
    "respiratoryRate": 16 (opcional),
    "medicalNotes": [
      {
        "title": "Notas Adicionais",
        "content": "<p>HTML ou texto plano</p>",
        "mode": "advanced",
        "order": 0
      }
    ]
  }
  ```
  - Exemplo response: objeto do atendimento criado (com `id` e relações incluídas, incluindo `medicalNotes`).

- **POST /attendances/from-appointment/:appointmentId**: Criar atendimento a partir de um agendamento.
  - Payload (campos clínicos e vitais, `chiefComplaint` obrigatório):
  ```json
  {
    "chiefComplaint": "Queixa principal",
    "presentingIllness": "...",
    "diagnosis": "...",
    "treatment": "...",
    "status": "EmAndamento" // opcional
  }
  ```
  - O atendimento será criado associando `patientId` e `professionalId` do agendamento; `attendanceDate` = `scheduledAt` do agendamento.

- **PUT /attendances/:id**: Atualizar atendimento.
  - Payload (qualquer campo opcional do `UpdateAttendanceDto`):
  ```json
  {
    "attendanceDate": "2025-12-24T11:00:00Z",
    "chiefComplaint": "Atualizada",
    "diagnosis": "...",
    "bloodPressure": "...",
    "heartRate": 80,
    "temperature": 37.0,
    "respiratoryRate": 18,
    "status": "Concluido",
    "medicalNotes": [
      {
        "title": "Notas Adicionais",
        "content": "<p>Conteúdo atualizado</p>",
        "mode": "advanced",
        "order": 0
      }
    ]
  }
  ```
  - Nota: Se `medicalNotes` é fornecido, **todas as notas anteriores serão removidas e substituídas**.
  - Response: atendimento atualizado (objeto completo).

- **PUT /attendances/:id/status**: Atualizar somente status.
  - Payload:
  ```json
  { "status": "EmAndamento" | "Concluido" | "Cancelado" }
  ```
  - Response: atendimento com novo `status`.

- **DELETE /attendances/:id**: Excluir atendimento.
  - Response: objeto do atendimento removido (ou mensagem de sucesso).


Prescrições

- **POST /attendances/:attendanceId/prescriptions**: Adicionar prescrição.
  - Payload:
  ```json
  {
    "medication": "Nome",
    "dosage": "500mg",
    "frequency": "8 em 8 horas",
    "duration": "10 dias",
    "instructions": "Tomar após refeições (opcional)"
  }
  ```
  - Response: prescrição criada `{ id, attendanceId, medication, ... }`.

- **PUT /attendances/:attendanceId/prescriptions/:prescriptionId**: Atualizar prescrição.
  - Payload: campos opcionais similares ao `CreatePrescriptionDto`.
  - Response: prescrição atualizada.

- **DELETE /attendances/:attendanceId/prescriptions/:prescriptionId**: Excluir prescrição.
  - Response: objeto deletado ou mensagem de sucesso.

Anexos

- **POST /attendances/:attendanceId/attachments**: (upload) — requer `multipart/form-data` e configuração de upload (não implementado automaticamente). Retorna `{ id, fileName, fileUrl, fileType }`.

- **DELETE /attendances/:attendanceId/attachments/:attachmentId**: Remover anexo.
  - Response: objeto deletado ou mensagem de sucesso.

Formulários e Respostas

- **GET /attendances/forms/available?isScreening=true|false**: Listar formulários ativos (opcionalmente apenas de triagem).
  - Response: array de formulários com `questions` e `options`.

- **POST /attendances/:attendanceId/assign-forms**: Atribuir formulários ao atendimento.
  - Payload:
  ```json
  { "formIds": ["form-uuid-1", "form-uuid-2"] }
  ```
  - Response: atendimento atualizado com `assignedForms` conectados.

- **POST /attendances/:attendanceId/unassign-forms**: Desatribuir formulários.
  - Payload: mesmo formato `formIds`.
  - Response: atendimento atualizado com formulários removidos.

- **GET /attendances/:attendanceId/assigned-forms**: Listar formulários atribuídos (com perguntas/opções).

- **POST /attendances/:attendanceId/link-response**: Vincular uma `Response` existente (submetida pelo paciente) ao atendimento.
  - Payload:
  ```json
  { "responseId": "uuid" }
  ```
  - Validações: a `response` deve existir; não é permitido vincular a mesma resposta duas vezes ao mesmo atendimento.
  - Response: objeto `AttendanceResponse` criado com inclusão da `response` (form + answers).

- **DELETE /attendances/:attendanceId/responses/:responseId**: Desvincular resposta do atendimento.
  - Response: objeto removido ou mensagem de sucesso.

- **GET /attendances/:attendanceId/responses**: Listar respostas vinculadas ao atendimento (cada item inclui `response` com `form`, `user` e `answers`).

---

Notas Médicas (Medical Notes)

As notas médicas são registros adicionais associados a um atendimento, permitindo armazenar observações estruturadas em diferentes abas (como "Queixa Principal", "Diagnóstico", "Observações", etc.).

**Modelo MedicalNote:**
```json
{
  "id": "uuid",
  "attendanceId": "uuid",
  "title": "Queixa Principal",
  "content": "<p>HTML ou texto plano</p>",
  "mode": "advanced | simple",
  "order": 0,
  "createdAt": "2025-12-24T10:00:00Z",
  "updatedAt": "2025-12-24T10:00:00Z"
}
```

**Campos:**
- `title`: Nome da aba/nota (obrigatório)
- `content`: Conteúdo em HTML (modo "advanced") ou texto plano (modo "simple") (obrigatório)
- `mode`: "advanced" (Quill Editor - retorna HTML) ou "simple" (Textarea - retorna texto plano). Padrão: "simple"
- `order`: Número inteiro indicando posição de exibição (0, 1, 2, ...). Padrão: calculado pelo índice no array

**Inclusão em Atendimentos:**
- Ao criar atendimento (`POST /attendances`), forneça `medicalNotes` como array
- Ao atualizar atendimento (`PUT /attendances/:id`), forneça `medicalNotes` para **substituir todas as notas anteriores**
- Ao buscar atendimento (`GET /attendances/:id`), as notas são incluídas no objeto resposta, ordenadas por `order`

**Exemplo de Resposta Completa (GET /attendances/:id):**
```json
{
  "id": "att-123",
  "patientId": "pat-456",
  "professionalId": "doc-789",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Queixa principal",
  "presentingIllness": "...",
  "medicalHistory": "...",
  "physicalExamination": "...",
  "diagnosis": "...",
  "treatment": "...",
  "bloodPressure": "120/80",
  "heartRate": 72,
  "temperature": 36.8,
  "respiratoryRate": 16,
  "status": "EmAndamento",
  "medicalNotes": [
    {
      "id": "note-1",
      "attendanceId": "att-123",
      "title": "Queixa Principal",
      "content": "Paciente relata dor de cabeça intensa",
      "mode": "simple",
      "order": 0,
      "createdAt": "2025-12-24T10:00:00Z",
      "updatedAt": "2025-12-24T10:00:00Z"
    },
    {
      "id": "note-2",
      "attendanceId": "att-123",
      "title": "Diagnóstico",
      "content": "<p><strong>Migrânea</strong> com aura</p>",
      "mode": "advanced",
      "order": 1,
      "createdAt": "2025-12-24T10:01:00Z",
      "updatedAt": "2025-12-24T10:01:00Z"
    }
  ],
  "prescriptions": [...],
  "attachments": [...]
}
```

---

Mensagens de erro (validação DTO)

- Os DTOs retornam mensagens de validação em português, por exemplo:
  - `ID do paciente é obrigatório`
  - `Data do atendimento deve ser uma data válida`
  - `Título da nota é obrigatório`
  - `Conteúdo da nota é obrigatório`
  - `Modo deve ser "advanced" ou "simple"`
  - `Queixa principal é obrigatória`
  - `Frequência cardíaca deve ser maior ou igual a 0`


Permissões

- O módulo adiciona a tag de menu `atendimento`. Ajuste permissões no sistema de `nivel_acesso` conforme necessário.

