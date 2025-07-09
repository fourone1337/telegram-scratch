// ton.js  (замените старый файл)
const TonWeb = require('tonweb');
require('dotenv').config();            // ← чтобы .env подтянулся до использования

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const SECRET_KEY         = process.env.SECRET_KEY;
if (!SECRET_KEY) { throw new Error('❌ SECRET_KEY не найден в .env'); }

const provider = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', { apiKey: TONCENTER_API_KEY });
const tonweb   = new TonWeb(provider);

const keyPair  = TonWeb.utils.keyPairFromSeed(Buffer.from(SECRET_KEY, 'base64'));

// ⚠  V3-кошелёк проще и дешевле, если плагины не нужны
const wallet = tonweb.wallet.create({
  publicKey : keyPair.publicKey,
  wc        : 0,
  type      : 'v3R2'            // ← было v4R2
});

// 1. Разворачиваем кошелёк (если это ещё не случилось)
async function deployWalletIfNeeded() { /* …как было… */ }

// 2. Отправка TON
async function sendTonReward(toAddress, amountTon) {
  await deployWalletIfNeeded();

  const seqno       = await wallet.methods.seqno().call();
  const amountNano  = TonWeb.utils.toNano(amountTon.toString());
  const validUntil  = Math.floor(Date.now() / 1000) + 600;   // +10 минут, см. чек-лист

  console.log(`🚀 Отправляем ${amountTon} TON на ${toAddress}`);

  await wallet.methods.transfer({
    secretKey : keyPair.secretKey,
    toAddress,
    amount    : amountNano,
    seqno,
    validUntil,                       // ← новое поле
    payload   : null,
    sendMode  : 3                     // кошелёк платит газ + вкладывает значение
  }).send();
}

module.exports = { sendTonReward };
