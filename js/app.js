/**
 * AGENDA SISINFRA - GESTÃO DE ESPAÇOS E INFRAESTRUTURA (PRG / UFPB)
 * Controlador Principal da Aplicação
 * Integrado ao SisInfra (https://sisinfra.ufpb.br)
 */

class AppManager {
  constructor() {
    this.currentTab = "novo";
    this.editingBookingId = null;
    this.editingUserId = null;
    this.currentChecklistSpaceId = null;
    this.currentRejectBookingId = null;
    this.currentCancelBookingId = null;
    this.sisinfraSearchTerm = "";
    this.sisinfraFilterBloco = "todos";
    this.sisinfraFilterTipo = "todos";
    this.sisinfraFilterReservavelOnly = false;
    this.selectedDateForAgenda = new Date().toISOString().split("T")[0];
  }

  async init() {
    this.bindNavigation();
    this.bindAuthEvents();
    this.bindBookingForm();
    this.bindUserForm();
    this.bindChecklistModal();
    this.bindImportSisinfraModal();
    this.bindBloqueiosEvents();
    this.bindSisinfraCatalogFilters();
    this.bindAccessibility();
    this.bindFilters();

    // Inicia o calendário
    if (window.calendarManager) {
      await window.calendarManager.init();
    }

    // Carrega dados e selects dinâmicos
    await this.populateBookingSpacesSelect();
    await this.renderSisinfraSpaces();
    await this.renderAgendamentosTable();
    await this.renderPautaDoDia();
    await this.renderBloqueiosList();
    this.updateAuthUI();

    // Listener para mudanças no estado de autenticação
    window.addEventListener("auth-state-changed", async () => {
      this.updateAuthUI();
      await this.renderSisinfraSpaces();
      await this.renderAgendamentosTable();
      await this.renderUsuariosList();
      await this.renderBloqueiosList();
      if (window.calendarManager) await window.calendarManager.render();
    });
  }

  // ================= NAVEGAÇÃO ENTRE ABAS =================
  bindNavigation() {
    const navButtons = document.querySelectorAll(".nav-tab-btn");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab) this.switchTab(tab);
      });
    });

    document.querySelectorAll("[data-navigate]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = el.getAttribute("data-navigate");
        if (tab) this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    const isLogged = window.authService.isLoggedIn();
    const restrictedTabs = ["pauta", "auditorios", "bloqueios", "usuarios"];

    // Trava de segurança: impede público geral de acessar abas de gestão
    if (restrictedTabs.includes(tabName) && !isLogged) {
      this.showToast("Acesso restrito à equipe autorizada da Central de Aulas e PRG.", "warning");
      this.openModal("modal-login");
      return;
    }

    this.currentTab = tabName;

    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    document.querySelectorAll(".tab-content-section").forEach(sec => {
      if (sec.id === `tab-${tabName}`) {
        sec.classList.remove("hidden");
      } else {
        sec.classList.add("hidden");
      }
    });

    if (tabName === "calendario" && window.calendarManager) {
      window.calendarManager.render();
    } else if (tabName === "lista") {
      this.renderAgendamentosTable();
    } else if (tabName === "usuarios") {
      this.renderUsuariosList();
    } else if (tabName === "pauta") {
      this.renderPautaDoDia();
    } else if (tabName === "auditorios" || tabName === "infraestrutura") {
      this.renderSisinfraSpaces();
    } else if (tabName === "bloqueios") {
      this.renderBloqueiosList();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ================= CONTROLE DE ACESSO & LOGIN =================
  bindAuthEvents() {
    const loginBtn = document.getElementById("btn-open-login");
    const logoutBtn = document.getElementById("btn-logout");
    const closeLoginBtn = document.getElementById("btn-close-login");
    const loginForm = document.getElementById("form-login");

    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        this.openModal("modal-login");
      });
    }

    if (closeLoginBtn) {
      closeLoginBtn.addEventListener("click", () => {
        this.closeModal("modal-login");
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.authService.logout();
        this.showToast("Você saiu do sistema.", "info");
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const senha = document.getElementById("login-senha").value;
        const submitBtn = loginForm.querySelector("button[type='submit']");

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = "Verificando...";
          await window.authService.login(email, senha);
          this.closeModal("modal-login");
          loginForm.reset();
          this.showToast("Login realizado com sucesso!", "success");
        } catch (err) {
          alert(err.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Entrar no Sistema";
        }
      });
    }

    const demoAdminBtn = document.getElementById("btn-demo-admin");
    const demoOpBtn = document.getElementById("btn-demo-op");

    if (demoAdminBtn) {
      demoAdminBtn.addEventListener("click", async () => {
        await window.authService.quickLogin("admin");
        this.closeModal("modal-login");
        this.showToast("Acessado como Administrador SisInfra / PRG", "success");
      });
    }

    if (demoOpBtn) {
      demoOpBtn.addEventListener("click", async () => {
        await window.authService.quickLogin("operador");
        this.closeModal("modal-login");
        this.showToast("Acessado como Operador da Central", "success");
      });
    }
  }

  updateAuthUI() {
    const isLogged = window.authService.isLoggedIn();
    const isAdmin = window.authService.isAdmin();
    const user = window.authService.getCurrentUser();

    const loggedContainer = document.getElementById("user-logged-container");
    const unloggedContainer = document.getElementById("user-unlogged-container");
    const userNameEl = document.getElementById("user-name-display");
    const userBadgeEl = document.getElementById("user-badge-display");
    const authAlertBooking = document.getElementById("auth-alert-booking");

    // Abas com controle de acesso (Público x Equipe Autorizada)
    const tabPautaBtn = document.getElementById("tab-btn-pauta");
    const tabAuditoriosBtn = document.getElementById("tab-btn-auditorios");
    const tabBloqueiosBtn = document.getElementById("tab-btn-bloqueios");
    const tabUsuariosBtn = document.getElementById("tab-btn-usuarios");

    if (isLogged && user) {
      if (loggedContainer) loggedContainer.classList.remove("hidden");
      if (unloggedContainer) unloggedContainer.classList.add("hidden");
      if (userNameEl) userNameEl.textContent = user.nome;

      if (userBadgeEl) {
        if (isAdmin) {
          userBadgeEl.textContent = "Gestor SisInfra / Admin";
          userBadgeEl.className = "text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300";
        } else {
          userBadgeEl.textContent = "Operador Autorizado";
          userBadgeEl.className = "text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 border border-blue-300";
        }
      }

      // Para equipe autorizada: exibe Pauta Diária, Infraestrutura e Bloqueios
      if (tabPautaBtn) tabPautaBtn.classList.remove("hidden");
      if (tabAuditoriosBtn) tabAuditoriosBtn.classList.remove("hidden");
      if (tabBloqueiosBtn) tabBloqueiosBtn.classList.remove("hidden");

      // Gestão de Pessoas Autorizadas: apenas Administrador Geral
      if (tabUsuariosBtn) {
        if (isAdmin) tabUsuariosBtn.classList.remove("hidden");
        else tabUsuariosBtn.classList.add("hidden");
      }

      if (authAlertBooking) authAlertBooking.classList.add("hidden");
    } else {
      // Para o público em geral: somente Nova Reserva, Calendário e Lista de Agendamentos
      if (loggedContainer) loggedContainer.classList.add("hidden");
      if (unloggedContainer) unloggedContainer.classList.remove("hidden");

      if (tabPautaBtn) tabPautaBtn.classList.add("hidden");
      if (tabAuditoriosBtn) tabAuditoriosBtn.classList.add("hidden");
      if (tabBloqueiosBtn) tabBloqueiosBtn.classList.add("hidden");
      if (tabUsuariosBtn) tabUsuariosBtn.classList.add("hidden");

      if (authAlertBooking) authAlertBooking.classList.remove("hidden");

      // Se o visitante estiver numa aba restrita, redireciona para Nova Reserva
      const restrictedTabs = ["pauta", "auditorios", "bloqueios", "usuarios"];
      if (restrictedTabs.includes(this.currentTab)) {
        this.switchTab("novo");
      }
    }
  }

  // ================= FORMULÁRIO DE AGENDAMENTO =================
  async populateBookingSpacesSelect() {
    const selectEl = document.getElementById("ag-auditorio");
    const tableFilterAud = document.getElementById("table-filter-auditorio");
    const reservaveis = await window.storageService.getEspacosReservaveis();

    // Agrupa por Bloco e Setor
    const groupMap = new Map();
    reservaveis.forEach(sp => {
      let groupName = sp.bloco || "Outros Espaços";
      if (sp.id === "INFRA2220PRG" || sp.id === "INFRA2202PRG" || sp.id === "INFRA2289PRG" || sp.id === "INFRA2290PRG" || sp.nome.includes("AUDITÓRIO") || sp.nome.includes("REUNIÃO")) {
        groupName = "Auditórios & Reuniões PRG";
      }
      if (!groupMap.has(groupName)) groupMap.set(groupName, []);
      groupMap.get(groupName).push(sp);
    });

    const sortedGroups = Array.from(groupMap.keys()).sort((a, b) => {
      if (a.includes("Auditórios")) return -1;
      if (b.includes("Auditórios")) return 1;
      return a.localeCompare(b);
    });

    if (selectEl) {
      const curVal = selectEl.value;
      let html = "";
      sortedGroups.forEach(grp => {
        const items = groupMap.get(grp);
        html += `<optgroup label="${this.escapeHtml(grp)}">`;
        items.forEach(sp => {
          html += `
            <option value="${sp.id}" ${sp.id === curVal ? 'selected' : ''}>
              ${this.escapeHtml(sp.nomeAmigavel || sp.nome)} (${sp.capacidade} lugares)
            </option>
          `;
        });
        html += `</optgroup>`;
      });

      selectEl.innerHTML = html;

      if (!selectEl.value && reservaveis.length > 0) {
        selectEl.value = reservaveis[0].id;
      }

      // Atualiza os recursos do espaço selecionado e checa bloqueio
      this.updateBookingFormResources(selectEl.value);
      this.checkBookingFormBlockWarning();

      selectEl.addEventListener("change", (e) => {
        this.updateBookingFormResources(e.target.value);
        this.checkBookingFormBlockWarning();
      });
    }

    if (tableFilterAud) {
      const curFilter = tableFilterAud.value;
      let filterHtml = `<option value="todos">Todos os Espaços Reserváveis (${reservaveis.length})</option>`;
      sortedGroups.forEach(grp => {
        const items = groupMap.get(grp);
        filterHtml += `<optgroup label="${this.escapeHtml(grp)}">`;
        items.forEach(sp => {
          filterHtml += `
            <option value="${sp.id}" ${sp.id === curFilter ? 'selected' : ''}>
              ${this.escapeHtml(sp.nomeAmigavel || sp.nome)}
            </option>
          `;
        });
        filterHtml += `</optgroup>`;
      });
      tableFilterAud.innerHTML = filterHtml;
    }
  }

  async checkBookingFormBlockWarning() {
    const spaceId = document.getElementById("ag-auditorio")?.value;
    const data = document.getElementById("ag-data")?.value;
    const horaInicio = document.getElementById("ag-inicio")?.value;
    const horaFim = document.getElementById("ag-fim")?.value;
    const warningBox = document.getElementById("booking-block-warning");
    const warningTitle = document.getElementById("booking-block-warning-title");
    const warningMsg = document.getElementById("booking-block-warning-msg");

    if (!warningBox || !spaceId || !data || !horaInicio || !horaFim) return;

    try {
      const bloq = await window.storageService.checkBlockConflict(spaceId, data, horaInicio, horaFim);
      if (bloq) {
        const espaco = await window.storageService.getEspacoById(spaceId);
        const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "Esta sala";
        warningTitle.textContent = `Atenção: Horário Bloqueado para ${bloq.titulo}`;
        warningMsg.textContent = `${espacoNome} está reservada das ${bloq.horaInicio} às ${bloq.horaFim} (${bloq.descricao || "Aulas regulares da graduação"}). Não será possível agendar para este intervalo.`;
        warningBox.classList.remove("hidden");
      } else {
        warningBox.classList.add("hidden");
      }
    } catch (e) {
      warningBox.classList.add("hidden");
    }
  }

  async updateBookingFormResources(spaceId) {
    const container = document.getElementById("ag-recursos-container");
    if (!container) return;

    const space = await window.storageService.getEspacoById(spaceId);
    if (!space || !space.checklist || space.checklist.length === 0) {
      container.innerHTML = `
        <p class="text-xs text-slate-400 py-1 italic">Nenhum equipamento cadastrado no checklist desta sala.</p>
      `;
      return;
    }

    const activeItems = space.checklist.filter(item => item.ativo === true);

    if (activeItems.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs">
          ⚠️ O gestor não marcou equipamentos disponíveis no checklist atual desta sala.
        </div>
      `;
      return;
    }

    container.innerHTML = activeItems.map(item => `
      <label class="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors">
        <input type="checkbox" name="recursos" value="${this.escapeHtml(item.label)}" checked class="rounded text-ufpb-blue focus:ring-ufpb-blue">
        <span class="text-base">${item.icon || '📦'}</span>
        <span class="text-xs font-semibold text-slate-800">${this.escapeHtml(item.label)}</span>
      </label>
    `).join("");
  }

  bindBookingForm() {
    const form = document.getElementById("form-agendamento");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const auditorioId = document.getElementById("ag-auditorio").value;
      const titulo = document.getElementById("ag-titulo").value.trim();
      const tipoEvento = document.getElementById("ag-tipo").value;
      const solicitante = document.getElementById("ag-solicitante").value.trim();
      const departamento = document.getElementById("ag-departamento").value.trim();
      const email = document.getElementById("ag-email").value.trim();
      const telefone = document.getElementById("ag-telefone").value.trim();
      const data = document.getElementById("ag-data").value;
      const horaInicio = document.getElementById("ag-inicio").value;
      const horaFim = document.getElementById("ag-fim").value;
      const observacoes = document.getElementById("ag-obs") ? document.getElementById("ag-obs").value.trim() : "";

      const recursos = [];
      form.querySelectorAll("input[name='recursos']:checked").forEach(cb => {
        recursos.push(cb.value);
      });

      if (horaInicio >= horaFim) {
        alert("O horário de término deve ser posterior ao horário de início.");
        return;
      }

      const isAuthorized = window.authService.isOperator();
      const status = isAuthorized ? "confirmado" : "pendente";
      const user = window.authService.getCurrentUser();
      const criadoPor = user ? `${user.nome} (${user.email})` : `${solicitante} [Solicitação Externa]`;

      const bookingData = {
        auditorioId,
        titulo,
        tipoEvento,
        solicitante,
        departamento,
        email,
        telefone,
        data,
        horaInicio,
        horaFim,
        recursos,
        status,
        observacoes,
        criadoPor
      };

      const submitBtn = form.querySelector("button[type='submit']");

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Validando horário e salvando...";

        if (this.editingBookingId) {
          const updated = await window.storageService.updateAgendamento(this.editingBookingId, bookingData);
          this.showToast("Agendamento atualizado com sucesso!", "success");
          if (window.emailService) {
            await window.emailService.notify("reserva_atualizada", updated);
          }
          this.editingBookingId = null;
        } else {
          const created = await window.storageService.createAgendamento(bookingData);
          if (isAuthorized) {
            this.showToast("Agendamento confirmado com sucesso na Agenda SisInfra!", "success");
            if (window.emailService) {
              await window.emailService.notify("reserva_confirmada", created);
            }
          } else {
            this.showToast("Solicitação enviada com sucesso! Aguarde a análise da equipe SisInfra / PRG.", "info");
            if (window.emailService) {
              await window.emailService.notify("solicitacao_recebida", created);
            }
          }
        }

        form.reset();
        document.getElementById("ag-data").value = new Date().toISOString().split("T")[0];
        document.getElementById("ag-form-title").textContent = "Novo Agendamento - Agenda SisInfra";

        if (window.calendarManager) await window.calendarManager.render();
        await this.renderAgendamentosTable();
        await this.renderPautaDoDia();
        this.switchTab("calendario");
      } catch (err) {
        alert(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirmar Agendamento";
      }
    });

    const cancelEditBtn = document.getElementById("btn-cancel-edit");
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        this.editingBookingId = null;
        form.reset();
        document.getElementById("ag-form-title").textContent = "Novo Agendamento - Agenda SisInfra";
        cancelEditBtn.classList.add("hidden");
        const warningBox = document.getElementById("booking-block-warning");
        if (warningBox) warningBox.classList.add("hidden");
        this.switchTab("calendario");
      });
    }

    // Monitoramento em tempo real de bloqueios no formulário
    const dateInput = document.getElementById("ag-data");
    const iniInput = document.getElementById("ag-inicio");
    const fimInput = document.getElementById("ag-fim");
    [dateInput, iniInput, fimInput].forEach(el => {
      if (el) {
        el.addEventListener("change", () => this.checkBookingFormBlockWarning());
        el.addEventListener("input", () => this.checkBookingFormBlockWarning());
      }
    });
  }

  prefillBookingDate(dateStr) {
    this.switchTab("novo");
    const dataInput = document.getElementById("ag-data");
    if (dataInput) {
      dataInput.value = dateStr;
      this.checkBookingFormBlockWarning();
    }
  }

  prefillBookingAuditorio(spaceId) {
    this.switchTab("novo");
    const sel = document.getElementById("ag-auditorio");
    if (sel) {
      sel.value = String(spaceId);
      this.updateBookingFormResources(spaceId);
      this.checkBookingFormBlockWarning();
    }
  }

  // ================= TABELA / LISTA DE AGENDAMENTOS =================
  bindFilters() {
    const searchInput = document.getElementById("table-search");
    const filterAuditorio = document.getElementById("table-filter-auditorio");
    const filterStatus = document.getElementById("table-filter-status");

    const triggerRender = () => this.renderAgendamentosTable();

    if (searchInput) searchInput.addEventListener("input", triggerRender);
    if (filterAuditorio) filterAuditorio.addEventListener("change", triggerRender);
    if (filterStatus) filterStatus.addEventListener("change", triggerRender);
  }

  async renderAgendamentosTable() {
    const tbody = document.getElementById("table-agendamentos-body");
    if (!tbody) return;

    const search = (document.getElementById("table-search")?.value || "").toLowerCase();
    const filterAud = document.getElementById("table-filter-auditorio")?.value || "todos";
    const filterStat = document.getElementById("table-filter-status")?.value || "todos";

    const all = await window.storageService.getAgendamentos();
    const allSpaces = await window.storageService.getEspacos();
    const spacesMap = new Map(allSpaces.map(s => [s.id, s]));

    const filtered = all.filter(ag => {
      const normId = window.storageService.normalizeSpaceId(ag.auditorioId);
      if (filterAud !== "todos" && normId !== filterAud) return false;
      if (filterStat !== "todos" && ag.status !== filterStat) return false;
      if (search) {
        const space = spacesMap.get(normId);
        const spaceName = space ? (space.nomeAmigavel || space.nome) : "";
        const fullText = `${ag.titulo} ${ag.solicitante} ${ag.departamento} ${spaceName}`.toLowerCase();
        if (!fullText.includes(search)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => b.data.localeCompare(a.data) || a.horaInicio.localeCompare(b.horaInicio));

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-slate-400">
            Nenhum agendamento encontrado com os filtros aplicados.
          </td>
        </tr>
      `;
      return;
    }

    const canManage = window.authService.isOperator();

    tbody.innerHTML = filtered.map(ag => {
      const normId = window.storageService.normalizeSpaceId(ag.auditorioId);
      const space = spacesMap.get(normId);
      const spaceName = space ? (space.nomeAmigavel || space.nome) : normId;
      const badgeStyle = space ? (space.badgeLight || "bg-blue-100 text-blue-900 border-blue-700") : "bg-blue-100 text-blue-900 border-blue-700";

      let badgeStatus = "";
      if (ag.status === "confirmado") {
        badgeStatus = `<span class="badge-confirmado text-xs font-bold px-2.5 py-0.5 rounded-full">Confirmado</span>`;
      } else if (ag.status === "pendente") {
        badgeStatus = `<span class="badge-pendente text-xs font-bold px-2.5 py-0.5 rounded-full">Pendente</span>`;
      } else if (ag.status === "rejeitado") {
        badgeStatus = `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Negado</span>`;
      } else {
        badgeStatus = `<span class="badge-cancelado text-xs font-bold px-2.5 py-0.5 rounded-full">Cancelado</span>`;
      }

      const [ano, mes, dia] = ag.data.split("-");
      const dataFormatada = `${dia}/${mes}/${ano}`;

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <td class="py-3 px-4 font-semibold text-slate-800">${dataFormatada}</td>
          <td class="py-3 px-4 text-xs font-medium text-slate-600">${ag.horaInicio} às ${ag.horaFim}</td>
          <td class="py-3 px-4">
            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle}">
              ${this.escapeHtml(spaceName)}
            </span>
          </td>
          <td class="py-3 px-4">
            <div class="font-bold text-sm text-slate-900">${this.escapeHtml(ag.titulo)}</div>
            <div class="text-xs text-slate-500">${this.escapeHtml(ag.tipoEvento || "")}</div>
          </td>
          <td class="py-3 px-4">
            <div class="text-xs font-semibold text-slate-700">${this.escapeHtml(ag.solicitante)}</div>
            <div class="text-[11px] text-slate-500">${this.escapeHtml(ag.departamento || "")}</div>
          </td>
          <td class="py-3 px-4">${badgeStatus}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="appManager.openBookingDetails('${ag.id}')" class="text-xs text-blue-700 hover:text-blue-900 font-semibold px-2 py-1 bg-blue-50 rounded hover:bg-blue-100 mr-1" title="Ver detalhes">
              Ver
            </button>
            ${canManage ? `
              <button onclick="appManager.startEditBooking('${ag.id}')" class="text-xs text-amber-700 hover:text-amber-900 font-semibold px-2 py-1 bg-amber-50 rounded hover:bg-amber-100 mr-1" title="Editar">
                Editar
              </button>
            ` : ""}
          </td>
        </tr>
      `;
    }).join("");
  }

  // ================= DETALHES DO AGENDAMENTO (MODAL) =================
  async openBookingDetails(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;

    const space = await window.storageService.getEspacoById(ag.auditorioId);
    const spaceName = space ? (space.nomeAmigavel || space.nome) : ag.auditorioId;
    const spaceCode = space ? space.idInterno : "";
    const spaceMec = space ? space.codigoMec : "";
    const badgeStyle = space ? (space.badgeLight || "bg-blue-100 text-blue-900") : "bg-blue-100 text-blue-900";

    const content = document.getElementById("booking-details-content");
    const actions = document.getElementById("booking-details-actions");
    if (!content) return;

    const [ano, mes, dia] = ag.data.split("-");
    const dataFormatada = `${dia}/${mes}/${ano}`;

    let statusHtml = "";
    if (ag.status === "confirmado") {
      statusHtml = `<span class="badge-confirmado text-xs font-bold px-2.5 py-0.5 rounded-full">Confirmado</span>`;
    } else if (ag.status === "pendente") {
      statusHtml = `<span class="badge-pendente text-xs font-bold px-2.5 py-0.5 rounded-full">Pendente de Aprovação</span>`;
    } else if (ag.status === "rejeitado") {
      statusHtml = `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Negado / Recusado</span>`;
    } else {
      statusHtml = `<span class="badge-cancelado text-xs font-bold px-2.5 py-0.5 rounded-full">Cancelado</span>`;
    }

    const recursosList = (ag.recursos && ag.recursos.length > 0)
      ? ag.recursos.map(r => `<span class="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-2 py-1 rounded">✓ ${this.escapeHtml(r)}</span>`).join(" ")
      : "<span class='text-xs text-slate-400'>Nenhum recurso extra solicitado</span>";

    content.innerHTML = `
      <div class="space-y-4 text-xs">
        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="text-slate-400">Código de Reserva:</span>
            <span class="font-bold text-slate-900 ml-1">#${ag.id}</span>
            <span class="text-slate-400 ml-2">SisInfra:</span>
            <span class="font-mono font-bold text-blue-700 ml-1">${spaceCode}</span>
          </div>
          <div>${statusHtml}</div>
        </div>

        ${ag.status === 'rejeitado' ? `
          <div class="bg-rose-50 border border-rose-300 p-3.5 rounded-xl text-rose-950">
            <div class="flex items-center gap-1.5 font-bold mb-1 text-rose-900">
              <span class="text-base">❌</span> <span>Solicitação de Reserva Indeferida / Recusada</span>
            </div>
            <p class="text-xs text-rose-900 leading-relaxed font-semibold">Justificativa da Gestão: "${this.escapeHtml(ag.motivoRejeicao || 'Não informada.')}"</p>
            ${ag.rejeitadoEm ? `<div class="text-[10px] text-rose-700 mt-1">Registrado em ${new Date(ag.rejeitadoEm).toLocaleString('pt-BR')} por ${this.escapeHtml(ag.rejeitadoPor || '')}</div>` : ''}
          </div>
        ` : ''}

        ${ag.status === 'cancelado' ? `
          <div class="bg-amber-50 border border-amber-300 p-3.5 rounded-xl text-amber-950">
            <div class="flex items-center gap-1.5 font-bold mb-1 text-amber-900">
              <span class="text-base">⚠️</span> <span>Reserva Cancelada</span>
            </div>
            <p class="text-xs text-amber-900 leading-relaxed font-semibold">Motivo: "${this.escapeHtml(ag.motivoCancelamento || 'Cancelamento solicitado.')}"</p>
            ${ag.canceladoEm ? `<div class="text-[10px] text-amber-700 mt-1">Registrado em ${new Date(ag.canceladoEm).toLocaleString('pt-BR')}</div>` : ''}
          </div>
        ` : ''}

        <div>
          <h3 class="text-lg font-bold text-ufpb-blue">${this.escapeHtml(ag.titulo)}</h3>
          <p class="text-xs text-slate-500 font-semibold">${this.escapeHtml(ag.tipoEvento || "")}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div>
            <span class="text-slate-400 block mb-0.5">Espaço Reservado:</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${badgeStyle}">
              ${this.escapeHtml(spaceName)}
            </span>
            ${space ? `
              <div class="text-[11px] text-slate-500 mt-1">Capacidade: <strong>${space.capacidade}</strong> pessoas • ${space.bloco}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">SisInfra: <strong>${space.idInterno}</strong> • e-MEC: <strong>${space.codigoMec}</strong> (${space.statusMec || 'Pendente'})</div>
            ` : ''}
          </div>
          <div>
            <span class="text-slate-400 block mb-0.5">Data & Horário:</span>
            <span class="font-bold text-slate-800 text-sm">📅 ${dataFormatada}</span>
            <div class="text-slate-600 font-bold mt-0.5">⏰ ${ag.horaInicio} às ${ag.horaFim}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span class="text-slate-400 block font-semibold mb-1">Solicitante:</span>
            <div class="font-bold text-slate-800">${this.escapeHtml(ag.solicitante)}</div>
            <div class="text-slate-500 text-[11px]">${this.escapeHtml(ag.departamento || "")}</div>
          </div>
          <div class="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span class="text-slate-400 block font-semibold mb-1">Contato do Interessado:</span>
            <div class="text-slate-800 font-medium">✉️ ${this.escapeHtml(ag.email)}</div>
            <div class="text-slate-800 font-medium mt-0.5">📞 ${this.escapeHtml(ag.telefone || "Não informado")}</div>
          </div>
        </div>

        <div>
          <span class="text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Recursos / Equipamentos Solicitados:</span>
          <div class="flex flex-wrap gap-1.5">${recursosList}</div>
        </div>

        ${ag.observacoes ? `
          <div class="bg-amber-50/60 p-3 rounded-lg border border-amber-200/80">
            <span class="text-amber-900 font-bold block mb-1">Observações:</span>
            <p class="text-slate-700">${this.escapeHtml(ag.observacoes)}</p>
          </div>
        ` : ""}

        <!-- Histórico de Notificações por E-mail -->
        ${Array.isArray(ag.notificacoes) && ag.notificacoes.length > 0 ? `
          <div class="border-t border-slate-200 pt-3">
            <span class="text-slate-500 font-bold uppercase tracking-wider block mb-1.5">✉️ Notificações por E-mail Enviadas (${ag.notificacoes.length}):</span>
            <div class="space-y-1.5">
              ${ag.notificacoes.map(n => `
                <div class="bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center justify-between text-[11px]">
                  <div>
                    <span class="font-bold text-slate-800">${this.escapeHtml(n.statusLabel || n.tipo)}</span>
                    <span class="text-slate-500 block text-[10px]">Para: ${this.escapeHtml(n.destinatario)}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">${new Date(n.data).toLocaleString("pt-BR")}</span>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `;

    const canManage = window.authService.isOperator();
    const isAdmin = window.authService.isAdmin();

    if (actions) {
      actions.innerHTML = `
        <button onclick="appManager.printComprovante('${ag.id}')" class="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors">
          🖨️ <span>Imprimir Comprovante</span>
        </button>

        <button onclick="appManager.reopenEmailNotification('${ag.id}')" class="px-3 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors" title="Visualizar / Reenviar e-mail de notificação">
          ✉️ <span>Notificação por E-mail</span>
        </button>

        ${canManage && ag.status === 'pendente' ? `
          <button onclick="appManager.approveBooking('${ag.id}')" class="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 shadow-sm transition-colors">
            <span>✓</span> <span>Aprovar Reserva</span>
          </button>
          <button onclick="appManager.openRejectBookingModal('${ag.id}')" class="px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1 shadow-sm transition-colors">
            <span>✕</span> <span>Negar Reserva</span>
          </button>
        ` : ""}

        ${canManage && ag.status === 'confirmado' ? `
          <button onclick="appManager.openCancelBookingModal('${ag.id}')" class="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
            Cancelar Reserva
          </button>
        ` : ""}

        ${isAdmin ? `
          <button onclick="appManager.deleteBooking('${ag.id}')" class="px-3 py-2 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg ml-auto transition-colors">
            Excluir Registro
          </button>
        ` : ""}
      `;
    }

    this.openModal("modal-booking-details");
  }

  async startEditBooking(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;

    this.editingBookingId = id;
    this.switchTab("novo");

    document.getElementById("ag-form-title").textContent = `Editar Agendamento #${ag.id}`;

    const sel = document.getElementById("ag-auditorio");
    if (sel) {
      sel.value = window.storageService.normalizeSpaceId(ag.auditorioId);
      await this.updateBookingFormResources(sel.value);
    }

    document.getElementById("ag-titulo").value = ag.titulo;
    document.getElementById("ag-tipo").value = ag.tipoEvento || "Outro";
    document.getElementById("ag-solicitante").value = ag.solicitante;
    document.getElementById("ag-departamento").value = ag.departamento || "";
    document.getElementById("ag-email").value = ag.email;
    document.getElementById("ag-telefone").value = ag.telefone || "";
    document.getElementById("ag-data").value = ag.data;
    document.getElementById("ag-inicio").value = ag.horaInicio;
    document.getElementById("ag-fim").value = ag.horaFim;
    if (document.getElementById("ag-obs")) document.getElementById("ag-obs").value = ag.observacoes || "";

    // Marca recursos
    const recursosList = ag.recursos || [];
    document.querySelectorAll("input[name='recursos']").forEach(cb => {
      cb.checked = recursosList.includes(cb.value);
    });

    const cancelBtn = document.getElementById("btn-cancel-edit");
    if (cancelBtn) cancelBtn.classList.remove("hidden");
  }

  async approveBooking(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;
    const space = await window.storageService.getEspacoById(ag.auditorioId);

    const updated = await window.storageService.updateAgendamento(id, { 
      status: "confirmado",
      aprovadoEm: new Date().toISOString(),
      aprovadoPor: window.authService.getCurrentUser()?.email || "gestor@academico.ufpb.br"
    });

    this.showToast("Agendamento aprovado com sucesso!", "success");
    this.closeModal("modal-booking-details");

    // Dispara notificação de aprovação por e-mail para o interessado
    if (window.emailService) {
      await window.emailService.notify("reserva_aprovada", updated, { space });
    }

    if (window.calendarManager) await window.calendarManager.render();
    await this.renderAgendamentosTable();
    await this.renderPautaDoDia();
  }

  // ================= NEGAR / RECUSAR RESERVA =================
  async openRejectBookingModal(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;
    this.currentRejectBookingId = id;

    const space = await window.storageService.getEspacoById(ag.auditorioId);
    const spaceName = space ? (space.nomeAmigavel || space.nome) : ag.auditorioId;
    const [ano, mes, dia] = (ag.data || "").split("-");
    const dataFormatada = (ano && mes && dia) ? `${dia}/${mes}/${ano}` : ag.data;

    const resumo = document.getElementById("rejeitar-resumo-container");
    if (resumo) {
      resumo.innerHTML = `
        <div class="font-bold text-slate-800 text-sm">${this.escapeHtml(ag.titulo)}</div>
        <div class="text-slate-600">Espaço: <strong>${this.escapeHtml(spaceName)}</strong> • Data: <strong>${dataFormatada}</strong> (${ag.horaInicio} às ${ag.horaFim})</div>
        <div class="text-slate-600">Interessado: <strong>${this.escapeHtml(ag.solicitante)}</strong> &lt;${this.escapeHtml(ag.email)}&gt;</div>
      `;
    }

    const input = document.getElementById("rejeitar-motivo-input");
    if (input) input.value = "";

    this.closeModal("modal-booking-details");
    this.openModal("modal-rejeitar-reserva");
  }

  fillRejectMotivo(txt) {
    const input = document.getElementById("rejeitar-motivo-input");
    if (input) {
      input.value = txt;
      input.focus();
    }
  }

  async confirmRejectBooking() {
    const id = this.currentRejectBookingId;
    if (!id) return;

    const input = document.getElementById("rejeitar-motivo-input");
    const motivo = (input?.value || "").trim();
    if (!motivo) {
      alert("Por favor, preencha a justificativa do indeferimento. Ela será enviada ao interessado.");
      if (input) input.focus();
      return;
    }

    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;
    const space = await window.storageService.getEspacoById(ag.auditorioId);

    const updated = await window.storageService.updateAgendamento(id, {
      status: "rejeitado",
      motivoRejeicao: motivo,
      rejeitadoEm: new Date().toISOString(),
      rejeitadoPor: window.authService.getCurrentUser()?.email || "gestor@academico.ufpb.br"
    });

    this.closeModal("modal-rejeitar-reserva");
    this.showToast("Solicitação de reserva indeferida.", "info");

    // Dispara notificação de recusa por e-mail para o interessado com a justificativa
    if (window.emailService) {
      await window.emailService.notify("reserva_negada", updated, { space, motivo });
    }

    if (window.calendarManager) await window.calendarManager.render();
    await this.renderAgendamentosTable();
    await this.renderPautaDoDia();
  }

  // ================= CANCELAR RESERVA =================
  async openCancelBookingModal(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;
    this.currentCancelBookingId = id;

    const space = await window.storageService.getEspacoById(ag.auditorioId);
    const spaceName = space ? (space.nomeAmigavel || space.nome) : ag.auditorioId;
    const [ano, mes, dia] = (ag.data || "").split("-");
    const dataFormatada = (ano && mes && dia) ? `${dia}/${mes}/${ano}` : ag.data;

    const resumo = document.getElementById("cancelar-resumo-container");
    if (resumo) {
      resumo.innerHTML = `
        <div class="font-bold text-slate-800 text-sm">${this.escapeHtml(ag.titulo)}</div>
        <div class="text-slate-600">Espaço: <strong>${this.escapeHtml(spaceName)}</strong> • Data: <strong>${dataFormatada}</strong> (${ag.horaInicio} às ${ag.horaFim})</div>
        <div class="text-slate-600">Interessado: <strong>${this.escapeHtml(ag.solicitante)}</strong> &lt;${this.escapeHtml(ag.email)}&gt;</div>
      `;
    }

    const input = document.getElementById("cancelar-motivo-input");
    if (input) input.value = "";

    this.closeModal("modal-booking-details");
    this.openModal("modal-cancelar-reserva");
  }

  fillCancelMotivo(txt) {
    const input = document.getElementById("cancelar-motivo-input");
    if (input) {
      input.value = txt;
      input.focus();
    }
  }

  async confirmCancelBooking() {
    const id = this.currentCancelBookingId;
    if (!id) return;

    const input = document.getElementById("cancelar-motivo-input");
    const motivo = (input?.value || "Cancelamento de reserva.").trim();

    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;
    const space = await window.storageService.getEspacoById(ag.auditorioId);

    const updated = await window.storageService.updateAgendamento(id, {
      status: "cancelado",
      motivoCancelamento: motivo,
      canceladoEm: new Date().toISOString(),
      canceladoPor: window.authService.getCurrentUser()?.email || "gestor@academico.ufpb.br"
    });

    this.closeModal("modal-cancelar-reserva");
    this.showToast("Agendamento cancelado com sucesso.", "info");

    // Dispara notificação de cancelamento por e-mail para o interessado
    if (window.emailService) {
      await window.emailService.notify("reserva_cancelada", updated, { space, motivo });
    }

    if (window.calendarManager) await window.calendarManager.render();
    await this.renderAgendamentosTable();
    await this.renderPautaDoDia();
  }

  // ================= REENVIAR / VISUALIZAR NOTIFICAÇÃO =================
  async reopenEmailNotification(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag || !window.emailService) return;
    const space = await window.storageService.getEspacoById(ag.auditorioId);

    let situation = "solicitacao_recebida";
    if (ag.status === "confirmado") situation = "reserva_confirmada";
    else if (ag.status === "rejeitado") situation = "reserva_negada";
    else if (ag.status === "cancelado") situation = "reserva_cancelada";

    window.emailService.notify(situation, ag, {
      space,
      motivo: ag.motivoRejeicao || ag.motivoCancelamento
    });
  }

  async cancelBooking(id) {
    this.openCancelBookingModal(id);
  }

  async deleteBooking(id) {
    if (!confirm("ATENÇÃO: Deseja excluir permanentemente este registro da Agenda SisInfra?")) return;
    await window.storageService.deleteAgendamento(id);
    this.showToast("Registro excluído com sucesso.", "info");
    this.closeModal("modal-booking-details");
    if (window.calendarManager) await window.calendarManager.render();
    await this.renderAgendamentosTable();
    await this.renderPautaDoDia();
  }

  // ================= PAUTA DIÁRIA =================
  async renderPautaDoDia() {
    const container = document.getElementById("pauta-container");
    const dateInput = document.getElementById("pauta-date-picker");
    if (!container) return;

    if (dateInput && !dateInput.value) {
      dateInput.value = this.selectedDateForAgenda;
      dateInput.addEventListener("change", (e) => {
        this.selectedDateForAgenda = e.target.value;
        this.renderPautaDoDia();
      });
    }

    const targetDate = (dateInput && dateInput.value) ? dateInput.value : this.selectedDateForAgenda;
    const allAgendamentos = await window.storageService.getAgendamentos();
    const dayEvents = allAgendamentos.filter(ag => ag.data === targetDate && ag.status !== "cancelado" && ag.status !== "rejeitado");

    const reservaveis = await window.storageService.getEspacosReservaveis();

    if (dayEvents.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
          <span class="text-4xl block mb-2">🏖️</span>
          <p class="font-bold text-sm text-slate-600">Nenhum evento agendado para esta data.</p>
          <p class="text-xs text-slate-400 mt-1">Todos os espaços da Central de Aulas e PRG estão disponíveis.</p>
        </div>
      `;
      return;
    }

    // Renderiza colunas por espaço reservável
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${reservaveis.map(sp => {
          const spEvents = dayEvents.filter(ev => window.storageService.normalizeSpaceId(ev.auditorioId) === sp.id);
          spEvents.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

          return `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <div class="flex items-center gap-2">
                  <span class="w-3.5 h-3.5 rounded-full" style="background-color: ${sp.cor || '#00509e'}"></span>
                  <div>
                    <h3 class="font-bold text-sm text-slate-800">${this.escapeHtml(sp.nomeAmigavel || sp.nome)}</h3>
                    <span class="text-[10px] text-slate-500 font-mono">${sp.idInterno} • ${sp.bloco}</span>
                  </div>
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  ${spEvents.length}
                </span>
              </div>

              <div class="space-y-3">
                ${spEvents.length === 0 ? `
                  <p class="text-xs text-slate-400 italic py-4 text-center">Nenhum evento agendado neste espaço.</p>
                ` : spEvents.map(ev => `
                  <div class="bg-white p-3.5 rounded-lg border-l-4 shadow-xs border border-slate-200" style="border-left-color: ${sp.cor || '#00509e'}">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold text-xs text-slate-800">⏰ ${ev.horaInicio} às ${ev.horaFim}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${ev.status === 'confirmado' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}">
                        ${ev.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </div>
                    <h4 class="font-bold text-sm text-slate-900 mb-1">${this.escapeHtml(ev.titulo)}</h4>
                    <p class="text-[11px] text-slate-600"><strong>Responsável:</strong> ${this.escapeHtml(ev.solicitante)}</p>
                    ${ev.recursos && ev.recursos.length > 0 ? `
                      <div class="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                        <strong>Recursos:</strong> ${ev.recursos.join(", ")}
                      </div>
                    ` : ""}
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  // ================= CATÁLOGO SISINFRA & CHECKLIST DOS ESPAÇOS =================
  bindSisinfraCatalogFilters() {
    const searchInput = document.getElementById("sisinfra-search");
    const blocoFilter = document.getElementById("sisinfra-filter-bloco");
    const tipoFilter = document.getElementById("sisinfra-filter-tipo");
    const reservavelFilter = document.getElementById("sisinfra-filter-reservavel");
    const btnResetCatalog = document.getElementById("btn-reset-sisinfra-catalog");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.sisinfraSearchTerm = e.target.value.toLowerCase();
        this.renderSisinfraSpaces();
      });
    }

    if (blocoFilter) {
      blocoFilter.addEventListener("change", (e) => {
        this.sisinfraFilterBloco = e.target.value;
        this.renderSisinfraSpaces();
      });
    }

    if (tipoFilter) {
      tipoFilter.addEventListener("change", (e) => {
        this.sisinfraFilterTipo = e.target.value;
        this.renderSisinfraSpaces();
      });
    }

    if (reservavelFilter) {
      reservavelFilter.addEventListener("change", (e) => {
        this.sisinfraFilterReservavelOnly = e.target.checked;
        this.renderSisinfraSpaces();
      });
    }

    if (btnResetCatalog) {
      btnResetCatalog.addEventListener("click", async () => {
        if (!confirm("Restaurar o catálogo oficial padrão do SisInfra (102 espaços da PRG)? As personalizações de checklist e permissões de reserva voltarão ao padrão original.")) return;
        await window.storageService.resetEspacosToDefault();
        await this.populateBookingSpacesSelect();
        await this.renderSisinfraSpaces();
        if (window.calendarManager) await window.calendarManager.render();
        this.showToast("Catálogo oficial do SisInfra restaurado com sucesso!", "success");
      });
    }
  }

  async renderSisinfraSpaces() {
    const container = document.getElementById("sisinfra-cards-container");
    if (!container) return;

    const spaces = await window.storageService.getEspacos();
    const canManage = window.authService.isOperator();

    // Atualiza KPIs
    const kpiTotal = document.getElementById("kpi-total-espacos");
    const kpiReservaveis = document.getElementById("kpi-reservaveis-espacos");
    const kpiSalas = document.getElementById("kpi-salas-aula");
    const kpiReuniao = document.getElementById("kpi-reuniao-espacos");

    if (kpiTotal) kpiTotal.textContent = spaces.length;
    if (kpiReservaveis) kpiReservaveis.textContent = spaces.filter(s => s.reservavel).length;
    if (kpiSalas) kpiSalas.textContent = spaces.filter(s => s.tipo === 'Sala de Aula').length;
    if (kpiReuniao) kpiReuniao.textContent = spaces.filter(s => s.tipo.includes('Reunião') || s.tipo.includes('Auditório') || s.nome.includes('REUNIÃO')).length;

    // Popula dropdown de blocos dinamicamente se estiver vazio
    const blocoSelect = document.getElementById("sisinfra-filter-bloco");
    if (blocoSelect && blocoSelect.options.length <= 1) {
      const blocos = [...new Set(spaces.map(s => s.bloco))].sort();
      blocos.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        blocoSelect.appendChild(opt);
      });
    }

    // Filtragem
    const filtered = spaces.filter(sp => {
      if (this.sisinfraFilterReservavelOnly && !sp.reservavel) return false;
      if (this.sisinfraFilterBloco !== "todos" && sp.bloco !== this.sisinfraFilterBloco) return false;
      if (this.sisinfraFilterTipo !== "todos" && sp.tipo !== this.sisinfraFilterTipo) return false;
      if (this.sisinfraSearchTerm) {
        const full = `${sp.nome} ${sp.nomeAmigavel} ${sp.idInterno} ${sp.codigoMec} ${sp.complemento} ${sp.bloco} ${sp.tipo}`.toLowerCase();
        if (!full.includes(this.sisinfraSearchTerm)) return false;
      }
      return true;
    });

    const countDisplay = document.getElementById("sisinfra-count-display");
    if (countDisplay) {
      countDisplay.textContent = `Exibindo ${filtered.length} de ${spaces.length} espaços cadastrados`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <span class="text-3xl block mb-2">🔍</span>
          <p class="font-bold text-slate-700">Nenhuma sala ou instalação encontrada com os filtros atuais.</p>
          <p class="text-xs text-slate-400 mt-1">Experimente limpar a busca ou selecionar outro bloco.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(sp => {
      const isReservavel = sp.reservavel === true;
      const activeChecklist = (sp.checklist || []).filter(c => c.ativo === true);
      const totalChecklist = (sp.checklist || []).length;

      // Badges
      const statusBadge = isReservavel
        ? `<span class="badge-sisinfra badge-reservavel font-bold">✓ Reservável na Agenda</span>`
        : `<span class="badge-sisinfra badge-restrito font-medium">Uso Acadêmico / Interno</span>`;

      // Selo Oficial e-MEC SisInfra
      let mecBadge = "";
      if (sp.statusMec === "Registrada no e-MEC") {
        mecBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full" title="Registrada no e-MEC">✓ Registrada no e-MEC</span>`;
      } else if (sp.statusMec === "Atualização Pendente no e-MEC") {
        mecBadge = `<span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full" title="Atualização Pendente no e-MEC">⏳ Atualização Pendente e-MEC</span>`;
      }

      // Selos de Infraestrutura e Inspeção SisInfra
      const infraBadges = [];
      if (sp.acessibilidadeSisinfra && sp.acessibilidadeSisinfra.includes("Possui")) {
        infraBadges.push(`<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded" title="${this.escapeHtml(sp.acessibilidadeSisinfra)}">♿ Acessibilidade SisInfra</span>`);
      }
      if (sp.climatizacaoSisinfra && sp.climatizacaoSisinfra.includes("Possui")) {
        infraBadges.push(`<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded" title="${this.escapeHtml(sp.climatizacaoSisinfra)}">❄️ Climatizado</span>`);
      }
      if (sp.multimidiaSisinfra && sp.multimidiaSisinfra.includes("Possui")) {
        infraBadges.push(`<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded" title="${this.escapeHtml(sp.multimidiaSisinfra)}">📽️ Multimídia</span>`);
      }
      if (sp.manutencaoSisinfra) {
        infraBadges.push(`<span class="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded" title="Manutenção SisInfra: ${this.escapeHtml(sp.manutencaoSisinfra)}">🔧 Manutenção ${this.escapeHtml(sp.manutencaoSisinfra)}</span>`);
      }

      // Visualização rápida dos equipamentos ativos
      const activeIcons = activeChecklist.slice(0, 7).map(item => `
        <span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded" title="${this.escapeHtml(item.label)}">
          <span>${item.icon || '✓'}</span> ${this.escapeHtml(item.label.split(' ')[0])}
        </span>
      `).join("");

      return `
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <!-- Topo do Card -->
            <div class="p-4 border-b border-slate-100 flex items-start justify-between gap-2 bg-gradient-to-r from-slate-50 to-white">
              <div>
                <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                    ${this.escapeHtml(sp.bloco)}
                  </span>
                  <span class="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                    ${sp.idInterno}
                  </span>
                  ${mecBadge}
                </div>
                <h3 class="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                  ${this.escapeHtml(sp.nomeAmigavel || sp.nome)}
                </h3>
                <p class="text-[11px] text-slate-500 mt-0.5">
                  e-MEC: <strong>${sp.codigoMec}</strong> • ${this.escapeHtml(sp.tipo)}
                </p>
              </div>
              <div class="flex-shrink-0">${statusBadge}</div>
            </div>

            <!-- Dados do Espaço -->
            <div class="p-4 space-y-3">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-slate-50 p-2 rounded border border-slate-100">
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">Capacidade:</span>
                  <span class="font-bold text-slate-800 text-sm">👥 ${sp.capacidade}</span>
                  <span class="text-[10px] text-slate-500 ml-0.5">lugares</span>
                </div>
                <div class="bg-slate-50 p-2 rounded border border-slate-100">
                  <span class="text-slate-400 block text-[10px] uppercase font-bold">Área Física:</span>
                  <span class="font-bold text-slate-800 text-sm">📐 ${sp.area}</span>
                  <span class="text-[10px] text-slate-500 ml-0.5">m²</span>
                </div>
              </div>

              ${infraBadges.length > 0 ? `
                <div class="flex flex-wrap gap-1 pt-0.5">
                  ${infraBadges.join("")}
                </div>
              ` : ""}

              ${sp.complemento ? `
                <div class="text-[11px] text-slate-600 bg-amber-50/50 border border-amber-100 px-2.5 py-1.5 rounded">
                  <span class="font-bold text-amber-900">Complemento SisInfra:</span> ${this.escapeHtml(sp.complemento)}
                </div>
              ` : ""}

              <!-- Resumo do Checklist de Itens -->
              <div>
                <div class="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                  <span>Equipamentos Ativos na Sala:</span>
                  <span class="text-blue-700">${activeChecklist.length} de ${totalChecklist} itens</span>
                </div>
                <div class="flex flex-wrap gap-1">
                  ${activeIcons}
                  ${activeChecklist.length > 7 ? `<span class="text-[10px] font-bold text-slate-400 self-center">+${activeChecklist.length - 7}</span>` : ''}
                  ${activeChecklist.length === 0 ? `<span class="text-[11px] text-slate-400 italic">Nenhum equipamento ativo no momento</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Ações do Card -->
          <div class="p-4 pt-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
            <button onclick="appManager.openChecklistModal('${sp.id}')" class="flex-1 py-2 px-3 rounded-lg font-bold text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all flex items-center justify-center gap-1.5 shadow-2xs">
              <span>⚙️</span> <span>Checklist da Sala</span>
            </button>
            ${isReservavel ? `
              <button onclick="appManager.prefillBookingAuditorio('${sp.id}')" class="py-2 px-3 rounded-lg font-bold text-xs text-white bg-ufpb-blue hover:bg-ufpb-navy transition-all flex items-center justify-center gap-1.5 shadow-2xs">
                <span>📅</span> <span>Agendar</span>
              </button>
            ` : ""}
            ${canManage ? `
              <button onclick="appManager.toggleSpaceReservableDirect('${sp.id}', ${!isReservavel})" class="p-2 rounded-lg text-xs font-semibold ${isReservavel ? 'text-amber-700 hover:bg-amber-100' : 'text-green-700 hover:bg-green-100'} transition-colors" title="${isReservavel ? 'Desativar reservas' : 'Ativar reservas'}">
                ${isReservavel ? '🔒 Desabilitar' : '🔓 Habilitar'}
              </button>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  async toggleSpaceReservableDirect(spaceId, newReservableState) {
    await window.storageService.toggleEspacoReservavel(spaceId, newReservableState);
    this.showToast(`Permissão de reserva atualizada com sucesso.`, "info");
    await this.populateBookingSpacesSelect();
    await this.renderSisinfraSpaces();
    if (window.calendarManager) await window.calendarManager.render();
  }

  // ================= MODAL DO CHECKLIST =================
  bindChecklistModal() {
    const saveBtn = document.getElementById("btn-save-checklist");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (!this.currentChecklistSpaceId) return;

        const isReservavel = document.getElementById("chk-is-reservavel")?.checked || false;
        const space = await window.storageService.getEspacoById(this.currentChecklistSpaceId);
        if (!space) return;

        // Atualiza os itens do checklist a partir dos switches
        const updatedChecklist = (space.checklist || []).map(item => {
          const chkBox = document.getElementById(`chk-item-${item.id}`);
          return {
            ...item,
            ativo: chkBox ? chkBox.checked : item.ativo
          };
        });

        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "Salvando...";
          await window.storageService.updateEspacoChecklist(this.currentChecklistSpaceId, updatedChecklist);
          await window.storageService.toggleEspacoReservavel(this.currentChecklistSpaceId, isReservavel);

          this.showToast("Checklist da sala atualizado com sucesso!", "success");
          this.closeModal("modal-checklist");

          await this.populateBookingSpacesSelect();
          await this.renderSisinfraSpaces();
          if (window.calendarManager) await window.calendarManager.render();
        } catch (err) {
          alert("Erro ao salvar checklist: " + err.message);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Salvar Checklist";
        }
      });
    }
  }

  async openChecklistModal(spaceId) {
    this.currentChecklistSpaceId = spaceId;
    const space = await window.storageService.getEspacoById(spaceId);
    if (!space) return;

    // Popula dados do cabeçalho
    const codeEl = document.getElementById("chk-modal-code");
    const emecEl = document.getElementById("chk-modal-emec");
    const titleEl = document.getElementById("chk-modal-title");
    const subEl = document.getElementById("chk-modal-subtitle");
    const isResSwitch = document.getElementById("chk-is-reservavel");
    const resLabel = document.getElementById("chk-reservavel-label");
    const itemsList = document.getElementById("chk-items-list");

    if (codeEl) codeEl.textContent = space.idInterno;
    if (emecEl) emecEl.textContent = `e-MEC: ${space.codigoMec} • ${space.statusMec || 'Informação Pendente'}`;
    if (titleEl) titleEl.textContent = space.nomeAmigavel || space.nome;
    if (subEl) {
      const extra = [];
      if (space.acessibilidadeSisinfra && space.acessibilidadeSisinfra.includes("Possui")) extra.push("♿ Acessibilidade SisInfra");
      if (space.climatizacaoSisinfra && space.climatizacaoSisinfra.includes("Possui")) extra.push("❄️ Climatização");
      if (space.multimidiaSisinfra && space.multimidiaSisinfra.includes("Possui")) extra.push("📽️ Multimídia");
      if (space.manutencaoSisinfra) extra.push(`🔧 Manutenção ${space.manutencaoSisinfra}`);
      const extraStr = extra.length > 0 ? ` • [${extra.join(" • ")}]` : "";
      subEl.textContent = `${space.tipo} • ${space.capacidade} lugares • Área: ${space.area} m² • ${space.bloco}${extraStr}`;
    }

    if (isResSwitch) {
      isResSwitch.checked = (space.reservavel === true);
      const updateResLabel = () => {
        if (resLabel) {
          resLabel.textContent = isResSwitch.checked ? "Reservável na Agenda" : "Apenas Uso Acadêmico / Interno";
          resLabel.className = isResSwitch.checked ? "text-xs font-bold text-green-700" : "text-xs font-semibold text-slate-500";
        }
      };
      updateResLabel();
      isResSwitch.onchange = updateResLabel;
    }

    if (itemsList) {
      itemsList.innerHTML = (space.checklist || []).map(item => `
        <div class="checklist-item-row ${item.ativo ? 'is-active' : ''}">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${item.icon || '📦'}</span>
            <div>
              <div class="font-bold text-xs text-slate-800">${this.escapeHtml(item.label)}</div>
              <span class="text-[10px] text-slate-400 uppercase font-semibold">${item.categoria || 'geral'}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="switch-toggle">
              <input type="checkbox" id="chk-item-${item.id}" ${item.ativo ? 'checked' : ''} onchange="this.closest('.checklist-item-row').classList.toggle('is-active', this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>
      `).join("");
    }

    this.openModal("modal-checklist");
  }

  // ================= GESTÃO DE PESSOAS AUTORIZADAS =================
  bindUserForm() {
    const btnNewUser = document.getElementById("btn-novo-usuario");
    const closeUserBtn = document.getElementById("btn-close-modal-user");
    const userForm = document.getElementById("form-usuario");

    if (btnNewUser) {
      btnNewUser.addEventListener("click", () => {
        this.editingUserId = null;
        userForm.reset();
        document.getElementById("modal-user-title").textContent = "Cadastrar Pessoa Autorizada";
        this.openModal("modal-usuario");
      });
    }

    if (closeUserBtn) {
      closeUserBtn.addEventListener("click", () => {
        this.closeModal("modal-usuario");
      });
    }

    if (userForm) {
      userForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("usr-nome").value.trim();
        let email = document.getElementById("usr-email").value.trim().toLowerCase();
        const setor = document.getElementById("usr-setor").value.trim();
        const perfil = document.getElementById("usr-perfil").value;
        const senha = document.getElementById("usr-senha").value;

        if (!email.endsWith("@academico.ufpb.br")) {
          alert("Apenas e-mails institucionais com final @academico.ufpb.br são permitidos.");
          return;
        }

        try {
          if (this.editingUserId) {
            await window.storageService.updateUsuario(this.editingUserId, { nome, email, setor, perfil });
            this.showToast("Dados do usuário atualizados.", "success");
            this.editingUserId = null;
          } else {
            await window.storageService.createUsuario({ nome, email, setor, perfil, senha });
            this.showToast("Pessoa autorizada cadastrada com sucesso!", "success");
          }
          this.closeModal("modal-usuario");
          this.renderUsuariosList();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }

  async renderUsuariosList() {
    const tbody = document.getElementById("table-usuarios-body");
    if (!tbody) return;

    const usuarios = await window.storageService.getUsuarios();
    const currentUser = window.authService.getCurrentUser();

    tbody.innerHTML = usuarios.map(u => {
      const isCurrent = currentUser && currentUser.email === u.email;
      const badgePerfil = (u.perfil === "admin")
        ? `<span class="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]">Administrador Geral</span>`
        : `<span class="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">Operador</span>`;

      const badgeStatus = (u.status === "ativo")
        ? `<span class="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full text-[11px]">Ativo</span>`
        : `<span class="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full text-[11px]">Inativo</span>`;

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <td class="py-3 px-4 font-bold text-slate-800">${this.escapeHtml(u.nome)}</td>
          <td class="py-3 px-4 text-xs font-mono text-slate-600">${this.escapeHtml(u.email)}</td>
          <td class="py-3 px-4 text-xs text-slate-600">${this.escapeHtml(u.setor || "-")}</td>
          <td class="py-3 px-4">${badgePerfil}</td>
          <td class="py-3 px-4">${badgeStatus}</td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            ${!isCurrent ? `
              <button onclick="appManager.toggleUserStatus('${u.id}', '${u.status}')" class="text-xs font-semibold px-2 py-1 rounded mr-1 ${u.status === 'ativo' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}">
                ${u.status === 'ativo' ? 'Desativar' : 'Ativar'}
              </button>
              <button onclick="appManager.deleteUser('${u.id}')" class="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 bg-red-50 rounded">
                Excluir
              </button>
            ` : '<span class="text-xs text-slate-400 italic">Sua conta</span>'}
          </td>
        </tr>
      `;
    }).join("");
  }

  async toggleUserStatus(id, currentStatus) {
    const newStatus = (currentStatus === "ativo") ? "inativo" : "ativo";
    await window.storageService.updateUsuario(id, { status: newStatus });
    this.showToast(`Status do usuário alterado para ${newStatus}.`, "info");
    this.renderUsuariosList();
  }

  async deleteUser(id) {
    if (!confirm("Tem certeza que deseja remover este usuário autorizado?")) return;
    await window.storageService.deleteUsuario(id);
    this.showToast("Usuário removido.", "info");
    this.renderUsuariosList();
  }

  // ================= IMPRESSÃO OFICIAL =================
  async printComprovante(id) {
    const ag = await window.storageService.getAgendamentoById(id);
    if (!ag) return;

    const space = await window.storageService.getEspacoById(ag.auditorioId);
    const spaceName = space ? (space.nomeAmigavel || space.nome) : ag.auditorioId;
    const spaceCode = space ? space.idInterno : "";
    const spaceMec = space ? space.codigoMec : "";
    const spaceBloco = space ? space.bloco : "";

    const [ano, mes, dia] = ag.data.split("-");

    const printWin = window.open("", "_blank");
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Comprovante Oficial - Agenda SisInfra (UFPB / PRG)</title>
        <style>
          body { font-family: 'Open Sans', Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.5; padding: 2cm; margin: 0; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #003366; padding-bottom: 14px; margin-bottom: 20px; }
          .header-center { text-align: center; flex: 1; padding: 0 16px; }
          .header h1 { font-size: 12pt; margin: 0; color: #003366; text-transform: uppercase; font-weight: bold; }
          .header h2 { font-size: 10.5pt; margin: 3px 0; color: #333; font-weight: 600; }
          .header h3 { font-size: 9pt; margin: 0; color: #555; font-weight: normal; }
          .logo-brasao { height: 70px; width: auto; object-fit: contain; }
          .logo-prg { height: 46px; width: auto; object-fit: contain; }
          .title { text-align: center; font-size: 12pt; font-weight: bold; margin: 18px 0 14px; background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
          th { background-color: #f8fafc; font-size: 9.5pt; width: 30%; color: #475569; }
          td { font-size: 10pt; color: #0f172a; }
          .terms { font-size: 8pt; color: #475569; margin-top: 20px; border: 1px solid #e2e8f0; padding: 8px 10px; background-color: #f8fafc; }
          .signatures { display: flex; justify-content: space-between; margin-top: 45px; }
          .sig-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 6px; font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="assets/ufpb-brasao.png" alt="Brasão da UFPB" class="logo-brasao">
          <div class="header-center">
            <h1>Universidade Federal da Paraíba</h1>
            <h2>Pró-Reitoria de Graduação (PRG)</h2>
            <h3>Agenda SisInfra • Catálogo Integrado: sisinfra.ufpb.br</h3>
          </div>
          <img src="assets/prg-logo.png" alt="Logo PRG" class="logo-prg">
        </div>

        <div class="title">COMPROVANTE OFICIAL DE RESERVA DE ESPAÇO ACADÊMICO</div>

        <table>
          <tr><th>Código de Reserva</th><td><strong>#${ag.id}</strong></td></tr>
          <tr><th>Espaço Reservado</th><td><strong>${this.escapeHtml(spaceName)}</strong> (${spaceCode} • e-MEC: ${spaceMec}${space && space.statusMec ? ' - ' + space.statusMec : ''} • ${spaceBloco} • Cap: ${space ? space.capacidade : ''} lugares)</td></tr>
          <tr><th>Evento / Atividade</th><td><strong>${this.escapeHtml(ag.titulo)}</strong></td></tr>
          <tr><th>Tipo de Evento</th><td>${this.escapeHtml(ag.tipoEvento || "Geral")}</td></tr>
          <tr><th>Data Agendada</th><td><strong>${dia}/${mes}/${ano}</strong></td></tr>
          <tr><th>Horário Autorizado</th><td><strong>${ag.horaInicio} às ${ag.horaFim}</strong></td></tr>
          <tr><th>Solicitante / Docente</th><td>${this.escapeHtml(ag.solicitante)}</td></tr>
          <tr><th>Departamento / Setor</th><td>${this.escapeHtml(ag.departamento || "Não informado")}</td></tr>
          <tr><th>E-mail / Contato</th><td>${this.escapeHtml(ag.email)} • ${this.escapeHtml(ag.telefone || "")}</td></tr>
          <tr><th>Recursos Solicitados</th><td>${ag.recursos ? ag.recursos.join(", ") : "Nenhum recurso extra"}</td></tr>
          <tr><th>Status da Reserva</th><td><strong>${ag.status.toUpperCase()}</strong></td></tr>
          ${ag.motivoRejeicao ? `<tr><th>Justificativa da Recusa</th><td style="color:#b91c1c;"><strong>${this.escapeHtml(ag.motivoRejeicao)}</strong></td></tr>` : ''}
          ${ag.motivoCancelamento ? `<tr><th>Motivo do Cancelamento</th><td style="color:#b45309;"><strong>${this.escapeHtml(ag.motivoCancelamento)}</strong></td></tr>` : ''}
        </table>

        <div class="terms">
          <strong>Termos de Uso e Conservação do Patrimônio (SisInfra / PRG):</strong><br>
          1. É expressamente proibido o consumo de alimentos ou bebidas (exceto água) no interior dos auditórios e salas.<br>
          2. Os equipamentos multimídia e didáticos devem ser operados com zelo e conforme as orientações da equipe da Central de Aulas.<br>
          3. O solicitante assume total responsabilidade pela ordem, conservação do mobiliário e entrega do espaço no horário pactuado.<br>
          4. Em caso de cancelamento, a Central de Aulas / PRG deve ser comunicada com antecedência mínima de 24 horas via sistema.
        </div>

        <div class="signatures">
          <div class="sig-box">
            ${this.escapeHtml(ag.solicitante)}<br>
            Solicitante Responsável
          </div>
          <div class="sig-box">
            Gestão SisInfra / PRG<br>
            Central de Aulas - Campus I
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  }

  // ================= ACESSIBILIDADE =================
  bindAccessibility() {
    const contrastBtn = document.getElementById("btn-toggle-contraste");
    if (contrastBtn) {
      contrastBtn.addEventListener("click", (e) => {
        e.preventDefault();
        document.body.classList.toggle("alto-contraste");
        const active = document.body.classList.contains("alto-contraste");
        this.showToast(active ? "Modo Alto Contraste ativado." : "Modo Normal ativado.", "info");
      });
    }

    const fontPlusBtn = document.getElementById("btn-font-plus");
    const fontMinusBtn = document.getElementById("btn-font-minus");

    let currentFontSize = 100;
    if (fontPlusBtn) {
      fontPlusBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentFontSize < 130) {
          currentFontSize += 10;
          document.documentElement.style.fontSize = `${currentFontSize}%`;
        }
      });
    }

    if (fontMinusBtn) {
      fontMinusBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentFontSize > 80) {
          currentFontSize -= 10;
          document.documentElement.style.fontSize = `${currentFontSize}%`;
        }
      });
    }
  }

  // ================= BLOQUEIOS DE HORÁRIOS & PERÍODOS LETIVOS =================
  bindBloqueiosEvents() {
    const btnNovo = document.getElementById("btn-novo-bloqueio");
    const btnQuick = document.getElementById("btn-quick-manage-blocks");
    const btnToggleSemestre = document.getElementById("btn-toggle-semestre-letivo");
    const form = document.getElementById("form-bloqueio");
    const searchInput = document.getElementById("bloqueios-search");
    const filterMotivo = document.getElementById("bloqueios-filter-motivo");
    const filterStatus = document.getElementById("bloqueios-filter-status");
    const escopoSelect = document.getElementById("bloq-tipo-espaco");

    if (btnNovo) {
      btnNovo.addEventListener("click", () => {
        this.openBloqueioModal();
      });
    }

    if (btnQuick) {
      btnQuick.addEventListener("click", () => {
        this.switchTab("bloqueios");
      });
    }

    if (escopoSelect) {
      escopoSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        const blocoWrap = document.getElementById("bloq-bloco-select-wrapper");
        const salaWrap = document.getElementById("bloq-sala-select-wrapper");
        if (blocoWrap) blocoWrap.classList.toggle("hidden", val !== "bloco");
        if (salaWrap) salaWrap.classList.toggle("hidden", val !== "especifico");
      });
    }

    if (btnToggleSemestre) {
      btnToggleSemestre.addEventListener("click", async () => {
        const bloqueios = await window.storageService.getBloqueios();
        const semestreBloqs = bloqueios.filter(b => b.motivo === "aulas_periodo_letivo");
        if (semestreBloqs.length === 0) return;
        const allActive = semestreBloqs.every(b => b.ativo !== false);
        const novoStatus = !allActive;
        for (const b of semestreBloqs) {
          await window.storageService.toggleBloqueioAtivo(b.id, novoStatus);
        }
        this.showToast(novoStatus ? "Aulas regulares da graduação ATIVADAS em todas as salas!" : "Aulas regulares da graduação DESATIVADAS (Período de férias/recesso).", "info");
        await this.renderBloqueiosList();
        this.checkBookingFormBlockWarning();
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const titulo = document.getElementById("bloq-titulo").value.trim();
        const motivo = document.getElementById("bloq-motivo").value;
        const tipoEspaco = document.getElementById("bloq-tipo-espaco").value;
        const bloco = document.getElementById("bloq-bloco")?.value || "todos";
        const salaEspecifica = document.getElementById("bloq-sala-especifica")?.value;
        const dataInicio = document.getElementById("bloq-data-inicio").value;
        const dataFim = document.getElementById("bloq-data-fim").value;
        const horaInicio = document.getElementById("bloq-hora-inicio").value;
        const horaFim = document.getElementById("bloq-hora-fim").value;
        const descricao = document.getElementById("bloq-descricao").value.trim();
        const ativo = document.getElementById("bloq-ativo").checked;

        const diasSemana = [];
        form.querySelectorAll("input[name='bloq-dia']:checked").forEach(cb => {
          diasSemana.push(parseInt(cb.value, 10));
        });

        if (horaInicio >= horaFim) {
          alert("A hora de término deve ser posterior à hora de início.");
          return;
        }

        const dataObj = {
          titulo,
          motivo,
          tipoEspaco,
          bloco,
          espacoIds: tipoEspaco === "especifico" && salaEspecifica ? [salaEspecifica] : [],
          dataInicio,
          dataFim,
          diasSemana,
          horaInicio,
          horaFim,
          descricao,
          ativo,
          criadoPor: window.authService.getCurrentUser()?.email || "admin@academico.ufpb.br"
        };

        try {
          if (this.editingBloqueioId) {
            await window.storageService.updateBloqueio(this.editingBloqueioId, dataObj);
            this.showToast("Bloqueio atualizado com sucesso!", "success");
            this.editingBloqueioId = null;
          } else {
            await window.storageService.createBloqueio(dataObj);
            this.showToast("Novo bloqueio cadastrado com sucesso!", "success");
          }

          this.closeModal("modal-bloqueio");
          await this.renderBloqueiosList();
          this.checkBookingFormBlockWarning();
        } catch (err) {
          alert("Erro ao salvar bloqueio: " + err.message);
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.bloqueioSearchTerm = e.target.value.toLowerCase();
        this.renderBloqueiosList();
      });
    }

    const filterSemestre = document.getElementById("bloqueios-filter-semestre");
    if (filterSemestre) {
      filterSemestre.addEventListener("change", (e) => {
        this.bloqueioFilterSemestre = e.target.value;
        this.renderBloqueiosList();
      });
    }

    if (filterMotivo) {
      filterMotivo.addEventListener("change", (e) => {
        this.bloqueioFilterMotivo = e.target.value;
        this.renderBloqueiosList();
      });
    }

    if (filterStatus) {
      filterStatus.addEventListener("change", (e) => {
        this.bloqueioFilterStatus = e.target.value;
        this.renderBloqueiosList();
      });
    }
  }

  fillBloqTurno(inicio, fim) {
    const hIni = document.getElementById("bloq-hora-inicio");
    const hFim = document.getElementById("bloq-hora-fim");
    if (hIni) hIni.value = inicio;
    if (hFim) hFim.value = fim;
  }

  fillBloqSemestre(sem) {
    const dIni = document.getElementById("bloq-data-inicio");
    const dFim = document.getElementById("bloq-data-fim");
    const tit = document.getElementById("bloq-titulo");
    if (sem === "2026.2") {
      if (dIni) dIni.value = "2026-08-28";
      if (dFim) dFim.value = "2026-12-16";
      if (tit && (!tit.value || tit.value.includes("Graduação"))) {
        tit.value = "Aulas da Graduação - Período 2026.2";
      }
    } else if (sem === "2027.1") {
      if (dIni) dIni.value = "2027-03-01";
      if (dFim) dFim.value = "2027-07-10";
      if (tit && (!tit.value || tit.value.includes("Graduação"))) {
        tit.value = "Aulas da Graduação - Período 2027.1";
      }
    } else if (sem === "2027.2") {
      if (dIni) dIni.value = "2027-08-09";
      if (dFim) dFim.value = "2027-12-16";
      if (tit && (!tit.value || tit.value.includes("Graduação"))) {
        tit.value = "Aulas da Graduação - Período 2027.2";
      }
    }
  }

  async openBloqueioModal(bloqueioId = null) {
    this.editingBloqueioId = bloqueioId;
    const form = document.getElementById("form-bloqueio");
    if (!form) return;
    form.reset();

    const titleEl = document.getElementById("modal-bloqueio-title");
    const salaSelect = document.getElementById("bloq-sala-especifica");
    if (salaSelect) {
      const espacos = await window.storageService.getEspacos();
      salaSelect.innerHTML = espacos.map(s => `<option value="${s.id}">${this.escapeHtml(s.nomeAmigavel || s.nome)} (${s.bloco})</option>`).join("");
    }

    if (bloqueioId) {
      const b = await window.storageService.getBloqueioById(bloqueioId);
      if (!b) return;
      if (titleEl) titleEl.textContent = `Editar Bloqueio: ${b.titulo}`;
      document.getElementById("bloq-titulo").value = b.titulo;
      document.getElementById("bloq-motivo").value = b.motivo;
      document.getElementById("bloq-tipo-espaco").value = b.tipoEspaco;
      document.getElementById("bloq-data-inicio").value = b.dataInicio;
      document.getElementById("bloq-data-fim").value = b.dataFim;
      document.getElementById("bloq-hora-inicio").value = b.horaInicio;
      document.getElementById("bloq-hora-fim").value = b.horaFim;
      document.getElementById("bloq-descricao").value = b.descricao || "";
      document.getElementById("bloq-ativo").checked = b.ativo !== false;

      form.querySelectorAll("input[name='bloq-dia']").forEach(cb => {
        cb.checked = Array.isArray(b.diasSemana) ? b.diasSemana.includes(parseInt(cb.value, 10)) : true;
      });

      document.getElementById("bloq-tipo-espaco").dispatchEvent(new Event("change"));
    } else {
      if (titleEl) titleEl.textContent = "Novo Bloqueio de Horário";
      document.getElementById("bloq-tipo-espaco").dispatchEvent(new Event("change"));
    }

    this.openModal("modal-bloqueio");
  }

  async renderBloqueiosList() {
    const container = document.getElementById("bloqueios-cards-container");
    if (!container) return;

    const list = await window.storageService.getBloqueios();

    // KPIs
    const kpiTotal = document.getElementById("kpi-total-bloqueios");
    const kpiAtivos = document.getElementById("kpi-bloqueios-ativos");
    const kpiSalas = document.getElementById("kpi-salas-bloqueadas");

    if (kpiTotal) kpiTotal.textContent = list.length;
    if (kpiAtivos) kpiAtivos.textContent = list.filter(b => b.ativo !== false).length;
    if (kpiSalas) kpiSalas.textContent = "59+";

    const filtered = list.filter(b => {
      if (this.bloqueioFilterSemestre && this.bloqueioFilterSemestre !== "todos") {
        if (b.semestre && b.semestre !== this.bloqueioFilterSemestre) return false;
        if (!b.semestre) {
          if (this.bloqueioFilterSemestre === "2026.2" && !b.dataInicio.startsWith("2026")) return false;
          if (this.bloqueioFilterSemestre === "2027.1" && (!b.dataInicio.startsWith("2027-03") && !b.dataInicio.startsWith("2027-07"))) return false;
          if (this.bloqueioFilterSemestre === "2027.2" && (!b.dataInicio.startsWith("2027-08") && !b.dataInicio.startsWith("2027-12"))) return false;
        }
      }
      if (this.bloqueioFilterMotivo && this.bloqueioFilterMotivo !== "todos" && b.motivo !== this.bloqueioFilterMotivo) return false;
      if (this.bloqueioFilterStatus === "ativo" && b.ativo === false) return false;
      if (this.bloqueioFilterStatus === "inativo" && b.ativo !== false) return false;
      if (this.bloqueioSearchTerm) {
        const full = `${b.titulo} ${b.motivo} ${b.tipoEspaco} ${b.semestre || ""} ${b.descricao || ""}`.toLowerCase();
        if (!full.includes(this.bloqueioSearchTerm)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
          <span class="text-3xl block mb-2">🔍</span>
          <p class="font-bold text-slate-700">Nenhum bloqueio encontrado com os filtros atuais.</p>
        </div>
      `;
      return;
    }

    const diaMap = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 0: "Dom" };
    const motivoMap = {
      aulas_periodo_letivo: { label: "Aulas da Graduação (SIGAA)", badge: "bg-blue-100 text-blue-900 border-blue-300" },
      manutencao: { label: "Manutenção Predial", badge: "bg-amber-100 text-amber-900 border-amber-300" },
      evento: { label: "Evento Institucional", badge: "bg-purple-100 text-purple-900 border-purple-300" },
      concurso: { label: "Concurso / Vestibular", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
      outro: { label: "Outro Motivo", badge: "bg-slate-100 text-slate-800 border-slate-300" }
    };

    container.innerHTML = filtered.map(b => {
      const isAtivo = b.ativo !== false;
      const motivoInfo = motivoMap[b.motivo] || motivoMap.outro;
      const diasStr = Array.isArray(b.diasSemana) ? b.diasSemana.map(d => diaMap[d] || d).join(", ") : "Todos os dias";

      let escopoStr = "Todas as Salas de Aula da Central";
      if (b.tipoEspaco === "bloco") escopoStr = b.bloco || "Bloco Específico";
      else if (b.tipoEspaco === "auditorios") escopoStr = "Auditórios 1 e 2";
      else if (b.tipoEspaco === "todos_espacos") escopoStr = "Todos os 102 Espaços da PRG";
      else if (b.tipoEspaco === "especifico") escopoStr = "Sala Específica";

      return `
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${motivoInfo.badge}">
                    ${motivoInfo.label}
                  </span>
                  ${b.semestre ? `
                    <span class="inline-flex items-center text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                      ${b.semestre}
                    </span>
                  ` : ''}
                </div>
                <h3 class="font-bold text-sm text-slate-900 leading-snug">${this.escapeHtml(b.titulo)}</h3>
              </div>
              <label class="switch-toggle flex-shrink-0" title="${isAtivo ? 'Desativar bloqueio' : 'Ativar bloqueio'}">
                <input type="checkbox" ${isAtivo ? 'checked' : ''} onchange="appManager.toggleBloqueioStatus('${b.id}', this.checked)">
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div><strong>🏢 Escopo:</strong> ${this.escapeHtml(escopoStr)}</div>
              <div><strong>📅 Vigência:</strong> ${b.dataInicio} até ${b.dataFim}</div>
              <div><strong>⏰ Horário:</strong> ${b.horaInicio} às ${b.horaFim} (${diasStr})</div>
              ${b.descricao ? `<div class="text-[11px] text-slate-500 pt-1 border-t border-slate-200 mt-1 italic">"${this.escapeHtml(b.descricao)}"</div>` : ''}
            </div>
          </div>

          <div class="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-[11px] font-bold ${isAtivo ? 'text-emerald-700' : 'text-slate-400'}">
              ${isAtivo ? '✓ Bloqueio Ativo' : '⚪ Inativo (Liberado)'}
            </span>
            <div class="flex items-center gap-1.5">
              <button onclick="appManager.openBloqueioModal('${b.id}')" class="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 rounded hover:bg-slate-100">
                Editar
              </button>
              <button onclick="appManager.deleteBloqueio('${b.id}')" class="px-2.5 py-1 text-xs font-semibold text-red-700 hover:text-red-900 bg-white border border-red-200 rounded hover:bg-red-50">
                Excluir
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  async toggleBloqueioStatus(id, state) {
    await window.storageService.toggleBloqueioAtivo(id, state);
    this.showToast(state ? "Bloqueio ativado com sucesso!" : "Bloqueio desativado.", "info");
    await this.renderBloqueiosList();
    this.checkBookingFormBlockWarning();
  }

  async deleteBloqueio(id) {
    if (!confirm("Deseja realmente remover esta regra de bloqueio de horário?")) return;
    await window.storageService.deleteBloqueio(id);
    this.showToast("Regra de bloqueio excluída.", "info");
    await this.renderBloqueiosList();
    this.checkBookingFormBlockWarning();
  }

  // ================= MODAL DE IMPORTAÇÃO SISINFRA =================
  bindImportSisinfraModal() {
    const btnOpen = document.getElementById("btn-open-import-sisinfra");
    const fileInput = document.getElementById("sisinfra-csv-file-input");
    const fileNameDisplay = document.getElementById("import-file-name-display");
    const textarea = document.getElementById("import-csv-textarea");
    const btnProcess = document.getElementById("btn-process-import-csv");
    const statusFeedback = document.getElementById("import-status-feedback");

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        if (textarea) textarea.value = "";
        if (fileNameDisplay) fileNameDisplay.textContent = "exportacao-infraestruturas-*.csv (delimitador ;)";
        if (statusFeedback) {
          statusFeedback.className = "hidden p-3 rounded-lg text-xs";
          statusFeedback.innerHTML = "";
        }
        this.openModal("modal-import-sisinfra");
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (fileNameDisplay) fileNameDisplay.textContent = `Arquivo selecionado: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (textarea) textarea.value = event.target.result;
        };
        reader.readAsText(file, "UTF-8");
      });
    }

    if (btnProcess) {
      btnProcess.addEventListener("click", async () => {
        const text = textarea ? textarea.value.trim() : "";
        if (!text) {
          alert("Por favor, selecione um arquivo CSV ou cole o conteúdo no campo de texto.");
          return;
        }

        const preserveChecklist = document.getElementById("import-opt-checklist")?.checked !== false;
        const preserveReservavel = document.getElementById("import-opt-reservavel")?.checked !== false;

        try {
          btnProcess.disabled = true;
          btnProcess.innerHTML = "<span>⏳</span> <span>Processando...</span>";

          const result = await window.storageService.importSisinfraCsv(text, {
            preserveChecklist,
            preserveReservavel
          });

          if (statusFeedback) {
            statusFeedback.className = "p-3 rounded-lg text-xs bg-green-50 border border-green-200 text-green-900";
            statusFeedback.innerHTML = `
              <strong>✓ Importação realizada com sucesso!</strong><br>
              • Total de registros processados: <strong>${result.total}</strong><br>
              • Espaços atualizados: <strong>${result.updated}</strong><br>
              • Novos espaços criados: <strong>${result.created}</strong><br>
              Todas as salas da Central de Aulas e auditórios foram sincronizados.
            `;
          }

          this.showToast(`Importação SisInfra concluída! ${result.total} espaços processados.`, "success");

          await this.populateBookingSpacesSelect();
          await this.renderSisinfraSpaces();
          if (window.calendarManager) await window.calendarManager.render();

          setTimeout(() => {
            this.closeModal("modal-import-sisinfra");
          }, 1800);
        } catch (err) {
          if (statusFeedback) {
            statusFeedback.className = "p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-900";
            statusFeedback.innerHTML = `<strong>Erro na importação:</strong> ${err.message}`;
          }
          alert("Erro ao importar CSV: " + err.message);
        } finally {
          btnProcess.disabled = false;
          btnProcess.innerHTML = "<span>📥</span> <span>Processar Importação</span>";
        }
      });
    }
  }

  // ================= MODAIS & TOASTS =================
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span><span class="flex-1 font-medium">${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m];
    });
  }
}

window.appManager = new AppManager();
document.addEventListener("DOMContentLoaded", () => {
  window.appManager.init();
});
