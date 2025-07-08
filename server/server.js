const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { sendTonReward } = require('./ton'); // 👈 Правильный импорт

const app = express();
const PORT = process.env.PORT || 3001;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(bodyParser.json());

app.get('/api/wins', async (req, res) => {
  const { data, error } = await supabase
    .from('wins')
    .select('*')
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Ошибка получения победителей:', error);
    return res.status(500).json({ error: 'Ошибка получения данных' });
  }

  res.json(data);
});

app.post('/api/wins', async (req, res) => {
  const { address, emojis, reward, date } = req.body;

  if (!address || !emojis || !date) {
    return res.status(400).json({ error: "Некорректные данные" });
  }

  console.log("📥 Новая заявка на победу:", { address, emojis, reward, date });

  const { error } = await supabase
    .from('wins')
    .insert([{ address, emojis, reward, date }]);

  if (error) {
    console.error('❌ Ошибка записи победы в Supabase:', error.message);
    return res.status(500).json({ error: error.message });
  }

  try {
    if (reward > 0) {
      await sendTonReward(address, reward);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Ошибка отправки TON:', err.message || err);
    res.status(500).json({ error: 'Ошибка отправки TON' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
