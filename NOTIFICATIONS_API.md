# API de Notificações - Documentação

## Visão Geral

Sistema completo de notificações com:
- **Histórico persistente** (sino de notificações)
- **Status de leitura** (não lidas/lidas/arquivadas)
- **Web Push Notifications** (notificações no navegador)
- **Broadcast** (envio para múltiplos usuários)

---

## Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# Web Push (VAPID Keys)
VAPID_PUBLIC_KEY=BK...seu-vapid-public-key
VAPID_PRIVATE_KEY=abc...seu-vapid-private-key
WEB_PUSH_SUBJECT=mailto:admin@example.com
```

**Como gerar VAPID Keys:**
```bash
npx web-push generate-vapid-keys
```

---

## Rotas - Push Subscriptions

### POST `/push/subscribe`
Registra uma assinatura de Web Push para o usuário autenticado.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc123...",
  "keys": {
    "p256dh": "BK...base64-public-key",
    "auth": "a1b2c3...base64-auth-secret"
  },
  "userAgent": "Chrome/120.0 (Windows)"
}
```

**Resposta (201):**
```json
{
  "id": "8f3b4a5c-1234-5678-90ab-cdef12345678"
}
```

**Regras:**
- Upsert por `endpoint` (se já existir, atualiza o `userId`)
- Remove `disabledAt` ao re-registrar
- Limite recomendado: 20 subscriptions ativas por usuário

---

### DELETE `/push/subscribe`
Desabilita uma assinatura de push.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/abc123..."
}
```

**Resposta (200):**
```json
{
  "status": 204
}
```

---

## Rotas - Notificações

### POST `/notifications`
Cria uma notificação e opcionalmente envia push.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Consulta agendada",
  "body": "Você tem uma consulta amanhã às 10h.",
  "data": {
    "url": "/admin/agendamentos/123",
    "appointmentId": "appt-456"
  },
  "category": "agendamento",
  "priority": 1,
  "targets": {
    "userIds": ["user-123", "user-456"]
  },
  "sendPush": true
}
```

**Campos:**
- `title` (obrigatório): Título da notificação
- `body` (opcional): Corpo/mensagem
- `data` (opcional): Objeto JSON com dados customizados (ex: URL de destino)
- `category` (opcional): Categoria para filtros (ex: "agendamento", "sistema")
- `priority` (opcional): 0=normal, 1=alta (default: 0)
- `targets` (opcional): Define quem recebe
  - `userIds`: Array de IDs de usuários
  - `roles`: Array de roles (futuro)
  - `filters`: Filtros customizados (futuro)
- `sendPush` (opcional): Se `true`, envia Web Push imediatamente

**Resposta (201):**
```json
{
  "notificationId": "notif-789",
  "recipients": 2
}
```

---

### GET `/notifications`
Lista notificações do usuário autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
- `status` (opcional): `UNREAD` | `READ` | `ARCHIVED`
- `category` (opcional): Filtrar por categoria
- `limit` (opcional): Número de itens (default: 20, max: 100)
- `after` (opcional): Cursor para paginação (base64)

**Exemplo:**
```
GET /notifications?status=UNREAD&limit=20
```

**Resposta (200):**
```json
{
  "items": [
    {
      "id": "notif-789",
      "title": "Consulta agendada",
      "body": "Você tem uma consulta amanhã às 10h.",
      "data": {
        "url": "/admin/agendamentos/123"
      },
      "status": "UNREAD",
      "category": "agendamento",
      "priority": 1,
      "createdAt": "2025-12-19T10:30:00Z",
      "readAt": null
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI1LTEyLTE5..."
}
```

**Paginação:**
- Use `nextCursor` da resposta anterior no param `after`
- Ordenação: `createdAt DESC`

---

### GET `/notifications/unread-count`
Retorna quantidade de notificações não lidas.

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta (200):**
```json
{
  "count": 5
}
```

---

### PATCH `/notifications/:id/read`
Marca uma notificação como lida ou não lida.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (opcional):**
```json
{
  "read": true
}
```
- `read: true` → marca como lida (default)
- `read: false` → marca como não lida

**Resposta (200):**
```json
{
  "status": 204
}
```

---

### PATCH `/notifications/read-all`
Marca todas as notificações como lidas.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body (opcional):**
```json
{
  "category": "agendamento",
  "before": "2025-12-19T23:59:59Z"
}
```
- `category` (opcional): Marcar apenas de uma categoria
- `before` (opcional): Marcar apenas criadas antes dessa data

**Resposta (200):**
```json
{
  "status": 204
}
```

---

### DELETE `/notifications/:id`
Arquiva uma notificação (soft delete).

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta (200):**
```json
{
  "status": 204
}
```

---

## Fluxo Completo

### 1. Frontend: Assinatura de Push
```javascript
// Solicita permissão e registra
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: 'BK...VAPID_PUBLIC_KEY'
});

// Envia para backend
await fetch('/push/subscribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
    },
    userAgent: navigator.userAgent
  })
});
```

### 2. Backend: Criar e Enviar Notificação
```typescript
// Exemplo: Após criar agendamento
await notificationsService.create({
  title: 'Consulta confirmada',
  body: `Sua consulta foi agendada para ${date}`,
  data: { url: `/appointments/${id}` },
  category: 'agendamento',
  priority: 1,
  targets: { userIds: [patientId] },
  sendPush: true
}, createdByUserId);
```

### 3. Frontend: Listar Notificações
```javascript
const { items, nextCursor } = await fetch('/notifications?status=UNREAD&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Exibir no sino
items.forEach(notif => {
  console.log(`${notif.title}: ${notif.body}`);
});
```

### 4. Frontend: Marcar como Lida
```javascript
// Ao clicar na notificação
await fetch(`/notifications/${notifId}/read`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` }
});

// Navegar para URL
if (notif.data?.url) {
  router.push(notif.data.url);
}
```

---

## Modelo de Dados

### Notification
```prisma
model Notification {
  id           String   @id @default(uuid())
  title        String
  body         String?
  data         Json?
  category     String?
  priority     Int      @default(0)
  createdAt    DateTime @default(now())
  createdById  String?
  
  createdBy         User?              @relation("NotificationCreatedBy")
  userNotifications UserNotification[]
}
```

### UserNotification
```prisma
model UserNotification {
  id             String             @id @default(uuid())
  status         NotificationStatus @default(UNREAD)
  deliveredAt    DateTime?
  readAt         DateTime?
  muted          Boolean            @default(false)
  createdAt      DateTime           @default(now())
  
  notificationId String
  notification   Notification @relation(...)
  
  userId         String
  user           User @relation(...)
  
  @@unique([notificationId, userId])
  @@index([userId, status, createdAt])
}
```

### PushSubscription
```prisma
model PushSubscription {
  id            String    @id @default(uuid())
  endpoint      String    @unique
  p256dh        String
  auth          String
  userAgent     String?
  createdAt     DateTime  @default(now())
  lastSuccessAt DateTime?
  disabledAt    DateTime?
  
  userId        String
  user          User @relation(...)
  
  @@index([userId])
}
```

---

## Segurança

1. **Autenticação obrigatória**: Todas as rotas exigem `Authorization: Bearer {token}`
2. **Isolamento por usuário**: Queries sempre filtram por `userId` do token
3. **Validação de endpoint**: Subscriptions são unique por endpoint
4. **Rate limiting**: Recomendado implementar limite de criação (ex: 100 notifs/min)
5. **VAPID Keys**: Nunca exponha a chave privada no frontend

---

## Boas Práticas

### Performance
- Use paginação com cursor (não offset)
- Índices compostos: `(userId, status, createdAt)`
- Limite de 20-50 notificações por página

### UX
- Badge no sino com `unread-count`
- Notificação local imediata (não espera push)
- Clique abre URL do `data.url`
- Marcar como lida ao abrir

### Resiliência
- Push é "best effort" (pode falhar)
- Histórico garante entrega mesmo sem push
- Auto-disable em 410/404 (subscription inválida)
- Retry opcional com `POST /notifications/:id/resend`

---

## Exemplos de Uso

### Notificação de Sistema
```json
{
  "title": "Manutenção programada",
  "body": "O sistema ficará offline amanhã das 2h às 4h.",
  "category": "sistema",
  "priority": 0,
  "targets": { "userIds": ["all-users"] },
  "sendPush": true
}
```

### Lembrete de Agendamento
```json
{
  "title": "Consulta em 1 hora",
  "body": "Não se esqueça da consulta às 15h com Dr. Silva.",
  "data": { "url": "/appointments/789" },
  "category": "lembrete",
  "priority": 1,
  "targets": { "userIds": ["patient-123"] },
  "sendPush": true
}
```

### Broadcast para Role
```json
{
  "title": "Novo formulário disponível",
  "body": "Triagem COVID-19 ativa para preenchimento.",
  "category": "formulario",
  "targets": { "roles": ["MEDICO", "ADMIN"] },
  "sendPush": false
}
```

---

## Migrações

Execute para criar as tabelas:

```bash
npx prisma migrate dev --name notifications_system
npx prisma generate
```

---

## Testes

### Testar Push Manual
```bash
# Usar Postman ou cURL
curl -X POST http://localhost:3000/notifications \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "body": "Hello World",
    "targets": { "userIds": ["your-user-id"] },
    "sendPush": true
  }'
```

### Verificar Subscriptions
```sql
SELECT * FROM "PushSubscription" WHERE "disabledAt" IS NULL;
```

---

## Troubleshooting

### Push não chega
1. Verificar permissões do navegador
2. Confirmar VAPID keys corretas
3. Checar `disabledAt` na subscription
4. Validar formato do payload (max 4KB)

### Notificações duplicadas
- Unique constraint `(notificationId, userId)` previne isso
- Use `skipDuplicates: true` no `createMany`

### Performance lenta
- Verificar índices: `userId, status, createdAt`
- Paginar com cursor (não offset)
- Limitar `limit` param (max 100)
