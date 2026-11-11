/**
 * SISTEMA DE AGENDAMENTO DE AUDITÓRIOS - CENTRAL DE AULAS (PRG / UFPB)
 * Configuração do Firebase & Detecção Automática
 * 
 * INSTRUÇÕES:
 * 1. Crie um projeto no console do Firebase: https://console.firebase.google.com/
 * 2. Em "Configurações do Projeto" > "Geral" > "Seus aplicativos", crie um app Web (</>).
 * 3. Copie as credenciais e substitua no objeto firebaseConfig abaixo.
 * 4. Ative os serviços no console:
 *    - "Authentication" (ative Provedor de E-mail/Senha)
 *    - "Cloud Firestore" (crie o banco de dados no modo de teste ou aplique firestore.rules)
 *    - "Hosting" (para publicar gratuitamente com 'firebase deploy')
 */

const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto-prg.firebaseapp.com",
  projectId: "seu-projeto-prg",
  storageBucket: "seu-projeto-prg.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Verifica se as credenciais reais foram preenchidas
function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "seu-projeto-prg"
  );
}

// Instâncias globais
window.isFirebaseActive = false;
window.fbAuth = null;
window.fbDb = null;
window.firebaseConfig = firebaseConfig;

// Inicialização segura
try {
  if (isFirebaseConfigured() && typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.fbAuth = firebase.auth();
    window.fbDb = firebase.firestore();
    window.isFirebaseActive = true;
    console.log("✅ Conectado com sucesso ao Firebase!");
  } else {
    console.info("ℹ️ Firebase não configurado. Rodando em Modo Demonstração com LocalStorage.");
    window.isFirebaseActive = false;
  }
} catch (error) {
  console.warn("⚠️ Erro ao inicializar Firebase. Alternando para Modo Demonstração:", error);
  window.isFirebaseActive = false;
}
