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

// 🎯 Добавить победу
app.post("/api/wins", async (req, res) => {
  const { address, emojis, reward, date } = req.body;
  const result = await supabase
    .from("wins")
    .insert([{ address, emojis, reward, date }]);

  if (result.error) {
    console.error("Ошибка записи в wins:", result.error.message);
    return res.status(500).json({ error: result.error.message });
  }

  res.json({ success: true });
});

// 💰 Пополнить баланс (через RPC Supabase)
app.post("/api/topup", async (req, res) => {
  const { address, amount } = req.body;

  const { data, error } = await supabase.rpc("increment_balance", {
    user_address: address,
    add_amount: amount
  });

  if (error) {
    console.error("Ошибка увеличения баланса:", error.message);
    return res.status(500).json({ error: error.message });
  }

  res.json({ balance: data });
});

// 🔍 Получить текущий баланс
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

// 💸 Списать сумму с баланса
app.post("/api/spend", async (req, res) => {
  const { address, amount } = req.body;

  const { data, error: selectError } = await supabase
    .from("users")
    .select("balance")
    .eq("address", address)
    .single();

  if (selectError || !data) {
    return res.status(404).json({ error: "Баланс не найден." });
  }

  if (data.balance < amount) {
    return res.status(400).json({ error: "Недостаточно средств." });
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      balance: data.balance - amount,
      updated_at: new Date().toISOString()
    })
    .eq("address", address);

  if (updateError) {
    console.error("Ошибка при списании:", updateError.message);
    return res.status(500).json({ error: "Ошибка при списании." });
  }

  res.json({ success: true });
});

// ▶️ Запуск сервера
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});
