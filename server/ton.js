const TonWeb = require("tonweb");

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("❌ SECRET_KEY не найден в .env.");
}

const tonweb = new TonWeb(new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
  apiKey: TONCENTER_API_KEY
}));

const keyBytes = Buffer.from(SECRET_KEY, 'base64');
const keyPair = TonWeb.utils.keyPairFromSeed(keyBytes);

const wallet = tonweb.wallet.create({
  publicKey: keyPair.publicKey,
  wc: 0,
  workchain: 0, // явное указание, для стабильности
  type: 'v4R2',
  revision: 5
});

// Ручная проверка развёрнут ли кошелёк
async function deployWalletIfNeeded() {
  const address = await wallet.getAddress();
  const info = await tonweb.provider.getAddressInfo(address.toString());

  const isDeployed = info && info.state === 'active';

  if (!isDeployed) {
    console.log("📦 Кошелёк не развёрнут. Разворачиваем...");
    await wallet.deploy(keyPair.secretKey).send();
    console.log("✅ Кошелёк развёрнут.");
  }
}

// Отправка TON
async function sendTonReward(toAddress, amountTon) {
  await deployWalletIfNeeded();

  const seqno = await wallet.methods.seqno().call();
  const amountNano = TonWeb.utils.toNano(amountTon.toString());

  console.log(`🚀 Отправляем ${amountTon} TON (${amountNano} nanoTON) на ${toAddress}...`);

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
