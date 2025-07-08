// ton.js
const TonWeb = require("tonweb");
const nacl = require("tweetnacl");

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("❌ SECRET_KEY не найден в .env");
}

const tonweb = new TonWeb(
  new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
    apiKey: TONCENTER_API_KEY
  })
);

// ✅ 1. Декодируем base64 → Uint8Array (32 байта)
const seed = Uint8Array.from(Buffer.from(SECRET_KEY, "base64"));

// ✅ 2. Получаем пару ключей (secretKey должен быть ровно 64 байта)
const rawKeyPair = nacl.sign.keyPair.fromSeed(seed);
const secretKey = Uint8Array.from(rawKeyPair.secretKey); // 👈 гарантированный тип
const publicKey = Uint8Array.from(rawKeyPair.publicKey);
const keyPair = { publicKey, secretKey };


// ✅ 3. Создаём кошелёк
const WalletClass = tonweb.wallet.all["v4R2"];
const wallet = new WalletClass(tonweb.provider, {
  publicKey: keyPair.publicKey,
  wc: 0
});

async function sendTonReward(toAddress, amountTon) {
  console.log("✅ sendTonReward загружен");

  const address = await wallet.getAddress();
  const walletInfo = await tonweb.provider.getAddressInfo(address.toString());

  if (walletInfo.state !== "active") {
    console.log("📦 Кошелёк не активирован. Выполняем deploy...");

    await wallet.deploy({ secretKey: keyPair.secretKey }).send();

    for (let i = 0; i < 10; i++) {
      await new Promise((res) => setTimeout(res, 3000));
      const info = await tonweb.provider.getAddressInfo(address.toString());
      if (info.state === "active") {
        console.log("✅ Кошелёк успешно активирован.");
        break;
      }
      if (i === 9) throw new Error("❌ Кошелёк не активировался после deploy.");
    }
  }

  const seqno = await wallet.methods.seqno().call();
  const amountNano = TonWeb.utils.toNano(amountTon.toString());

  console.log(`🚀 Отправляем ${amountTon} TON на ${toAddress}...`);

  await wallet.methods.transfer({
    secretKey: keyPair.secretKey, // ✅ ЭТО 64-байтовый Uint8Array
    toAddress,
    amount: amountNano,
    seqno,
    payload: null,
    sendMode: 3
  }).send();

  console.log("✅ Транзакция отправлена!");
}

module.exports = { sendTonReward };
