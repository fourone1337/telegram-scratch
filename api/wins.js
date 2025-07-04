let wins = []; // временное хранилище побед (обнуляется при перезапуске)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { address, emojis, date } = req.body;

    if (!address || !emojis) {
      return res.status(400).json({ error: 'Недостаточно данных' });
    }

    wins.push({ address, emojis, date: date || new Date().toISOString() });

    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    return res.status(200).json(wins);
  }

  return res.status(405).json({ error: 'Метод не поддерживается' });
}
