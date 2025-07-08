const axios = require('axios');

const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY;
const FROM_WALLET = process.env.FROM_WALLET;
const SECRET_KEY = process.env.SECRET_KEY; // Пока не используется

async function sendTonReward(toAddress, amountTon) {
  const amountNano = (amountTon * 1e9).toFixed(0);
  console.log(`\n🚀 Подготовка к отправке ${amountTon} TON (${amountNano} nanoTON) на ${toAddress}`);

  // Здесь должна быть реальная отправка через TonCenter, TonWeb или другой SDK
  console.log(`⚠️ Симуляция отправки — TON не отправлен. Реализуй SDK/TonCenter вызов.`);

  return Promise.resolve();
}

module.exports = { sendTonReward };
