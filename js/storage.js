/**
 * AGENDA SISINFRA - GESTÃO DE ESPAÇOS E INFRAESTRUTURA (PRG / UFPB)
 * Camada de Dados (Firebase Firestore + LocalStorage Fallback)
 * Integrado ao Catálogo SisInfra (https://sisinfra.ufpb.br)
 */

const SEED_USUARIOS = [
  {
    id: "usr_admin",
    nome: "Prof. Coordenador da Central / Gestor SisInfra",
    email: "admin@academico.ufpb.br",
    setor: "PRG / Coordenação Central de Aulas",
    perfil: "admin",
    status: "ativo",
    senha: "admin123",
    criadoEm: "2026-01-15T08:00:00.000Z"
  },
  {
    id: "usr_operador",
    nome: "Técnico de Apoio Acadêmico",
    email: "operador@academico.ufpb.br",
    setor: "Central de Aulas - Campus I",
    perfil: "operador",
    status: "ativo",
    senha: "operador123",
    criadoEm: "2026-02-01T10:00:00.000Z"
  }
];

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

const SEED_BLOQUEIOS = [
  // ---------------- 2026.2 (VIGENTE / EM ANDAMENTO) ----------------
  {
    id: "bloq_2026_2_manha",
    titulo: "Aulas da Graduação - Período 2026.2 (Manhã: 07h às 12h)",
    semestre: "2026.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2026-08-28",
    dataFim: "2026-12-16",
    diasSemana: [1, 2, 3, 4, 5], // Seg a Sex
    horaInicio: "07:00",
    horaFim: "12:00",
    descricao: "Horário exclusivo para turmas presenciais da graduação no SIGAA (2026.2 - Turno Manhã).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-08-15T08:00:00.000Z"
  },
  {
    id: "bloq_2026_2_tarde",
    titulo: "Aulas da Graduação - Período 2026.2 (Tarde: 13h às 18h)",
    semestre: "2026.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2026-08-28",
    dataFim: "2026-12-16",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "13:00",
    horaFim: "18:00",
    descricao: "Horário exclusivo para turmas presenciais da graduação no SIGAA (2026.2 - Turno Tarde).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-08-15T08:00:00.000Z"
  },
  {
    id: "bloq_2026_2_noite",
    titulo: "Aulas da Graduação - Período 2026.2 (Noite: 18h30 às 22h)",
    semestre: "2026.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2026-08-28",
    dataFim: "2026-12-16",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "18:30",
    horaFim: "22:00",
    descricao: "Horário exclusivo para turmas noturnas da graduação via SIGAA (2026.2).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-08-15T08:00:00.000Z"
  },
  {
    id: "bloq_2026_2_exames",
    titulo: "Exames Finais da Graduação - Período 2026.2",
    semestre: "2026.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2026-12-17",
    dataFim: "2026-12-22",
    diasSemana: [1, 2, 3, 4, 5, 6], // Seg a Sáb
    horaInicio: "07:00",
    horaFim: "22:00",
    descricao: "Período oficial de exames finais das turmas do semestre 2026.2.",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-08-15T08:00:00.000Z"
  },

  // ---------------- 2027.1 (PRÓXIMO SEMESTRE LETIVO) ----------------
  {
    id: "bloq_2027_1_manha",
    titulo: "Aulas da Graduação - Período 2027.1 (Manhã: 07h às 12h)",
    semestre: "2027.1",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-03-01",
    dataFim: "2027-07-10",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "07:00",
    horaFim: "12:00",
    descricao: "Horário reservado para turmas do SIGAA no semestre 2027.1 (Turno Manhã).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-10-01T08:00:00.000Z"
  },
  {
    id: "bloq_2027_1_tarde",
    titulo: "Aulas da Graduação - Período 2027.1 (Tarde: 13h às 18h)",
    semestre: "2027.1",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-03-01",
    dataFim: "2027-07-10",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "13:00",
    horaFim: "18:00",
    descricao: "Horário reservado para turmas do SIGAA no semestre 2027.1 (Turno Tarde).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-10-01T08:00:00.000Z"
  },
  {
    id: "bloq_2027_1_noite",
    titulo: "Aulas da Graduação - Período 2027.1 (Noite: 18h30 às 22h)",
    semestre: "2027.1",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-03-01",
    dataFim: "2027-07-10",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "18:30",
    horaFim: "22:00",
    descricao: "Horário reservado para turmas noturnas no semestre 2027.1.",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-10-01T08:00:00.000Z"
  },
  {
    id: "bloq_2027_1_exames",
    titulo: "Exames Finais da Graduação - Período 2027.1",
    semestre: "2027.1",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-07-12",
    dataFim: "2027-07-17",
    diasSemana: [1, 2, 3, 4, 5, 6],
    horaInicio: "07:00",
    horaFim: "22:00",
    descricao: "Período oficial de aplicação de exames finais do semestre 2027.1.",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-10-01T08:00:00.000Z"
  },

  // ---------------- 2027.2 (PUBLICADO NO CONSEPE) ----------------
  {
    id: "bloq_2027_2_manha",
    titulo: "Aulas da Graduação - Período 2027.2 (Manhã: 07h às 12h)",
    semestre: "2027.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-08-09",
    dataFim: "2027-12-16",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "07:00",
    horaFim: "12:00",
    descricao: "Horário reservado para turmas regulares do SIGAA no semestre 2027.2 (Turno Manhã).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "bloq_2027_2_tarde",
    titulo: "Aulas da Graduação - Período 2027.2 (Tarde: 13h às 18h)",
    semestre: "2027.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-08-09",
    dataFim: "2027-12-16",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "13:00",
    horaFim: "18:00",
    descricao: "Horário reservado para turmas regulares do SIGAA no semestre 2027.2 (Turno Tarde).",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "bloq_2027_2_noite",
    titulo: "Aulas da Graduação - Período 2027.2 (Noite: 18h30 às 22h)",
    semestre: "2027.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-08-09",
    dataFim: "2027-12-16",
    diasSemana: [1, 2, 3, 4, 5],
    horaInicio: "18:30",
    horaFim: "22:00",
    descricao: "Horário reservado para turmas noturnas da graduação no semestre 2027.2.",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-11-01T08:00:00.000Z"
  },
  {
    id: "bloq_2027_2_exames",
    titulo: "Exames Finais da Graduação - Período 2027.2",
    semestre: "2027.2",
    motivo: "aulas_periodo_letivo",
    tipoEspaco: "todas_salas",
    bloco: "todos",
    espacoIds: [],
    dataInicio: "2027-12-17",
    dataFim: "2027-12-22",
    diasSemana: [1, 2, 3, 4, 5, 6],
    horaInicio: "07:00",
    horaFim: "22:00",
    descricao: "Período oficial de exames finais do semestre 2027.2.",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-11-01T08:00:00.000Z"
  }
];

function getSampleBookings() {
  const hoje = new Date();
  const formatData = (offsetDays) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: "ag_001",
      auditorioId: "INFRA2220PRG",
      titulo: "Seminário de Boas-Vindas aos Ingressantes PRG",
      tipoEvento: "Palestra / Conferência",
      solicitante: "Pró-Reitoria de Graduação (PRG)",
      departamento: "Coordenação de Acompanhamento Acadêmico",
      email: "prg@ufpb.br",
      telefone: "(83) 3216-7100",
      data: formatData(0), // Hoje
      horaInicio: "09:00",
      horaFim: "12:00",
      recursos: ["Datashow / Projetor Laser HD", "Microfones sem Fio (Lapela / Bastão)", "Ar-condicionado Split / Central", "Sistema de Som Embutido / Caixas Ativas"],
      status: "confirmado",
      observacoes: "Necessário apoio de técnico de som e microfones no púlpito.",
      criadoPor: "admin@academico.ufpb.br",
      criadoEm: new Date().toISOString()
    },
    {
      id: "ag_002",
      auditorioId: "INFRA2289PRG",
      titulo: "Reunião Geral de Planejamento da Graduação 2026.2",
      tipoEvento: "Reunião de Colegiado / Gestão",
      solicitante: "Profa. Dra. Maria do Carmo",
      departamento: "Coordenação de Currículos Acadêmicos - PRG",
      email: "colegiado@prg.ufpb.br",
      telefone: "(83) 3216-7200",
      data: formatData(0), // Hoje
      horaInicio: "14:00",
      horaFim: "16:30",
      recursos: ["Datashow / Projetor Laser HD", "Conexão HDMI & USB-C para Notebooks", "Ar-condicionado Split / Central"],
      status: "confirmado",
      observacoes: "Reunião presencial com coordenadores de curso.",
      criadoPor: "operador@academico.ufpb.br",
      criadoEm: new Date().toISOString()
    },
    {
      id: "ag_003",
      auditorioId: "INFRA2202PRG",
      titulo: "Colação de Grau Especial - Cursos do CCHLA e CE",
      tipoEvento: "Colação de Grau / Solenidade",
      solicitante: "Profa. Dra. Ana Carolina Bezerra",
      departamento: "Coordenação de Escolaridade e Registro Diplomado - PRG",
      email: "diplomacao@prg.ufpb.br",
      telefone: "(83) 3216-7250",
      data: formatData(1), // Amanhã
      horaInicio: "14:00",
      horaFim: "17:30",
      recursos: ["Datashow / Projetor Laser HD", "Microfones sem Fio (Lapela / Bastão)", "Púlpito / Mesa Diretora", "Ar-condicionado Split / Central"],
      status: "confirmado",
      observacoes: "Solenidade no Auditório 2 (120 lugares). Providenciar 6 microfones e cerimonial.",
      criadoPor: "operador@academico.ufpb.br",
      criadoEm: new Date().toISOString()
    },
    {
      id: "ag_004",
      auditorioId: "INFRA2290PRG",
      titulo: "Alinhamento com Equipe de Atendimento e Matrículas",
      tipoEvento: "Reunião de Trabalho",
      solicitante: "Coordenação de Acompanhamento Discente",
      departamento: "PRG / Secretaria de Atendimento",
      email: "atendimento@prg.ufpb.br",
      telefone: "(83) 3216-7150",
      data: formatData(2), // Daqui a 2 dias
      horaInicio: "10:00",
      horaFim: "11:30",
      recursos: ["Ar-condicionado Split / Central", "Wi-Fi Institucional Eduroam"],
      status: "confirmado",
      observacoes: "Reunião da secretaria para fechamento de relatórios.",
      criadoPor: "operador@academico.ufpb.br",
      criadoEm: new Date().toISOString()
    },
    {
      id: "ag_005",
      auditorioId: "INFRA2220PRG",
      titulo: "Conferência Internacional de Inovação Pedagógica",
      tipoEvento: "Palestra / Conferência",
      solicitante: "Pró-Reitoria de Graduação e Reitoria",
      departamento: "Gabinete da Reitoria",
      email: "conferencia@academico.ufpb.br",
      telefone: "(83) 3216-7000",
      data: formatData(3), // Daqui a 3 dias
      horaInicio: "19:00",
      horaFim: "22:00",
      recursos: ["Datashow / Projetor Laser HD", "Microfones sem Fio (Lapela / Bastão)", "Câmera / Sistema para Transmissão Híbrida", "Púlpito / Mesa Diretora"],
      status: "pendente",
      observacoes: "Aguardando confirmação do protocolo e cerimonial.",
      criadoPor: "operador@academico.ufpb.br",
      criadoEm: new Date().toISOString()
    }
  ];
}

class StorageService {
  constructor() {
    this.initLocalStorage();
  }

  // Mapeia IDs legados ("1", "2", "3", "4") para IDs SisInfra
  normalizeSpaceId(id) {
    if (!id) return "INFRA2220PRG";
    const str = String(id).trim();
    if (str === "1") return "INFRA2220PRG"; // Auditório 1
    if (str === "2") return "INFRA2202PRG"; // Auditório 2 (Atualização SisInfra 11/11/2026)
    if (str === "3") return "INFRA2289PRG"; // Sala de Reunião Principal
    if (str === "4") return "INFRA2290PRG"; // Sala de Reunião Secretaria
    return str;
  }

  initLocalStorage() {
    const rawCatalog = window.SISINFRA_SPACES_CATALOG || [];

    // Inicialização e sincronização contínua com o catálogo oficial SisInfra
    const existingSpaces = localStorage.getItem("sisinfra_espacos");
    if (!existingSpaces) {
      localStorage.setItem("sisinfra_espacos", JSON.stringify(rawCatalog));
    } else {
      try {
        const stored = JSON.parse(existingSpaces);
        const mapStored = new Map(stored.map(s => [s.id, s]));
        const merged = rawCatalog.map(catItem => {
          const prev = mapStored.get(catItem.id);
          if (prev) {
            // Preserva customizações do checklist feitas pelo usuário
            let checklist = catItem.checklist;
            if (Array.isArray(prev.checklist) && prev.checklist.length > 0) {
              const prevCheckMap = new Map(prev.checklist.map(c => [c.id, c.ativo]));
              checklist = (catItem.checklist || []).map(item => ({
                ...item,
                ativo: prevCheckMap.has(item.id) ? prevCheckMap.get(item.id) : item.ativo
              }));
            }
            return {
              ...catItem,
              reservavel: catItem.reservavel === true ? true : (prev.reservavel !== undefined ? prev.reservavel : false),
              checklist: checklist
            };
          }
          return catItem;
        });
        localStorage.setItem("sisinfra_espacos", JSON.stringify(merged));
      } catch (e) {
        localStorage.setItem("sisinfra_espacos", JSON.stringify(rawCatalog));
      }
    }

    // Inicialização dos Usuários
    if (!localStorage.getItem("prg_usuarios")) {
      localStorage.setItem("prg_usuarios", JSON.stringify(SEED_USUARIOS));
    }

    // Inicialização dos Agendamentos
    const existingBookings = localStorage.getItem("prg_agendamentos");
    if (!existingBookings) {
      localStorage.setItem("prg_agendamentos", JSON.stringify(getSampleBookings()));
    } else {
      try {
        const list = JSON.parse(existingBookings);
        let updated = false;
        list.forEach(item => {
          const norm = this.normalizeSpaceId(item.auditorioId);
          if (norm !== item.auditorioId) {
            item.auditorioId = norm;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem("prg_agendamentos", JSON.stringify(list));
        }
      } catch (e) {
        localStorage.setItem("prg_agendamentos", JSON.stringify(getSampleBookings()));
      }
    }

    // Inicialização e atualização dos Bloqueios de Horários / Períodos Letivos (2026.2, 2027.1, 2027.2)
    const existingBlocks = localStorage.getItem("prg_bloqueios");
    if (!existingBlocks) {
      localStorage.setItem("prg_bloqueios", JSON.stringify(SEED_BLOQUEIOS));
    } else {
      try {
        const stored = JSON.parse(existingBlocks);
        const storedIds = new Set(stored.map(b => b.id));
        let changed = false;
        const filtered = stored.filter(b => b.id !== "bloq_001" && b.id !== "bloq_002" && b.id !== "bloq_003");
        if (filtered.length !== stored.length) changed = true;

        SEED_BLOQUEIOS.forEach(seed => {
          if (!storedIds.has(seed.id)) {
            filtered.push(seed);
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem("prg_bloqueios", JSON.stringify(filtered));
        }
      } catch (e) {
        localStorage.setItem("prg_bloqueios", JSON.stringify(SEED_BLOQUEIOS));
      }
    }
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
    if (window.isFirebaseActive && window.fbDb) {
      try {
        const snap = await window.fbDb.collection("sisinfra_espacos").get();
        if (!snap.empty) {
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        // Se vazio no Firestore, carrega catálogo padrão
        const rawCatalog = window.SISINFRA_SPACES_CATALOG || [];
        for (const sp of rawCatalog) {
          await window.fbDb.collection("sisinfra_espacos").doc(sp.id).set(sp);
        }
        return rawCatalog;
      } catch (err) {
        console.error("Erro ao buscar espaços no Firestore:", err);
      }
    }

    const localData = localStorage.getItem("sisinfra_espacos");
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error("Erro ao parsear espaços locais:", e);
      }
    }
    return window.SISINFRA_SPACES_CATALOG || [];
  }

  async getEspacosReservaveis() {
    const list = await this.getEspacos();
    return list.filter(s => s.reservavel === true);
  }

  async getEspacoById(id) {
    const targetId = this.normalizeSpaceId(id);
    const list = await this.getEspacos();
    return list.find(s => s.id === targetId || s.idInterno === targetId) || null;
  }

  async saveEspaco(spaceData) {
    const targetId = this.normalizeSpaceId(spaceData.id || spaceData.idInterno);
    const spaceToSave = { ...spaceData, id: targetId, idInterno: targetId };

    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("sisinfra_espacos").doc(targetId).set(spaceToSave, { merge: true });
      } catch (err) {
        console.error("Erro ao salvar espaço no Firestore:", err);
      }
    }

    const list = await this.getEspacos();
    const idx = list.findIndex(s => s.id === targetId || s.idInterno === targetId);
    if (idx >= 0) list[idx] = spaceToSave;
    else list.push(spaceToSave);

    localStorage.setItem("sisinfra_espacos", JSON.stringify(list));
    return spaceToSave;
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
    const rawCatalog = window.SISINFRA_SPACES_CATALOG || [];
    localStorage.setItem("sisinfra_espacos", JSON.stringify(rawCatalog));
    if (window.isFirebaseActive && window.fbDb) {
      try {
        for (const sp of rawCatalog) {
          await window.fbDb.collection("sisinfra_espacos").doc(sp.id).set(sp);
        }
      } catch (err) {
        console.error("Erro ao resetar espaços no Firestore:", err);
      }
    }
    return rawCatalog;
  }

  // Aliases para compatibilidade retroativa
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
    if (window.isFirebaseActive && window.fbDb) {
      try {
        const snap = await window.fbDb.collection("agendamentos").orderBy("data").get();
        return snap.docs.map(doc => {
          const item = { id: doc.id, ...doc.data() };
          item.auditorioId = this.normalizeSpaceId(item.auditorioId);
          return item;
        });
      } catch (err) {
        console.error("Erro ao buscar agendamentos no Firestore:", err);
      }
    }
    const raw = JSON.parse(localStorage.getItem("prg_agendamentos") || "[]");
    return raw.map(item => ({
      ...item,
      auditorioId: this.normalizeSpaceId(item.auditorioId)
    }));
  }

  async getAgendamentoById(id) {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        const doc = await window.fbDb.collection("agendamentos").doc(id).get();
        if (doc.exists) {
          const item = { id: doc.id, ...doc.data() };
          item.auditorioId = this.normalizeSpaceId(item.auditorioId);
          return item;
        }
      } catch (err) {
        console.error("Erro ao buscar agendamento por ID:", err);
      }
    }
    const list = await this.getAgendamentos();
    return list.find(ag => ag.id === id) || null;
  }

  /**
   * Checagem Rigorosa de Conflito de Horário
   * Dois eventos não podem sobrepor no mesmo espaço na mesma data
   */
  async checkConflict(auditorioId, data, horaInicio, horaFim, excludeId = null) {
    const agendamentos = await this.getAgendamentos();
    const audIdStr = this.normalizeSpaceId(auditorioId);

    const conflito = agendamentos.find(ag => {
      if (excludeId && ag.id === excludeId) return false;
      if (ag.status === "cancelado") return false;
      if (this.normalizeSpaceId(ag.auditorioId) === audIdStr && ag.data === data) {
        // (A_inicio < B_fim) && (A_fim > B_inicio)
        return (horaInicio < ag.horaFim && horaFim > ag.horaInicio);
      }
      return false;
    });

    return conflito || null;
  }

  async createAgendamento(data) {
    const normalizedAudId = this.normalizeSpaceId(data.auditorioId);
    
    // 1. Checa Bloqueio de Horário (Aulas em Período Letivo, Manutenção, etc.)
    const bloqueio = await this.checkBlockConflict(normalizedAudId, data.data, data.horaInicio, data.horaFim);
    if (bloqueio) {
      const espaco = await this.getEspacoById(normalizedAudId);
      const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
      throw new Error(`HORÁRIO BLOQUEADO!\n${espacoNome} está bloqueado das ${bloqueio.horaInicio} às ${bloqueio.horaFim} por: "${bloqueio.titulo}". Aulas regulares da graduação ou atividades acadêmicas possuem reserva prioritária neste período.`);
    }

    // 2. Checa conflito de agendamento existente
    const conflito = await this.checkConflict(normalizedAudId, data.data, data.horaInicio, data.horaFim);
    if (conflito) {
      const espaco = await this.getEspacoById(normalizedAudId);
      const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
      throw new Error(`Conflito de Horário! ${espacoNome} já está ocupado das ${conflito.horaInicio} às ${conflito.horaFim} pelo evento: "${conflito.titulo}".`);
    }

    const id = "ag_" + Date.now();
    const novoAgendamento = {
      id,
      ...data,
      auditorioId: normalizedAudId,
      status: data.status || "confirmado",
      criadoEm: new Date().toISOString()
    };

    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("agendamentos").doc(id).set(novoAgendamento);
      } catch (err) {
        console.error("Erro ao salvar no Firestore:", err);
      }
    }

    const list = JSON.parse(localStorage.getItem("prg_agendamentos") || "[]");
    list.push(novoAgendamento);
    localStorage.setItem("prg_agendamentos", JSON.stringify(list));

    return novoAgendamento;
  }

  async updateAgendamento(id, data) {
    const normalizedAudId = this.normalizeSpaceId(data.auditorioId);

    // 1. Checa Bloqueio de Horário
    const bloqueio = await this.checkBlockConflict(normalizedAudId, data.data, data.horaInicio, data.horaFim);
    if (bloqueio) {
      const espaco = await this.getEspacoById(normalizedAudId);
      const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
      throw new Error(`HORÁRIO BLOQUEADO!\n${espacoNome} está bloqueado das ${bloqueio.horaInicio} às ${bloqueio.horaFim} por: "${bloqueio.titulo}".`);
    }

    // 2. Checa conflito
    const conflito = await this.checkConflict(normalizedAudId, data.data, data.horaInicio, data.horaFim, id);
    if (conflito) {
      const espaco = await this.getEspacoById(normalizedAudId);
      const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
      throw new Error(`Conflito de Horário! ${espacoNome} já está ocupado das ${conflito.horaInicio} às ${conflito.horaFim} pelo evento: "${conflito.titulo}".`);
    }

    const updatedData = {
      ...data,
      auditorioId: normalizedAudId,
      atualizadoEm: new Date().toISOString()
    };

    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("agendamentos").doc(id).update(updatedData);
      } catch (err) {
        console.error("Erro ao atualizar no Firestore:", err);
      }
    }

    const list = JSON.parse(localStorage.getItem("prg_agendamentos") || "[]");
    const idx = list.findIndex(ag => ag.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updatedData };
      localStorage.setItem("prg_agendamentos", JSON.stringify(list));
      return list[idx];
    }
    return null;
  }

  async deleteAgendamento(id) {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("agendamentos").doc(id).delete();
      } catch (err) {
        console.error("Erro ao excluir no Firestore:", err);
      }
    }

    const list = JSON.parse(localStorage.getItem("prg_agendamentos") || "[]");
    const filtered = list.filter(ag => ag.id !== id);
    localStorage.setItem("prg_agendamentos", JSON.stringify(filtered));
    return true;
  }

  // ================= GESTÃO DE PESSOAS AUTORIZADAS =================
  async getUsuarios() {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        const snap = await window.fbDb.collection("usuarios").get();
        if (!snap.empty) {
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        for (const u of SEED_USUARIOS) {
          await window.fbDb.collection("usuarios").doc(u.id).set(u);
        }
        return SEED_USUARIOS;
      } catch (err) {
        console.error("Erro ao buscar usuários no Firestore:", err);
      }
    }
    return JSON.parse(localStorage.getItem("prg_usuarios") || "[]");
  }

  async createUsuario(data) {
    const emailNorm = (data.email || "").trim().toLowerCase();
    if (!emailNorm.endsWith("@academico.ufpb.br")) {
      throw new Error("O e-mail deve pertencer obrigatoriamente ao domínio institucional @academico.ufpb.br");
    }

    const list = await this.getUsuarios();
    const jaExiste = list.some(u => u.email.toLowerCase() === emailNorm);
    if (jaExiste) {
      throw new Error("Já existe um usuário cadastrado com este e-mail.");
    }

    const id = "usr_" + Date.now();
    const novoUsuario = {
      id,
      ...data,
      email: emailNorm,
      status: data.status || "ativo",
      criadoEm: new Date().toISOString()
    };

    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("usuarios").doc(id).set(novoUsuario);
      } catch (err) {
        console.error("Erro ao salvar usuário no Firestore:", err);
      }
    }

    const localList = JSON.parse(localStorage.getItem("prg_usuarios") || "[]");
    localList.push(novoUsuario);
    localStorage.setItem("prg_usuarios", JSON.stringify(localList));

    return novoUsuario;
  }

  async updateUsuario(id, data) {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("usuarios").doc(id).update(data);
      } catch (err) {
        console.error("Erro ao atualizar usuário no Firestore:", err);
      }
    }

    const list = JSON.parse(localStorage.getItem("prg_usuarios") || "[]");
    const idx = list.findIndex(u => u.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      localStorage.setItem("prg_usuarios", JSON.stringify(list));
      return list[idx];
    }
    return null;
  }

  async deleteUsuario(id) {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("usuarios").doc(id).delete();
      } catch (err) {
        console.error("Erro ao deletar usuário no Firestore:", err);
      }
    }

    const list = JSON.parse(localStorage.getItem("prg_usuarios") || "[]");
    const filtered = list.filter(u => u.id !== id);
    localStorage.setItem("prg_usuarios", JSON.stringify(filtered));
    return true;
  }

  // ================= BLOQUEIOS DE HORÁRIOS & PERÍODOS LETIVOS =================
  async getBloqueios() {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        const snap = await window.fbDb.collection("bloqueios").get();
        if (!snap.empty) {
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (err) {
        console.error("Erro ao buscar bloqueios no Firestore:", err);
      }
    }

    const localData = localStorage.getItem("prg_bloqueios");
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error("Erro ao parsear bloqueios locais:", e);
      }
    }
    return SEED_BLOQUEIOS;
  }

  async getBloqueioById(id) {
    const list = await this.getBloqueios();
    return list.find(b => b.id === id) || null;
  }

  async createBloqueio(data) {
    const id = "bloq_" + Date.now();
    const novoBloqueio = {
      id,
      ...data,
      ativo: data.ativo !== undefined ? data.ativo : true,
      criadoEm: new Date().toISOString()
    };

    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("bloqueios").doc(id).set(novoBloqueio);
      } catch (err) {
        console.error("Erro ao salvar bloqueio no Firestore:", err);
      }
    }

    const list = await this.getBloqueios();
    list.push(novoBloqueio);
    localStorage.setItem("prg_bloqueios", JSON.stringify(list));
    return novoBloqueio;
  }

  async updateBloqueio(id, data) {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("bloqueios").doc(id).update(data);
      } catch (err) {
        console.error("Erro ao atualizar bloqueio no Firestore:", err);
      }
    }

    const list = await this.getBloqueios();
    const idx = list.findIndex(b => b.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data, atualizadoEm: new Date().toISOString() };
      localStorage.setItem("prg_bloqueios", JSON.stringify(list));
      return list[idx];
    }
    return null;
  }

  async toggleBloqueioAtivo(id, novoEstado) {
    return await this.updateBloqueio(id, { ativo: !!novoEstado });
  }

  async deleteBloqueio(id) {
    if (window.isFirebaseActive && window.fbDb) {
      try {
        await window.fbDb.collection("bloqueios").doc(id).delete();
      } catch (err) {
        console.error("Erro ao deletar bloqueio no Firestore:", err);
      }
    }

    const list = await this.getBloqueios();
    const filtered = list.filter(b => b.id !== id);
    localStorage.setItem("prg_bloqueios", JSON.stringify(filtered));
    return true;
  }

  /**
   * Checagem de Conflito com Bloqueios Ativos (Aulas / Semestre Letivo / Manutenção)
   */
  async checkBlockConflict(auditorioId, data, horaInicio, horaFim) {
    const targetId = this.normalizeSpaceId(auditorioId);
    const espaco = await this.getEspacoById(targetId);
    if (!espaco) return null;

    const bloqueios = await this.getBloqueios();
    const ativos = bloqueios.filter(b => b.ativo !== false);

    // Converte data para dia da semana (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)
    const [ano, mes, dia] = data.split("-").map(Number);
    const dt = new Date(ano, mes - 1, dia);
    const diaSemana = dt.getDay();

    for (const b of ativos) {
      // 1. Vigência de datas
      if (b.dataInicio && data < b.dataInicio) continue;
      if (b.dataFim && data > b.dataFim) continue;

      // 2. Dias da semana (se configurados)
      if (Array.isArray(b.diasSemana) && b.diasSemana.length > 0) {
        if (!b.diasSemana.includes(diaSemana)) continue;
      }

      // 3. Abrangência do espaço
      let afeta = false;
      if (b.tipoEspaco === "todos_espacos") {
        afeta = true;
      } else if (b.tipoEspaco === "todas_salas") {
        // Afeta salas de aula e laboratórios didáticos da Central de Aulas
        const isClassroom = espaco.tipo === "Sala de Aula" || (espaco.bloco && espaco.bloco.includes("Bloco "));
        const isAuditorio = (espaco.nome && espaco.nome.includes("AUDITÓRIO")) || targetId === "INFRA2220PRG" || targetId === "INFRA2202PRG";
        if (isClassroom && !isAuditorio) {
          afeta = true;
        }
      } else if (b.tipoEspaco === "bloco") {
        if (b.bloco === "todos" || espaco.bloco === b.bloco) {
          afeta = true;
        }
      } else if (b.tipoEspaco === "auditorios") {
        if ((espaco.nome && espaco.nome.includes("AUDITÓRIO")) || targetId === "INFRA2220PRG" || targetId === "INFRA2202PRG") {
          afeta = true;
        }
      } else if (b.tipoEspaco === "especifico") {
        if (Array.isArray(b.espacoIds) && b.espacoIds.includes(targetId)) {
          afeta = true;
        }
      }

      if (!afeta) continue;

      // 4. Sobreposição de horário: (A_inicio < B_fim && A_fim > B_inicio)
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
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
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

    const header = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
    const getIndex = (keywords) => header.findIndex(h => keywords.some(k => h.includes(k)));

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
      const cols = splitLine(lines[i]).map(c => c.replace(/^"|"$/g, "").trim());
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

      // Salas de aula da Central de Aulas e auditórios são agendáveis por padrão
      const isReservavel = (
        tipo === "Sala de Aula" ||
        bloco.includes("Central de Aulas") ||
        nome.includes("AUDITÓRIO") ||
        nome.includes("REUNIÃO") ||
        id === "INFRA2220PRG" ||
        id === "INFRA2202PRG" ||
        id === "INFRA2289PRG" ||
        id === "INFRA2290PRG"
      );

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
    const currentMap = new Map(currentSpaces.map(s => [s.id, s]));

    let updatedCount = 0;
    let createdCount = 0;

    const mergedSpaces = parsedRows.map(row => {
      const prev = currentMap.get(row.id);
      if (prev) {
        updatedCount++;
        return {
          ...prev,
          ...row,
          reservavel: (preserveReservavel && prev.reservavel !== undefined) ? prev.reservavel : row.reservavel,
          checklist: (preserveChecklist && Array.isArray(prev.checklist) && prev.checklist.length > 0)
            ? prev.checklist
            : (prev.checklist || (window.SISINFRA_SPACES_CATALOG && window.SISINFRA_SPACES_CATALOG[0] ? window.SISINFRA_SPACES_CATALOG[0].checklist : []))
        };
      } else {
        createdCount++;
        const defaultChecklist = (window.SISINFRA_SPACES_CATALOG && window.SISINFRA_SPACES_CATALOG[0])
          ? window.SISINFRA_SPACES_CATALOG[0].checklist.map(item => ({ ...item }))
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

    localStorage.setItem("sisinfra_espacos", JSON.stringify(mergedSpaces));

    if (window.isFirebaseActive && window.fbDb) {
      try {
        const batch = window.fbDb.batch();
        for (const sp of mergedSpaces.slice(0, 450)) {
          const docRef = window.fbDb.collection("sisinfra_espacos").doc(sp.id);
          batch.set(docRef, sp, { merge: true });
        }
        await batch.commit();
      } catch (err) {
        console.error("Erro ao sincronizar importação no Firestore:", err);
      }
    }

    return {
      total: parsedRows.length,
      updated: updatedCount,
      created: createdCount
    };
  }
}

window.storageService = new StorageService();
