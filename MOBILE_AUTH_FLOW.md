# Fluxo de Autenticação Mobile — Pré-Aprovação & Notificações

## Visão Geral

O app mobile permite que pacientes se registrem e recebam um **token de pré-aprovação** mesmo antes de serem ativados pelo admin. Com esse token, o usuário consegue **apenas se registrar para notificações push** (Firebase). Ele **não pode acessar nenhum dado** do sistema até ser ativado.

Quando o admin ativa o usuário, ele recebe uma **notificação push** dizendo que já tem acesso ao sistema.

---

## Rotas

### 1. `POST /auth/register` — Registro Mobile

Cria o usuário com `active: false` e retorna um **token JWT imediatamente**.

**Request:**
```json
{
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678901",
    "password": "senha123"
}
```

**Response (201):**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "idUser": "uuid-aqui",
        "name": "João Silva",
        "email": "joao@email.com",
        "cpf": "12345678901",
        "active": false,
        "type": "PACIENTE"
    }
}
```

**O que o app deve fazer:**
1. Salvar o `access_token` no storage do dispositivo.
2. Verificar `user.active` — se `false`, mostrar tela de "Aguardando aprovação".
3. Imediatamente chamar `POST /push/subscribe` para registrar o device token do Firebase.

---

### 2. `POST /auth/login` — Login Mobile

Permite login **mesmo que o usuário esteja inativo**. Retorna o token e o status do usuário.

**Request:**
```json
{
    "cpf": "12345678901",
    "password": "senha123"
}
```

**Response — Usuário INATIVO (200):**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "idUser": "uuid-aqui",
        "name": "João Silva",
        "email": "joao@email.com",
        "active": false,
        "type": "PACIENTE"
    }
}
```

**Response — Usuário ATIVO (200):**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "idUser": "uuid-aqui",
        "name": "João Silva",
        "email": "joao@email.com",
        "active": true,
        "type": "PACIENTE"
    }
}
```

**O que o app deve fazer:**
1. Salvar o `access_token`.
2. Se `user.active === false`: mostrar tela de "Aguardando aprovação" e chamar `POST /push/subscribe`.
3. Se `user.active === true`: navegar para a tela principal e chamar `POST /push/subscribe`.

---

### 3. `POST /push/subscribe` — Registrar para Notificações Push

Funciona com **qualquer token válido**, inclusive de usuários inativos. É assim que o usuário inativo se registra para receber a notificação de ativação.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
    "deviceToken": "firebase-fcm-token-do-dispositivo",
    "userAgent": "MeuApp/1.0 Android"
}
```

**Response (201):**
```json
{
    "id": 1,
    "message": "Dispositivo registrado para notificações push"
}
```

**Importante:** O `deviceToken` é o token FCM obtido via Firebase Messaging no app mobile.

---

### 4. `DELETE /push/subscribe` — Remover registro de notificações

**Request:**
```json
{
    "deviceToken": "firebase-fcm-token-do-dispositivo"
}
```

---

## Rotas Web (Cookie-based) — Explicação

### `POST /auth/refresh`

**Como funciona:**
- Essa rota é para o **frontend web** (não mobile).
- Ela lê o cookie `refresh_token` (HttpOnly, enviado automaticamente pelo browser).
- Verifica se o refresh token é válido e não expirou.
- Busca o usuário pelo `sub` do token — **requer `active: true`**.
- Gera um novo par `accessToken` + `refreshToken`.
- Sobrescreve o cookie `refresh_token` com o novo valor.
- Retorna `{ accessToken }` no body.

**Se o token expirou ou é inválido:** limpa o cookie e retorna `401 Unauthorized`.

**Fluxo do frontend web:**
```
[App detecta accessToken expirado]
    → POST /auth/refresh (cookie refresh_token vai automaticamente)
    → Recebe novo accessToken no body + novo cookie refresh_token
    → Continua usando o novo accessToken
```

### `GET /auth/me`

**Como funciona:**
- Também é para o **frontend web** (cookie-based).
- Lê o cookie `refresh_token`.
- Valida o token com `validateToken(token, { type: 'refresh' })`.
- Busca o usuário completo pelo `sub` — **requer `active: true`**.
- Retorna dados do usuário com `nivel_acesso` e `menus` (sem password).

**Uso:** O frontend web usa no carregamento inicial para saber se o usuário está logado e quais menus ele tem acesso.

> **Nota:** Essas rotas (`refresh` e `me`) NÃO funcionam para o app mobile porque dependem de cookies HttpOnly. O app mobile usa apenas o `access_token` no header `Authorization: Bearer`.

---

## Fluxo Completo — Da Instalação à Ativação

```
┌─────────────────────────────────────────────────────────┐
│                    FLUXO DO PACIENTE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. INSTALA O APP                                        │
│     └─ Abre tela de registro                             │
│                                                          │
│  2. FAZ REGISTRO (POST /auth/register)                   │
│     └─ Recebe access_token + user.active = false         │
│     └─ App salva o token                                 │
│                                                          │
│  3. REGISTRA PARA PUSH (POST /push/subscribe)            │
│     └─ Envia deviceToken (FCM) com Bearer token          │
│     └─ Agora o servidor pode enviar notificações         │
│                                                          │
│  4. APP MOSTRA TELA "AGUARDANDO APROVAÇÃO"               │
│     └─ Usuário não consegue acessar nenhuma funcionalidade│
│     └─ Pode apenas esperar                               │
│                                                          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                          │
│  5. ADMIN ATIVA O USUÁRIO (painel web)                   │
│     └─ PATCH /admin/acesso/users/:id/status              │
│     └─ Body: { "active": true }                          │
│                                                          │
│  6. SISTEMA ENVIA NOTIFICAÇÃO PUSH                       │
│     └─ Título: "Conta Ativada"                           │
│     └─ Corpo: "Sua conta foi ativada! Você já tem        │
│        acesso ao sistema."                               │
│                                                          │
│  7. PACIENTE RECEBE A NOTIFICAÇÃO NO CELULAR             │
│     └─ Abre o app                                        │
│     └─ Faz login novamente (POST /auth/login)            │
│     └─ user.active = true → acesso completo              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementação no App Mobile

### Registro
```typescript
// 1. Registrar usuário
const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, cpf, password }),
});
const { access_token, user } = await response.json();

// 2. Salvar token
await AsyncStorage.setItem('access_token', access_token);
await AsyncStorage.setItem('user', JSON.stringify(user));

// 3. Registrar para push (mesmo inativo)
const fcmToken = await messaging().getToken();
await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
    },
    body: JSON.stringify({ deviceToken: fcmToken }),
});

// 4. Redirecionar baseado no status
if (user.active) {
    navigation.navigate('Home');
} else {
    navigation.navigate('AguardandoAprovacao');
}
```

### Login
```typescript
const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, password }),
});
const { access_token, user } = await response.json();

await AsyncStorage.setItem('access_token', access_token);
await AsyncStorage.setItem('user', JSON.stringify(user));

// Re-registrar push token (pode ter mudado)
const fcmToken = await messaging().getToken();
await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
    },
    body: JSON.stringify({ deviceToken: fcmToken }),
});

if (user.active) {
    navigation.navigate('Home');
} else {
    navigation.navigate('AguardandoAprovacao');
}
```

### Listener de Notificação (tela de aguardando)
```typescript
useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        const data = remoteMessage.data;
        if (data?.type === 'user_activated') {
            // Usuário foi ativado! Redirecionar para login
            Alert.alert(
                'Conta Ativada!',
                'Sua conta foi aprovada. Faça login para acessar o sistema.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        }
    });
    return unsubscribe;
}, []);
```

---

## Resumo das Permissões por Status

| Rota | Inativo (pré-aprovação) | Ativo |
|------|------------------------|-------|
| `POST /auth/register` | ✅ Retorna token | - |
| `POST /auth/login` | ✅ Retorna token + `active: false` | ✅ Retorna token + `active: true` |
| `POST /push/subscribe` | ✅ Pode registrar | ✅ Pode registrar |
| Qualquer outra rota protegida | ❌ Bloqueado (guards checam `active`) | ✅ Permitido |
| `POST /auth/refresh` (web) | ❌ Requer ativo | ✅ Funciona |
| `GET /auth/me` (web) | ❌ Requer ativo | ✅ Funciona |

---

## Arquivo Postman

O arquivo `mobile-auth.postman_collection.json` na raiz do projeto `back-nest` pode ser importado diretamente no Postman:

1. Abra o Postman
2. Clique em **Import**
3. Selecione o arquivo `mobile-auth.postman_collection.json`
4. Altere a variável `baseUrl` se necessário (padrão: `http://localhost:3000`)
5. Execute as requisições na ordem (1 → 2 → 3)
6. Os tokens são salvos automaticamente entre as requisições
