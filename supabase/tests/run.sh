#!/usr/bin/env bash
# Tests the migration + security rules on a local Postgres (no Supabase needed).
# Usage: PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -v ON_ERROR_STOP=1 -q -t"
$P -d postgres -c "drop database if exists ftc_grants_test" -c "create database ftc_grants_test"
$P -d ftc_grants_test -f supabase/tests/supabase_stubs.sql
for f in supabase/migrations/*.sql; do $P -d ftc_grants_test -f "$f"; done
$P -d ftc_grants_test -f supabase/tests/rls_test.sql 2>&1 | grep -v '^\s*$' | sed -E 's/^psql:[^:]+:[0-9]+: //'
