const TonWeb = require('tonweb');                // v0.0.66+
require('dotenv').config();

const { TONCENTER_API_KEY, SECRET_KEY } = process.env;
if (!SECRET_KEY) throw new Error('❌ SECRET_KEY отсутствует в .env');

const provider = new TonWeb.HttpProvider(
  'https://toncenter.com/api/v2/jsonRPC',
  { apiKey: TONCENTER_API_KEY }
);
const tonweb = new TonWeb(provider);

// ---------- 1. Создаём кошелёк strictly v4R2 ----------
const keyPair = TonWeb.utils.keyPairFromSeed(Buffer.from(SECRET_KEY, 'base64'));
const WalletV4R2 = TonWeb.wallet.all.v4R2;       // <-- явная ссылка на контракт
const wallet   = new WalletV4R2(provider, {
  publicKey: keyPair.publicKey,
  wc: 0                                          // 0-й workchain
});
// ------------------------------------------------------

async function deployWalletIfNeeded() {
  const address = await wallet.getAddress();
  const info    = await provider.getAddressInfo(address.toString());
  if (info?.state === 'active') return;          // уже развёрнут

  console.log('📦 Кошелёк не развёрнут — деплоим…');
  await wallet.deploy({ secretKey: keyPair.secretKey }).send();
  console.log('✅ Кошелёк развёрнут.');
}

// ---------- отправка TON -----------------------------
async function sendTonReward(toAddress, amountTon) {
  await deployWalletIfNeeded();

  // если кошелёк только что развёрнут → seqno = 0
  let seqno = 0;
  try { seqno = await wallet.methods.seqno().call(); } catch { /* ignore */ }

  const amountNano = TonWeb.utils.toNano(amountTon.toString());
  console.log(`🚀 Перевод ${amountTon} TON на ${toAddress}…`);

  await wallet.methods.transfer({
    secretKey:   keyPair.secretKey,
    toAddress,
    amount:      amountNano,
    seqno,
    payload:     null,
    bounce:      false,          // для простого перевода лучше off
    sendMode:    3               // pay gas separately, ignore errors
  }).send();

  console.log('✅ Транзакция отправлена!');
}
// ------------------------------------------------------

module.exports = { sendTonReward };
