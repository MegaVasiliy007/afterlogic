# Тестовое задание Afterlogic
Веб сервер запускается на порте 8000.

В коде есть закоменченные console.log() для отслеживания запросов. Первая загрузка, после авторизации, занимает время на запросы и кэширование данных. Сессии авторизации и кэш сохраняются до перезагрузки ноды.

Автоматическое обновление данных происходит раз в 10 секунд. Интервал меняется в index.html в 44 строке.

Поддерживается мультипользовательность и мультидоменность в рамках описаного API.

## Установка
Я надеюсь на уже установленный node.js, в противном случае его можно найти по [ссылке](https://nodejs.org/).
```text
git clone https://github.com/MegaVasiliy007/afterlogic.git
cd afterlogic
npm i
npm run dev

open browser http://localhost:8000
```
