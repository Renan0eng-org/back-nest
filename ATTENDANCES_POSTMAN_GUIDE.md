# 📋 Guia de Rotas - Atendimentos (Postman)

**Versão**: 2.0  
**Data**: 29/12/2025  
**Base URL**: `http://localhost:3000/attendances` (ou sua URL base)

---

## 📌 Variáveis Globais Recomendadas (Postman)

```
{{BASE_URL}} = http://localhost:3000
{{TOKEN}} = seu_jwt_token_aqui
{{PATIENT_ID}} = id-do-paciente
{{PROFESSIONAL_ID}} = id-do-profissional
{{ATTENDANCE_ID}} = id-do-atendimento
```

---

## 🎯 Rotas Principais

### 1️⃣ LISTAR ATENDIMENTOS

**GET** `{{BASE_URL}}/attendances`

**Query Parameters:**
```
page=1
pageSize=10
patientName=João (opcional)
professionalName=Dr. Silva (opcional)
status=EmAndamento (opcional: EmAndamento | Concluido | Cancelado)
attendanceFrom=2025-12-01 (opcional)
attendanceTo=2025-12-31 (opcional)
createdFrom=2025-12-01 (opcional)
createdTo=2025-12-31 (opcional)
appointmentId=uuid (opcional)
```

**Headers:**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Exemplo Response (200):**
```json
{
  "total": 5,
  "page": 1,
  "pageSize": 10,
  "data": [
    {
      "id": "cuid123",
      "appointmentId": "apt456",
      "patientId": "pat789",
      "professionalId": "prof111",
      "attendanceDate": "2025-12-24T10:00:00Z",
      "chiefComplaint": "Dor de cabeça intensa",
      "presentingIllness": "Iniciou há 2 dias",
      "medicalHistory": null,
      "physicalExamination": "Paciente apresenta fotofobia",
      "diagnosis": "Migrânea com aura",
      "treatment": "Analgésico e repouso",
      "bloodPressure": "120/80",
      "heartRate": 72,
      "temperature": 37.5,
      "respiratoryRate": 16,
      "status": "EmAndamento",
      "createdAt": "2025-12-24T09:30:00Z",
      "updatedAt": "2025-12-24T09:30:00Z",
      "patient": {
        "idUser": "pat789",
        "name": "João Silva",
        "email": "joao@example.com",
        "cpf": "123.456.789-00"
      },
      "professional": {
        "idUser": "prof111",
        "name": "Dr. Carlos",
        "email": "carlos@example.com"
      },
      "prescription": [],
      "medicalNotes": []
    }
  ]
}
```

---

### 2️⃣ OBTER ATENDIMENTO POR ID

**GET** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
```

**Exemplo Response (200):**
```json
{
  "id": "cuid123",
  "appointmentId": "apt456",
  "patientId": "pat789",
  "professionalId": "prof111",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Dor de cabeça intensa",
  "presentingIllness": "Iniciou há 2 dias",
  "medicalHistory": "Histórico familiar de migrânea",
  "physicalExamination": "Fotofobia moderada",
  "diagnosis": "Migrânea com aura",
  "treatment": "Prescrever analgésico",
  "bloodPressure": "120/80",
  "heartRate": 72,
  "temperature": 37.5,
  "respiratoryRate": 16,
  "status": "EmAndamento",
  "createdAt": "2025-12-24T09:30:00Z",
  "updatedAt": "2025-12-24T09:30:00Z",
  "patient": {
    "idUser": "pat789",
    "name": "João Silva",
    "email": "joao@example.com",
    "cpf": "123.456.789-00"
  },
  "professional": {
    "idUser": "prof111",
    "name": "Dr. Carlos",
    "email": "carlos@example.com"
  },
  "appointment": {
    "id": "apt456",
    "scheduledAt": "2025-12-24T10:00:00Z"
  },
  "prescriptions": [],
  "attachments": [],
  "medicalNotes": [
    {
      "id": "note123",
      "attendanceId": "cuid123",
      "title": "Queixa Principal",
      "content": "<p>Dor de cabeça intensa</p>",
      "mode": "advanced",
      "order": 0,
      "createdAt": "2025-12-24T09:30:00Z",
      "updatedAt": "2025-12-24T09:30:00Z"
    },
    {
      "id": "note124",
      "attendanceId": "cuid123",
      "title": "Observações",
      "content": "• Paciente com fotofobia\n• Dor pulsátil",
      "mode": "simple",
      "order": 1,
      "createdAt": "2025-12-24T09:31:00Z",
      "updatedAt": "2025-12-24T09:31:00Z"
    }
  ],
  "assignedForms": [],
  "responses": []
}
```

---

### 3️⃣ CRIAR ATENDIMENTO (Novo)

**POST** `{{BASE_URL}}/attendances`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "patientId": "pat789",
  "professionalId": "prof111",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Dor de cabeça intensa",
  "presentingIllness": "Iniciou há 2 dias, acompanhada de febre",
  "medicalHistory": "Histórico familiar de migrânea",
  "physicalExamination": "Paciente apresenta fotofobia moderada",
  "diagnosis": "Migrânea com aura",
  "treatment": "Prescrever analgésico e repouso",
  "bloodPressure": "120/80",
  "heartRate": 72,
  "temperature": 37.5,
  "respiratoryRate": 16,
  "medicalNotes": [
    {
      "title": "Queixa Principal",
      "content": "<p><strong>Dor de cabeça</strong> intensa</p>",
      "mode": "advanced",
      "order": 0
    },
    {
      "title": "Observações",
      "content": "• Fotofobia\n• Dor pulsátil\n• Sensibilidade ao som",
      "mode": "simple",
      "order": 1
    }
  ]
}
```

**Campos Obrigatórios:**
- `patientId` ✅
- `professionalId` ✅
- `attendanceDate` ✅
- `chiefComplaint` ✅

**Exemplo Response (201):**
```json
{
  "id": "cuid123",
  "appointmentId": null,
  "patientId": "pat789",
  "professionalId": "prof111",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Dor de cabeça intensa",
  "presentingIllness": "Iniciou há 2 dias, acompanhada de febre",
  "medicalHistory": "Histórico familiar de migrânea",
  "physicalExamination": "Paciente apresenta fotofobia moderada",
  "diagnosis": "Migrânea com aura",
  "treatment": "Prescrever analgésico e repouso",
  "bloodPressure": "120/80",
  "heartRate": 72,
  "temperature": "37.50",
  "respiratoryRate": 16,
  "status": "EmAndamento",
  "createdAt": "2025-12-29T10:30:00Z",
  "updatedAt": "2025-12-29T10:30:00Z",
  "medicalNotes": [
    {
      "id": "note123",
      "attendanceId": "cuid123",
      "title": "Queixa Principal",
      "content": "<p><strong>Dor de cabeça</strong> intensa</p>",
      "mode": "advanced",
      "order": 0,
      "createdAt": "2025-12-29T10:30:00Z",
      "updatedAt": "2025-12-29T10:30:00Z"
    },
    {
      "id": "note124",
      "attendanceId": "cuid123",
      "title": "Observações",
      "content": "• Fotofobia\n• Dor pulsátil\n• Sensibilidade ao som",
      "mode": "simple",
      "order": 1,
      "createdAt": "2025-12-29T10:30:00Z",
      "updatedAt": "2025-12-29T10:30:00Z"
    }
  ]
}
```

---

### 4️⃣ CRIAR ATENDIMENTO A PARTIR DE AGENDAMENTO

**POST** `{{BASE_URL}}/attendances/from-appointment/:appointmentId`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "chiefComplaint": "Consulta de rotina",
  "presentingIllness": "Sem queixa principal",
  "medicalHistory": null,
  "physicalExamination": "Exame físico normal",
  "diagnosis": "Paciente saudável",
  "treatment": "Nenhum tratamento necessário",
  "bloodPressure": "120/80",
  "heartRate": 70,
  "temperature": 36.5,
  "respiratoryRate": 16,
  "medicalNotes": [
    {
      "title": "Resumo da Consulta",
      "content": "Consulta de rotina sem achados relevantes",
      "mode": "simple",
      "order": 0
    }
  ]
}
```

**Campos Obrigatórios:**
- `chiefComplaint` ✅

**Exemplo Response (201):**
```json
{
  "id": "cuid456",
  "appointmentId": "apt456",
  "patientId": "pat789",
  "professionalId": "prof111",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Consulta de rotina",
  "presentingIllness": "Sem queixa principal",
  "medicalHistory": null,
  "physicalExamination": "Exame físico normal",
  "diagnosis": "Paciente saudável",
  "treatment": "Nenhum tratamento necessário",
  "bloodPressure": "120/80",
  "heartRate": 70,
  "temperature": "36.50",
  "respiratoryRate": 16,
  "status": "EmAndamento",
  "createdAt": "2025-12-29T10:40:00Z",
  "medicalNotes": [
    {
      "id": "note200",
      "title": "Resumo da Consulta",
      "content": "Consulta de rotina sem achados relevantes",
      "mode": "simple",
      "order": 0
    }
  ]
}
```

---

### 5️⃣ ATUALIZAR ATENDIMENTO

**PUT** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Body (JSON) - Exemplo 1: Atualizar dados clínicos**
```json
{
  "diagnosis": "Migrânea com aura (confirmado)",
  "treatment": "Prescrever tripitano + repouso",
  "status": "Concluido",
  "bloodPressure": "118/76"
}
```

**Body (JSON) - Exemplo 2: Substituir notas médicas**
```json
{
  "medicalNotes": [
    {
      "title": "Queixa Principal",
      "content": "<p>Dor de cabeça INTENSA revisada</p>",
      "mode": "advanced",
      "order": 0
    },
    {
      "title": "Avaliação Clínica",
      "content": "Paciente com melhora após medicação",
      "mode": "simple",
      "order": 1
    },
    {
      "title": "Orientações",
      "content": "Repouso absoluto por 24h",
      "mode": "simple",
      "order": 2
    }
  ]
}
```

**Nota Importante:** Se `medicalNotes` é fornecido, **todas as notas anteriores serão deletadas** e substituídas pelas novas.

**Exemplo Response (200):**
```json
{
  "id": "cuid123",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Dor de cabeça intensa",
  "diagnosis": "Migrânea com aura (confirmado)",
  "treatment": "Prescrever tripitano + repouso",
  "bloodPressure": "118/76",
  "status": "Concluido",
  "updatedAt": "2025-12-29T11:00:00Z",
  "medicalNotes": [
    {
      "id": "note999",
      "title": "Queixa Principal",
      "content": "<p>Dor de cabeça INTENSA revisada</p>",
      "mode": "advanced",
      "order": 0
    },
    {
      "id": "note1000",
      "title": "Avaliação Clínica",
      "content": "Paciente com melhora após medicação",
      "mode": "simple",
      "order": 1
    },
    {
      "id": "note1001",
      "title": "Orientações",
      "content": "Repouso absoluto por 24h",
      "mode": "simple",
      "order": 2
    }
  ]
}
```

---

### 6️⃣ ATUALIZAR STATUS

**PUT** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/status`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "status": "Concluido"
}
```

**Valores Aceitos:**
- `EmAndamento`
- `Concluido`
- `Cancelado`

**Exemplo Response (200):**
```json
{
  "id": "cuid123",
  "status": "Concluido",
  "updatedAt": "2025-12-29T11:05:00Z"
}
```

---

### 7️⃣ DELETAR ATENDIMENTO

**DELETE** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
```

**Exemplo Response (200):**
```json
{
  "id": "cuid123",
  "message": "Atendimento deletado com sucesso"
}
```

---

## 💊 Prescrições

### Criar Prescrição

**POST** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/prescriptions`

**Headers:**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "medication": "Dipirona",
  "dosage": "500mg",
  "frequency": "8 em 8 horas",
  "duration": "5 dias",
  "instructions": "Tomar após refeições"
}
```

**Exemplo Response (201):**
```json
{
  "id": "presc123",
  "attendanceId": "cuid123",
  "medication": "Dipirona",
  "dosage": "500mg",
  "frequency": "8 em 8 horas",
  "duration": "5 dias",
  "instructions": "Tomar após refeições",
  "createdAt": "2025-12-29T11:10:00Z"
}
```

---

### Atualizar Prescrição

**PUT** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/prescriptions/{{PRESCRIPTION_ID}}`

**Body (JSON):**
```json
{
  "frequency": "6 em 6 horas",
  "duration": "7 dias"
}
```

---

### Deletar Prescrição

**DELETE** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/prescriptions/{{PRESCRIPTION_ID}}`

---

## 📋 Formulários e Respostas

### Listar Formulários Disponíveis

**GET** `{{BASE_URL}}/forms/available?isScreening=true`

**Query Parameters:**
```
isScreening=true (opcional: true | false)
```

---

### Atribuir Formulários

**POST** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/assign-forms`

**Body (JSON):**
```json
{
  "formIds": ["form-uuid-1", "form-uuid-2"]
}
```

---

### Desatribuir Formulários

**POST** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/unassign-forms`

**Body (JSON):**
```json
{
  "formIds": ["form-uuid-1"]
}
```

---

### Listar Formulários Atribuídos

**GET** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/assigned-forms`

---

### Vincular Resposta

**POST** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/link-response`

**Body (JSON):**
```json
{
  "responseId": "resp-uuid-123"
}
```

---

### Desvincular Resposta

**DELETE** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/responses/{{RESPONSE_ID}}`

---

### Listar Respostas do Atendimento

**GET** `{{BASE_URL}}/attendances/{{ATTENDANCE_ID}}/responses`

---

## 🔥 Notas Importantes

### 1. Medical Notes (Notas Médicas)

- São armazenadas em uma **tabela separada** (`MedicalNote`)
- Cada nota possui: `id`, `title`, `content`, `mode`, `order`
- **Mode**: `"advanced"` (HTML via Quill) ou `"simple"` (texto plano)
- **Order**: Determina a ordem de exibição nas abas

### 2. Atualização de Notes

Ao fazer **PUT** em um atendimento com `medicalNotes`:
- Todas as notas antigas são **deletadas**
- Novas notas são **criadas**
- A ordem é preservada pelo campo `order`

### 3. Códigos de Erro

```
400 Bad Request → Validação falhou
  "message": "Queixa principal é obrigatória"
  
404 Not Found → Atendimento/Paciente/Profissional não existe
  "message": "Atendimento não encontrado"
  
401 Unauthorized → Token inválido ou ausente
  
500 Internal Server Error → Erro no servidor
```

### 4. Filtros de Data

Formato: **ISO 8601** (ex.: `2025-12-24` ou `2025-12-24T10:00:00Z`)

```
attendanceFrom=2025-12-01
attendanceTo=2025-12-31
createdFrom=2025-12-01
createdTo=2025-12-31
```

---

## 📊 Exemplo de Workflow Completo

### 1. Criar Atendimento
```
POST /attendances
{
  "patientId": "pat789",
  "professionalId": "prof111",
  "attendanceDate": "2025-12-24T10:00:00Z",
  "chiefComplaint": "Dor de cabeça"
}
→ Retorna: id = "cuid123"
```

### 2. Adicionar Notas
```
PUT /attendances/cuid123
{
  "medicalNotes": [
    { "title": "Principal", "content": "Dor de cabeça", "mode": "simple" }
  ]
}
```

### 3. Adicionar Prescrição
```
POST /attendances/cuid123/prescriptions
{
  "medication": "Dipirona",
  "dosage": "500mg"
}
```

### 4. Finalizar
```
PUT /attendances/cuid123/status
{
  "status": "Concluido"
}
```

---

**Última atualização**: 29/12/2025  
**Versão da API**: 2.0  
**Status**: ✅ Ativo
