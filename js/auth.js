/**
 * SISTEMA DE AGENDAMENTO DE AUDITÓRIOS - CENTRAL DE AULAS (PRG / UFPB)
 * Serviço de Autenticação e Controle de Acesso (RBAC) — Integrado ao Backend SQLite
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    const saved = sessionStorage.getItem("prg_current_user");
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getToken() {
    return sessionStorage.getItem("prg_auth_token") || "";
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
    if (this.isAdmin() || this.isOperator()) return true;
    return false;
  }

  async login(email, senha) {
    email = (email || "").trim().toLowerCase();
    if (email && !email.includes("@")) {
      email = `${email}@academico.ufpb.br`;
    }
    if (!email.endsWith("@academico.ufpb.br")) {
      throw new Error("Acesso restrito! O login deve ser realizado com uma conta do domínio institucional @academico.ufpb.br.");
    }

    const resp = await fetch("./api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha })
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || "Falha na autenticação.");
    }

    this.currentUser = data.user;
    sessionStorage.setItem("prg_current_user", JSON.stringify(this.currentUser));
    if (data.token) {
      sessionStorage.setItem("prg_auth_token", data.token);
    }
    window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: this.currentUser }));
    return this.currentUser;
  }

  async logout() {
    this.currentUser = null;
    sessionStorage.removeItem("prg_current_user");
    sessionStorage.removeItem("prg_auth_token");
    window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: null }));
  }

  async quickLogin(role = "admin") {
    if (role === "admin") {
      return await this.login("admin@academico.ufpb.br", "admin123");
    } else {
      return await this.login("operador@academico.ufpb.br", "operador123");
    }
  }
}

window.authService = new AuthService();
