/**
 * AGENDA SISINFRA - GESTÃO DE ESPAÇOS E INFRAESTRUTURA (PRG / UFPB)
 * Módulo de Notificações Oficiais por E-mail (EmailNotificationService)
 * 
 * Garante que em todas as situações (solicitação recebida, aprovação,
 * recusa/indeferimento com justificativa, cancelamento e alteração),
 * o interessado seja notificado formalmente no e-mail cadastrado.
 */

class EmailNotificationService {
  constructor() {
    this.emailConfigKey = "prg_emailjs_config";
    this.currentNotification = null;
  }

  /**
   * Monta o conteúdo institucional do e-mail de acordo com a situação
   */
  buildEmail(situation, ag, extra = {}) {
    const space = extra.space || {};
    const spaceName = space.nomeAmigavel || space.nome || ag.auditorioId || "Espaço Solicitado";
    const spaceCode = space.idInterno || ag.auditorioId;
    const spaceMec = space.codigoMec || "SisInfra UFPB";
    const spaceBloco = space.bloco || "Central de Aulas - Campus I";

    const [ano, mes, dia] = (ag.data || "").split("-");
    const dataFormatada = (ano && mes && dia) ? `${dia}/${mes}/${ano}` : ag.data;

    const recursosStr = (Array.isArray(ag.recursos) && ag.recursos.length > 0)
      ? ag.recursos.map(r => `  • ${r}`).join("\n")
      : "  • Nenhum equipamento adicional requisitado";

    const solicitanteNome = ag.solicitante || "Prezado(a) Solicitante";
    const motivoTexto = extra.motivo || ag.motivoRejeicao || ag.motivoCancelamento || "Necessidade de adequação de horário ou atividade acadêmica prioritária.";

    let subject = "";
    let statusLabel = "";
    let headline = "";
    let bodyIntro = "";
    let bodyExtra = "";
    let badgeColor = "bg-blue-100 text-blue-900 border-blue-300";

    switch (situation) {
      case "solicitacao_recebida":
        statusLabel = "SOLICITAÇÃO RECEBIDA (EM ANÁLISE)";
        badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
        subject = `[Agenda SisInfra UFPB] Solicitação de Reserva Recebida - #${ag.id}`;
        headline = "Sua solicitação de reserva foi registrada com sucesso!";
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nConfirmamos o recebimento da sua solicitação de reserva na Agenda SisInfra da Pró-Reitoria de Graduação (PRG / UFPB).\nSua solicitação está em análise pela equipe da Central de Aulas e da PRG.`;
        bodyExtra = `⚠️ IMPORTANTE: Este e-mail é um comprovante de recebimento da solicitação. Aguarde a confirmação de aprovação pela equipe gestora antes de divulgar seu evento.`;
        break;

      case "reserva_confirmada":
        statusLabel = "RESERVA CONFIRMADA";
        badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300";
        subject = `[Agenda SisInfra UFPB] Reserva CONFIRMADA - #${ag.id} (${ag.titulo})`;
        headline = "Sua reserva foi confirmada com sucesso!";
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nSua reserva de espaço na Agenda SisInfra foi confirmada com sucesso pela equipe autorizada da PRG / UFPB.`;
        bodyExtra = `📋 ORIENTAÇÕES GERAIS:\n1. A sala/auditório estará liberada 15 minutos antes do horário de início.\n2. Os recursos solicitados estarão disponíveis e inspecionados.\n3. Em caso de necessidade de cancelamento, avise com antecedência mínima de 24h pelo e-mail centraldeaulas@prg.ufpb.br.`;
        break;

      case "reserva_aprovada":
        statusLabel = "SOLICITAÇÃO APROVADA";
        badgeColor = "bg-emerald-100 text-emerald-900 border-emerald-300";
        subject = `[Agenda SisInfra UFPB] Solicitação APROVADA - #${ag.id} (${ag.titulo})`;
        headline = "Parabéns! Sua solicitação de reserva foi APROVADA!";
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nTemos a satisfação de informar que a sua solicitação de reserva para o evento "${ag.titulo}" foi AVALIADA E APROVADA pela Pró-Reitoria de Graduação (PRG / UFPB).`;
        bodyExtra = `📋 ORIENTAÇÕES DE USO:\n• Apresente este e-mail ou o comprovante impresso à portaria/apoio da Central de Aulas no dia do evento.\n• Conserve os equipamentos de áudio, projeção e climatização conforme as orientações de patrimônio do SisInfra.`;
        break;

      case "reserva_negada":
        statusLabel = "SOLICITAÇÃO NÃO APROVADA / RECUSADA";
        badgeColor = "bg-rose-100 text-rose-900 border-rose-300";
        subject = `[Agenda SisInfra UFPB] Informação sobre Solicitação de Reserva - #${ag.id}`;
        headline = "Sua solicitação de reserva não pôde ser aprovada";
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nInformamos que, após análise de disponibilidade e critérios operacionais da Central de Aulas / PRG, a sua solicitação de reserva NÃO PÔDE SER APROVADA para a data e horário pretendidos.`;
        bodyExtra = `❌ MOTIVO / JUSTIFICATIVA DA GESTÃO:\n"${motivoTexto}"\n\n💡 ORIENTAÇÃO:\nCaso deseje verificar a possibilidade de agendamento em outra data, turno ou em outro espaço físico compatível, consulte o Calendário da Agenda SisInfra (https://sisinfra.ufpb.br) ou entre em contato com a equipe da PRG.`;
        break;

      case "reserva_cancelada":
        statusLabel = "RESERVA CANCELADA";
        badgeColor = "bg-amber-100 text-amber-900 border-amber-300";
        subject = `[Agenda SisInfra UFPB] Aviso de Cancelamento de Reserva - #${ag.id}`;
        headline = "A sua reserva foi cancelada";
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nInformamos que o agendamento #${ag.id} ("${ag.titulo}") agendado para o dia ${dataFormatada} foi CANCELADO no sistema Agenda SisInfra.`;
        bodyExtra = `ℹ️ MOTIVO DO CANCELAMENTO:\n"${motivoTexto}"\n\nO horário foi liberado no calendário oficial de reservas.`;
        break;

      case "reserva_atualizada":
        statusLabel = "DADOS DA RESERVA ATUALIZADOS";
        badgeColor = "bg-indigo-100 text-indigo-900 border-indigo-300";
        subject = `[Agenda SisInfra UFPB] Atualização de Reserva - #${ag.id} (${ag.titulo})`;
        headline = "Os dados da sua reserva foram atualizados";
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nInformamos que os dados da sua reserva #${ag.id} foram alterados pela equipe gestora da Agenda SisInfra.`;
        bodyExtra = `Por favor, confira os novos horários, data e espaço descritos abaixo.`;
        break;

      default:
        statusLabel = "NOTIFICAÇÃO AGENDA SISINFRA";
        subject = `[Agenda SisInfra UFPB] Notificação sobre Reserva - #${ag.id}`;
        bodyIntro = `Prezado(a) ${solicitanteNome},\n\nNotificação oficial sobre a reserva #${ag.id}.`;
    }

    const bodyText = 
`================================================================================
UNIVERSIDADE FEDERAL DA PARAÍBA - UFPB
PRÓ-REITORIA DE GRADUAÇÃO - PRG
SISTEMA DE GESTÃO DE ESPAÇOS E INFRAESTRUTURA - AGENDA SISINFRA
https://sisinfra.ufpb.br
================================================================================

${headline}

${bodyIntro}

--------------------------------------------------------------------------------
DADOS OFICIAIS DO AGENDAMENTO
--------------------------------------------------------------------------------
• Código da Reserva: #${ag.id}
• Status: ${statusLabel}
• Espaço Reservado: ${spaceName}
• Bloco / Localização: ${spaceBloco}
• Código SisInfra: ${spaceCode}
• Registro e-MEC: ${spaceMec}
• Data do Evento: ${dataFormatada}
• Horário: ${ag.horaInicio} às ${ag.horaFim}
• Título do Evento: ${ag.titulo}
• Tipo do Evento: ${ag.tipoEvento || "Atividade Acadêmica"}
• Solicitante: ${solicitanteNome}
• Departamento / Setor: ${ag.departamento || "UFPB"}
• E-mail do Solicitante: ${ag.email}
• Telefone: ${ag.telefone || "Não informado"}

RECURSOS / EQUIPAMENTOS SOLICITADOS:
${recursosStr}

${ag.observacoes ? `OBSERVAÇÕES REGISTRADAS:\n"${ag.observacoes}"\n` : ""}
${bodyExtra}

--------------------------------------------------------------------------------
Em caso de dúvidas ou necessidade de informações complementares, entre em contato:
Pró-Reitoria de Graduação (PRG) • Central de Aulas do Campus I
E-mail: centraldeaulas@prg.ufpb.br | Apoio SisInfra: https://sisinfra.ufpb.br
Universidade Federal da Paraíba - João Pessoa / PB
================================================================================`;

    const recipient = (ag.email || "").trim();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    return {
      situation,
      statusLabel,
      badgeColor,
      recipient,
      recipientName: solicitanteNome,
      subject,
      headline,
      bodyText,
      gmailUrl,
      mailtoUrl,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Processa a notificação, salva no histórico do agendamento e exibe o modal
   */
  async notify(situation, ag, extra = {}) {
    if (!ag || !ag.email) {
      console.warn("Agendamento sem e-mail cadastrado para notificação.");
      return;
    }

    // Busca detalhes do espaço caso não tenham sido passados
    let space = extra.space;
    if (!space && window.storageService && ag.auditorioId) {
      space = await window.storageService.getEspacoById(ag.auditorioId);
    }
    extra.space = space;

    const emailData = this.buildEmail(situation, ag, extra);
    this.currentNotification = emailData;

    // Registra a notificação no histórico do agendamento
    try {
      if (window.storageService && ag.id) {
        const notifRecord = {
          id: "notif_" + Date.now(),
          data: emailData.timestamp,
          tipo: situation,
          statusLabel: emailData.statusLabel,
          destinatario: emailData.recipient,
          assunto: emailData.subject,
          motivo: extra.motivo || null
        };

        const existingNotifs = Array.isArray(ag.notificacoes) ? ag.notificacoes : [];
        existingNotifs.unshift(notifRecord);
        await window.storageService.updateAgendamento(ag.id, {
          notificacoes: existingNotifs,
          ultimaNotificacaoEm: emailData.timestamp,
          ultimoStatusNotificado: situation
        });
      }
    } catch (e) {
      console.error("Erro ao salvar histórico de notificação:", e);
    }

    // Dispara via EmailJS se configurado
    this.trySendViaEmailJS(emailData);

    // Abre o modal de pré-visualização e envio interativo
    this.showEmailModal(emailData);
  }

  /**
   * Tenta envio automático silencioso via EmailJS caso o usuário tenha configurado
   */
  async trySendViaEmailJS(emailData) {
    try {
      const configStr = localStorage.getItem(this.emailConfigKey);
      if (!configStr || !window.emailjs) return;
      const config = JSON.parse(configStr);
      if (!config.serviceId || !config.templateId || !config.publicKey) return;

      window.emailjs.init(config.publicKey);
      await window.emailjs.send(config.serviceId, config.templateId, {
        to_email: emailData.recipient,
        to_name: emailData.recipientName,
        subject: emailData.subject,
        message: emailData.bodyText
      });
      console.log("Notificação enviada com sucesso via EmailJS!");
    } catch (err) {
      console.warn("EmailJS não configurado ou erro no envio automático:", err);
    }
  }

  /**
   * Exibe o modal de e-mail ao usuário
   */
  showEmailModal(emailData) {
    const modal = document.getElementById("modal-email-notificacao");
    if (!modal) return;

    const badgeEl = document.getElementById("email-modal-badge");
    const toEl = document.getElementById("email-modal-to");
    const subjectEl = document.getElementById("email-modal-subject");
    const bodyEl = document.getElementById("email-modal-body");
    const btnGmail = document.getElementById("email-modal-btn-gmail");
    const btnMailto = document.getElementById("email-modal-btn-mailto");

    if (badgeEl) {
      badgeEl.className = `text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${emailData.badgeColor}`;
      badgeEl.textContent = emailData.statusLabel;
    }
    if (toEl) toEl.textContent = `${emailData.recipientName} <${emailData.recipient}>`;
    if (subjectEl) subjectEl.textContent = emailData.subject;
    if (bodyEl) bodyEl.value = emailData.bodyText;

    if (btnGmail) {
      btnGmail.href = emailData.gmailUrl;
      btnGmail.target = "_blank";
    }
    if (btnMailto) {
      btnMailto.href = emailData.mailtoUrl;
    }

    modal.classList.add("active");
  }

  copyEmailText() {
    if (!this.currentNotification) return;
    navigator.clipboard.writeText(this.currentNotification.bodyText).then(() => {
      if (window.appManager) {
        window.appManager.showToast("Texto do e-mail copiado para a área de transferência!", "success");
      } else {
        alert("Texto copiado!");
      }
    });
  }
}

window.emailService = new EmailNotificationService();
