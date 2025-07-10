require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 🏆 Сохранить победу
app.post("/api/wins", async (req, res) => {
  const { address, emojis, reward, date } = req.body;
  const result = await supabase.from("wins").insert([{ address, emojis, reward, date }]);
  if (result.error) {
    console.error("Ошибка записи в wins:", result.error.message);
    return res.status(500).json({ error: result.error.message });
  }
  res.json({ success: true });
});

// 💰 Увеличить баланс
app.post("/api/topup", async (req, res) => {
  const { address, amount } = req.body;
  const { data, error } = await supabase.rpc("increment_balance", {
    user_address: address,
    add_amount: amount,
  });
  if (error) {
    console.error("Ошибка увеличения баланса:", error.message);
    return res.status(500).json({ error: error.message });
  }
  res.json({ balance: data });
});

// 🔍 Получить баланс
app.get("/api/balance/:address", async (req, res) => {
  const { address } = req.params;
  const { data, error } = await supabase
    .from("users")
    .select("balance")
    .eq("address", address)
    .single();

  if (error) {
    console.error("Ошибка получения баланса:", error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ balance: data.balance });
});

// Запуск
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
