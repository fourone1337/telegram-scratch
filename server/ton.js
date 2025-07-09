const TonWeb = require('tonweb');
require('dotenv').config();

const { TONCENTER_API_KEY, SECRET_KEY } = process.env;
if (!SECRET_KEY) throw new Error('❌ SECRET_KEY отсутствует в .env');

const provider = new TonWeb.HttpProvider(
  'https://toncenter.com/api/v2/jsonRPC',
  { apiKey: TONCENTER_API_KEY }
);
const tonweb = new TonWeb(provider);

// ---------- ключи и кошелёк v4R2 ----------
const seedBytes = Uint8Array.from(Buffer.from(SECRET_KEY, 'base64'));  // <-- Uint8Array
const keyPair   = TonWeb.utils.keyPairFromSeed(seedBytes);

const wallet = tonweb.wallet.create({
  publicKey : keyPair.publicKey,
  wc        : 0,
  type      : 'v4R2'
});
// ------------------------------------------

async function deployWalletIfNeeded() {
  const addr = await wallet.getAddress();
  const info = await provider.getAddressInfo(addr.toString());

  if (info?.state === 'active') return;

  console.log('📦 Кошелёк не развёрнут — деплоим…');
  await wallet.deploy({ secretKey: keyPair.secretKey }).send();
  console.log('✅ Кошелёк развёрнут.');
}

async function sendTonReward(toAddressStr, amountTon) {
  await deployWalletIfNeeded();

  let seqno = 0;
  try { seqno = await wallet.methods.seqno().call(); } catch {}

  const amountNano = TonWeb.utils.toNano(amountTon.toString());
  const toAddress  = new TonWeb.Address(toAddressStr);     // <-- объект, не строка

  console.log(`🚀 Перевод ${amountTon} TON на ${toAddressStr}`);

  await wallet.methods.transfer({
    secretKey : keyPair.secretKey,        // Uint8Array
    toAddress,
    amount    : amountNano,
    seqno,
    payload   : null,
    bounce    : false,
    sendMode  : 3
  }).send();

  console.log('✅ Транзакция отправлена!');
}

module.exports = { sendTonReward };
