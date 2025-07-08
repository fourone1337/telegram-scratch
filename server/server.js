const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { sendTonReward } = require('./ton');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const dbFile = './wins.json';
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '[]');

// Получить список победителей
app.get('/api/wins', (req, res) => {
  const wins = JSON.parse(fs.readFileSync(dbFile));
  res.json(wins);
});

// Сохранить нового победителя и выдать приз
app.post('/api/wins', async (req, res) => {
  const { address, emojis, date } = req.body;
  if (!address || !emojis || !date) {
    return res.status(400).json({ error: "Некорректные данные" });
  }

  const win = { address, emojis, date };
  const wins = JSON.parse(fs.readFileSync(dbFile));
  wins.unshift(win);
  fs.writeFileSync(dbFile, JSON.stringify(wins, null, 2));

  try {
    await sendTonReward(address); // здесь будет реальная отправка TON
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Ошибка при отправке TON:", err);
    res.status(500).json({ error: "Не удалось выдать приз" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});