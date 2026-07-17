# RSVP-функция (Yandex Cloud)

Приём ответов формы и отправка в Telegram. Заменяет Cloudflare Worker: домен
`functions.yandexcloud.net` доступен в РФ без VPN (в отличие от `workers.dev`).

Контракт запроса — тот же, что у прежнего воркера в `../rsvp-worker`. Отличие только
в адресе: сайт шлёт POST **прямо на URL функции** (без суффикса `/rsvp`).

## Что нужно один раз

1. Завести Yandex Cloud, создать облако и каталог, включить биллинг (есть грант на старте).
2. Создать Telegram-бота у @BotFather → получить `TG_BOT_TOKEN`.
   Узнать свой chat id (напр. через @userinfobot) → `TG_CHAT_ID` (несколько — через запятую).

## Деплой через yc CLI

```bash
# установка CLI: https://yandex.cloud/docs/cli/quickstart
yc init                       # авторизация, выбор cloud/folder

cd rsvp-fn
TG_BOT_TOKEN=xxxxx TG_CHAT_ID=111,222 ./deploy.sh
```

Скрипт создаст функцию `rsvp-fn`, выложит код, задаст секреты в переменные окружения,
сделает функцию публичной и напечатает URL вида
`https://functions.yandexcloud.net/<id>`.

## Деплой через консоль (без CLI)

1. Cloud Functions → «Создать функцию» → runtime **Node.js 18**.
2. Загрузить файлы `index.js` и `package.json`, точка входа `index.handler`.
3. Параметры версии: память 128 МБ, таймаут 10 с; переменные окружения
   `TG_BOT_TOKEN`, `TG_CHAT_ID`.
4. Вкладка «Обзор» → сделать функцию **публичной** (вызов без авторизации).
5. Скопировать URL для вызова.

## После деплоя

Вписать полученный URL в `site/src/data/wedding.ts` → `rsvpEndpoint` и задеплоить сайт.
Проверка «жив ли» без спама в Telegram (honeypot-ветка отвечает 200 и ничего не шлёт):

```bash
curl -i -X POST '<URL>' -H 'Content-Type: application/json' \
  -H 'Origin: https://bshom1e.github.io' \
  -d '{"guest":null,"name":"","attending":false,"guestsCount":1,"people":[],"website":"bot"}'
```
