import { TonConnect } from "https://unpkg.com/@tonconnect/sdk@latest";

const tonConnect = new TonConnect({
  manifestUrl: "https://telegram-scratch-yhgb.vercel.app/tonconnect-manifest.json"
});

const connectBtn = document.getElementById("connect");
const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");

const WALLET_ADDRESS = "UQB9fEOUC9inarIB7azGR-uS6t5Y8XoeJZyr5DYw2bIqFif7"; // ← замени на свой адрес

connectBtn.onclick = async () => {
  try {
    await tonConnect.connectWallet();
    const wallet = tonConnect.wallet;
    status.textContent = "✅ Кошелёк: " + wallet.account.address;
    buyBtn.disabled = false;
  } catch (error) {
    console.error(error);
    status.textContent = "❌ Ошибка подключения кошелька";
  }
};

buyBtn.onclick = async () => {
  const tx = {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: WALLET_ADDRESS,
        amount: (1 * 1e9).toString() // 1 TON в нанотонах
      }
    ]
  };

  try {
    await tonConnect.sendTransaction(tx);
    status.textContent = "📤 Транзакция отправлена. Ожидаем подтверждение.";
  } catch (error) {
    console.error(error);
    status.textContent = "❌ Транзакция отменена.";
  }
};
