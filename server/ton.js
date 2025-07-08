async function sendTonReward(toAddress, amountTon) {
  const address = await wallet.getAddress();
  const walletInfo = await tonweb.provider.getAddressInfo(address.toString());

  if (walletInfo.state !== 'active') {
    console.log("📦 Кошелёк не активирован. Выполняем deploy...");

    await wallet.deploy({ secretKey: keyPair.secretKey }).send();

    for (let i = 0; i < 10; i++) {
      await new Promise(res => setTimeout(res, 3000));
      const info = await tonweb.provider.getAddressInfo(address.toString());
      if (info.state === 'active') {
        console.log("✅ Кошелёк успешно активирован.");
        break;
      }
      if (i === 9) throw new Error("❌ Кошелёк не активировался после deploy.");
    }
  }

  const seqno = await wallet.methods.seqno().call();
  const amountNano = TonWeb.utils.toNano(amountTon.toString());

  console.log(`🚀 Отправляем ${amountTon} TON на ${toAddress}...`);

  await wallet.methods.transfer({
    secretKey: keyPair.secretKey,
    toAddress,
    amount: amountNano,
    seqno,
    payload: null,
    sendMode: 3
  }).send();

  console.log("✅ Транзакция отправлена!");
}
