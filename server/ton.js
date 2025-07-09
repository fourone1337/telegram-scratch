const TonWeb = require('tonweb');
require('dotenv').config();

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error('❌ SECRET_KEY не найден в .env');
}

const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
  apiKey: TONCENTER_API_KEY,
});

const tonweb = new TonWeb(provider);
const keyPair = TonWeb.utils.keyPairFromSeed(Buffer.from(SECRET_KEY, 'base64'));

const wallet = tonweb.wallet.create({
  publicKey: keyPair.publicKey,
  wc: 0,
  type: 'v4R2'
});

async function sendTonReward(toAddress, amountTon) {
  const seqno = await wallet.methods.seqno().call();
  const amountNano = TonWeb.utils.toNano(amountTon.toString());
  const validUntil = Math.floor(Date.now() / 1000) + 600;

  console.log(`🚀 Отправляем ${amountTon} TON на ${toAddress}`);

  await wallet.methods.transfer({
    secretKey: keyPair.secretKey,
    toAddress,
    amount: amountNano,
    seqno,
    validUntil,
    payload: null,
    sendMode: 3
  }).send();
}

module.exports = { sendTonReward, wallet };
