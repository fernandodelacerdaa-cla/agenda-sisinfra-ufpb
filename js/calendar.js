/**
 * AGENDA SISINFRA - GESTÃO DE ESPAÇOS E INFRAESTRUTURA (PRG / UFPB)
 * Módulo de Calendário Interativo & Visualização Dinâmica dos Espaços Reserváveis
 * Integrado ao SisInfra (https://sisinfra.ufpb.br)
 */

class CalendarManager {
  constructor() {
    this.currentDate = new Date();
    this.selectedAuditorio = "todos"; // "todos" ou ID do espaço (ex: "INFRA2220PRG")
    this.viewMode = "month";
    this.spacesMap = new Map();
    this.monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    this.dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  }

  async init() {
    this.bindControls();
    await this.render();
  }

  bindControls() {
    const prevBtn = document.getElementById("cal-prev-btn");
    const nextBtn = document.getElementById("cal-next-btn");
    const todayBtn = document.getElementById("cal-today-btn");
    const filterSelect = document.getElementById("cal-auditorio-filter");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener("click", () => {
        this.currentDate = new Date();
        this.render();
      });
    }

    if (filterSelect) {
      filterSelect.addEventListener("change", (e) => {
        this.selectedAuditorio = e.target.value;
        this.render();
      });
    }
  }

  async updateFilterSelect() {
    const filterSelect = document.getElementById("cal-auditorio-filter");
    if (!filterSelect) return;

    const reservaveis = await window.storageService.getEspacosReservaveis();
    const curVal = this.selectedAuditorio;

    // Agrupa por Bloco / Categoria
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

    let html = `<option value="todos">Todos os Espaços Reserváveis (${reservaveis.length})</option>`;
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

    filterSelect.innerHTML = html;

    // Renderiza legenda dinâmica (Auditórios principais + salas de aula)
    const legendEl = document.getElementById("calendar-legend-container");
    if (legendEl) {
      const mainSpaces = reservaveis.filter(sp => sp.id === "INFRA2220PRG" || sp.id === "INFRA2202PRG" || sp.id === "INFRA2289PRG" || sp.id === "INFRA2290PRG");
      legendEl.innerHTML = `
        ${mainSpaces.map(sp => `
          <div class="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
            <span class="w-3 h-3 rounded-full" style="background-color: ${sp.cor || '#00509e'}"></span>
            <span>${this.escapeHtml(sp.nomeAmigavel || sp.nome)}</span>
          </div>
        `).join("")}
        <div class="flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
          <span>🏛️</span>
          <span>59 Salas da Central de Aulas</span>
        </div>
      `;
    }
  }

  async render() {
    const gridEl = document.getElementById("calendar-grid-container");
    const titleEl = document.getElementById("calendar-month-title");
    if (!gridEl) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    if (titleEl) {
      titleEl.textContent = `${this.monthNames[month]} de ${year}`;
    }

    // Renderiza badge informativo do semestre letivo UFPB
    this.renderSemesterBadge(year, month);

    // Carrega espaços no mapa
    const allSpaces = await window.storageService.getEspacos();
    this.spacesMap.clear();
    allSpaces.forEach(sp => this.spacesMap.set(sp.id, sp));

    // Carrega marcos acadêmicos oficiais UFPB (2026.2, 2027.1, 2027.2)
    const milestones = (window.storageService && window.storageService.getAcademicMilestones) ? window.storageService.getAcademicMilestones() : [];
    this.milestonesMap = {};
    milestones.forEach(m => {
      this.milestonesMap[m.date] = m;
    });

    // Atualiza dropdown de filtros e legenda
    await this.updateFilterSelect();

    // Carrega agendamentos
    const allAgendamentos = await window.storageService.getAgendamentos();

    // Filtra agendamentos por espaço selecionado
    const agendamentos = allAgendamentos.filter(ag => {
      if (ag.status === "cancelado") return false;
      const normalized = window.storageService.normalizeSpaceId(ag.auditorioId);
      if (this.selectedAuditorio !== "todos" && normalized !== String(this.selectedAuditorio)) {
        return false;
      }
      return true;
    });

    // Mapeia eventos por data YYYY-MM-DD
    const eventsByDate = {};
    agendamentos.forEach(ag => {
      if (!eventsByDate[ag.data]) eventsByDate[ag.data] = [];
      eventsByDate[ag.data].push(ag);
    });

    // Ordena por horário em cada data
    Object.keys(eventsByDate).forEach(d => {
      eventsByDate[d].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    });

    // Cálculos de dias do calendário
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    let html = '<div class="calendar-grid">';

    // Cabeçalho dos dias da semana
    this.dayNames.forEach(name => {
      html += `<div class="calendar-header-cell">${name}</div>`;
    });

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split("T")[0];

    // Dias do mês anterior
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthLastDay - x + 1;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split("T")[0];
      html += this.renderDayCell(dayNum, dateStr, true, false, eventsByDate[dateStr] || []);
    }

    // Dias do mês atual
    for (let i = 1; i <= lastDayOfMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isToday = (dateStr === hojeStr);
      html += this.renderDayCell(i, dateStr, false, isToday, eventsByDate[dateStr] || []);
    }

    // Dias do próximo mês para completar grid de 35 ou 42 células
    const totalRendered = firstDayIndex + lastDayOfMonth;
    const nextDays = (totalRendered > 35) ? (42 - totalRendered) : (35 - totalRendered);
    for (let j = 1; j <= nextDays; j++) {
      const nextDate = new Date(year, month + 1, j);
      const dateStr = nextDate.toISOString().split("T")[0];
      html += this.renderDayCell(j, dateStr, true, false, eventsByDate[dateStr] || []);
    }

    html += '</div>';
    gridEl.innerHTML = html;

    // Vincula eventos nos pills e células
    this.attachCellListeners();
  }

  renderSemesterBadge(year, month) {
    const badgeEl = document.getElementById("calendar-semester-badge");
    if (!badgeEl) return;

    let badgeHtml = "";
    if (year === 2026) {
      if (month >= 7 && month <= 10) { // Ago a Nov 2026
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Semestre 2026.2 Vigente (Aulas até 16/12)
        </span>`;
      } else if (month === 11) { // Dez 2026
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          2026.2: Aulas até 16/12 • Exames 17-22/12
        </span>`;
      } else {
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
          UFPB • 2026
        </span>`;
      }
    } else if (year === 2027) {
      if (month === 0) { // Jan 2027
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          🏖️ Recesso • Colações 11 a 29/01 (2027.1 em 01/03)
        </span>`;
      } else if (month === 1) { // Fev 2027
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          🏖️ Recesso • Matrículas SIGAA 11 a 13/02 • Aulas 01/03
        </span>`;
      } else if (month >= 2 && month <= 5) { // Mar a Jun 2027
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
          📘 Semestre 2027.1 (Aulas: 01/03 a 10/07/2027)
        </span>`;
      } else if (month === 6) { // Jul 2027
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
          📘 2027.1: Aulas até 10/07 • Exames 12 a 17/07
        </span>`;
      } else if (month >= 7 && month <= 10) { // Ago a Nov 2027
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
          🎓 Semestre 2027.2 Publicado (Aulas: 09/08 a 16/12)
        </span>`;
      } else if (month === 11) { // Dez 2027
        badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
          🎓 2027.2: Aulas até 16/12 • Exames 17 a 22/12
        </span>`;
      }
    } else if (year === 2028 && (month === 0 || month === 1)) {
      badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
        🏖️ Recesso • Colações 2027.2 (01 a 25/02/2028)
      </span>`;
    } else {
      badgeHtml = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
        UFPB • Agenda SisInfra
      </span>`;
    }

    badgeEl.innerHTML = badgeHtml;
  }

  renderDayCell(dayNum, dateStr, isOtherMonth, isToday, events) {
    let classes = "calendar-day-cell";
    if (isOtherMonth) classes += " other-month";
    if (isToday) classes += " is-today";

    let extraPills = "";

    // 1. Marco acadêmico oficial UFPB do Consepe
    if (this.milestonesMap && this.milestonesMap[dateStr]) {
      const ms = this.milestonesMap[dateStr];
      extraPills += `
        <div class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 mb-1 flex items-center gap-1 truncate shadow-2xs" title="${this.escapeHtml(ms.title)}">
          <span>${this.escapeHtml(ms.label)}</span>
        </div>
      `;
    }

    // 2. Se um espaço específico da Central de Aulas estiver selecionado, indica aulas regulares nos dias úteis
    if (this.selectedAuditorio && this.selectedAuditorio !== "todos") {
      const selectedSpace = this.spacesMap.get(this.selectedAuditorio);
      if (selectedSpace && (selectedSpace.tipo === "Sala de Aula" || (selectedSpace.bloco && selectedSpace.bloco.includes("Bloco ")))) {
        // Verifica se cai em dia útil durante 2026.2, 2027.1 ou 2027.2
        const [ano, mes, dia] = dateStr.split("-").map(Number);
        const dayOfWeek = new Date(ano, mes - 1, dia).getDay();
        const isWeekday = (dayOfWeek >= 1 && dayOfWeek <= 5);

        const isSem26_2 = (dateStr >= "2026-08-28" && dateStr <= "2026-12-16");
        const isSem27_1 = (dateStr >= "2027-03-01" && dateStr <= "2027-07-10");
        const isSem27_2 = (dateStr >= "2027-08-09" && dateStr <= "2027-12-16");

        if (isWeekday && (isSem26_2 || isSem27_1 || isSem27_2)) {
          extraPills += `
            <div class="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 mb-1 truncate" title="Horários reservados para turmas regulares da graduação (07h às 22h)">
              📚 Aulas Regulares SIGAA
            </div>
          `;
        }
      }
    }

    let eventsHtml = extraPills;
    events.slice(0, 3).forEach(ev => {
      const normId = window.storageService.normalizeSpaceId(ev.auditorioId);
      const space = this.spacesMap.get(normId);

      let pillClass = space ? (space.badgeLight || "bg-blue-100 text-blue-900 border-blue-700") : "bg-blue-100 text-blue-900 border-blue-700";
      let spaceName = space ? (space.nomeAmigavel || space.nome) : "Espaço";
      
      // Abreviação para pill compacta
      let shortLabel = spaceName;
      if (spaceName.length > 14) {
        shortLabel = spaceName.substring(0, 12) + "…";
      }

      const pendingMark = (ev.status === "pendente") ? "⏳ " : "";

      eventsHtml += `
        <div class="calendar-event-pill ${pillClass} border-l-2" data-event-id="${ev.id}" title="${this.escapeHtml(spaceName)} - ${ev.horaInicio} às ${ev.horaFim}: ${this.escapeHtml(ev.titulo)}">
          <span class="font-bold text-[10px] opacity-90">[${this.escapeHtml(shortLabel)}]</span> ${pendingMark}${ev.horaInicio} ${this.escapeHtml(ev.titulo)}
        </div>
      `;
    });

    if (events.length > 3) {
      eventsHtml += `<div class="text-[10px] font-semibold text-slate-500 mt-1 pl-1">+ mais ${events.length - 3} agendamentos</div>`;
    }

    return `
      <div class="${classes}" data-date="${dateStr}">
        <div class="flex items-center justify-between mb-1">
          <span class="day-number font-semibold text-xs text-slate-700">${dayNum}</span>
          ${events.length > 0 ? `<span class="text-[10px] font-medium text-slate-400">${events.length}</span>` : ""}
        </div>
        <div class="space-y-1 flex-1 overflow-y-auto">
          ${eventsHtml}
        </div>
      </div>
    `;
  }

  attachCellListeners() {
    // Clique no evento
    document.querySelectorAll(".calendar-event-pill").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = el.getAttribute("data-event-id");
        if (id && window.appManager) {
          window.appManager.openBookingDetails(id);
        }
      });
    });

    // Clique na célula do dia para agendar nessa data
    document.querySelectorAll(".calendar-day-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        const dateStr = cell.getAttribute("data-date");
        if (dateStr && window.appManager) {
          window.appManager.prefillBookingDate(dateStr);
        }
      });
    });
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

window.calendarManager = new CalendarManager();
