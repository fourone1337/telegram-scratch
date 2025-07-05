
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json([{ address: "EQ123...", emojis: "🍒🍒🍒", date: "2025-07-06T10:00:00Z" }]);
  } else {
    res.status(405).json({ error: 'Метод не поддерживается' });
  }
}
