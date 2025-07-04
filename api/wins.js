// api/wins.js
let wins = []; // временное хранилище (обнуляется при перезапуске Vercel)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { address, emojis, date } = req.body;

    if (!address || !emojis) {
      return res.status(400).json({ error: 'Неверные данные' });
    }

    wins.push({
      address,
      emojis,
      date: date || new Date().toISOString()
    });

    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    // возвращаем последние 10 побед
    return res.status(200).json(wins.slice(-10).reverse());
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
