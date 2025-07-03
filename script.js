const tg = window.Telegram.WebApp;
tg.expand();

const userInfo = document.getElementById("user-info");
const btn = document.getElementById("buy-button");

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
  const user = tg.initDataUnsafe.user;
  userInfo.innerText = `Привет, ${user.first_name}! (ID: ${user.id})`;
} else {
  userInfo.innerText = "Не удалось получить данные Telegram.";
}

// TON Connect
let tonConnect;
let connectedWallet;

btn.innerText = "🔌 Подключить TON кошелёк";
btn.addEventListener("click", async () => {
  if (!tonConnect) {
    tonConnect = new TonConnect({
      manifestUrl: "https://your-vercel-url.vercel.app/tonconnect-manifest.json"
    });
  }

  await tonConnect.restoreConnection(); // восстановим, если уже подключено

  if (!tonConnect.wallet) {
    await tonConnect.connectWallet();
  }

  connectedWallet = tonConnect.wallet;

  if (connectedWallet) {
    const address = connectedWallet.account.address;
    btn.innerText = `✅ Кошелёк: ${address.slice(0, 6)}...${address.slice(-4)}`;
    userInfo.innerText += `\nTON: ${address}`;
  } else {
    alert("Не удалось подключить кошелёк.");
  }
});
