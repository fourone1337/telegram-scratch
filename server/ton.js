const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicToPrivateKey, keyPairFromSeed } = require('@ton/crypto');
const { mnemonicValidate } = require('bip39');
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

  let keyPair;

  if (SECRET_KEY.trim().includes(' ')) {
    // 🧠 Мнемоника
    const mnemonic = SECRET_KEY.trim().split(/\s+/);
    if (!mnemonicValidate(mnemonic)) {
      throw new Error("❌ Неверная мнемоническая фраза");
    }
    keyPair = await mnemonicToPrivateKey(mnemonic);
    console.log("🔑 Ключ получен из мнемоники");
  } else {
    // 📦 Base64 seed
    const seed = Buffer.from(SECRET_KEY, 'base64');
    if (seed.length !== 32) throw new Error("❌ Base64 seed должен быть 32 байта");
    keyPair = keyPairFromSeed(seed);
    console.log("🔑 Ключ получен из base64 seed");
  }

  wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  sender = client.open(wallet);
  secretKey = keyPair.secretKey;

  // 📦 Проверка — развёрнут ли кошелёк
  const address = wallet.address;
  const info = await client.getAccountLite(address);

  if (info.account.state.type !== 'active') {
    console.log("📦 Кошелёк не развёрнут — отправляем deploy...");
    await sender.deploy(secretKey);
    console.log("✅ Кошелёк развёрнут");
  }
}

async function sendTonReward(toAddress, amountTon) {
  try {
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
  } catch (err) {
    console.error("❌ Ошибка отправки TON:", err.response?.data || err.message || err);
  }
}

module.exports = { sendTonReward };
