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
  const userAddress = Address.parse(address).toFriendly();

  const result = await supabase
    .from("wins")
    .insert([{ address: userAddress, emojis, reward, date }]);

  if (result.error) {
    console.error("❌ Ошибка записи в wins:", result.error.message);
    return res.status(500).json({ error: result.error.message });
  }

  const { error: rewardError } = await supabase.rpc("increment_balance", {
    user_address: userAddress,
    add_amount: reward
  });

  if (rewardError) {
    console.error("❌ Ошибка начисления награды:", rewardError.message);
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
      `https://tonapi.io/v2/blockchain/accounts/${RECEIVER_ADDRESS}/transactions?limit=50`,
      {
        headers: { Authorization: `Bearer ${TONAPI_KEY}` }
      }
    );

    const txs = await response.json();
    const nanoAmount = BigInt(Math.floor(parseFloat(amount) * 1e9));
    const userAddress = Address.parse(address).toFriendly();

    console.log("🔍 Проверка перевода TON");
    console.log("→ Получатель:", RECEIVER_ADDRESS);
    console.log("→ Ожидаемый отправитель:", userAddress);
    console.log("→ Сумма (nanoTON):", nanoAmount.toString());

    const found = txs.transactions.find(tx => {
      const inMsg = tx.in_msg;
      if (!inMsg || !inMsg.source || !inMsg.value || !inMsg.source.address) return false;

      try {
        const txSender = Address.parse(inMsg.source.address).toFriendly();
        console.log(`→ Сравнение: ${txSender} === ${userAddress} ?`);
        return txSender === userAddress && BigInt(inMsg.value) >= nanoAmount;
      } catch (e) {
        console.error("❌ Ошибка парсинга:", e.message);
        return false;
      }
    });

    if (!found) {
      console.log("❌ Перевод не найден. txs:", txs.transactions.map(tx => ({
        source: tx.in_msg?.source?.address,
        value: tx.in_msg?.value
      })));
      return res.json({ confirmed: false });
    }

    console.log("✅ Перевод найден. Начисляем баланс...");

    const { error } = await supabase.rpc("increment_balance", {
      user_address: userAddress,
      add_amount: parseFloat(amount)
    });

    if (error) {
      console.error("❌ Ошибка зачисления:", error.message);
      return res.status(500).json({ error: "Ошибка зачисления баланса" });
    }

    console.log("✅ Баланс успешно увеличен");
    return res.json({ confirmed: true });

  } catch (err) {
    console.error("❌ Ошибка проверки перевода:", err);
    return res.status(500).json({ error: "Проверка TON не удалась" });
  }
});

// ✅ Списание с баланса
app.post("/api/spend", async (req, res) => {
  const { address, amount } = req.body;
  const userAddress = Address.parse(address).toFriendly();

  const { data, error: selectError } = await supabase
    .from("users")
    .select("balance")
    .eq("address", userAddress)
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
    .eq("address", userAddress);

  if (updateError) {
    console.error("❌ Ошибка при списании:", updateError.message);
    return res.status(500).json({ error: "Ошибка при списании." });
  }

  res.json({ success: true });
});

// ✅ Получение баланса
app.get("/api/balance/:address", async (req, res) => {
  const raw = req.params.address;
  const userAddress = Address.parse(raw).toFriendly();

  let { data, error } = await supabase
    .from("users")
    .select("balance")
    .eq("address", userAddress)
    .single();

  if (error && error.code === 'PGRST116') {
    console.log("👤 Пользователь не найден, пробуем создать...");

    const insert = await supabase
      .from("users")
      .insert([
        {
          address: userAddress,
          balance: 0,
          created_at: new Date().toISOString(),
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


