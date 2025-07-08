const TonWeb = require("tonweb");

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const FROM_WALLET = process.env.FROM_WALLET;
const SECRET_KEY = process.env.SECRET_KEY;

const tonweb = new TonWeb(new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC", {
  apiKey: TONCENTER_API_KEY
}));

// Восстановим ключи из seed (в hex или base64)
const keyPair = TonWeb.utils.keyPairFromSeed(TonWeb.utils.base64ToBytes(SECRET_KEY));

const WalletClass = TonWeb.wallet.all.v3R2;
const wallet = new WalletClass(tonweb.provider, {
  publicKey: keyPair.publicKey,
  wc: 0
});

let isWalletOpened = false;

async function sendTonReward(toAddress, amountTon) {
  if (!isWalletOpened) {
    await wallet.open();
    isWalletOpened = true;
  }

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
