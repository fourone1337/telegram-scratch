require("dotenv").config();
const { TonClient, WalletContractV4, internal } = require("@ton/ton");
const { mnemonicToPrivateKey } = require("@ton/crypto");
const { Address } = require("@ton/core");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

async function processNextWithdrawal() {
  const { data: job, error } = await supabase
    .from("withdraw_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!job || error) return;

  console.log("🔁 Обрабатываю заявку на вывод:", job.address, job.amount);

  try {
    // 1. Инициализация TON кошелька
    const keyPair = await mnemonicToPrivateKey(SECRET_KEY.split(" "));

    const client = new TonClient({
      endpoint: `https://toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_API_KEY}`
    });

    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey
    });

    const sender = client.provider(wallet.address, wallet.init);
    const seqno = await wallet.getSeqno(sender);

    // 2. Отправка TON
    await wallet.sendTransfer(sender, {
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: Address.parse(job.address),
          value: BigInt(Math.floor(job.amount * 1e9)), // в nanoTON
          bounce: false
        })
      ]
    });

    // 3. Обновление статуса
    await supabase
      .from("withdraw_queue")
      .update({ status: "success", updated_at: new Date().toISOString() })
      .eq("id", job.id);

    console.log("✅ Выплата успешно отправлена:", job.amount, "TON →", job.address);
  } catch (e) {
    console.error("❌ Ошибка перевода:", e.message);

    await supabase
      .from("withdraw_queue")
      .update({
        status: "error",
        error: e.message,
        updated_at: new Date().toISOString()
      })
      .eq("id", job.id);
  }
}

// 🔁 Запускаем обработку каждые 15 секунд
setInterval(processNextWithdrawal, 15000);
