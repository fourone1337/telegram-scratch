const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(bodyParser.json());

// Получить список победителей
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

// Сохранить нового победителя
app.post('/api/wins', async (req, res) => {
  const { address, emojis, date } = req.body;

  if (!address || !emojis || !date) {
    return res.status(400).json({ error: "Некорректные данные" });
  }

  const { error } = await supabase
    .from('wins')
    .insert([{ address, emojis, date }]);

  if (error) {
    console.error('Ошибка записи победы:', error);
    return res.status(500).json({ error: 'Ошибка записи' });
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
