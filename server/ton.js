const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { Address, toNano } = require('@ton/core');
require('dotenv').config();

const MNEMONIC = process.env.MNEMONIC;
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;

if (!MNEMONIC || !TONCENTER_API_KEY) {
  throw new Error('❌ MNEMONIC или TONCENTER_API_KEY не найдены в .env');
}

const toncenterEndpoint = `https://toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_API_KEY}`;
const client = new TonClient({ endpoint: toncenterEndpoint });

let walletContract;
let keyPair;

async function initWallet() {
  keyPair = await mnemonicToPrivateKey(MNEMONIC.split(' '));

  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  walletContract = client.open(wallet);

  console.log("👛 Кошелёк TON создан по мнемонике:", walletContract.address.toString());
}

async function sendTonReward(toAddressRaw, amountTon) {
  if (!walletContract || !keyPair) {
    await initWallet();
  }

  const to = Address.parse(toAddressRaw);
  const value = toNano(amountTon.toString());

  const seqno = await walletContract.getSeqno();

  console.log(`🚀 Отправляем ${amountTon} TON на ${to.toString()}...`);

  await walletContract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: 3,
    messages: [
      internal({
        to,
        value,
        body: '🏆 Вы выиграли в лотерее!',
      }),
    ],
  });

  console.log('✅ TON отправлены!');
}

module.exports = { sendTonReward };
