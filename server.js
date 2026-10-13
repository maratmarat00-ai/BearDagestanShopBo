
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

let pageviews = 0;
const visitors = new Set();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    telegramConfigured: Boolean(BOT_TOKEN && ADMIN_CHAT_ID)
  });
});

app.post('/api/visit', (req, res) => {
  pageviews += 1;

  let id = req.headers['x-bear-visitor'];

  if (!id) {
    id = crypto.randomUUID();
    res.setHeader(
      'Set-Cookie',
      `bear_vid=${id}; Max-Age=31536000; Path=/; SameSite=Lax; HttpOnly`
    );
  }

  visitors.add(String(id));

  const cookie = (req.headers.cookie || '').match(
    /(?:^|; )bear_vid=([^;]+)/
  );

  if (cookie) visitors.add(cookie[1]);

  res.json({ ok: true });
});

app.get('/api/stats', (_req, res) => {
  res.json({
    pageviews,
    visitors: visitors.size
  });
});

app.post('/api/order', async (req, res) => {
  const body = req.body || {};

  const product = String(body.product || '').trim();
  const name = String(body.name || '').trim();

  // Сайт передаёт телефон в поле phone.
  const contact = String(
    body.contact || body.phone || ''
  ).trim();

  const message = String(body.message || '').trim();

  if (!product || !name || !contact) {
    return res.status(400).json({
      error: 'Заполните товар, имя и контакт'
    });
  }

  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error(
      'Не настроены BOT_TOKEN или ADMIN_CHAT_ID'
    );

    return res.status(503).json({
      error: 'Уведомления Telegram не настроены на сервере'
    });
  }

  const text = [
    '🟢 НОВЫЙ ЗАКАЗ BEAR',
    '',
    '🏹 Товар и количество:',
    product,
    '',
    '👤 Имя: ' + name,
    '📲 Контакт: ' + contact,
    '💬 Комментарий: ' + (message || '—')
  ].join('\n');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error(
        'Ошибка Telegram:',
        data.description || response.status
      );

      return res.status(502).json({
        error: 'Telegram не принял заказ. Проверьте настройки бота.'
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error(
      'Ошибка соединения с Telegram:',
      error.message
    );

    return res.status(502).json({
      error: 'Не удалось связаться с Telegram. Попробуйте ещё раз.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`BEAR server listening on ${PORT}`);
});
