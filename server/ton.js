const { TonClient, WalletContractV4, internal } = require('@ton/ton');
const { mnemonicToPrivateKey } = require('@ton/crypto');
const { Address, toNano } = require('@ton/core');
require('dotenv').config();

// Загрузка переменных окружения
const SECRET_KEY = process.env.SECRET_KEY; // Мнемоника
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;

if (!SECRET_KEY || !TONCENTER_API_KEY) {
  throw new Error('❌ SECRET_KEY или TONCENTER_API_KEY не найдены в .env');
}

// Основная функция отправки TON — уже с готовым адресом, суммой и условием
async function sendTonRewardIfWin({ address, emojis, reward }) {
  const winning = checkWin(emojis); // 🎰 Проверка выигрыша по эмоджи
  if (!winning || reward <= 0) {
    console.log('❌ Не выиграл — TON не отправлены.');
    return;
  }

  const toncenterEndpoint = `https://toncenter.com/api/v2/jsonRPC?api_key=${TONCENTER_API_KEY}`;
  const client = new TonClient({ endpoint: toncenterEndpoint });

  const keyPair = await mnemonicToPrivateKey(SECRET_KEY.split(' '));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const walletContract = client.open(wallet);

  const recipientAddress = Address.parse(address);
  const amountToSend = toNano(reward.toString());

  console.log(`🎯 Победа! Отправляем ${reward} TON на ${recipientAddress.toString()}`);

  await walletContract.sendTransfer({
    seqno: await walletContract.getSeqno(),
    secretKey: keyPair.secretKey,
    messages: [internal({
      to: recipientAddress,
      value: amountToSend,
      body: '🎁 Scratch Lottery reward',
    })],
    sendMode: 3,
  });

  console.log('✅ TON отправлены!');
}

// Проверка, что все 3 эмоджи совпадают
function checkWin(emojis) {
  if (typeof emojis !== 'string' || emojis.length < 3) return false;
  const symbols = [...emojis];
  return symbols.every(s => s === symbols[0]);
}

module.exports = { sendTonRewardIfWin };
