#!/bin/bash
set -euo pipefail
echo "Importando mysticalcut-db..."
PASS="${MYSQL_ROOT_PASSWORD:-$MARIADB_ROOT_PASSWORD}"
sed 's/DEFINER=`[^`]*`@`[^`]*`//g' /sql/mysticalcut-db.sql | mariadb -uroot -p"$PASS"
echo "Base importada."
