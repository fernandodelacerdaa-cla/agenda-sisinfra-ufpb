/**
 * AGENDA SISINFRA - PRG / UFPB
 * Micro-servidor Node.js + Banco Relacional SQLite (node:sqlite nativo)
 * Porta padrão: 3001 (127.0.0.1) — Totalmente isolado do SisInfra (porta 3000)
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.AGENDA_PORT || 3001);
const HOST = process.env.AGENDA_HOST || "127.0.0.1";
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "dados");
const DB_PATH = path.join(DATA_DIR, "agenda.db");
const SECRET_PATH = path.join(DATA_DIR, ".secret");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Segredo de assinatura de token de sessão (gerado automaticamente na 1ª execução)
let TOKEN_SECRET;
if (fs.existsSync(SECRET_PATH)) {
  TOKEN_SECRET = fs.readFileSync(SECRET_PATH, "utf8").trim();
} else {
  TOKEN_SECRET = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_PATH, TOKEN_SECRET, { mode: 0o600 });
}

// ================= CRIPTOGRAFIA DE SENHAS E TOKENS =================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, keyHex] = storedHash.split(":");
  const keyBuf = Buffer.from(keyHex, "hex");
  const derivedBuf = crypto.scryptSync(String(password), salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function createToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      perfil: user.perfil,
      exp: Date.now() + 12 * 60 * 60 * 1000 // 12 horas
    })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

// ================= BANCO DE DADOS RELACIONAL SQLITE =================
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
  CREATE TABLE IF NOT EXISTS espacos (
    id TEXT PRIMARY KEY,
    id_interno TEXT NOT NULL,
    codigo_mec TEXT,
    tipo TEXT,
    nome TEXT NOT NULL,
    nome_amigavel TEXT,
    capacidade INTEGER DEFAULT 0,
    area REAL DEFAULT 0,
    bloco TEXT,
    reservavel INTEGER DEFAULT 0,
    payload TEXT NOT NULL,
    atualizado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    setor TEXT,
    perfil TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativo',
    senha_hash TEXT NOT NULL,
    criado_em TEXT,
    atualizado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS bloqueios (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    semestre TEXT,
    motivo TEXT,
    tipo_espaco TEXT,
    bloco TEXT,
    data_inicio TEXT,
    data_fim TEXT,
    hora_inicio TEXT,
    hora_fim TEXT,
    ativo INTEGER DEFAULT 1,
    payload TEXT NOT NULL,
    criado_em TEXT,
    atualizado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS agendamentos (
    id TEXT PRIMARY KEY,
    auditorio_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    tipo_evento TEXT,
    solicitante TEXT,
    departamento TEXT,
    email TEXT,
    telefone TEXT,
    data TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fim TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmado',
    payload TEXT NOT NULL,
    criado_por TEXT,
    criado_em TEXT,
    atualizado_em TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_agendamentos_conflito
    ON agendamentos(auditorio_id, data, status);
`);

function normalizeSpaceId(id) {
  if (!id) return "INFRA2220PRG";
  const str = String(id).trim();
  if (str === "1") return "INFRA2220PRG";
  if (str === "2") return "INFRA2202PRG";
  if (str === "3") return "INFRA2289PRG";
  if (str === "4") return "INFRA2290PRG";
  return str;
}

// ================= CARGA INICIAL (SEED) A PARTIR DO CATÁLOGO =================
function loadCatalogFromJs() {
  const filePath = path.join(ROOT_DIR, "js", "sisinfra-data.js");
  if (!fs.existsSync(filePath)) return [];
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code + "\nwindow.__catalog = typeof SISINFRA_SPACES_CATALOG !== 'undefined' ? SISINFRA_SPACES_CATALOG : [];", sandbox);
  return Array.isArray(sandbox.window.__catalog) ? sandbox.window.__catalog : [];
}

const DEFAULT_BLOQUEIOS = [
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
    diasSemana: [1, 2, 3, 4, 5],
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
    diasSemana: [1, 2, 3, 4, 5, 6],
    horaInicio: "07:00",
    horaFim: "22:00",
    descricao: "Período oficial de exames finais das turmas do semestre 2026.2.",
    ativo: true,
    criadoPor: "admin@academico.ufpb.br",
    criadoEm: "2026-08-15T08:00:00.000Z"
  },
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

function getInitialBookings() {
  const hoje = new Date();
  const formatData = (offsetDays) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };
  const nowIso = hoje.toISOString();
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
      data: formatData(0),
      horaInicio: "09:00",
      horaFim: "12:00",
      recursos: [
        "Datashow / Projetor Laser HD",
        "Microfones sem Fio (Lapela / Bastão)",
        "Ar-condicionado Split / Central",
        "Sistema de Som Embutido / Caixas Ativas"
      ],
      status: "confirmado",
      observacoes: "Necessário apoio de técnico de som e microfones no púlpito.",
      notificacoes: [],
      criadoPor: "admin@academico.ufpb.br",
      criadoEm: nowIso
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
      data: formatData(0),
      horaInicio: "14:00",
      horaFim: "16:30",
      recursos: [
        "Datashow / Projetor Laser HD",
        "Conexão HDMI & USB-C para Notebooks",
        "Ar-condicionado Split / Central"
      ],
      status: "confirmado",
      observacoes: "Reunião presencial com coordenadores de curso.",
      notificacoes: [],
      criadoPor: "operador@academico.ufpb.br",
      criadoEm: nowIso
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
      data: formatData(1),
      horaInicio: "14:00",
      horaFim: "17:30",
      recursos: [
        "Datashow / Projetor Laser HD",
        "Microfones sem Fio (Lapela / Bastão)",
        "Púlpito / Mesa Diretora",
        "Ar-condicionado Split / Central"
      ],
      status: "confirmado",
      observacoes: "Solenidade no Auditório 2 (120 lugares). Providenciar 6 microfones e cerimonial.",
      notificacoes: [],
      criadoPor: "operador@academico.ufpb.br",
      criadoEm: nowIso
    }
  ];
}

function seedDatabaseIfNeeded() {
  const countEspacos = db.prepare("SELECT COUNT(*) AS c FROM espacos").get().c;
  if (countEspacos === 0) {
    const catalog = loadCatalogFromJs();
    const stmt = db.prepare(`
      INSERT INTO espacos (id, id_interno, codigo_mec, tipo, nome, nome_amigavel, capacidade, area, bloco, reservavel, payload, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const sp of catalog) {
        const id = normalizeSpaceId(sp.id || sp.idInterno);
        const normalized = { ...sp, id, idInterno: id };
        stmt.run(
          id,
          id,
          normalized.codigoMec || "",
          normalized.tipo || "",
          normalized.nome || id,
          normalized.nomeAmigavel || normalized.nome || id,
          Number(normalized.capacidade || 0),
          Number(normalized.area || 0),
          normalized.bloco || "",
          normalized.reservavel ? 1 : 0,
          JSON.stringify(normalized),
          now
        );
      }
      db.exec("COMMIT");
      console.log(`[SQLite] Semeados ${catalog.length} espaços da PRG.`);
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }

  const countUsuarios = db.prepare("SELECT COUNT(*) AS c FROM usuarios").get().c;
  if (countUsuarios === 0) {
    const adminPass = process.env.AGENDA_ADMIN_PASS || "admin123";
    const opPass = process.env.AGENDA_OPERADOR_PASS || "operador123";
    const stmt = db.prepare(`
      INSERT INTO usuarios (id, nome, email, setor, perfil, status, senha_hash, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      "usr_admin",
      "Prof. Coordenador da Central / Gestor SisInfra",
      "admin@academico.ufpb.br",
      "PRG / Coordenação Central de Aulas",
      "admin",
      "ativo",
      hashPassword(adminPass),
      "2026-01-15T08:00:00.000Z",
      new Date().toISOString()
    );
    stmt.run(
      "usr_operador",
      "Técnico de Apoio Acadêmico",
      "operador@academico.ufpb.br",
      "Central de Aulas - Campus I",
      "operador",
      "ativo",
      hashPassword(opPass),
      "2026-02-01T10:00:00.000Z",
      new Date().toISOString()
    );
    console.log("[SQLite] Semeados 2 usuários iniciais (senhas protegidas com hash scrypt).");
  }

  const countBloqueios = db.prepare("SELECT COUNT(*) AS c FROM bloqueios").get().c;
  if (countBloqueios === 0) {
    const stmt = db.prepare(`
      INSERT INTO bloqueios (id, titulo, semestre, motivo, tipo_espaco, bloco, data_inicio, data_fim, hora_inicio, hora_fim, ativo, payload, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const b of DEFAULT_BLOQUEIOS) {
        stmt.run(
          b.id,
          b.titulo,
          b.semestre || "",
          b.motivo || "",
          b.tipoEspaco || "todas_salas",
          b.bloco || "todos",
          b.dataInicio || "",
          b.dataFim || "",
          b.horaInicio || "",
          b.horaFim || "",
          b.ativo !== false ? 1 : 0,
          JSON.stringify(b),
          b.criadoEm || new Date().toISOString(),
          new Date().toISOString()
        );
      }
      db.exec("COMMIT");
      console.log(`[SQLite] Semeados ${DEFAULT_BLOQUEIOS.length} bloqueios acadêmicos.`);
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }

  const countAgendamentos = db.prepare("SELECT COUNT(*) AS c FROM agendamentos").get().c;
  if (countAgendamentos === 0) {
    const samples = getInitialBookings();
    const stmt = db.prepare(`
      INSERT INTO agendamentos (id, auditorio_id, titulo, tipo_evento, solicitante, departamento, email, telefone, data, hora_inicio, hora_fim, status, payload, criado_por, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const ag of samples) {
        stmt.run(
          ag.id,
          ag.auditorioId,
          ag.titulo,
          ag.tipoEvento || "",
          ag.solicitante || "",
          ag.departamento || "",
          ag.email || "",
          ag.telefone || "",
          ag.data,
          ag.horaInicio,
          ag.horaFim,
          ag.status || "confirmado",
          JSON.stringify(ag),
          ag.criadoPor || "",
          ag.criadoEm,
          ag.criadoEm
        );
      }
      db.exec("COMMIT");
      console.log(`[SQLite] Semeados ${samples.length} agendamentos iniciais.`);
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

seedDatabaseIfNeeded();

// ================= REGRAS DE CONFLITO NO SERVIDOR =================
function getEspacoFromDb(id) {
  const targetId = normalizeSpaceId(id);
  const row = db.prepare("SELECT payload FROM espacos WHERE id = ?").get(targetId);
  return row ? JSON.parse(row.payload) : null;
}

function checkBlockConflictInDb(auditorioId, data, horaInicio, horaFim) {
  const targetId = normalizeSpaceId(auditorioId);
  const espaco = getEspacoFromDb(targetId);
  if (!espaco || !data) return null;

  const rows = db.prepare("SELECT payload FROM bloqueios WHERE ativo = 1").all();
  const [ano, mes, dia] = String(data).split("-").map(Number);
  const dt = new Date(ano, mes - 1, dia);
  const diaSemana = dt.getDay();

  for (const r of rows) {
    const b = JSON.parse(r.payload);
    if (b.ativo === false) continue;
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

function checkBookingConflictInDb(auditorioId, data, horaInicio, horaFim, excludeId = null) {
  const targetId = normalizeSpaceId(auditorioId);
  let row;
  if (excludeId) {
    row = db.prepare(`
      SELECT payload FROM agendamentos
      WHERE auditorio_id = ?
        AND data = ?
        AND status NOT IN ('cancelado', 'rejeitado')
        AND id != ?
        AND ? < hora_fim
        AND ? > hora_inicio
      LIMIT 1
    `).get(targetId, data, excludeId, horaInicio, horaFim);
  } else {
    row = db.prepare(`
      SELECT payload FROM agendamentos
      WHERE auditorio_id = ?
        AND data = ?
        AND status NOT IN ('cancelado', 'rejeitado')
        AND ? < hora_fim
        AND ? > hora_inicio
      LIMIT 1
    `).get(targetId, data, horaInicio, horaFim);
  }
  return row ? JSON.parse(row.payload) : null;
}

// ================= UTILITÁRIOS HTTP =================
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function getAuthUser(req) {
  const auth = req.headers["authorization"] || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return verifyToken(token);
}

function requireOperator(req, res) {
  const u = getAuthUser(req);
  if (!u || (u.perfil !== "admin" && u.perfil !== "operador")) {
    sendJson(res, 401, { error: "Sessão expirada ou sem permissão. Faça login novamente." });
    return null;
  }
  return u;
}

function requireAdmin(req, res) {
  const u = getAuthUser(req);
  if (!u || u.perfil !== "admin") {
    sendJson(res, 403, { error: "Apenas administradores da PRG podem executar esta ação." });
    return null;
  }
  return u;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// ================= SERVIDOR HTTP E ROTAS DA API =================
const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

    // Suporte transparente tanto na raiz (/) quanto em subcaminho (/agenda/)
    if (urlPath === "/agenda") {
      res.writeHead(301, { Location: "/agenda/" });
      return res.end();
    }
    if (urlPath.startsWith("/agenda/")) {
      urlPath = urlPath.slice("/agenda".length) || "/";
    }

    // ---------------- ROTAS DA API (/api/...) ----------------
    if (urlPath === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, { ok: true, db: "sqlite", timestamp: new Date().toISOString() });
    }

    // 1. AUTENTICAÇÃO
    if (urlPath === "/api/auth/login" && req.method === "POST") {
      const body = await readJsonBody(req);
      let email = String(body.email || "").trim().toLowerCase();
      const senha = String(body.senha || "");
      if (email && !email.includes("@")) {
        email = `${email}@academico.ufpb.br`;
      }
      if (!email.endsWith("@academico.ufpb.br")) {
        return sendJson(res, 403, { error: "Acesso restrito! O login deve ser realizado com uma conta do domínio institucional @academico.ufpb.br." });
      }
      const user = db.prepare("SELECT * FROM usuarios WHERE lower(email) = ?").get(email);
      if (!user || !verifyPassword(senha, user.senha_hash)) {
        return sendJson(res, 401, { error: "E-mail ou senha inválidos." });
      }
      if (user.status === "inativo") {
        return sendJson(res, 403, { error: "Seu acesso está inativo no momento. Procure a PRG / Central de Aulas." });
      }
      const safeUser = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        setor: user.setor,
        perfil: user.perfil,
        status: user.status
      };
      const token = createToken(safeUser);
      return sendJson(res, 200, { user: safeUser, token });
    }

    // 2. ESPAÇOS
    if (urlPath === "/api/espacos" && req.method === "GET") {
      const rows = db.prepare("SELECT payload FROM espacos ORDER BY nome ASC").all();
      return sendJson(res, 200, rows.map((r) => JSON.parse(r.payload)));
    }

    if (urlPath === "/api/espacos/reset" && req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const catalog = loadCatalogFromJs();
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO espacos (id, id_interno, codigo_mec, tipo, nome, nome_amigavel, capacidade, area, bloco, reservavel, payload, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      db.exec("BEGIN IMMEDIATE");
      try {
        db.exec("DELETE FROM espacos");
        for (const sp of catalog) {
          const id = normalizeSpaceId(sp.id || sp.idInterno);
          const normalized = { ...sp, id, idInterno: id };
          stmt.run(
            id,
            id,
            normalized.codigoMec || "",
            normalized.tipo || "",
            normalized.nome || id,
            normalized.nomeAmigavel || normalized.nome || id,
            Number(normalized.capacidade || 0),
            Number(normalized.area || 0),
            normalized.bloco || "",
            normalized.reservavel ? 1 : 0,
            JSON.stringify(normalized),
            now
          );
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return sendJson(res, 200, catalog);
    }

    if (urlPath === "/api/espacos/batch" && req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const body = await readJsonBody(req);
      const list = Array.isArray(body.espacos) ? body.espacos : [];
      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO espacos (id, id_interno, codigo_mec, tipo, nome, nome_amigavel, capacidade, area, bloco, reservavel, payload, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const sp of list) {
          const id = normalizeSpaceId(sp.id || sp.idInterno);
          const normalized = { ...sp, id, idInterno: id };
          stmt.run(
            id,
            id,
            normalized.codigoMec || "",
            normalized.tipo || "",
            normalized.nome || id,
            normalized.nomeAmigavel || normalized.nome || id,
            Number(normalized.capacidade || 0),
            Number(normalized.area || 0),
            normalized.bloco || "",
            normalized.reservavel ? 1 : 0,
            JSON.stringify(normalized),
            now
          );
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      return sendJson(res, 200, { ok: true, count: list.length });
    }

    if (urlPath.startsWith("/api/espacos/") && req.method === "PUT") {
      if (!requireOperator(req, res)) return;
      const id = normalizeSpaceId(urlPath.slice("/api/espacos/".length));
      const body = await readJsonBody(req);
      const existing = getEspacoFromDb(id) || {};
      const merged = { ...existing, ...body, id, idInterno: id };
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO espacos (id, id_interno, codigo_mec, tipo, nome, nome_amigavel, capacidade, area, bloco, reservavel, payload, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        id,
        merged.codigoMec || "",
        merged.tipo || "",
        merged.nome || id,
        merged.nomeAmigavel || merged.nome || id,
        Number(merged.capacidade || 0),
        Number(merged.area || 0),
        merged.bloco || "",
        merged.reservavel ? 1 : 0,
        JSON.stringify(merged),
        now
      );
      return sendJson(res, 200, merged);
    }

    // 3. AGENDAMENTOS (COM TRAVA TRANSACIONAL DE CONFLITO)
    if (urlPath === "/api/agendamentos" && req.method === "GET") {
      const rows = db.prepare("SELECT payload FROM agendamentos ORDER BY data ASC, hora_inicio ASC").all();
      return sendJson(res, 200, rows.map((r) => JSON.parse(r.payload)));
    }

    if (urlPath === "/api/agendamentos" && req.method === "POST") {
      const data = await readJsonBody(req);
      const normalizedAudId = normalizeSpaceId(data.auditorioId);

      db.exec("BEGIN IMMEDIATE");
      try {
        const bloqueio = checkBlockConflictInDb(normalizedAudId, data.data, data.horaInicio, data.horaFim);
        if (bloqueio) {
          db.exec("ROLLBACK");
          const espaco = getEspacoFromDb(normalizedAudId);
          const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
          return sendJson(res, 409, {
            error: `HORÁRIO BLOQUEADO!\n${espacoNome} está bloqueado das ${bloqueio.horaInicio} às ${bloqueio.horaFim} por: "${bloqueio.titulo}". Aulas regulares da graduação ou atividades acadêmicas possuem reserva prioritária neste período.`
          });
        }

        const conflito = checkBookingConflictInDb(normalizedAudId, data.data, data.horaInicio, data.horaFim);
        if (conflito) {
          db.exec("ROLLBACK");
          const espaco = getEspacoFromDb(normalizedAudId);
          const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
          return sendJson(res, 409, {
            error: `Conflito de Horário! ${espacoNome} já está ocupado das ${conflito.horaInicio} às ${conflito.horaFim} pelo evento: "${conflito.titulo}".`
          });
        }

        const id = "ag_" + Date.now() + "_" + crypto.randomBytes(2).toString("hex");
        const now = new Date().toISOString();
        const authUser = getAuthUser(req);
        const canConfirm = authUser && (authUser.perfil === "admin" || authUser.perfil === "operador");
        const novoAgendamento = {
          id,
          ...data,
          auditorioId: normalizedAudId,
          status: canConfirm ? (data.status || "confirmado") : "pendente",
          notificacoes: Array.isArray(data.notificacoes) ? data.notificacoes : [],
          criadoEm: now
        };

        db.prepare(`
          INSERT INTO agendamentos (id, auditorio_id, titulo, tipo_evento, solicitante, departamento, email, telefone, data, hora_inicio, hora_fim, status, payload, criado_por, criado_em, atualizado_em)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          normalizedAudId,
          novoAgendamento.titulo || "",
          novoAgendamento.tipoEvento || "",
          novoAgendamento.solicitante || "",
          novoAgendamento.departamento || "",
          novoAgendamento.email || "",
          novoAgendamento.telefone || "",
          novoAgendamento.data || "",
          novoAgendamento.horaInicio || "",
          novoAgendamento.horaFim || "",
          novoAgendamento.status,
          JSON.stringify(novoAgendamento),
          novoAgendamento.criadoPor || "",
          now,
          now
        );

        db.exec("COMMIT");
        return sendJson(res, 201, novoAgendamento);
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch {}
        throw e;
      }
    }

    if (urlPath.startsWith("/api/agendamentos/") && req.method === "PUT") {
      if (!requireOperator(req, res)) return;
      const id = urlPath.slice("/api/agendamentos/".length);
      const data = await readJsonBody(req);

      db.exec("BEGIN IMMEDIATE");
      try {
        const row = db.prepare("SELECT payload FROM agendamentos WHERE id = ?").get(id);
        if (!row) {
          db.exec("ROLLBACK");
          return sendJson(res, 404, { error: "Agendamento não encontrado." });
        }
        const existing = JSON.parse(row.payload);
        const merged = { ...existing, ...data };
        const normalizedAudId = normalizeSpaceId(merged.auditorioId);
        merged.auditorioId = normalizedAudId;
        merged.atualizadoEm = new Date().toISOString();

        if (merged.status !== "cancelado" && merged.status !== "rejeitado") {
          const bloqueio = checkBlockConflictInDb(normalizedAudId, merged.data, merged.horaInicio, merged.horaFim);
          if (bloqueio) {
            db.exec("ROLLBACK");
            const espaco = getEspacoFromDb(normalizedAudId);
            const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
            return sendJson(res, 409, {
              error: `HORÁRIO BLOQUEADO!\n${espacoNome} está bloqueado das ${bloqueio.horaInicio} às ${bloqueio.horaFim} por: "${bloqueio.titulo}".`
            });
          }

          const conflito = checkBookingConflictInDb(normalizedAudId, merged.data, merged.horaInicio, merged.horaFim, id);
          if (conflito) {
            db.exec("ROLLBACK");
            const espaco = getEspacoFromDb(normalizedAudId);
            const espacoNome = espaco ? (espaco.nomeAmigavel || espaco.nome) : "o espaço solicitado";
            return sendJson(res, 409, {
              error: `Conflito de Horário! ${espacoNome} já está ocupado das ${conflito.horaInicio} às ${conflito.horaFim} pelo evento: "${conflito.titulo}".`
            });
          }
        }

        db.prepare(`
          UPDATE agendamentos
          SET auditorio_id = ?, titulo = ?, tipo_evento = ?, solicitante = ?, departamento = ?, email = ?, telefone = ?, data = ?, hora_inicio = ?, hora_fim = ?, status = ?, payload = ?, atualizado_em = ?
          WHERE id = ?
        `).run(
          normalizedAudId,
          merged.titulo || "",
          merged.tipoEvento || "",
          merged.solicitante || "",
          merged.departamento || "",
          merged.email || "",
          merged.telefone || "",
          merged.data || "",
          merged.horaInicio || "",
          merged.horaFim || "",
          merged.status || "confirmado",
          JSON.stringify(merged),
          merged.atualizadoEm,
          id
        );

        db.exec("COMMIT");
        return sendJson(res, 200, merged);
      } catch (e) {
        try { db.exec("ROLLBACK"); } catch {}
        throw e;
      }
    }

    if (urlPath.startsWith("/api/agendamentos/") && req.method === "DELETE") {
      if (!requireOperator(req, res)) return;
      const id = urlPath.slice("/api/agendamentos/".length);
      db.prepare("DELETE FROM agendamentos WHERE id = ?").run(id);
      return sendJson(res, 200, { ok: true });
    }

    // 4. USUÁRIOS (SEM EXPOR SENHAS)
    if (urlPath === "/api/usuarios" && req.method === "GET") {
      const rows = db.prepare("SELECT id, nome, email, setor, perfil, status, criado_em AS criadoEm FROM usuarios ORDER BY nome ASC").all();
      return sendJson(res, 200, rows);
    }

    if (urlPath === "/api/usuarios" && req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const data = await readJsonBody(req);
      const emailNorm = String(data.email || "").trim().toLowerCase();
      if (!emailNorm.endsWith("@academico.ufpb.br")) {
        return sendJson(res, 400, { error: "O e-mail deve pertencer obrigatoriamente ao domínio institucional @academico.ufpb.br" });
      }
      const existing = db.prepare("SELECT id FROM usuarios WHERE lower(email) = ?").get(emailNorm);
      if (existing) {
        return sendJson(res, 409, { error: "Já existe um usuário cadastrado com este e-mail." });
      }
      const id = "usr_" + Date.now();
      const now = new Date().toISOString();
      const rawPass = data.senha || "ufpb123";
      db.prepare(`
        INSERT INTO usuarios (id, nome, email, setor, perfil, status, senha_hash, criado_em, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.nome || emailNorm,
        emailNorm,
        data.setor || "PRG",
        data.perfil || "operador",
        data.status || "ativo",
        hashPassword(rawPass),
        now,
        now
      );
      return sendJson(res, 201, {
        id,
        nome: data.nome || emailNorm,
        email: emailNorm,
        setor: data.setor || "PRG",
        perfil: data.perfil || "operador",
        status: data.status || "ativo",
        criadoEm: now
      });
    }

    if (urlPath.startsWith("/api/usuarios/") && req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const id = urlPath.slice("/api/usuarios/".length);
      const data = await readJsonBody(req);
      const current = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id);
      if (!current) return sendJson(res, 404, { error: "Usuário não encontrado." });

      const nome = data.nome !== undefined ? data.nome : current.nome;
      const email = data.email !== undefined ? String(data.email).trim().toLowerCase() : current.email;
      const setor = data.setor !== undefined ? data.setor : current.setor;
      const perfil = data.perfil !== undefined ? data.perfil : current.perfil;
      const status = data.status !== undefined ? data.status : current.status;
      const senhaHash = data.senha ? hashPassword(data.senha) : current.senha_hash;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE usuarios SET nome = ?, email = ?, setor = ?, perfil = ?, status = ?, senha_hash = ?, atualizado_em = ?
        WHERE id = ?
      `).run(nome, email, setor, perfil, status, senhaHash, now, id);

      return sendJson(res, 200, { id, nome, email, setor, perfil, status, criadoEm: current.criado_em });
    }

    if (urlPath.startsWith("/api/usuarios/") && req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = urlPath.slice("/api/usuarios/".length);
      db.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
      return sendJson(res, 200, { ok: true });
    }

    // 5. BLOQUEIOS DE HORÁRIOS E SEMESTRES LETIVOS
    if (urlPath === "/api/bloqueios" && req.method === "GET") {
      const rows = db.prepare("SELECT payload FROM bloqueios ORDER BY data_inicio ASC").all();
      return sendJson(res, 200, rows.map((r) => JSON.parse(r.payload)));
    }

    if (urlPath === "/api/bloqueios" && req.method === "POST") {
      if (!requireOperator(req, res)) return;
      const data = await readJsonBody(req);
      const id = "bloq_" + Date.now();
      const now = new Date().toISOString();
      const novo = {
        id,
        ...data,
        ativo: data.ativo !== undefined ? !!data.ativo : true,
        criadoEm: now
      };
      db.prepare(`
        INSERT INTO bloqueios (id, titulo, semestre, motivo, tipo_espaco, bloco, data_inicio, data_fim, hora_inicio, hora_fim, ativo, payload, criado_em, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        novo.titulo || "",
        novo.semestre || "",
        novo.motivo || "",
        novo.tipoEspaco || "todas_salas",
        novo.bloco || "todos",
        novo.dataInicio || "",
        novo.dataFim || "",
        novo.horaInicio || "",
        novo.horaFim || "",
        novo.ativo ? 1 : 0,
        JSON.stringify(novo),
        now,
        now
      );
      return sendJson(res, 201, novo);
    }

    if (urlPath.startsWith("/api/bloqueios/") && req.method === "PUT") {
      if (!requireOperator(req, res)) return;
      const id = urlPath.slice("/api/bloqueios/".length);
      const data = await readJsonBody(req);
      const row = db.prepare("SELECT payload FROM bloqueios WHERE id = ?").get(id);
      if (!row) return sendJson(res, 404, { error: "Bloqueio não encontrado." });
      const existing = JSON.parse(row.payload);
      const now = new Date().toISOString();
      const merged = { ...existing, ...data, id, atualizadoEm: now };
      db.prepare(`
        UPDATE bloqueios
        SET titulo = ?, semestre = ?, motivo = ?, tipo_espaco = ?, bloco = ?, data_inicio = ?, data_fim = ?, hora_inicio = ?, hora_fim = ?, ativo = ?, payload = ?, atualizado_em = ?
        WHERE id = ?
      `).run(
        merged.titulo || "",
        merged.semestre || "",
        merged.motivo || "",
        merged.tipoEspaco || "todas_salas",
        merged.bloco || "todos",
        merged.dataInicio || "",
        merged.dataFim || "",
        merged.horaInicio || "",
        merged.horaFim || "",
        merged.ativo !== false ? 1 : 0,
        JSON.stringify(merged),
        now,
        id
      );
      return sendJson(res, 200, merged);
    }

    if (urlPath.startsWith("/api/bloqueios/") && req.method === "DELETE") {
      if (!requireOperator(req, res)) return;
      const id = urlPath.slice("/api/bloqueios/".length);
      db.prepare("DELETE FROM bloqueios WHERE id = ?").run(id);
      return sendJson(res, 200, { ok: true });
    }

    // ---------------- ARQUIVOS ESTÁTICOS ----------------
    if (urlPath === "/" || urlPath === "") urlPath = "/index.html";
    const safeFile = path.resolve(ROOT_DIR, "." + urlPath);

    // Bloqueia acesso externo ao banco SQLite, scripts de servidor e arquivos ocultos
    const rel = path.relative(ROOT_DIR, safeFile).replace(/\\/g, "/");
    if (
      !safeFile.startsWith(path.resolve(ROOT_DIR)) ||
      rel.startsWith("dados/") ||
      rel.startsWith("backups/") ||
      rel === "server.js" ||
      rel.endsWith(".sh") ||
      rel.endsWith(".md") ||
      rel.startsWith(".") ||
      !fs.existsSync(safeFile) ||
      fs.statSync(safeFile).isDirectory()
    ) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Não encontrado");
    }

    const ext = path.extname(safeFile).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=300"
    });
    fs.createReadStream(safeFile).pipe(res);
  } catch (err) {
    console.error("[Agenda PRG Erro]:", err);
    sendJson(res, 500, { error: err.message || "Erro interno no servidor da Agenda." });
  }
});

// Trava interna de memória (300 MB) para proteger o servidor compartilhado
const MAX_RSS_BYTES = 300 * 1024 * 1024;
setInterval(() => {
  const rss = process.memoryUsage().rss;
  if (rss > MAX_RSS_BYTES) {
    console.error(`[Agenda PRG] Limite de memória (300 MB) atingido (${Math.round(rss / 1048576)} MB). Encerrando para reinício limpo.`);
    process.exit(1);
  }
}, 30000).unref();

server.listen(PORT, HOST, () => {
  console.log(`Agenda PRG (SQLite ativo) rodando em http://${HOST}:${PORT}`);
});
