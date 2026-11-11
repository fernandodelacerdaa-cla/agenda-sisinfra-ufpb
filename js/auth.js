/**
 * SISTEMA DE AGENDAMENTO DE AUDITÓRIOS - CENTRAL DE AULAS (PRG / UFPB)
 * Serviço de Autenticação e Controle de Acesso (RBAC)
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    // Carrega sessão salva no sessionStorage
    const saved = sessionStorage.getItem("prg_current_user");
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = null;
      }
    }

    // Se Firebase estiver ativo, monitora estado da sessão
    if (window.isFirebaseActive && window.fbAuth) {
      window.fbAuth.onAuthStateChanged(async (user) => {
        if (user) {
          // Busca dados do perfil no Firestore
          try {
            const doc = await window.fbDb.collection("usuarios").where("email", "==", user.email).limit(1).get();
            if (!doc.empty) {
              const uData = doc.docs[0].data();
              this.currentUser = { id: doc.docs[0].id, ...uData };
              sessionStorage.setItem("prg_current_user", JSON.stringify(this.currentUser));
            }
          } catch (err) {
            console.error("Erro ao sincronizar perfil do Firebase:", err);
          }
        } else if (!saved) {
          this.currentUser = null;
        }
        window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: this.currentUser }));
      });
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.perfil === "admin";
  }

  isOperator() {
    return this.currentUser && (this.currentUser.perfil === "operador" || this.currentUser.perfil === "admin");
  }

  canEditBooking(booking) {
    if (!this.isLoggedIn()) return false;
    if (this.isAdmin()) return true;
    if (this.isOperator()) return true; // Operadores autorizados podem gerenciar
    return false;
  }

  async login(email, senha) {
    email = email.trim().toLowerCase();

    // Se o usuário digitou apenas o prefixo (sem @), completa automaticamente com @academico.ufpb.br
    if (!email.includes("@")) {
      email = `${email}@academico.ufpb.br`;
    }

    if (!email.endsWith("@academico.ufpb.br")) {
      throw new Error("Acesso restrito! O login deve ser realizado com uma conta do domínio institucional @academico.ufpb.br.");
    }

    // 1. Tenta login no Firebase se ativo
    if (window.isFirebaseActive && window.fbAuth) {
      try {
        const userCred = await window.fbAuth.signInWithEmailAndPassword(email, senha);
        const snap = await window.fbDb.collection("usuarios").where("email", "==", email).limit(1).get();
        if (!snap.empty) {
          const profile = { id: snap.docs[0].id, ...snap.docs[0].data() };
          if (profile.status === "inativo") {
            await window.fbAuth.signOut();
            throw new Error("Seu acesso foi desativado pela coordenação da Central de Aulas.");
          }
          this.currentUser = profile;
          sessionStorage.setItem("prg_current_user", JSON.stringify(this.currentUser));
          window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: this.currentUser }));
          return this.currentUser;
        }
      } catch (firebaseErr) {
        console.warn("Falha no login do Firebase:", firebaseErr);
        throw new Error(this.translateFirebaseError(firebaseErr.code) || firebaseErr.message);
      }
    }

    // 2. Fallback / Modo Demonstração (LocalStorage)
    const usuarios = await window.storageService.getUsuarios();
    const user = usuarios.find(u => u.email.toLowerCase() === email);

    if (!user) {
      throw new Error("Usuário não encontrado. Verifique o e-mail informado.");
    }

    if (user.senha && user.senha !== senha) {
      throw new Error("Senha incorreta. Tente novamente.");
    }

    if (user.status === "inativo") {
      throw new Error("Seu acesso está inativo no momento. Procure a PRG / Central de Aulas.");
    }

    this.currentUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      setor: user.setor,
      perfil: user.perfil,
      status: user.status
    };

    sessionStorage.setItem("prg_current_user", JSON.stringify(this.currentUser));
    window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: this.currentUser }));
    return this.currentUser;
  }

  async logout() {
    if (window.isFirebaseActive && window.fbAuth) {
      try {
        await window.fbAuth.signOut();
      } catch (e) {
        console.error("Erro ao sair do Firebase:", e);
      }
    }
    this.currentUser = null;
    sessionStorage.removeItem("prg_current_user");
    window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: null }));
  }

  // Atalho para teste rápido em demonstração
  async quickLogin(role = "admin") {
    if (role === "admin") {
      return await this.login("admin@academico.ufpb.br", "admin123");
    } else {
      return await this.login("operador@academico.ufpb.br", "operador123");
    }
  }

  translateFirebaseError(code) {
    switch (code) {
      case "auth/user-not-found":
        return "Nenhum usuário cadastrado com este e-mail.";
      case "auth/wrong-password":
        return "Senha incorreta.";
      case "auth/invalid-email":
        return "Formato de e-mail inválido.";
      case "auth/user-disabled":
        return "Este usuário foi desativado.";
      default:
        return null;
    }
  }
}

window.authService = new AuthService();
