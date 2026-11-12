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

## 3. Fluxo Obrigatório de Trabalho (Local ➔ Teste Local ➔ GitHub ➔ Script no Servidor)

> **REGRA DE OURO PARA A IA E PARA O DESENVOLVEDOR:**
> **JAMAIS edite arquivos diretamente no servidor da UFPB** (via SSH, `nano`, `vim`, `scp` ou comandos remotos). Editar arquivos no servidor suja o repositório Git de produção e trava as atualizações futuras.
> Todo o trabalho deve seguir obrigatoriamente as **4 etapas abaixo, sempre nesta ordem**:

```
[1. Editar no PC Local] ➔ [2. Testar em localhost:3001] ➔ [3. Enviar ao GitHub] ➔ [4. Rodar ./atualizar-agenda.sh no Servidor]
```

### Etapa 1 — Fazer as edições na máquina local
Toda alteração de telas (`index.html`, `admin.html`, `css/`), regras de front-end (`js/`) ou rotas de back-end (`server.js`) deve ser feita **exclusivamente na pasta local do computador**.

### Etapa 2 — Testar localmente na máquina antes de subir
Antes de fazer commit ou enviar para o GitHub, inicie o servidor local para validar as alterações:
```bash
node --no-warnings server.js
```
1. Abra no navegador local: **`http://localhost:3001`** (e **`http://localhost:3001/admin.html`**).
2. Verifique se a funcionalidade nova está correta e se a API local responde em `http://localhost:3001/api/health`.
3. Só avance para a Etapa 3 depois de confirmar que tudo funcionou localmente sem erros.

### Etapa 3 — Salvar no Git e enviar para o GitHub (`git push`)
Com a alteração testada e aprovada na máquina local, envie o código para o GitHub:
```bash
git status -s
git add .
git commit -m "feat: descricao clara da melhoria"
git push origin main
```
*(Lembrete: nunca force o envio da pasta `dados/` ou `backups/` — o banco local de testes nunca deve ir para o GitHub).*

### Etapa 4 — Atualizar o servidor da UFPB usando o script oficial
Com o código já no GitHub e a **VPN da UFPB conectada**, **não** rode `git pull` ou `pm2 restart` manualmente no servidor. Execute sempre o script oficial de deploy seguro:
```bash
ssh agenda@150.165.130.3 "./agenda-prg/atualizar-agenda.sh"
```
**O que este script faz sozinho no servidor:**
1. Cria um backup íntegro a quente do banco SQLite de produção em `/home/agenda/agenda-prg/backups/agenda_DATA_HORA.db`.
2. Cria uma tag Git (`backup-antes-deploy-DATA_HORA`) guardando o estado anterior exato.
3. Puxa do GitHub as atualizações que você acabou de enviar (`git pull --ff-only origin main`).
4. Reinicia apenas o processo `agenda-prg` (porta `3001`) no PM2 do usuário `agenda`.
5. Testa automaticamente `http://127.0.0.1:3001/api/health`. Se houver qualquer falha, **ele desfaz a atualização sozinho** na mesma hora.

---

## 4. Botão de Pânico: Como Reverter em Caso de Problema (Rollback)

Se após atualizar o servidor você notar que algo visual ou funcional não ficou como esperado, basta rodar da sua máquina **apenas o comando de reversão**:
```bash
ssh agenda@150.165.130.3 "./agenda-prg/reverter-agenda.sh"
```
*(Volta o código imediatamente para a versão anterior ao último deploy e reinicia a Agenda em 2 segundos, mantendo os agendamentos salvos).*

Para voltar o código **e também** restaurar o banco SQLite ao backup criado imediatamente antes do deploy:
```bash
ssh agenda@150.165.130.3 "./agenda-prg/reverter-agenda.sh --com-banco"
```
