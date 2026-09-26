const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'mario87363').replace(/^@/, '').toLowerCase();

let adminChatId = process.env.ADMIN_CHAT_ID || null;

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/order', async (req, res) => {
  const { product, name, phone, message } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: 'Не указаны имя или телефон' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Telegram ещё не настроен' });
  }

  if (!adminChatId) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=20`
      );

      const data = await response.json();

      if (data.ok) {
        const match = (data.result || [])
          .slice()
          .reverse()
          .find(x => {
            const username = x.message?.from?.username;
            return username &&
              username.toLowerCase() === ADMIN_USERNAME;
          });

        if (match) {
          adminChatId = match.message.chat.id;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (!adminChatId) {
    return res.status(500).json({
      error: 'Сначала откройте бота и нажмите Start'
    });
  }

  const text = [
    '🟢 НОВАЯ ЗАЯВКА BEAR',
    '',
    `🏹 Товар: ${product || 'Не указан'}`,
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
          chat_id: adminChatId,
          text: text
        })
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }

    res.json({ ok: true });

  } catch (error) {
    console.error(error);
    res.status(502).json({
      error: 'Telegram не принял заявку'
    });
  }
});

app.listen(PORT, () => {
  console.log(`BEAR server listening on ${PORT}`);
});
