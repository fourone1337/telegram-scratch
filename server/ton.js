async function sendTonReward(toAddress) {
  console.log(`🎁 Заглушка: Отправляем приз победителю на ${toAddress} (на самом деле не отправляется)`);
  // Здесь будет логика Toncenter или SDK
  return Promise.resolve();
}

module.exports = { sendTonReward };