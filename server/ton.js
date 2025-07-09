const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { mnemonicValidate, mnemonicToSeedSync } = require('bip39');
const { fromBase64 } = require('@ton/crypto');
require('dotenv').config();

const { TONCENTER_API_KEY, SECRET_KEY } = process.env;
if (!SECRET_KEY) throw new Error("❌ SECRET_KEY отсутствует в .env");

const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: TONCENTER_API_KEY
});

let wallet, sender, secretKey;

async function initWallet() {
  if (wallet && sender && secretKey) return;

  let key;
  if (SECRET_KEY.trim().includes(' ')) {
    // 🧠 Мнемоника
    const mnemonic = SECRET_KEY.trim().split(/\s+/);
    if (!mnemonicValidate(mnemonic)) {
      throw new Error("❌ Неверная мнемоническая фраза");
    }
    key = await mnemonicToPrivateKey(mnemonic);
    console.log("🔑 Ключ получен из мнемоники");
  } else {
    // 📦 Base64 seed
    const seed = fromBase64(SECRET_KEY);
    if (seed.length !== 32) throw new Error("❌ Base64 seed должен быть 32 байта");
    const mnemonic = Array(24).fill("abandon"); // placeholder
    key = await mnemonicToPrivateKey(mnemonic); // временный хак
    key.secretKey = seed;
    console.log("🔑 Ключ получен из base64 seed");
  }

  wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
  sender = client.open(wallet);
  secretKey = key.secretKey;
}

async function sendTonReward(toAddress, amountTon) {
  await initWallet();

  const seqno = await sender.getSeqno();
  const amountNano = BigInt(Math.floor(parseFloat(amountTon) * 1e9));

  console.log(`🚀 Перевод ${amountTon} TON на ${toAddress} (seqno ${seqno})`);

  await sender.sendTransfer({
    secretKey,
    seqno,
    messages: [
      internal({
        to: toAddress,
        value: amountNano,
        bounce: false
      })
    ]
  });

  console.log("✅ Транзакция отправлена!");
}

module.exports = { sendTonReward };
