#!/usr/bin/env bash
# Деплой RSVP-функции в Yandex Cloud.
# Перед запуском: установлен и настроен yc CLI (yc init), выбраны cloud/folder.
# Секреты берём из окружения:
#   TG_BOT_TOKEN=xxx TG_CHAT_ID=111,222 ./deploy.sh
set -euo pipefail

FUNC=rsvp-fn
: "${TG_BOT_TOKEN:?нужно задать TG_BOT_TOKEN}"
: "${TG_CHAT_ID:?нужно задать TG_CHAT_ID}"

cd "$(dirname "$0")"

# Создаём функцию (идемпотентно) и публикуем новую версию из этой папки.
yc serverless function create --name "$FUNC" 2>/dev/null || true

yc serverless function version create \
  --function-name "$FUNC" \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 10s \
  --source-path ./ \
  --environment "TG_BOT_TOKEN=${TG_BOT_TOKEN},TG_CHAT_ID=${TG_CHAT_ID}"

# Делаем функцию публичной (гости вызывают без авторизации).
yc serverless function allow-unauthenticated-invoke "$FUNC"

FID=$(yc serverless function get --name "$FUNC" --format json | grep -o '"id": *"[^"]*"' | head -1 | sed 's/.*"id": *"//; s/"//')
echo
echo "Готово. URL функции:"
echo "  https://functions.yandexcloud.net/${FID}"
echo
echo "Пропиши его в site/src/data/wedding.ts → rsvpEndpoint"
