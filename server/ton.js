// server/ton.js
const TonWeb = require('tonweb');
const bip39  = require('bip39');                // уже есть в package.json
require('dotenv').config();

const { TONCENTER_API_KEY, SECRET_KEY } = process.env;
if (!SECRET_KEY) throw new Error('❌ SECRET_KEY отсутствует в .env');

const provider = new TonWeb.HttpProvider(
  'https://toncenter.com/api/v2/jsonRPC',
  { apiKey: TONCENTER_API_KEY }
);
const tonweb = new TonWeb(provider);

/* ---------- 1. Получаем seed (32 байта) ---------- */
let seedBytes;

// A) в .env лежит 24-словная мнемоника
if (SECRET_KEY.trim().split(/\s+/).length >= 12) {
  if (!bip39.validateMnemonic(SECRET_KEY.trim()))
    throw new Error('❌ Неверная мнемоническая фраза');
  const fullSeed = bip39.mnemonicToSeedSync(SECRET_KEY.trim()); // 64 байта Buffer
  seedBytes = Uint8Array.from(fullSeed.slice(0, 32));           // первые 32
  console.log('🔑 seed получен из мнемоники');
}
// B) в .env лежит base64-seed (32 байта)
else {
  seedBytes = Uint8Array.from(Buffer.from(SECRET_KEY, 'base64'));
  console.log('🔑 seed получен из base64');
}

/* ---------- 2. Ключи и кошелёк v4R2 ---------- */
const keyPair = TonWeb.utils.keyPairFromSeed(seedBytes);
const secretKeyUint8 = new Uint8Array(keyPair.secretKey);       // гарантия Uint8Array

const wallet = tonweb.wallet.create({
  publicKey : new Uint8Array(keyPair.publicKey),                // тоже Uint8Array
  wc        : 0,
  type      : 'v4R2'
});
/* --------------------------------------------- */

async function deployWalletIfNeeded() {
  const addr = await wallet.getAddress();
  const info = await provider.getAddressInfo(addr.toString());

  if (info?.state === 'active') return;

  console.log('📦 Кошелёк не развёрнут — деплоим…');
  await wallet.deploy({ secretKey: secretKeyUint8 }).send();
  console.log('✅ Кошелёк развёрнут.');
}

async function sendTonReward(toAddressStr, amountTon) {
  await deployWalletIfNeeded();

  let seqno = 0;
  try { seqno = await wallet.methods.seqno().call(); } catch {}

  const amountNano = TonWeb.utils.toNano(amountTon.toString());
  const toAddress  = new TonWeb.Address(toAddressStr);

  console.log(`🚀 Перевод ${amountTon} TON на ${toAddressStr}`);

  await wallet.methods.transfer({
    secretKey : secretKeyUint8,   // <-- теперь Uint8Array
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
