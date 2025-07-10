
const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");
const walletDisplay = document.getElementById("wallet-address");
const balanceDisplay = document.getElementById("balance-display");

const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];
const emojiRewards = {
  "🍒": 0.1,
  "⭐️": 0.2,
  "🍋": 0.3,
  "🔔": 0.4,
  "7️⃣": 0.5,
  "💎": 1.0
};

const SERVER_URL = "https://telegram-scratch.onrender.com";
let currentWalletAddress = null;
let currentTicket = null;
let openedIndices = [];
const history = [];

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: "tonconnect-manifest.json",
  buttonRootId: "ton-connect"
});

tonConnectUI.onStatusChange(wallet => {
  const fullAddress = wallet?.account?.address || "";
  const shortAddress = fullAddress
    ? `${fullAddress.slice(0, 4)}...${fullAddress.slice(-3)}`
    : "🔴 Кошелёк не подключён.";

  currentWalletAddress = fullAddress || null;

  walletDisplay.textContent = fullAddress
    ? `🟢 Кошелёк: ${shortAddress}`
    : shortAddress;

  buyBtn.disabled = !fullAddress;
  loadBalance(currentWalletAddress);
});

buyBtn.onclick = async () => {
  if (!currentWalletAddress) {
    alert("Пожалуйста, подключите TON-кошелёк.");
    return;
  }

  const price = 0.2;

  try {
    const res = await fetch(`${SERVER_URL}/api/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentWalletAddress, amount: price })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Ошибка при списании.");
      return;
    }

    currentTicket = generateTicket();
    openedIndices = [];
    status.textContent = "Выберите 3 ячейки, чтобы открыть";
    renderTicket(currentTicket);
    loadBalance(currentWalletAddress);

  } catch (err) {
    console.error("Ошибка покупки билета:", err);
    alert("Сервер недоступен.");
  }
};

function loadBalance(address) {
  if (!address) return;
  fetch(`${SERVER_URL}/api/balance/${address}`)
    .then(res => res.json())
    .then(data => {
      balanceDisplay.textContent = `💰 Баланс: ${data.balance} TON`;
    })
    .catch(err => {
      console.error("Ошибка загрузки баланса:", err);
      balanceDisplay.textContent = "💰 Баланс: —";
    });
}

function generateTicket() {
  const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];
  return Array.from({ length: 6 }, () => emojis[Math.floor(Math.random() * emojis.length)]);
}

function renderTicket(ticket) {
  const containerId = "ticket-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(3, 60px)";
    container.style.gridTemplateRows = "repeat(2, 60px)";
    container.style.gridGap = "10px";
    container.style.margin = "20px 0";
    document.body.insertBefore(container, status);
  }
  container.innerHTML = "";

  ticket.forEach((emoji, idx) => {
    const cell = document.createElement("div");
    cell.style.width = "60px";
    cell.style.height = "60px";
    cell.style.backgroundColor = "rgba(136, 136, 136, 0.1)";
    cell.style.borderRadius = "8px";
    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    cell.style.fontSize = "36px";
    cell.style.cursor = "pointer";
    cell.textContent = openedIndices.includes(idx) ? emoji : "❓";

    cell.onclick = () => {
      if (openedIndices.length >= 3 || openedIndices.includes(idx)) return;
      openedIndices.push(idx);
      cell.textContent = emoji;
      if (openedIndices.length === 3) checkWin(ticket);
    };

    container.appendChild(cell);
  });
}

function checkWin(ticket) {
  const openedEmojis = openedIndices.map(i => ticket[i]);
  const allSame = openedEmojis.every(e => e === openedEmojis[0]);

  if (allSame) {
    const symbol = openedEmojis[0];
    const reward = emojiRewards[symbol] || 0;
    status.textContent = `🎉 Вы выиграли ${reward} TON за ${symbol}!`;

    fetch(`${SERVER_URL}/api/wins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: currentWalletAddress,
        emojis: openedEmojis.join(""),
        reward,
        date: new Date().toISOString()
      })
    });

    fetch(`${SERVER_URL}/api/topup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentWalletAddress, amount: reward })
    });

    loadBalance(currentWalletAddress);
  } else {
    status.textContent = "😞 К сожалению, вы проиграли. Попробуйте ещё.";
  }
}
