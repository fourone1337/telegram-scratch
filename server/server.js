require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
const { Address } = require("@ton/core");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ Добавление победы + автоначисление награды
app.post("/api/wins", async (req, res) => {
  const { address, emojis, reward, date } = req.body;

  const result = await supabase
    .from("wins")
    .insert([{ address, emojis, reward, date }]);

  if (result.error) {
    console.error("Ошибка записи в wins:", result.error.message);
    return res.status(500).json({ error: result.error.message });
  }

  const { error: rewardError } = await supabase.rpc("increment_balance", {
    user_address: Address.parseFriendly(address).address.toString(),
    add_amount: reward
  });

  if (rewardError) {
    console.error("Ошибка начисления награды:", rewardError.message);
    return res.status(500).json({ error: rewardError.message });
  }

  res.json({ success: true });
});

// ✅ Проверка перевода TON и зачисление
app.get("/api/verify-topup/:address/:amount", async (req, res) => {
  const { address, amount } = req.params;
  const RECEIVER_ADDRESS = "UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g";
  const TONAPI_KEY = process.env.TONAPI_KEY;

  try {
    const response = await fetch(
      `https://tonapi.io/v2/blockchain/accounts/${RECEIVER_ADDRESS}/transactions?limit=20`,
      {
        headers: { Authorization: `Bearer ${TONAPI_KEY}` }
      }
    );

    const txs = await response.json();
    const nanoAmount = BigInt(Math.floor(parseFloat(amount) * 1e9));

    const found = txs.transactions.find(tx => {
      if (!tx.incoming || !tx.incoming.source) return false;
      try {
        const txRaw = Address.parseFriendly(tx.incoming.source).address.toString();
        const userRaw = Address.parseFriendly(address).address.toString();
        return txRaw === userRaw && BigInt(tx.incoming.value) >= nanoAmount;
      } catch {
        return false;
      }
    });

    if (!found) return res.json({ confirmed: false });

    const { error } = await supabase.rpc("increment_balance", {
      user_address: Address.parseFriendly(address).address.toString(),
      add_amount: parseFloat(amount)
    });

    if (error) {
      console.error("Ошибка зачисления:", error.message);
      return res.status(500).json({ error: "Ошибка зачисления баланса" });
    }

    return res.json({ confirmed: true });
  } catch (err) {
    console.error("Ошибка проверки перевода:", err);
    return res.status(500).json({ error: "Проверка TON не удалась" });
  }
});

// ✅ Списание с баланса
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

// ✅ Получение баланса по адресу
app.get("/api/balance/:address", async (req, res) => {
  const { address } = req.params;

  let { data, error } = await supabase
    .from("users")
    .select("balance")
    .eq("address", address)
    .single();

  if (error && error.code === 'PGRST116') {
    console.log("👤 Пользователь не найден, пробуем создать...");

    const insert = await supabase
      .from("users")
      .insert([
        {
          address,
          balance: 0,
          created_at: new Date().toISOString(), // добавим явно
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insert.error) {
      console.error("❌ Ошибка создания пользователя:", insert.error.message);
      return res.status(500).json({ error: "Ошибка создания пользователя" });
    }

    return res.json({ balance: 0 });
  }

  if (error) {
    console.error("❌ Ошибка запроса баланса:", error.message);
    return res.status(500).json({ error: "Ошибка запроса баланса" });
  }

  return res.json({ balance: data.balance });
});

// ▶️ Запуск сервера
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
