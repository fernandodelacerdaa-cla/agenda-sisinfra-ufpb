#!/usr/bin/env bash
# ==============================================================================
# atualizar-agenda.sh — Atualização Segura da Agenda PRG (UFPB)
# ==============================================================================
# O que este script faz:
#   1. Garante que está rodando apenas com o usuário isolado 'agenda'.
#   2. Faz backup íntegro a quente (VACUUM INTO) do banco SQLite (dados/agenda.db).
#   3. Cria uma tag Git ("botão de pânico") com o estado exato antes de atualizar.
#   4. Puxa as novidades do GitHub (git pull --ff-only origin main).
#   5. Reinicia apenas o processo 'agenda-prg' (porta 3001).
#   6. Verifica a saúde de http://127.0.0.1:3001/api/health; se falhar, reverte sozinho.
# ==============================================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

CURRENT_USER="$(whoami)"
if [ "$CURRENT_USER" = "root" ] || [ "$CURRENT_USER" = "sisinfra" ]; then
  echo "[ERRO DE SEGURANÇA] Este script NUNCA deve ser executado por '$CURRENT_USER'."
  echo "Execute exclusivamente como usuário 'agenda': ssh agenda@150.165.130.3 ./agenda-prg/atualizar-agenda.sh"
  exit 1
fi

if [ -x "$HOME/pm2-runtime/node_modules/.bin/pm2" ]; then
  PM2_BIN="$HOME/pm2-runtime/node_modules/.bin/pm2"
elif [ -x "$APP_DIR/node_modules/.bin/pm2" ]; then
  PM2_BIN="$APP_DIR/node_modules/.bin/pm2"
else
  PM2_BIN="pm2"
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$APP_DIR/backups"
DB_FILE="$APP_DIR/dados/agenda.db"
mkdir -p "$BACKUP_DIR"

echo "============================================================"
echo " Iniciando atualização segura da Agenda PRG ($TIMESTAMP)"
echo "============================================================"

# 1. Backup íntegro do banco SQLite (VACUUM INTO via node:sqlite)
if [ -f "$DB_FILE" ]; then
  BACKUP_DB="$BACKUP_DIR/agenda_${TIMESTAMP}.db"
  echo "[1/5] Criando backup íntegro do banco SQLite em: backups/agenda_${TIMESTAMP}.db ..."
  node --no-warnings -e "
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(process.argv[1]);
    db.exec('PRAGMA busy_timeout = 5000;');
    const dest = process.argv[2].replace(/'/g, \"''\");
    db.exec(\"VACUUM INTO '\" + dest + \"'\");
    db.close();
  " "$DB_FILE" "$BACKUP_DB"
  # Mantém os últimos 30 backups de banco para não acumular disco
  ls -1t "$BACKUP_DIR"/agenda_*.db 2>/dev/null | tail -n +31 | xargs -r rm -f
else
  echo "[1/5] Banco dados/agenda.db ainda não existe (será criado na subida)."
fi

# 2. Botão de pânico no Git (tag + registro do commit anterior)
PREV_COMMIT="$(git rev-parse --short HEAD)"
TAG_NAME="backup-antes-deploy-${TIMESTAMP}"
echo "$PREV_COMMIT" > "$BACKUP_DIR/ultimo_commit_estavel.txt"
echo "$TAG_NAME" > "$BACKUP_DIR/ultima_tag_estavel.txt"
git tag "$TAG_NAME"
echo "[2/5] Ponto de retorno criado: tag '$TAG_NAME' (commit $PREV_COMMIT)"

# 3. Atualizar código via Git
echo "[3/5] Baixando atualizações do GitHub (origin/main)..."
git fetch origin main
git pull --ff-only origin main
NEW_COMMIT="$(git rev-parse --short HEAD)"
echo "      Código atualizado: $PREV_COMMIT -> $NEW_COMMIT"

# 4. Reiniciar exclusivamente o processo da Agenda PRG (porta 3001)
echo "[4/5] Reiniciando processo 'agenda-prg' (porta 3001)..."
"$PM2_BIN" restart agenda-prg --update-env

# 5. Verificação automática de saúde (Health Check)
echo "[5/5] Verificando saúde da Agenda em http://127.0.0.1:3001/api/health ..."
HEALTH_OK=0
for i in 1 2 3 4 5; do
  sleep 1
  if curl -fsS --max-time 3 "http://127.0.0.1:3001/api/health" | grep -q '"ok":true'; then
    HEALTH_OK=1
    break
  fi
done

if [ "$HEALTH_OK" -eq 1 ]; then
  echo "============================================================"
  echo " SUCESSO! Agenda PRG atualizada e respondendo (commit $NEW_COMMIT)."
  echo " Se precisar desfazer: ./agenda-prg/reverter-agenda.sh"
  echo "============================================================"
else
  echo "[ALERTA] A Agenda não respondeu ao teste de saúde após a atualização!"
  echo "Acionando reversão automática para a tag '$TAG_NAME'..."
  "$APP_DIR/reverter-agenda.sh" "$TAG_NAME"
  exit 1
fi
