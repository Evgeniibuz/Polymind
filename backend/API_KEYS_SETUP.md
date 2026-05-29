# Polymind — Инструкция по API-ключам

Полное руководство: где взять каждый ключ, сколько стоит, и куда вставить в `.env`.

> **Главное правило:** Polymind работает **без единого ключа** в режиме paper-trading с demo-данными.
> Добавляй ключи по одному — каждый включает свой источник данных. Начни с двух
> самых важных (Anthropic + Polymarket), остальное докинешь позже.

---

## Сводная таблица приоритетов

| Приоритет | Сервис | Что даёт | Стоимость на старте | Обязателен? |
|-----------|--------|----------|---------------------|-------------|
| 🔴 1 | **AI-провайдер** (DeepSeek / Claude / OpenAI) | AI-reasoning, расчёт вероятностей | DeepSeek ~$1–5/мес | Да, для AI |
| 🔴 2 | **Polymarket** | Рынки + цены + торговля | Бесплатно (чтение) | Да |
| 🟡 3 | **OpenAI** | Embeddings (дедуп, арбитраж) | ~$1–5/мес | Желательно |
| 🟡 4 | **Reddit** | Соц-сигналы | Бесплатно | Желательно |
| 🟡 5 | **News (RSS)** | Новости | Бесплатно | Уже работает |
| 🟢 6 | **Alchemy** | Onchain (Polygon) | Бесплатно (free tier) | Опционально |
| 🟢 7 | **Telegram** | Соц-сигналы из каналов | Бесплатно | Опционально |
| 🟢 8 | **Kalshi** | 2-й рынок, арбитраж | Бесплатно | Опционально |
| 🟢 9 | **Google OAuth** | Вход через Gmail | Бесплатно | Опционально |
| 🔵 10 | **Twitter/X** | Соц-сигналы из X | $$ дорого (см. ниже) | Опционально |

---

## 🔴 1. AI-провайдер (мозг системы) — на выбор

**Зачем:** считает «настоящую» вероятность события и пишет reasoning («почему рынок ошибается»).

Polymind поддерживает **3 провайдера** — переключаются одной строкой `AI_PROVIDER` в `.env`.
Логика, промпты и JSON-парсинг одинаковые, меняется только бэкенд.

| Провайдер | Модель | Цена (вход/выход за 1M токенов) | Когда выбрать |
|-----------|--------|-------------------------------|---------------|
| **DeepSeek** ⭐ | `deepseek-v4-flash` | ~$0.14 / $0.28 | Дёшево, отличное соотношение цена/качество |
| **DeepSeek Pro** | `deepseek-v4-pro` | ~$1.74 / $3.48 | Сильнее reasoning, всё ещё дешевле Claude |
| **Anthropic** | `claude-sonnet-4-5` | ~$3 / $15 | Максимальное качество reasoning |
| **OpenAI** | `gpt-4o-mini` | ~$0.15 / $0.60 | Если уже есть OpenAI-ключ |

> 💡 **Рекомендация для старта:** DeepSeek `deepseek-v4-flash`. Он в ~20 раз дешевле Claude,
> а для задачи «оцени вероятность + верни JSON» качества более чем достаточно. Реальные
> затраты — **$1–5/мес** вместо $5–50.

---

### Вариант A — DeepSeek (рекомендуется, дёшево)

1. Зайди на https://platform.deepseek.com
2. Зарегистрируйся → **API Keys → Create new API key**
3. Скопируй ключ (`sk-...`)
4. Пополни баланс (минимум ~$2, хватит надолго)

**В `.env`:**
```
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

> ⚠️ Не используй старые имена `deepseek-chat` / `deepseek-reasoner` — их отключают
> 24 июля 2026. Только `deepseek-v4-flash` или `deepseek-v4-pro`.

---

### Вариант B — Anthropic (Claude)

1. https://console.anthropic.com → **Settings → API Keys → Create Key**
2. Скопируй ключ (`sk-ant-...`)
3. Пополни баланс: **Settings → Billing** (минимум $5)

**В `.env`:**
```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
ANTHROPIC_MODEL=claude-sonnet-4-5
```

---

### Вариант C — OpenAI

1. https://platform.openai.com → **API keys → Create new secret key**
2. Пополни баланс: **Settings → Billing**

**В `.env`:**
```
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
OPENAI_CHAT_MODEL=gpt-4o-mini
```

> **Важно:** какой бы провайдер ты ни выбрал для reasoning, ключ **OpenAI всё равно нужен
> для embeddings** (дедупликация + арбитраж) — см. пункт 3. Embeddings у OpenAI стоят копейки.
> Если выбрал `AI_PROVIDER=openai`, один ключ покрывает и reasoning, и embeddings.

---

## 🔴 2. Polymarket — рынки и торговля

**Зачем:** основной источник рынков, цен и исполнения сделок.

### Чтение (бесплатно, ключ не нужен)
Gamma API (список рынков, цены) работает **без ключа**. Уже настроено:
```
POLYMARKET_GAMMA_URL=https://gamma-api.polymarket.com
POLYMARKET_CLOB_URL=https://clob.polymarket.com
```
Этого достаточно, чтобы видеть рынки, сигналы и mispricing.

### Торговля (нужен кошелёк)
Чтобы бот реально открывал позиции — нужен приватный ключ кошелька на Polygon.

1. Создай кошелёк (Metamask / Phantom с поддержкой Polygon)
2. Заведи на Polymarket: https://polymarket.com → Connect → пополни USDC на Polygon
3. Получи **proxy-адрес** (Polymarket создаёт его автоматически при первом депозите)
4. Экспортируй приватный ключ кошелька

**В `.env`:**
```
POLYMARKET_PRIVATE_KEY=0xтвой_приватный_ключ
POLYMARKET_FUNDER=0xтвой_proxy_адрес
```

> ⚠️ **Безопасность:** приватный ключ = полный доступ к деньгам. Используй **отдельный**
> кошелёк только для бота, держи там ограниченную сумму. Никогда не коммить `.env` в git
> (он уже в `.gitignore`). На Railway добавляй ключ только через защищённые Variables.

> Без этих двух переменных система работает в **paper-режиме** — сделки симулируются,
> деньги не двигаются. Идеально для тестов.

---

## 🟡 3. OpenAI — embeddings

**Зачем:** превращает тексты в векторы для дедупликации новостей и **cross-market арбитража**
(находит одинаковые события на Polymarket и Kalshi).

**Где взять:**
1. https://platform.openai.com → **API keys → Create new secret key**
2. Пополни баланс: **Settings → Billing** ($5 хватит надолго)

**Цена:** модель `text-embedding-3-small` — **$0.02 за 1M токенов**. Реально **$1–5/мес**.

**В `.env`:**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## 🟡 4. Reddit — бесплатные соц-сигналы

**Зачем:** мониторит r/wallstreetbets, r/cryptocurrency, r/PredictionMarkets и др.

**Где взять:**
1. https://www.reddit.com/prefs/apps → **Create another app**
2. Тип: выбери **script**
3. Заполни name (например `polymind`), redirect uri: `http://localhost:8000`
4. Скопируй **client ID** (под названием приложения) и **secret**

**Цена:** бесплатно (100 запросов/мин).

**В `.env`:**
```
REDDIT_CLIENT_ID=xxxxxxxx
REDDIT_CLIENT_SECRET=xxxxxxxxxxxx
REDDIT_USER_AGENT=polymind/0.1 by /u/твой_ник
```

---

## 🟡 5. News (RSS) — уже работает бесплатно

8 RSS-фидов (Reuters, Bloomberg, WSJ, CoinDesk, Politico…) парсятся **без ключа**.
Ничего настраивать не нужно.

### Опционально — NewsAPI (больше покрытия)
1. https://newsapi.org → **Get API Key** (бесплатный tier: 100 запросов/день, только для разработки)
2. Для коммерции нужен платный план (~$449/мес) — на старте **не нужен**, RSS хватает.

**В `.env`:**
```
NEWSAPI_KEY=xxxxxxxxxxxx   # оставь пустым — RSS работает и так
```

---

## 🟢 6. Alchemy — onchain (whale tracking)

**Зачем:** отслеживает крупные кошельки на Polygon (Polymarket settle-ится там).

**Где взять:**
1. https://www.alchemy.com → Sign up
2. **Create App** → Chain: **Polygon**, Network: **Mainnet**
3. Скопируй **HTTPS URL** из вкладки API Key

**Цена:** бесплатный tier (300M запросов/мес) — с головой на старте.

**В `.env`:**
```
ALCHEMY_POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/твой_ключ
```

> Примечание: whale-трекинг сейчас в виде каркаса (`onchain.py`). Ключ подготовит почву,
> но полная логика подписки на CTF-события дописывается отдельно (см. README backend).

---

## 🟢 7. Telegram — соц-сигналы из каналов

**Зачем:** читает публичные каналы (WatcherGuru, tier10k и др).

**Где взять (2 шага):**

**Шаг А — API credentials:**
1. https://my.telegram.org → войди по номеру телефона
2. **API development tools** → создай приложение
3. Скопируй **api_id** (число) и **api_hash**

**Шаг Б — session string (одноразово):**
1. Заполни в `.env`: `TELEGRAM_API_ID` и `TELEGRAM_API_HASH`
2. Запусти локально: `python -m scripts.telegram_login`
3. Введи номер телефона + код из Telegram
4. Скрипт напечатает **session string** — вставь его в `TELEGRAM_SESSION`

**Цена:** бесплатно.

**В `.env`:**
```
TELEGRAM_API_ID=1234567
TELEGRAM_API_HASH=xxxxxxxxxxxx
TELEGRAM_SESSION=1ApWap...длинная_строка
```

---

## 🟢 8. Kalshi — второй рынок для арбитража

**Зачем:** второй источник цен → детектор cross-market арбитража (одно событие, разные цены).

**Где взять:**
1. https://kalshi.com → зарегистрируйся (нужен US-аккаунт / верификация)
2. Используй email + пароль аккаунта (простой режим, уже поддержан)

**Цена:** бесплатно для чтения.

**В `.env`:**
```
KALSHI_BASE_URL=https://trading-api.kalshi.com/trade-api/v2
KALSHI_EMAIL=твой@email.com
KALSHI_PASSWORD=твой_пароль
```

> Если Kalshi недоступен в твоём регионе — пропусти. Арбитраж просто не будет
> находить пары, остальное работает.

---

## 🟢 9. Google OAuth — вход через Gmail

**Зачем:** кнопка «Continue with Google» на экране подключения.

**Где взять:**
1. https://console.cloud.google.com → создай проект
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. Тип: **Web application**
4. Authorized JavaScript origins: добавь URL фронта (`http://localhost:8080`, твой домен)
5. Скопируй **Client ID** и **Client Secret**

**Цена:** бесплатно.

**В `.env` (backend):**
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx
```

**Во фронте** (в `polymind.html`, блок конфига вверху):
```js
window.POLYMIND_GOOGLE_CLIENT_ID = "xxxxx.apps.googleusercontent.com";
```

> Без этого кнопка Google работает в demo-режиме (пускает без реальной авторизации).
> Phantom-вход работает полноценно без Google.

---

## 🔵 10. Twitter / X — дорого, добавляй последним

**⚠️ Важное обновление 2026:** X убрал старые тарифы Basic ($200) / Pro ($5000) для новых
пользователей. Теперь **pay-per-use**: ~**$0.005 за чтение поста**, кэп 2M чтений/мес.
Старые фиксированные тарифы доступны только legacy-подписчикам.

**Где взять:**
1. https://developer.x.com → Sign up, создай проект и App
2. В разделе **Keys and tokens** скопируй **Bearer Token**
3. Пополни баланс кредитов в Developer Console

**Цена:** pay-per-use. При активном сканировании это **десятки–сотни $/мес**.

**Дешёвые альтернативы** (сторонние провайдеры данных X, ~$0.05 за 1000 твитов):
GetXAPI, TweetAPI, Zernio. Можно подключить вместо официального API, изменив
`integrations/twitter.py`.

**В `.env`:**
```
TWITTER_BEARER_TOKEN=AAAAAAAAxxxxxxxxxxxx
```

> **Рекомендация:** запусти Polymind без Twitter. Reddit + News + Telegram + onchain дают
> мощный сигнал бесплатно. Twitter добавишь, когда проект начнёт зарабатывать.

---

## Минимальный старт (рекомендуемый)

Чтобы увидеть реальные данные с минимальными затратами (~$5–10/мес):

```env
# .env — минимальный рабочий набор
SECRET_KEY=сгенерируй_32_случайных_байта
JWT_SECRET=сгенерируй_ещё_32_байта
DATABASE_URL=postgresql+asyncpg://...   # Railway даёт автоматически
REDIS_URL=redis://...                    # Railway даёт автоматически

ANTHROPIC_API_KEY=sk-ant-...            # 🔴 главный — AI reasoning
# Или дешевле — DeepSeek:
#   AI_PROVIDER=deepseek
#   DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-proj-...              # 🟡 embeddings (дёшево, нужно для арбитража)
REDDIT_CLIENT_ID=...                     # 🟡 бесплатно
REDDIT_CLIENT_SECRET=...

# Polymarket чтение работает без ключей.
# Торговля = paper-режим, пока не добавишь POLYMARKET_PRIVATE_KEY.
```

Сгенерировать секреты:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Куда вставлять на Railway

1. Зайди в свой сервис на Railway → вкладка **Variables**
2. Добавь каждую переменную из `.env` (кроме `DATABASE_URL`/`REDIS_URL` — их Railway
   подставляет сам при добавлении плагинов Postgres + Redis)
3. Сделай это **и для сервиса `api`, и для сервиса `worker`** — они оба читают одни переменные

---

## Чек-лист «всё работает»

- [ ] `GET /health` → `{"status":"ok"}`
- [ ] `GET /ready` → database: true, redis: true
- [ ] `GET /api/v1/markets` → список рынков Polymarket (значит Gamma работает)
- [ ] Через 3–5 мин после старта worker: `GET /api/v1/signals` → появились сигналы (значит Claude работает)
- [ ] На фронте кнопка **Connect → Phantom** проходит и пускает в терминал
- [ ] В терминале баннер «demo data» исчез — значит фронт видит бэкенд
