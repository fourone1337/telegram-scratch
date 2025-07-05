const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://telegram-scratch-yhgb.vercel.app/tonconnect-manifest.json',
  buttonRootId: 'ton-connect'
});

console.log("📦 Инициализация TON Connect UI...");

setTimeout(() => {
  const btn = document.querySelector('#ton-connect button');
  if (!btn) {
    console.error("❌ Кнопка TON Connect не отрендерилась.");
  } else {
    console.log("✅ Кнопка TON Connect появилась!");
  }
}, 2000);

const testButton = document.createElement("button");
testButton.textContent = "🔗 Подключить кошелёк (тест вручную)";
testButton.onclick = () => {
  tonConnectUI.connect();
};
document.body.appendChild(testButton);