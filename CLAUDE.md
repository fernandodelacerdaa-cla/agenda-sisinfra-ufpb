# Instruções Obrigatórias de Arquitetura e Segurança (CLAUDE.md)

Este arquivo define as regras invioláveis deste repositório (**Agenda de Espaços Acadêmicos — PRG/UFPB**) para qualquer assistente de IA (Claude Code, Cursor, Antigravity, Copilot). **Leia integralmente antes de propor ou executar qualquer comando.**

---

## 1. Isolamento Absoluto no Servidor da UFPB (`150.165.130.3`)

Este sistema compartilha a máquina física (`sisinfra.ufpb.br`) com o sistema principal **SisInfra v1.0**, mas opera em **isolamento total de usuário, porta, processo e banco de dados**:

| Componente | Agenda PRG (ESTE PROJETO) | SisInfra Principal (PROIBIDO TOCAR) |
|---|---|---|
| **URL pública** | `https://sisinfra.ufpb.br/agenda/` | `https://sisinfra.ufpb.br/` |
| **Usuário Linux** | `agenda` | `sisinfra` |
| **Pasta no servidor** | `/home/agenda/agenda-prg` | `/home/sisinfra/projeto-sisinfra` |
| **Porta interna** | `127.0.0.1:3001` | `127.0.0.1:3000` |
| **Banco de dados** | SQLite (`dados/agenda.db`) | PostgreSQL (`sisinfra_ufpb`) |
| **Processo PM2** | `agenda-prg` (PM2 local do usuário `agenda`) | `sisinfra-api` (PM2 do usuário `sisinfra`) |

### Regras Invioláveis de Segurança:
1. **NUNCA toque em `/home/sisinfra`:** É terminantemente proibido ler, listar, editar, mover ou alterar permissões de qualquer arquivo dentro de `/home/sisinfra`.
2. **NUNCA toque na porta `3000` ou no PostgreSQL:** Este projeto não usa PostgreSQL nem a porta `3000`.
3. **NUNCA use `sudo`, `apt` ou `npm install -g`:** O usuário `agenda` é propositalmente desprovido de `sudo`. Toda operação deve ocorrer exclusivamente dentro de `/home/agenda`.
4. **NUNCA reinicie ou recarregue o Nginx:** O bloco `/agenda/` já está configurado no Nginx fazendo proxy reverso para `http://127.0.0.1:3001/`. Qualquer mudança no código da Agenda exige apenas reiniciar o processo `agenda-prg` via `./atualizar-agenda.sh`.

---

## 2. Arquitetura Técnica da Agenda PRG

- **Back-end e Banco Relacional (`server.js`):**
  - Usa exclusivamente módulos nativos do **Node.js 22** (`node:http`, `node:sqlite`, `node:crypto`, `node:fs`). Zero dependências externas de produção.
  - O arquivo do banco SQLite fica em `dados/agenda.db` (com `PRAGMA journal_mode = WAL` e `BEGIN IMMEDIATE` para impedir conflitos de horário concorrentes no mesmo espaço/data/hora).
  - Na primeira execução, se `dados/agenda.db` estiver vazio, o `server.js` semeia automaticamente as **102 salas/auditórios da PRG** (lendo `js/sisinfra-data.js`), os **12 bloqueios de calendários letivos** e os usuários iniciais com senhas protegidas por hash `scrypt`.
  - **Importante:** A pasta `dados/` e a pasta `backups/` estão no `.gitignore`. **Jamais** versione `dados/agenda.db` no Git para não sobrescrever os agendamentos reais do servidor durante um deploy.

- **Front-end (`index.html`, `admin.html`, `js/storage.js`, `js/auth.js`, `js/app.js`, `js/admin.js`):**
  - As chamadas HTTP do front-end para o back-end **DEVEM SEMPRE usar caminho relativo** (`./api/...` e nunca `/api/...`), pois em produção a aplicação roda sob o subcaminho `/agenda/` (logo `./api/agendamentos` resolve para `https://sisinfra.ufpb.br/agenda/api/agendamentos`, sem colidir com o `/api/` do SisInfra principal).
  - Rotas de leitura (`GET ./api/espacos`, `GET ./api/agendamentos`, `GET ./api/bloqueios`) são públicas para alimentar o calendário e a consulta de espaços.
  - Visitantes sem login podem enviar solicitações de reserva (`POST ./api/agendamentos`), mas o servidor força `status: "pendente"` até que um operador ou administrador aprove no painel.
  - Operações administrativas (aprovar, confirmar direto, editar, excluir, gerenciar espaços/bloqueios/usuários) exigem token de sessão (`Authorization: Bearer <token>`) validado no `server.js`.

---

## 3. Como Testar Localmente e Fazer Deploy

### Teste Local (Windows / Mac / Linux):
```bash
node --no-warnings server.js
```
Acesse `http://localhost:3001`.

### Deploy Seguro para Produção (`sisinfra.ufpb.br/agenda/`):
1. Na máquina local, valide as alterações, faça o commit e envie ao GitHub:
   ```bash
   git add .
   git commit -m "feat: descricao da melhoria"
   git push origin main
   ```
2. Conectado na VPN da UFPB, execute **apenas o script oficial de atualização** com o usuário `agenda`:
   ```bash
   ssh agenda@150.165.130.3 "./agenda-prg/atualizar-agenda.sh"
   ```
   *(O script faz backup íntegro do SQLite em `backups/`, cria tag Git de retorno, puxa o código, reinicia o processo `agenda-prg` na porta `3001` e testa `/api/health`. Se algo falhar, ele reverte sozinho).*

### Como Reverter em Caso de Problema (Rollback):
```bash
ssh agenda@150.165.130.3 "./agenda-prg/reverter-agenda.sh"
```
Para voltar também o banco de dados ao estado exato de antes da atualização:
```bash
ssh agenda@150.165.130.3 "./agenda-prg/reverter-agenda.sh --com-banco"
```
