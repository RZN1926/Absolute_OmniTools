# 🧰 TOOLBOX — Универсальный арсенал

Полнофункциональный веб-инструментарий с Express-бэкендом.

## ⚡ Быстрый старт

```bash
npm install
npm start
# Открой: http://localhost:3000
```

## 🛠 Инструменты

| Раздел | Что умеет |
|---|---|
| 📝 **Текст** | Статистика, регистр, замена (RegEx), slug, транслит |
| 🔀 **Diff** | Построчное сравнение двух текстов (LCS алгоритм) |
| 📄 **Markdown** | Редактор с live-превью, тулбар, экспорт MD/HTML |
| 🎨 **CSS Gen** | Gradient, Box Shadow, Text Shadow, Border Radius, Glassmorphism, Neumorphism, Animation, Filter |
| 🔄 **Конвертер** | JSON↔CSV, MD→HTML, форматирование JSON, загрузка файлов |
| ⬇️ **Загрузчик** | Команды для yt-dlp, spotdl, gallery-dl |
| 🔐 **Encode** | Base64, URL encode/decode, MD5/SHA хэши |
| 🎲 **Генераторы** | Пароли, UUID, случайные числа, Lorem Ipsum |
| 🌈 **Цвет** | HEX↔RGB↔HSL, палитры (5 типов гармонии) |
| 📱 **QR-код** | Ссылки, WiFi, Email, SMS |
| 📏 **Единицы** | Длина, вес, температура, скорость, площадь, данные |
| 💾 **Сниппеты** | Сохранение текстов через REST API |

## 🔌 API Endpoints

```
GET  /api/health                — статус сервера
POST /api/hash                  — MD5/SHA хэши (Node crypto)
POST /api/diff                  — diff двух текстов (LCS)
GET  /api/snippets              — список сниппетов
POST /api/snippets              — создать сниппет
GET  /api/snippets/:id          — получить сниппет
PUT  /api/snippets/:id          — обновить сниппет
DELETE /api/snippets/:id        — удалить сниппет
POST /api/convert/json-csv      — JSON → CSV (сервер)
POST /api/convert/csv-json      — CSV → JSON (сервер)
POST /api/convert/file          — конвертация файла (multipart)
```

## 📦 Зависимости

- **express** — HTTP сервер
- **multer** — загрузка файлов
- **cors** — CORS headers

## 🔧 Конфигурация

```bash
PORT=8080 npm start   # другой порт
```
