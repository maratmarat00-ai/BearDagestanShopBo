const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/order', async (req, res) => {
  const { product, name, phone, message } = req.body || {};

  if (!product || !name || !phone) {
    return res.status(400).json({
      error: 'Заполните товар, имя и телефон'
    });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({
      error: 'BOT_TOKEN не настроен в Render'
    });
  }

  if (!ADMIN_CHAT_ID) {
    return res.status(500).json({
      error: 'ADMIN_CHAT_ID не настроен в Render'
    });
  }

  const text = [
    '🟢 НОВАЯ ЗАЯВКА BEAR',
    '',
    `🏹 Товар: ${product}`,
    `👤 Имя: ${name}`,
    `📞 Телефон: ${phone}`,
    `💬 Сообщение: ${message || '—'}`
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
        })
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram:', data);
      return res.status(502).json({
        error: 'Telegram не принял заявку'
      });
    }

    res.json({ ok: true });

  } catch (error) {
    console.error(error);

    res.status(502).json({
      error: 'Ошибка соединения с Telegram'
    });
  }
});

app.listen(PORT, () => {
  console.log(`BEAR server listening on ${PORT}`);
});