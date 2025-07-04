// pages/api/wins.js
const BIN_ID = "6867bece8561e97a50316303";
const API_KEY = "$2a$10$..."; // ← вставьте свой ключ
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { address, emojis, date } = req.body;
    if (!address || !emojis) {
      return res.status(400).json({ error: 'Неверные данные' });
    }
    try {
      const getRes = await fetch(BASE_URL, {
        method: 'GET',
        headers: { 'X-Master-Key': API_KEY }
      });
      const json = await getRes.json();
      const winnings = json.record.winnings || [];
      winnings.push({ address, emojis, date: date || new Date().toISOString() });
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY
        },
        body: JSON.stringify({
          name: "Пётр",
          game: "Scratch Lottery",
          winnings
        })
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Ошибка загрузки данных' });
    }
  }

  if (req.method === 'GET') {
    try {
      const getRes = await fetch(BASE_URL, {
        method: 'GET',
        headers: { 'X-Master-Key': API_KEY }
      });
      const json = await getRes.json();
      return res.status(200).json(json.record.winnings || []);
    } catch (err) {
      return res.status(500).json({ error: 'Ошибка загрузки данных' });
    }
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
