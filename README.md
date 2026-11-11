# Agenda SisInfra - Gestão de Espaços e Infraestrutura (PRG / UFPB)

Sistema web completo para gestão, controle de checklist de equipamentos, consulta e agendamento dos auditórios, salas de reunião e instalações sob gestão da **Pró-Reitoria de Graduação (PRG)** da **Universidade Federal da Paraíba (UFPB)**.

Integrado ao catálogo oficial de infraestrutura da UFPB: **[sisinfra.ufpb.br](https://sisinfra.ufpb.br)**.

---

## 🏛️ Identidade Visual Institucional & Integração SisInfra

O sistema segue rigorosamente os padrões oficiais de identidade visual da UFPB, PRG e Governo Federal (e-MAG):
- **Barra Superior Institucional:** Acesso direto a [SisInfra UFPB](https://sisinfra.ufpb.br), Portal UFPB, PRG, SIGAA e SIPAC.
- **Acessibilidade Governamental:** Modo **Alto Contraste** funcional e redimensionamento de fontes (`A+` e `A-`).
- **Padrão de Cores Oficial:**
  - **Azul UFPB:** `#003366` e `#002244`
  - **Dourado UFPB:** `#D4AF37` / `#C5A059`
  - **Cinza Institucional:** `#F8FAFC` / `#E2E8F0`

---

## 🏢 Catálogo de Infraestrutura SisInfra (PRG)

O sistema possui o cadastro completo de todas as **102 instalações** da PRG catalogadas no SisInfra, divididas por blocos e finalidades:

1. **Auditórios & Salas de Reunião (Habilitados para Reserva por Padrão):**
   - **PRG - AUDITÓRIO 1 (`INFRA2220PRG`):** Capacidade para 110 pessoas, 123 m², climatizado, sonorizado, datashow laser, tela retrátil e púlpito para palestras e conferências solenes. SisInfra: *Atualização Pendente no e-MEC*, inspeção confirmada de acessibilidade, climatização e multimídia.
   - **PRG - AUDITÓRIO 2 (`INFRA2202PRG`):** Capacidade para 120 pessoas, 100 m², climatizado, equipado com recursos multimídia e acessibilidade para formaturas, palestras e eventos de grande porte. SisInfra: *Atualização Pendente no e-MEC*.
   - **PRG - SALA DE REUNIÃO (`INFRA2289PRG`):** Capacidade para 50 pessoas, 50 m², equipada para colegiados e reuniões de gestão. SisInfra: *Registrada no e-MEC*.
   - **PRG - SALA DE REUNIÃO SECRETARIA (`INFRA2290PRG`):** Capacidade para 10 pessoas, 17 m², para reuniões de trabalho e alinhamento interno.

2. **Salas de Aula (59 Salas de Aula na Central de Aulas):**
   - **Bloco A:** Salas 101 a 106 (capacidades de 60 a 80 alunos).
   - **Bloco B:** Salas 101 a 107 (capacidades de 40 a 60 alunos).
   - **Bloco C:** Sala 108 e laboratórios (LID I, LID II, LAMBDA, PIBID, Bilíngue CE).
   - **Bloco D:** Salas 101 a 109, 111 (capacidades de 30 a 60 alunos, lousas de vidro e verdes) e NCDH.
   - **Bloco E:** Salas 101 a 111 (quadro branco e vidro).
   - **Bloco F:** Salas 101 a 111 (lousa de vidro).
   - **Bloco G:** Salas 101 a 105 (lousa de vidro).
   - **Bloco H:** Salas 101 a 108 (capacidades de 40 a 50 alunos).

3. **Gabinetes, Coordenações e Apoio Administrativo:**
   - Gabinete PRG, Coordenação Acadêmica, Currículos, Estágio, Programas/Projetos, Regulação/Avaliação e Permanência.

---

## ⚙️ Checklist Interativo de Equipamentos por Sala

O gestor possui um painel interativo para cada sala e espaço do catálogo onde pode **ativar ou desativar** os recursos presentes:
- 📽️ **Datashow / Projetor Laser HD**
- 🖥️ **Tela de Projeção Retrátil / Fixa**
- 🔊 **Sistema de Som / Caixas Ativas**
- 🎤 **Microfones sem Fio (Lapela / Bastão)**
- 💻 **Computador do Docente / Ponto de Rede**
- 🔌 **Conectividade HDMI & USB-C**
- ❄️ **Ar-condicionado Split / Central**
- 🖊️ **Quadro Branco Magnético**
- 🟩 **Quadro Verde Tradicional (Giz)**
- 🪟 **Lousa de Vidro Temperado**
- 🪑 **Púlpito / Mesa Diretora**
- ♿ **Acessibilidade PCD (Rampa / Vaga)**
- 📶 **Wi-Fi Institucional Eduroam**
- ⚡ **Tomadas Elétricas para Notebooks**
- 🪟 **Cortinas com Vedação / Blackout**
- 📹 **Câmera / Transmissão Híbrida**

> **Impacto Direto na Reserva:** Ao solicitar uma reserva na Agenda SisInfra, o formulário apresenta dinamicamente apenas os recursos que estão **ativos no checklist** daquela sala específica!

---

## 🔒 Controle de Espaços Reserváveis, Calendários Acadêmicos UFPB & Bloqueio de Horários

As **salas de aula da Central de Aulas (59 salas nos Blocos A a H)** e os auditórios estão configurados como **agendáveis**. Para garantir que as reservas respeitem rigorosamente o calendário letivo aprovado pelo Consepe / PRG, o sistema conta com o módulo **Bloqueios & Calendários Acadêmicos Oficiais**:

1. **Calendários Acadêmicos UFPB Integrados:**
   - **Semestre 2026.2 (Vigente / Em Curso):** Aulas regulares de 28/08/2026 a 16/12/2026; Exames Finais de 17 a 22/12/2026; Colações de Grau de 11 a 29/01/2027; Recesso Acadêmico de 23/12/2026 a 28/02/2027.
   - **Semestre 2027.1 (Próximo Semestre Letivo):** Matrículas SIGAA de 11 a 13/02/2027; Aulas de 01/03/2027 a 10/07/2027; Exames Finais de 12 a 17/07/2027; Colações de Grau de 02 a 31/08/2027.
   - **Semestre 2027.2 (Oficial Publicado no Consepe):** Matrículas SIGAA de 21 a 23/07/2027; Aulas de 09/08/2027 a 16/12/2027; Exames Finais de 17 a 22/12/2027; Colações de Grau de 01 a 25/02/2028.

2. **Bloqueio Automático das Aulas Regulares (SIGAA):**
   - **Turno Manhã:** 07:00 às 12:00 (Segunda a Sexta)
   - **Turno Tarde:** 13:00 às 18:00 (Segunda a Sexta)
   - **Turno Noite:** 18:30 às 22:00 (Segunda a Sexta)
   - As salas da Central de Aulas ficam protegidas para turmas regulares nos semestres 2026.2, 2027.1 e 2027.2.
   - Fora dos horários de aula (finais de semana, feriados, intervalos entre turnos ou durante recesso/férias), as salas ficam disponíveis para reserva.

3. **Gestão Flexível para os Gestores:**
   - Ativação ou desativação em 1 clique com switch toggle.
   - Criação de novos bloqueios por motivo de **Manutenção Predial**, **Concursos Públicos / Vestibulares**, **Eventos Institucionais** ou **Recesso Acadêmico**.
   - Definição de escopo por bloco (ex: todas as salas do Bloco A), salas específicas ou todos os espaços.

4. **Alerta Preventivo em Tempo Real:**
   - O formulário de agendamento avisa imediatamente ao usuário se a data e turno selecionados colidem com o período letivo ou bloqueio ativo, impedindo conflitos.

---

## 📥 Importação Direta de Dados do SisInfra (CSV)

O sistema conta com um botão oficial **"Importar Dados SisInfra (CSV)"**:
- Suporte a upload do arquivo exportado do [sisinfra.ufpb.br](https://sisinfra.ufpb.br) ou colagem direta do texto CSV.
- Atualização instantânea de capacidades, nomes, blocos, status no e-MEC e atributos de inspeção técnica (Acessibilidade, Climatização, Multimídia, Manutenção).
- Preservação inteligente de personalizações de checklist e permissões de reserva feitas anteriormente pelo gestor.

---

## 👥 Perfis de Acesso & Visibilidade por Perfil

O menu da Agenda SisInfra é segmentado dinamicamente para preservar a segurança institucional:

1. **Visão Pública / Visitante (Sem autenticação):**
   - **➕ 1. Nova Reserva:** Formulário para submissão de solicitações (status *Pendente de Análise*).
   - **📅 2. Calendário:** Consulta interativa de disponibilidade dos auditórios e salas.
   - **📋 3. Lista de Agendamentos:** Visualização dos eventos confirmados e pendentes.
   *(As demais abas ficam ocultas para o público externo).*

2. **Equipe Autorizada da Central de Aulas e PRG (Operador / Gestor SisInfra):**
   - **📑 4. Pauta Diária:** Controle diário de uso dos espaços para portaria e suporte técnico.
   - **🏢 5. Infraestrutura & Checklist:** Gestão de equipamentos por sala (ativar/desativar datashows, som, etc.) e controle de reserva.
   - **🔒 6. Bloqueios & Período Letivo:** Gestão de bloqueios de turnos de aula (2026.2, 2027.1, 2027.2) e manutenções.
   - **👥 7. Pessoas Autorizadas:** Gestão de operadores (exclusivo para Administrador Geral com e-mail `@academico.ufpb.br`).

### 🔑 Contas de Demonstração para Testes Rápidos:
| Perfil | E-mail Institucional | Senha | Acesso |
|---|---|---|---|
| **Gestor SisInfra / Admin** | `admin@academico.ufpb.br` | `admin123` | Acesso total a todas as 7 abas |
| **Operador da Central** | `operador@academico.ufpb.br` | `operador123` | Reservas, Pauta, Checklist e Bloqueios |
| **Público Geral** | *Sem login* | *Sem login* | Nova Reserva, Calendário e Lista |

---

## ✉️ Sistema de Notificações Oficiais por E-mail

Em conformidade com as diretrizes da PRG, o interessado é **notificado formalmente por e-mail em todas as situações**:

1. **Solicitação Recebida (Público):** Protocolo oficial com código `#ID`, dados do espaço SisInfra, turno e orientações de análise.
2. **Reserva Confirmada (Operador/Admin):** Confirmação imediata com orientações de uso e recursos garantidos.
3. **Reserva Aprovada pelo Gestor:** Notificação de deferimento da solicitação com orientações de acesso.
4. **Reserva Negada / Recusada:** Notificação com **justificativa obrigatória da gestão** (motivos frequentes como choque com aulas SIGAA, manutenção predial, capacidade inadequada, etc.) e orientações para novas datas.
5. **Reserva Cancelada:** Aviso formal com justificativa e liberação de horário.
6. **Reserva Atualizada:** Notificação de alteração de horário ou sala.

> **Envio e Pré-visualização:** O sistema disponibiliza envio direto com 1 clique para o **Gmail Web** (com assunto e corpo preenchidos), cliente padrão (**Outlook / Mail** via `mailto`), cópia do texto e suporte integrado à API do **EmailJS** para envio automático em segundo plano. Histórico de notificações registrado em cada agendamento.

---

## ⚡ Prevenção Automática de Conflitos de Horário

O motor de agendamento valida automaticamente:
1. Espaço solicitado (ID SisInfra / código interno).
2. Data do evento.
3. Intervalo `[Hora Início, Hora Fim]`.

Se houver choque de horário no mesmo espaço, a gravação é bloqueada imediatamente informando o evento e horário conflitantes.

---

## 🖨️ Documentos Oficiais

- **Comprovante Oficial de Reserva:** Ficha individual com código de rastreio, código SisInfra (`INFRA...`), código e-MEC, bloco, itens do checklist requisitados, termos de uso do patrimônio e campos de assinatura.
- **Pauta Diária:** Grade por espaço com todos os eventos do dia para portaria e suporte técnico.

---

## 🚀 Como Testar Localmente

Basta abrir o arquivo `index.html` em qualquer navegador.
O sistema opera automaticamente em modo de demonstração via `localStorage`, sem necessidade de compilação ou instalação prévia.

---

## ☁️ Publicação no Firebase

```bash
# 1. Login no Firebase
firebase login

# 2. Vincular ao seu projeto
firebase use --add seu-projeto-id

# 3. Publicar
firebase deploy
```

O site estará acessível com HTTPS em `https://seu-projeto-id.web.app`.
