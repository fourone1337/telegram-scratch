const TonWeb = require("tonweb");

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("❌ SECRET_KEY не найден в .env. Убедись, что он задан.");
}

const tonweb = new TonWeb(new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
  apiKey: TONCENTER_API_KEY
}));

const keyBytes = Buffer.from(SECRET_KEY, 'base64');
const keyPair = TonWeb.utils.keyPairFromSeed(keyBytes);

const WalletClass = tonweb.wallet.all['v4R2'];
const wallet = new WalletClass(tonweb.provider, {
  publicKey: keyPair.publicKey,
  wc: 0
});

// Проверка и развёртывание кошелька при необходимости
async function deployWalletIfNeeded() {
  const isDeployed = await wallet.isDeployed();
  if (!isDeployed) {
    console.log("📦 Кошелёк не развёрнут. Отправляем транзакцию для развёртывания...");
    await wallet.deploy(keyPair.secretKey).send();
    console.log("✅ Кошелёк развёрнут.");
  }
}

// Отправка TON на адрес победителя
async function sendTonReward(toAddress, amountTon) {
  await deployWalletIfNeeded();

  const seqno = await wallet.methods.seqno().call();
  const amountNano = TonWeb.utils.toNano(amountTon.toString());

  console.log(`\n🚀 Отправляем ${amountTon} TON (${amountNano} nanoTON) на ${toAddress}...`);

  await wallet.methods.transfer({
    secretKey: keyPair.secretKey,
    toAddress,
    amount: amountNano,
    seqno,
    payload: null,
    sendMode: 3
  }).send();

  console.log("✅ Транзакция отправлена!");
}

module.exports = { sendTonReward };
