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
  type: 'v3R2'
});

async function deployWalletIfNeeded() {
  const address = await wallet.getAddress();
  const addressStr = address.toString(true, true, true);

  const info = await tonweb.provider.getAddressInfo(addressStr);
  const isDeployed = info?.state === 'active';

  if (!isDeployed) {
    console.log('📦 Кошелёк ещё не активен, активируем...');

    const seqno = 0;
    const amountNano = TonWeb.utils.toNano('0.01');

    await wallet.methods.transfer({
      secretKey: keyPair.secretKey,
      toAddress: addressStr,
      amount: amountNano,
      seqno,
      sendMode: 3,
      payload: null,
      validUntil: Math.floor(Date.now() / 1000) + 600
    }).send();

    console.log('⏳ Ожидаем активацию кошелька...');

    for (let i = 0; i < 10; i++) {
      await new Promise(res => setTimeout(res, 5000));
      const s = await wallet.methods.seqno().call();
      if (typeof s === 'number' && s >= 0) {
        console.log('✅ Кошелёк активен, seqno =', s);
        return;
      }
    }

    throw new Error('❌ Не удалось активировать кошелёк');
  }
}

async function sendTonReward(toAddress, amountTon) {
  await deployWalletIfNeeded();

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
