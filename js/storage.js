/**
 * AGENDA SISINFRA - GESTÃO DE ESPAÇOS E INFRAESTRUTURA (PRG / UFPB)
 * Camada de Dados Conectada ao Banco Relacional SQLite (./api/...)
 * Integrado ao Catálogo SisInfra (https://sisinfra.ufpb.br)
 */

const CALENDARIOS_ACADEMICOS_UFPB = [
  {
    semestre: "2026.2",
    status: "vigente",
    rotulo: "2026.2 (Semestre Vigente / Em Andamento)",
    dataInicioAulas: "2026-08-28",
    dataFimAulas: "2026-12-16",
    examesFinais: "17/12/2026 a 22/12/2026",
    colacaoGrau: "11/01/2027 a 29/01/2027",
    recessoFimDeAno: "23/12/2026 a 28/02/2027",
    descricao: "Calendário acadêmico vigente aprovado pelo Consepe / PRG (Resolução oficial)."
  },
  {
    semestre: "2027.1",
    status: "proximo",
    rotulo: "2027.1 (Próximo Semestre Letivo)",
    matriculaSigaa: "11/02/2027 a 13/02/2027",
    dataInicioAulas: "2027-03-01",
    dataFimAulas: "2027-07-10",
    examesFinais: "12/07/2027 a 17/07/2027",
    colacaoGrau: "02/08/2027 a 31/08/2027",
    descricao: "Calendário acadêmico aprovado pelo Consepe / PRG."
  },
  {
    semestre: "2027.2",
    status: "publicado",
    rotulo: "2027.2 (Publicado no Consepe)",
    matriculaSigaa: "21/07/2027 a 23/07/2027",
    dataInicioAulas: "2027-08-09",
    dataFimAulas: "2027-12-16",
    examesFinais: "17/12/2027 a 22/12/2027",
    colacaoGrau: "01/02/2028 a 25/02/2028",
    descricao: "Calendário oficial publicado pelo Consepe / PRG para o segundo semestre de 2027."
  }
];

class StorageService {
  constructor() {
    window.isFirebaseActive = true; // Sinaliza na UI que o banco centralizado está ativo
  }

  async _api(url, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = sessionStorage.getItem("prg_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const resp = await fetch(url, { ...options, headers });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      throw new Error((data && data.error) || `Erro na comunicação com o banco (${resp.status}).`);
    }
    return data;
  }

  normalizeSpaceId(id) {
    if (!id) return "INFRA2220PRG";
    const str = String(id).trim();
    if (str === "1") return "INFRA2220PRG";
    if (str === "2") return "INFRA2202PRG";
    if (str === "3") return "INFRA2289PRG";
    if (str === "4") return "INFRA2290PRG";
    return str;
  }

  getCalendariosAcademicos() {
    return CALENDARIOS_ACADEMICOS_UFPB;
  }

  getAcademicMilestones() {
    return [
      { date: "2026-12-16", label: "🏁 Fim Aulas 2026.2", title: "Último dia de aulas do semestre 2026.2", type: "end" },
      { date: "2026-12-17", label: "📝 Início Exames", title: "Início dos Exames Finais da Graduação 2026.2 (17 a 22/12)", type: "exam" },
      { date: "2026-12-22", label: "📝 Fim Exames", title: "Término dos Exames Finais do semestre 2026.2", type: "exam" },
      { date: "2026-12-23", label: "🏖️ Início Recesso", title: "Início do Recesso Acadêmico de Fim de Ano UFPB", type: "recess" },
      { date: "2027-01-11", label: "🎓 Início Colações", title: "Colações de Grau 2026.2 (11 a 29/01/2027)", type: "grad" },
      { date: "2027-01-29", label: "🎓 Fim Colações", title: "Término das Colações de Grau 2026.2", type: "grad" },
      { date: "2027-02-11", label: "📋 Matrícula SIGAA", title: "Matrícula de alunos regulares 2027.1 no SIGAA (11 a 13/02/2027)", type: "enrollment" },
      { date: "2027-03-01", label: "🚀 Início Aulas 2027.1", title: "Início das Aulas da Graduação no período 2027.1", type: "start" },
      { date: "2027-07-10", label: "🏁 Fim Aulas 2027.1", title: "Último dia de aulas do período 2027.1", type: "end" },
      { date: "2027-07-12", label: "📝 Início Exames", title: "Exames Finais do período 2027.1 (12 a 17/07/2027)", type: "exam" },
      { date: "2027-07-17", label: "📝 Fim Exames", title: "Término dos Exames Finais do período 2027.1", type: "exam" },
      { date: "2027-07-21", label: "📋 Matrícula 2027.2", title: "Matrícula regular no SIGAA para o semestre 2027.2 (21 a 23/07/2027)", type: "enrollment" },
      { date: "2027-08-02", label: "🎓 Colações 2027.1", title: "Colações de Grau do semestre 2027.1 (02 a 31/08/2027)", type: "grad" },
      { date: "2027-08-09", label: "🚀 Início Aulas 2027.2", title: "Início das Aulas do semestre 2027.2 (Publicado Consepe)", type: "start" },
      { date: "2027-12-16", label: "🏁 Fim Aulas 2027.2", title: "Último dia de aulas do período 2027.2", type: "end" },
      { date: "2027-12-17", label: "📝 Início Exames", title: "Exames Finais do período 2027.2 (17 a 22/12/2027)", type: "exam" },
      { date: "2027-12-22", label: "📝 Fim Exames", title: "Término dos Exames Finais do período 2027.2", type: "exam" },
      { date: "2028-02-01", label: "🎓 Colações 2027.2", title: "Colações de Grau do semestre 2027.2 (01 a 25/02/2028)", type: "grad" }
    ];
  }

  // ================= ESPAÇOS SISINFRA & CHECKLIST =================
  async getEspacos() {
    return await this._api("./api/espacos");
  }

  async getEspacosReservaveis() {
    const list = await this.getEspacos();
    return list.filter((s) => s.reservavel === true);
  }

  async getEspacoById(id) {
    const targetId = this.normalizeSpaceId(id);
    const list = await this.getEspacos();
    return list.find((s) => s.id === targetId || s.idInterno === targetId) || null;
  }

  async saveEspaco(spaceData) {
    const targetId = this.normalizeSpaceId(spaceData.id || spaceData.idInterno);
    return await this._api(`./api/espacos/${encodeURIComponent(targetId)}`, {
      method: "PUT",
      body: JSON.stringify({ ...spaceData, id: targetId, idInterno: targetId })
    });
  }

  async updateEspacoChecklist(id, checklist) {
    const space = await this.getEspacoById(id);
    if (!space) throw new Error("Espaço não encontrado no catálogo SisInfra.");
    space.checklist = checklist;
    return await this.saveEspaco(space);
  }

  async toggleEspacoReservavel(id, isReservavel) {
    const space = await this.getEspacoById(id);
    if (!space) throw new Error("Espaço não encontrado no catálogo SisInfra.");
    space.reservavel = !!isReservavel;
    return await this.saveEspaco(space);
  }

  async resetEspacosToDefault() {
    return await this._api("./api/espacos/reset", { method: "POST" });
  }

  async getAuditorios() {
    return await this.getEspacosReservaveis();
  }

  async getAuditorioById(id) {
    return await this.getEspacoById(id);
  }

  async saveAuditorio(data) {
    return await this.saveEspaco(data);
  }

  // ================= AGENDAMENTOS =================
  async getAgendamentos() {
    const list = await this._api("./api/agendamentos");
    return list.map((item) => ({
      ...item,
      auditorioId: this.normalizeSpaceId(item.auditorioId)
    }));
  }

  async getAgendamentoById(id) {
    const list = await this.getAgendamentos();
    return list.find((ag) => ag.id === id) || null;
  }

  async checkConflict(auditorioId, data, horaInicio, horaFim, excludeId = null) {
    const agendamentos = await this.getAgendamentos();
    const audIdStr = this.normalizeSpaceId(auditorioId);
    const conflito = agendamentos.find((ag) => {
      if (excludeId && ag.id === excludeId) return false;
      if (ag.status === "cancelado" || ag.status === "rejeitado") return false;
      if (this.normalizeSpaceId(ag.auditorioId) === audIdStr && ag.data === data) {
        return horaInicio < ag.horaFim && horaFim > ag.horaInicio;
      }
      return false;
    });
    return conflito || null;
  }

  async createAgendamento(data) {
    return await this._api("./api/agendamentos", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateAgendamento(id, data) {
    return await this._api(`./api/agendamentos/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async deleteAgendamento(id) {
    await this._api(`./api/agendamentos/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return true;
  }

  // ================= GESTÃO DE PESSOAS AUTORIZADAS =================
  async getUsuarios() {
    return await this._api("./api/usuarios");
  }

  async createUsuario(data) {
    return await this._api("./api/usuarios", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateUsuario(id, data) {
    return await this._api(`./api/usuarios/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async deleteUsuario(id) {
    await this._api(`./api/usuarios/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return true;
  }

  // ================= BLOQUEIOS DE HORÁRIOS & PERÍODOS LETIVOS =================
  async getBloqueios() {
    return await this._api("./api/bloqueios");
  }

  async getBloqueioById(id) {
    const list = await this.getBloqueios();
    return list.find((b) => b.id === id) || null;
  }

  async createBloqueio(data) {
    return await this._api("./api/bloqueios", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateBloqueio(id, data) {
    return await this._api(`./api/bloqueios/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async toggleBloqueioAtivo(id, novoEstado) {
    return await this.updateBloqueio(id, { ativo: !!novoEstado });
  }

  async deleteBloqueio(id) {
    await this._api(`./api/bloqueios/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    return true;
  }

  async checkBlockConflict(auditorioId, data, horaInicio, horaFim) {
    const targetId = this.normalizeSpaceId(auditorioId);
    const espaco = await this.getEspacoById(targetId);
    if (!espaco) return null;

    const bloqueios = await this.getBloqueios();
    const ativos = bloqueios.filter((b) => b.ativo !== false);

    const [ano, mes, dia] = data.split("-").map(Number);
    const dt = new Date(ano, mes - 1, dia);
    const diaSemana = dt.getDay();

    for (const b of ativos) {
      if (b.dataInicio && data < b.dataInicio) continue;
      if (b.dataFim && data > b.dataFim) continue;
      if (Array.isArray(b.diasSemana) && b.diasSemana.length > 0) {
        if (!b.diasSemana.includes(diaSemana)) continue;
      }

      let afeta = false;
      if (b.tipoEspaco === "todos_espacos") {
        afeta = true;
      } else if (b.tipoEspaco === "todas_salas") {
        const isClassroom = espaco.tipo === "Sala de Aula" || (espaco.bloco && espaco.bloco.includes("Bloco "));
        const isAuditorio = (espaco.nome && espaco.nome.includes("AUDITÓRIO")) || targetId === "INFRA2220PRG" || targetId === "INFRA2202PRG";
        if (isClassroom && !isAuditorio) afeta = true;
      } else if (b.tipoEspaco === "bloco") {
        if (b.bloco === "todos" || espaco.bloco === b.bloco) afeta = true;
      } else if (b.tipoEspaco === "auditorios") {
        if ((espaco.nome && espaco.nome.includes("AUDITÓRIO")) || targetId === "INFRA2220PRG" || targetId === "INFRA2202PRG") {
          afeta = true;
        }
      } else if (b.tipoEspaco === "especifico") {
        if (Array.isArray(b.espacoIds) && b.espacoIds.includes(targetId)) afeta = true;
      }

      if (!afeta) continue;
      if (horaInicio < b.horaFim && horaFim > b.horaInicio) {
        return b;
      }
    }
    return null;
  }

  // ================= IMPORTAÇÃO OFICIAL DO SISINFRA (CSV) =================
  parseSisinfraCsv(text) {
    if (!text) return [];
    const cleanText = text.replace(/^\uFEFF/, "").trim();
    const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(";") ? ";" : ",";
    const splitLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const getIndex = (keywords) => header.findIndex((h) => keywords.some((k) => h.includes(k)));

    const idxId = getIndex(["id interno", "id", "identificador"]);
    const idxNome = getIndex(["nome/identificação", "nome da infraestrutura", "nome"]);
    const idxEmec = getIndex(["código e-mec", "e-mec", "mec"]);
    const idxTipo = getIndex(["tipo de instalação", "tipo"]);
    const idxCapacidade = getIndex(["capacidade", "vagas", "lugares"]);
    const idxArea = getIndex(["área", "area"]);
    const idxStatus = getIndex(["status"]);
    const idxAcess = getIndex(["acessibilidade"]);
    const idxClim = getIndex(["climatização", "climatizacao"]);
    const idxManut = getIndex(["protocolo de manutenção", "manutenção", "manutencao"]);
    const idxMulti = getIndex(["recursos multimídia", "multimídia", "multimidia"]);
    const idxCompl = getIndex(["complemento"]);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]).map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 3) continue;

      const id = (idxId >= 0 ? cols[idxId] : cols[3] || `INFRA_${Date.now()}_${i}`).trim();
      const nome = (idxNome >= 0 ? cols[idxNome] : cols[6] || id).trim();
      if (!id || !nome) continue;

      const tipo = (idxTipo >= 0 ? cols[idxTipo] : "Outras Instalações") || "Outras Instalações";
      const codigoMec = (idxEmec >= 0 ? cols[idxEmec] : "") || "";
      const capacidade = parseInt(idxCapacidade >= 0 ? cols[idxCapacidade] : "0", 10) || 0;
      const area = parseFloat(idxArea >= 0 ? cols[idxArea].replace(",", ".") : "0") || 0;
      const statusMec = (idxStatus >= 0 ? cols[idxStatus] : "") || "Informação Pendente";
      const acessibilidade = (idxAcess >= 0 ? cols[idxAcess] : "") || "";
      const climatizacao = (idxClim >= 0 ? cols[idxClim] : "") || "";
      const manutencao = (idxManut >= 0 ? cols[idxManut] : "") || "";
      const multimidia = (idxMulti >= 0 ? cols[idxMulti] : "") || "";
      const complemento = (idxCompl >= 0 ? cols[idxCompl] : "") || "";

      let bloco = "PRG - Gabinete & Apoio";
      if (nome.includes("BLOCO A")) bloco = "Central de Aulas - Bloco A";
      else if (nome.includes("BLOCO B")) bloco = "Central de Aulas - Bloco B";
      else if (nome.includes("BLOCO C")) bloco = "Central de Aulas - Bloco C";
      else if (nome.includes("BLOCO D")) bloco = "Central de Aulas - Bloco D";
      else if (nome.includes("BLOCO E")) bloco = "Central de Aulas - Bloco E";
      else if (nome.includes("BLOCO F")) bloco = "Central de Aulas - Bloco F";
      else if (nome.includes("BLOCO G")) bloco = "Central de Aulas - Bloco G";
      else if (nome.includes("BLOCO H")) bloco = "Central de Aulas - Bloco H";
      else if (nome.includes("ALMOXARIFADO") || nome.includes("ARQUIVO")) bloco = "PRG - Apoio & Arquivo";
      else if (nome.includes("REUNIÃO") || nome.includes("AUDITÓRIO")) bloco = "PRG - Setor de Reuniões e Auditórios";

      let nomeAmigavel = nome.replace(/^PRG\s*-\s*/, "");
      if (nomeAmigavel.includes("CENTRAL DE AULAS - ")) {
        nomeAmigavel = nomeAmigavel.replace("CENTRAL DE AULAS - ", "");
      }

      const isReservavel =
        tipo === "Sala de Aula" ||
        bloco.includes("Central de Aulas") ||
        nome.includes("AUDITÓRIO") ||
        nome.includes("REUNIÃO") ||
        id === "INFRA2220PRG" ||
        id === "INFRA2202PRG" ||
        id === "INFRA2289PRG" ||
        id === "INFRA2290PRG";

      rows.push({
        id,
        idInterno: id,
        codigoMec,
        tipo,
        nome,
        nomeAmigavel,
        capacidade,
        area,
        bloco,
        complemento,
        statusMec,
        acessibilidadeSisinfra: acessibilidade,
        climatizacaoSisinfra: climatizacao,
        manutencaoSisinfra: manutencao,
        multimidiaSisinfra: multimidia,
        reservavel: isReservavel
      });
    }

    return rows;
  }

  async importSisinfraCsv(csvText, options = {}) {
    const preserveChecklist = options.preserveChecklist !== false;
    const preserveReservavel = options.preserveReservavel !== false;

    const parsedRows = this.parseSisinfraCsv(csvText);
    if (parsedRows.length === 0) {
      throw new Error("Nenhum registro válido foi encontrado no arquivo CSV informado. Verifique se o formato é do SisInfra.");
    }

    const currentSpaces = await this.getEspacos();
    const currentMap = new Map(currentSpaces.map((s) => [s.id, s]));

    let updatedCount = 0;
    let createdCount = 0;

    const mergedSpaces = parsedRows.map((row) => {
      const prev = currentMap.get(row.id);
      if (prev) {
        updatedCount++;
        return {
          ...prev,
          ...row,
          reservavel: preserveReservavel && prev.reservavel !== undefined ? prev.reservavel : row.reservavel,
          checklist:
            preserveChecklist && Array.isArray(prev.checklist) && prev.checklist.length > 0
              ? prev.checklist
              : prev.checklist || (window.SISINFRA_SPACES_CATALOG && window.SISINFRA_SPACES_CATALOG[0] ? window.SISINFRA_SPACES_CATALOG[0].checklist : [])
        };
      } else {
        createdCount++;
        const defaultChecklist =
          window.SISINFRA_SPACES_CATALOG && window.SISINFRA_SPACES_CATALOG[0]
            ? window.SISINFRA_SPACES_CATALOG[0].checklist.map((item) => ({ ...item }))
            : [];
        return {
          ...row,
          checklist: defaultChecklist,
          cor: "#00509e",
          corClara: "#eff6ff",
          badge: "bg-blue-600",
          badgeLight: "bg-blue-100 text-blue-900 border-blue-700"
        };
      }
    });

    await this._api("./api/espacos/batch", {
      method: "PUT",
      body: JSON.stringify({ espacos: mergedSpaces })
    });

    return {
      total: parsedRows.length,
      updated: updatedCount,
      created: createdCount
    };
  }
}

window.storageService = new StorageService();
