#!/usr/bin/env bash
# ==============================================================================
# reverter-agenda.sh — Botão de Pânico (Rollback Rápido da Agenda PRG)
# ==============================================================================
# Uso:
#   ./reverter-agenda.sh                  -> Volta o código para a última tag de backup
#   ./reverter-agenda.sh <tag_ou_commit>  -> Volta o código para a tag/commit informado
#   ./reverter-agenda.sh --com-banco      -> Volta o código E restaura o último backup do SQLite
# ==============================================================================

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

CURRENT_USER="$(whoami)"
if [ "$CURRENT_USER" = "root" ] || [ "$CURRENT_USER" = "sisinfra" ]; then
  echo "[ERRO DE SEGURANÇA] Este script NUNCA deve ser executado por '$CURRENT_USER'."
  echo "Execute exclusivamente como usuário 'agenda'."
  exit 1
fi

if [ -x "$HOME/pm2-runtime/node_modules/.bin/pm2" ]; then
  PM2_BIN="$HOME/pm2-runtime/node_modules/.bin/pm2"
elif [ -x "$APP_DIR/node_modules/.bin/pm2" ]; then
  PM2_BIN="$APP_DIR/node_modules/.bin/pm2"
else
  PM2_BIN="pm2"
fi

BACKUP_DIR="$APP_DIR/backups"
DB_FILE="$APP_DIR/dados/agenda.db"
RESTORE_DB=0
TARGET_REF=""

for arg in "$@"; do
  if [ "$arg" = "--com-banco" ]; then
    RESTORE_DB=1
  else
    TARGET_REF="$arg"
  fi
done

if [ -z "$TARGET_REF" ]; then
  if [ -f "$BACKUP_DIR/ultima_tag_estavel.txt" ]; then
    TARGET_REF="$(cat "$BACKUP_DIR/ultima_tag_estavel.txt")"
  else
    TARGET_REF="$(git tag -l 'backup-antes-deploy-*' --sort=-creatordate | head -n 1)"
  fi
fi

if [ -z "$TARGET_REF" ]; then
  echo "[ERRO] Nenhuma tag de backup encontrada para reverter."
  exit 1
fi

echo "============================================================"
echo " Revertendo Agenda PRG para: $TARGET_REF"
echo "============================================================"

# 1. Reverter código
git reset --hard "$TARGET_REF"

# 2. Se solicitado (--com-banco), restaurar o último backup do SQLite
if [ "$RESTORE_DB" -eq 1 ]; then
  LATEST_DB_BACKUP="$(ls -1t "$BACKUP_DIR"/agenda_*.db 2>/dev/null | head -n 1 || true)"
  if [ -n "$LATEST_DB_BACKUP" ] && [ -f "$LATEST_DB_BACKUP" ]; then
    echo "Parando agenda-prg temporariamente para restaurar o banco SQLite..."
    "$PM2_BIN" stop agenda-prg || true
    if [ -f "$DB_FILE" ]; then
      cp "$DB_FILE" "$BACKUP_DIR/agenda_antes_rollback_$(date +%Y%m%d_%H%M%S).db"
    fi
    rm -f "${DB_FILE}-wal" "${DB_FILE}-shm"
    cp "$LATEST_DB_BACKUP" "$DB_FILE"
    echo "Banco restaurado a partir de: $(basename "$LATEST_DB_BACKUP")"
  else
    echo "[AVISO] Nenhum arquivo de backup em backups/agenda_*.db encontrado. Mantendo banco atual."
  fi
fi

# 3. Reiniciar processo no PM2 local
"$PM2_BIN" restart agenda-prg --update-env

# 4. Verificar saúde
sleep 2
if curl -fsS --max-time 3 "http://127.0.0.1:3001/api/health" | grep -q '"ok":true'; then
  echo "============================================================"
  echo " ROLLBACK CONCLUÍDO! Agenda PRG voltou para $TARGET_REF e está online."
  echo "============================================================"
else
  echo "[ERRO] A Agenda foi revertida para $TARGET_REF, mas o teste de saúde falhou. Verifique: $PM2_BIN logs agenda-prg --lines 30"
  exit 1
fi
