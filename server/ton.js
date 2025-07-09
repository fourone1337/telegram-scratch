const TonWeb = require('tonweb');          // v0.0.66
require('dotenv').config();

const { TONCENTER_API_KEY, SECRET_KEY } = process.env;
if (!SECRET_KEY) throw new Error('❌ SECRET_KEY отсутствует в .env');

const provider = new TonWeb.HttpProvider(
  'https://toncenter.com/api/v2/jsonRPC',
  { apiKey: TONCENTER_API_KEY }
);
const tonweb = new TonWeb(provider);

// ---------- ключи и кошелёк v4R2 ----------
const keyPair = TonWeb.utils.keyPairFromSeed(Buffer.from(SECRET_KEY, 'base64'));

const wallet = tonweb.wallet.create({
  publicKey : keyPair.publicKey,
  wc        : 0,          // workchain-id
  type      : 'v4R2'      // нужный тип кошелька
});
// ------------------------------------------

async function deployWalletIfNeeded() {
  const address = await wallet.getAddress();
  const info    = await provider.getAddressInfo(address.toString());

  if (info?.state === 'active') return;     // уже развёрнут

  console.log('📦 Кошелёк не развёрнут — деплоим…');
  await wallet.deploy({ secretKey: keyPair.secretKey }).send();
  console.log('✅ Кошелёк развёрнут.');
}

async function sendTonReward(toAddress, amountTon) {
  await deployWalletIfNeeded();

  // безопасно получаем seqno: на пустом кошельке будет ошибка → берём 0
  let seqno = 0;
  try { seqno = await wallet.methods.seqno().call(); } catch { /* ignore */ }

  const amountNano = TonWeb.utils.toNano(amountTon.toString());
  console.log(`🚀 Перевод ${amountTon} TON на ${toAddress} (seqno ${seqno})`);

  await wallet.methods.transfer({
    secretKey : keyPair.secretKey,
    toAddress,
    amount    : amountNano,
    seqno,
    payload   : null,
    bounce    : false,   // обычный перевод, без возврата
    sendMode  : 3        // отдельно платим gas, игнорируем ошибки при доставке
  }).send();

  console.log('✅ Транзакция отправлена!');
}

module.exports = { sendTonReward };
