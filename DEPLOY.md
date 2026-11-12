# Guia de Atualização e Operação — Agenda PRG (`sisinfra.ufpb.br/agenda/`)

Este guia explica como rodar a **Agenda de Espaços Acadêmicos da PRG** no seu computador, como funcionam o banco de dados **SQLite** e a proteção contra conflitos de horário, e como publicar atualizações no servidor da UFPB com segurança total.

---

## 1. O que foi configurado na arquitetura (Mapa de Alterações)

1. **Banco de Dados Relacional Real (SQLite):**
   - Antes, os dados ficavam salvos apenas no navegador de cada pessoa (`localStorage`) ou dependiam de configuração futura no Firebase.
   - Agora, o arquivo `server.js` usa o banco relacional nativo do Node.js 22 (`node:sqlite`), gravando tudo em `dados/agenda.db` no servidor (`https://sisinfra.ufpb.br/agenda/`).
   - As **102 salas e auditórios da PRG**, os **calendários letivos (2026.2, 2027.1 e 2027.2)** e os **agendamentos** ficam centralizados no servidor: qualquer reserva ou aprovação feita na PRG aparece imediatamente para todos os usuários.
2. **Trava de Conflito de Horário no Servidor:**
   - Quando duas pessoas tentam reservar o mesmo auditório/sala no mesmo dia e horário ao mesmo tempo, o banco abre uma transação atômica (`BEGIN IMMEDIATE`), grava a primeira e recusa a segunda (`HTTP 409 - Conflito de Horário`).
3. **Autenticação Segura (`scrypt` + Token HMAC):**
   - As senhas dos operadores e administradores são protegidas com hash criptográfico `scrypt` no banco SQLite, e as ações de gestão exigem token de sessão validado no `server.js`.
4. **Isolamento Total:**
   - A Agenda roda na porta interna `127.0.0.1:3001`, em um usuário Linux exclusivo (`agenda`), na pasta `/home/agenda/agenda-prg`.
   - O banco de dados (`dados/agenda.db`) **não vai para o GitHub** (está protegido no `.gitignore`), garantindo que uma atualização de tela ou código nunca apague os agendamentos já cadastrados no servidor.

### Resumo dos Arquivos: O que é Novo, o que foi Adaptado e o que é Legado Firebase

| Categoria | Arquivos | Função / Observação |
|---|---|---|
| **1. Arquivos Novos (Back-end, Banco e Automação)** | `server.js`, `package.json`, `.gitignore`, `.gitattributes`, `atualizar-agenda.sh`, `reverter-agenda.sh`, `DEPLOY.md`, `CLAUDE.md` | Servidor Node.js 22, banco SQLite (`dados/agenda.db`), trava anti-conflito e scripts de deploy/rollback seguros. |
| **2. Arquivos Originais Adaptados** | `js/storage.js`, `js/auth.js` | Conectados à API REST (`./api/...`) do `server.js` para ler e gravar no SQLite (mantendo `localStorage` apenas como *fallback* offline). |
| **3. Front-end Original Intocado** | `index.html`, `admin.html`, `css/styles.css`, `js/app.js`, `js/admin.js`, `js/sisinfra-data.js`, `js/email-service.js` | Interface institucional, catálogo das 102 salas e regras visuais originais. |
| **4. Resquícios Legados do Firebase (Inativos)** | `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `js/firebase-config.js` e referências em `index.html` (linhas 36–39, 157–160, 871–906 e 1407) | **Mantidos intencionalmente** para que o autor original reconheça toda a estrutura que criou. **Estão inativos** (pois o banco oficial agora é o SQLite) e podem ser removidos quando desejar. |

---

## 2. Como rodar e testar no seu computador

No terminal, dentro da pasta do projeto, execute:

```bash
node --no-warnings server.js
```

Abra no navegador:
- **Página Pública / Calendário:** `http://localhost:3001`
- **Painel Administrativo:** `http://localhost:3001/admin.html`

> Na primeira vez que rodar, a pasta `dados/agenda.db` será criada automaticamente já com as 102 salas da PRG e os bloqueios de semestre letivo.

---

## 3. Como enviar atualizações para o servidor (`sisinfra.ufpb.br/agenda/`)

Sempre que você (ou sua IA assistente) fizer uma melhoria nas telas ou regras da Agenda:

### Passo 1 — Salvar e enviar para o GitHub (no seu computador)
```bash
git add .
git commit -m "feat: descricao da atualizacao"
git push origin main
```

### Passo 2 — Atualizar o servidor da UFPB (com a VPN da UFPB ligada)
Rode este único comando no terminal:
```bash
ssh agenda@150.165.130.3 "./agenda-prg/atualizar-agenda.sh"
```

### O que o `atualizar-agenda.sh` faz automaticamente por você:
1. **Backup do banco SQLite:** Cria uma cópia íntegra a quente do banco em `/home/agenda/agenda-prg/backups/agenda_DATA_HORA.db`.
2. **Ponto de retorno no Git:** Marca o código anterior com uma tag `backup-antes-deploy-DATA_HORA`.
3. **Baixa o código novo:** Executa `git pull` do GitHub.
4. **Reinicia a Agenda:** Reinicia apenas o processo `agenda-prg` na porta `3001`.
5. **Teste automático de saúde:** Confere se a Agenda respondeu `OK` em `http://127.0.0.1:3001/api/health`. Se houver qualquer erro no código novo, ele **desfaz a atualização sozinho** na mesma hora.

---

## 4. Botão de Pânico: como desfazer uma atualização

Se você atualizar a Agenda e perceber que algum botão ou tela não ficou como queria, basta rodar:

```bash
ssh agenda@150.165.130.3 "./agenda-prg/reverter-agenda.sh"
```

Isso volta o código imediatamente para a versão anterior ao último deploy e reinicia a Agenda em 2 segundos, **mantendo todos os agendamentos salvos no banco**.

Se além de voltar o código você também quiser restaurar o banco SQLite para o backup tirado antes do deploy:

```bash
ssh agenda@150.165.130.3 "./agenda-prg/reverter-agenda.sh --com-banco"
```

---

## 5. Comandos úteis de consulta no servidor

- **Ver se a Agenda está online e quanta memória usa:**
  ```bash
  ssh agenda@150.165.130.3 "~/pm2-runtime/node_modules/.bin/pm2 status"
  ```
- **Ver as últimas 30 linhas de log da Agenda:**
  ```bash
  ssh agenda@150.165.130.3 "~/pm2-runtime/node_modules/.bin/pm2 logs agenda-prg --lines 30 --nostream"
  ```
- **Listar os backups automáticos do banco SQLite:**
  ```bash
  ssh agenda@150.165.130.3 "ls -lh ~/agenda-prg/backups/"
  ```
