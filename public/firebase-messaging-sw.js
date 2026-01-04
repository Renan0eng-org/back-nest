// firebase-messaging-sw.js
// Service Worker para gerenciar notificações em background

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
});

// Obter instância de messaging
const messaging = firebase.messaging();

// Lidar com notificações em background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificação em background:', payload);
  
  const notificationTitle = payload.notification?.title || 'Notificação';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/notification-icon.png',
    tag: payload.data?.appointmentId || 'default',
    data: payload.data,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lidar com cliques nas notificações
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notificação clicada:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Processar dados da notificação
  const data = event.notification.data;
  let urlToOpen = '/';

  if (data?.appointmentId) {
    urlToOpen = `/appointments/${data.appointmentId}`;
  } else if (data?.patientId) {
    urlToOpen = `/patients/${data.patientId}`;
  } else if (data?.type === 'announcement') {
    urlToOpen = '/announcements';
  }

  // Abrir janela/aba
  return clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(clientList) {
    // Verificar se já existe aba aberta
    for (let i = 0; i < clientList.length; i++) {
      const client = clientList[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    // Abrir nova aba se não existir
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });
});

// Lidar com fechar notificações
self.addEventListener('notificationclose', function(event) {
  console.log('[firebase-messaging-sw.js] Notificação fechada:', event);
});
