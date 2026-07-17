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

# yc --environment разбивает значение по запятым, поэтому:
#  1) каждую переменную передаём ОТДЕЛЬНЫМ флагом --environment;
#  2) запятые в списке chat id заменяем пробелами (функция понимает оба разделителя).
TG_CHAT_ID_SPACED="${TG_CHAT_ID//,/ }"

# Создаём функцию, если её ещё нет (ошибки создания больше не прячем).
if ! yc serverless function get --name "$FUNC" >/dev/null 2>&1; then
  echo "Создаю функцию $FUNC…"
  yc serverless function create --name "$FUNC"
fi

yc serverless function version create \
  --function-name "$FUNC" \
  --runtime nodejs18 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 10s \
  --source-path ./ \
  --environment "TG_BOT_TOKEN=${TG_BOT_TOKEN}" \
  --environment "TG_CHAT_ID=${TG_CHAT_ID_SPACED}"

# Делаем функцию публичной (гости вызывают без авторизации).
yc serverless function allow-unauthenticated-invoke "$FUNC"

FID=$(yc serverless function get --name "$FUNC" --format json | grep -o '"id": *"[^"]*"' | head -1 | sed 's/.*"id": *"//; s/"//')
echo
echo "Готово. URL функции:"
echo "  https://functions.yandexcloud.net/${FID}"
echo
echo "Пропиши его в site/src/data/wedding.ts → rsvpEndpoint"
