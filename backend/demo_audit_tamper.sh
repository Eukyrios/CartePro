#!/usr/bin/env bash
# La demonstration du jeudi 9h, telle que decrite dans le mail de Vignal :
# sur une copie jetable de la base, jamais sur celle presentee l'apres-midi.
#
#   1. Verification sur la chaine intacte -> conforme.
#   2. Alteration d'un enregistrement, avec l'utilisateur PRIVILEGIE (postgres) :
#      l'utilisateur applicatif n'a plus le droit d'UPDATE/DELETE sur
#      audit_log depuis `provision_postgres.py`.
#   3. Reverification -> designe l'enregistrement exact.
#   4. Meme chose avec une suppression, sur une seconde copie fraiche.
#
# Prealables (une fois) : `docker compose up -d postgres`, un `.env` rempli
# (voir backend/.env.example), puis :
#   python backend/provision_postgres.py
#   python backend/migrate_sqlite_to_postgres.py
#
# Usage : backend/demo_audit_tamper.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
set -a
[ -f backend/.env ] && source backend/.env
set +a

: "${AUDIT_EXPORT_HMAC_KEY:?AUDIT_EXPORT_HMAC_KEY manquante — remplir backend/.env}"
: "${CARTEPRO_APP_DB_PASSWORD:?CARTEPRO_APP_DB_PASSWORD manquante — remplir backend/.env}"

CONTAINER=cartepro-postgres
# Doit correspondre a POSTGRES_PASSWORD dans docker-compose.yml.
PGSUPERPW="${DEMO_SUPERUSER_PASSWORD:-postgres-superuser-dev-only}"
# Le compte d'administration seme par `seed.py` (DEMO_ADMIN_EMAIL,
# DEMO_PASSWORD) — celui-la meme que le README publie en clair. Ce n'est donc
# pas un secret qu'on expose ici, c'est la valeur qui rend la demonstration
# executable en une commande. Les deux se surchargent si la base demontree
# n'est pas celle du seed.
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@administration.example}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-CartePro2026}"
APP_PORT=5099

VENV_PY="$ROOT/backend/venv/bin/python"
[ -x "$VENV_PY" ] || VENV_PY="$ROOT/backend/.venv-1/bin/python"
[ -x "$VENV_PY" ] || VENV_PY="python3"

OUT_DIR="$ROOT/backend/demo_output"
mkdir -p "$OUT_DIR"

psql_super() {
  docker exec -e PGPASSWORD="$PGSUPERPW" -i "$CONTAINER" psql -U postgres "$@"
}

cloner_base() {
  local nom_base="$1"
  echo "-- Clonage de « cartepro » vers « ${nom_base} » (copie jetable) --"
  psql_super -d postgres -c "DROP DATABASE IF EXISTS ${nom_base};" >/dev/null
  psql_super -d postgres -c "CREATE DATABASE ${nom_base};" >/dev/null
  docker exec -e PGPASSWORD="$PGSUPERPW" -i "$CONTAINER" pg_dump -U postgres -d cartepro \
    | docker exec -e PGPASSWORD="$PGSUPERPW" -i "$CONTAINER" psql -U postgres -d "${nom_base}" -q >/dev/null
  echo "Base « ${nom_base} » prete, roles et privileges (dont le REVOKE) inclus."
}

demarrer_app() {
  local nom_base="$1"
  (
    cd "$ROOT/backend" && \
    TICKET_TOUT_DATABASE_URI="postgresql+psycopg2://cartepro_app:${CARTEPRO_APP_DB_PASSWORD}@localhost:5432/${nom_base}" \
    AUDIT_EXPORT_HMAC_KEY="$AUDIT_EXPORT_HMAC_KEY" \
    SECRET_KEY="${SECRET_KEY:-change-me-en-dev}" \
    JWT_SECRET_KEY="${JWT_SECRET_KEY:-change-me-en-dev}" \
    FLASK_RUN_PORT="$APP_PORT" \
      "$VENV_PY" -c "
import os
from app import create_app
app = create_app()
app.run(port=${APP_PORT})
"
  ) >"$OUT_DIR/app_${nom_base}.log" 2>&1 &
  APP_PID=$!
  for _ in $(seq 1 30); do
    curl -sf "http://127.0.0.1:${APP_PORT}/health" >/dev/null 2>&1 && return 0
    sleep 0.5
  done
  echo "L'application ne repond pas sur le port ${APP_PORT} — voir $OUT_DIR/app_${nom_base}.log" >&2
  exit 1
}

arreter_app() {
  kill "$APP_PID" >/dev/null 2>&1 || true
  wait "$APP_PID" 2>/dev/null || true
}

exporter_et_verifier() {
  local sortie_json="$1"
  local sortie_verdict="$2"
  local jeton
  jeton=$(curl -s -X POST "http://127.0.0.1:${APP_PORT}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    | "$VENV_PY" -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
  curl -s "http://127.0.0.1:${APP_PORT}/api/v1/admin/audit/export" \
    -H "Authorization: Bearer ${jeton}" -o "$sortie_json"
  AUDIT_EXPORT_HMAC_KEY="$AUDIT_EXPORT_HMAC_KEY" \
    "$VENV_PY" "$ROOT/backend/verify_audit.py" "$sortie_json" | tee "$sortie_verdict"
}

executer_un_cas() {
  local mode="$1"   # "modification" ou "suppression"
  local nom_base="demo_${mode}"

  echo
  echo "=================================================================="
  echo " CAS : ${mode}"
  echo "=================================================================="

  cloner_base "$nom_base"
  demarrer_app "$nom_base"
  trap arreter_app RETURN

  echo
  echo "-- 1. Verification sur la chaine intacte --"
  exporter_et_verifier "$OUT_DIR/${mode}_avant.json" "$OUT_DIR/${mode}_avant.txt"

  echo
  echo "-- 2. Alteration, connecte en utilisateur PRIVILEGIE (postgres) --"
  local total
  total=$(psql_super -d "$nom_base" -t -A -c "SELECT count(*) FROM audit_log;")
  local id_cible
  if [ "$mode" = "suppression" ]; then
    # Une suppression du DERNIER enregistrement de la chaine n'est PAS
    # detectable : rien, apres lui, ne peut signaler son absence. Ce n'est
    # pas un defaut du controle, c'est une propriete de tout chainage par
    # empreintes (git, blockchain : memes limites). D'ou l'avant-dernier
    # plutot que « au milieu » — et un garde explicite si la base n'a pas de
    # quoi le demontrer.
    if [ "$total" -lt 2 ]; then
      echo "REFUS : audit_log ne contient que ${total} enregistrement(s)." >&2
      echo "La suppression du dernier enregistrement d'une chaine n'est jamais detectable" >&2
      echo "(voir docs/audit-log/note.md, § limites) : il faut au moins 2 lignes pour" >&2
      echo "demontrer la suppression d'un enregistrement qui a un successeur." >&2
      return 1
    fi
    id_cible=$(psql_super -d "$nom_base" -t -A -c "SELECT id FROM audit_log ORDER BY id DESC OFFSET 1 LIMIT 1;")
  else
    id_cible=$(psql_super -d "$nom_base" -t -A -c \
      "SELECT id FROM audit_log ORDER BY id LIMIT 1 OFFSET (${total} / 2);")
  fi
  echo "Enregistrement cible : id=${id_cible} (sur ${total} au total)"

  if [ "$mode" = "modification" ]; then
    echo "Commande executee :"
    echo "  UPDATE audit_log SET ip = '203.0.113.66' WHERE id = ${id_cible};"
    psql_super -d "$nom_base" -c "UPDATE audit_log SET ip = '203.0.113.66' WHERE id = ${id_cible};"
  else
    echo "Commande executee :"
    echo "  DELETE FROM audit_log WHERE id = ${id_cible};"
    psql_super -d "$nom_base" -c "DELETE FROM audit_log WHERE id = ${id_cible};"
  fi

  # Preuve annexe : la meme commande, tentee avec l'utilisateur applicatif,
  # echoue — c'est le REVOKE de `provision_postgres.py` qui parle ici.
  echo
  echo "-- Preuve annexe : la meme commande avec l'utilisateur APPLICATIF --"
  PGPASSWORD="$CARTEPRO_APP_DB_PASSWORD" docker exec -e PGPASSWORD="$CARTEPRO_APP_DB_PASSWORD" -i "$CONTAINER" \
    psql -U cartepro_app -d "$nom_base" -c "DELETE FROM audit_log WHERE id = ${id_cible};" \
    || echo "(echec attendu : permission denied for table audit_log)"

  echo
  echo "-- 3. Reverification : doit designer l'enregistrement exact --"
  set +e
  exporter_et_verifier "$OUT_DIR/${mode}_apres.json" "$OUT_DIR/${mode}_apres.txt"
  set -e

  arreter_app
  trap - RETURN

  echo
  echo "Sorties ecrites dans $OUT_DIR/${mode}_avant.txt et ${mode}_apres.txt"
}

executer_un_cas "modification"
executer_un_cas "suppression"

echo
echo "=================================================================="
echo "Termine. A joindre au dossier :"
echo "  $OUT_DIR/modification_avant.txt / modification_apres.txt"
echo "  $OUT_DIR/suppression_avant.txt  / suppression_apres.txt"
echo "=================================================================="
