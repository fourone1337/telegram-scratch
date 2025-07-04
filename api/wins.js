
// pages/api/wins.js

const BIN_ID = "6867bece8561e97a50316303";
const API_KEY = "$2a$10$v97PDf5iapEJ8qAdzxlCYuKKmOtA7s9wE6llFmOfbNDlc3WYl1BXW";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { address, emojis, date } = req.body;

    if (!address || !emojis) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Получить текущий список побед
    let current = [];
    try {
      const getRes = await fetch(BASE_URL, {
        method: 'GET',
        headers: {
          'X-Master-Key': API_KEY
        }
      });
      const result = await getRes.json();
      current = result.record || [];
    } catch (err) {
      console.error("Fetch error", err);
    }

    // Добавить новую запись
    const updated = [
      ...current,
      {
        address,
        emojis,
        date: date || new Date().toISOString()
      }
    ];

    // Обновить Bin
    try {
      await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY
        },
        body: JSON.stringify(updated)
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update JSONBin' });
    }
  }

  if (req.method === 'GET') {
    try {
      const getRes = await fetch(BASE_URL, {
        method: 'GET',
        headers: {
          'X-Master-Key': API_KEY
        }
      });
      const result = await getRes.json();
      const data = result.record || [];
      return res.status(200).json(data.slice(-10).reverse());
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
