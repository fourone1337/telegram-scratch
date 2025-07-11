require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // добавь, если не используешь глобальный fetch
const { createClient } = require("@supabase/supabase-js");
const { Address } = require('@ton/core'); // Добавь вверху файла

const app = express();
app.use(cors());
app.use(express.json());

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

// 💰 Пополнить виртуальный баланс (без проверки TON)
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

// 🔍 Получить текущий виртуальный баланс (и создать пользователя при необходимости)
const { Address } = require('@ton/core'); // Добавь вверху файла

app.get("/api/verify-topup/:address/:amount", async (req, res) => {
  const { address, amount } = req.params;
  const RECEIVER_ADDRESS = "UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g"; // твой TON-кошелёк
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

    console.log("🔍 Ищем входящий перевод на", RECEIVER_ADDRESS);
    console.log("Искомый адрес (сырой):", Address.parseFriendly(address).address.toString());
    console.log("Искомая сумма (в nanoTON):", nanoAmount.toString());

    const found = txs.transactions.find(tx => {
      if (!tx.incoming || !tx.incoming.source) return false;

      try {
        const txRaw = Address.parseFriendly(tx.incoming.source).address.toString();
        const userRaw = Address.parseFriendly(address).address.toString();

        console.log("→ Проверка:", txRaw, "==", userRaw);
        return (
          txRaw === userRaw &&
          BigInt(tx.incoming.value) >= nanoAmount
        );
      } catch (e) {
        console.error("❌ Ошибка парсинга адреса:", e.message);
        return false;
      }
    });

    if (!found) {
      console.log("❌ Перевод не найден для", address);
      return res.json({ confirmed: false });
    }

    console.log("✅ Перевод найден! Зачисляем виртуальный баланс...");

    const { error } = await supabase.rpc("increment_balance", {
      user_address: Address.parseFriendly(address).address.toString(), // Приводим к raw
      add_amount: parseFloat(amount)
    });

    if (error) {
      console.error("❌ Ошибка при зачислении:", error.message);
      return res.status(500).json({ error: "Ошибка зачисления баланса" });
    }

    return res.json({ confirmed: true });
  } catch (err) {
    console.error("❌ Ошибка проверки перевода:", err);
    return res.status(500).json({ error: "Проверка TON не удалась" });
  }
});


// 🔐 Проверка реального перевода через TonAPI
app.get("/api/verify-topup/:address/:amount", async (req, res) => {
  const { address, amount } = req.params;
  const RECEIVER_ADDRESS = "UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g"; // твой TON-кошелёк
 const TONAPI_KEY = process.env.TONAPI_KEY;
console.log("TONAPI_KEY:", TONAPI_KEY); // временно добавь

  try {
    const response = await fetch(
      `https://tonapi.io/v2/blockchain/accounts/${RECEIVER_ADDRESS}/transactions?limit=20`,
      {
        headers: { Authorization: `Bearer ${TONAPI_KEY}` }
      }
    );

    const txs = await response.json();
    const nanoAmount = BigInt(Math.floor(parseFloat(amount) * 1e9));

    console.log("🔍 Ищем входящий перевод от:", address);
    console.log("Нужно >=:", nanoAmount.toString(), "наноTON");
    console.log("Последние транзакции:", txs.transactions.length);

    const found = txs.transactions.find(tx =>
      tx.incoming &&
      tx.incoming.source === address &&
      BigInt(tx.incoming.value) >= nanoAmount
    );

    if (!found) {
      console.log("❌ Перевод не найден для", address);
      return res.json({ confirmed: false });
    }

    console.log("✅ Перевод найден от", address, "на", found.incoming.value, "наноTON");

    const { error } = await supabase.rpc("increment_balance", {
      user_address: address,
      add_amount: parseFloat(amount)
    });

    if (error) {
      console.error("❌ Ошибка при зачислении баланса:", error.message);
      return res.status(500).json({ error: "Ошибка при зачислении баланса" });
    }

    return res.json({ confirmed: true });
  } catch (err) {
    console.error("❌ Ошибка проверки перевода:", err);
    return res.status(500).json({ error: "Проверка TON не удалась" });
  }
});


// 💸 Списать с баланса
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
