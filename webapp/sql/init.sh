#!/usr/bin/env bash

set -eux
cd $(dirname $0)

if [ "${ENV:-}" == "local-dev" ]; then
  exit 0
fi

if test -f /home/isucon/env.sh; then
	. /home/isucon/env.sh
fi

# MySQLを初期化
mysql -u"$DB_USER" \
		-p"$DB_PASSWORD" \
		--host "$DB_HOST" \
		--port "$DB_PORT" \
		"$DB_NAME" < 0-init.sql

mysql -u"$DB_USER" \
		-p"$DB_PASSWORD" \
		--host "$DB_HOST" \
		--port "$DB_PORT" \
		"$DB_NAME" < 1-schema.sql
