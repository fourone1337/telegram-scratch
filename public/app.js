const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");
const walletDisplay = document.getElementById("wallet-address");
const SERVER_URL = "https://scratch-lottery.ru";

let currentWalletAddress = null;
let currentTicket = null;
let openedIndices = [];
const history = [];

// 🔧 Конвертация raw → friendly
function toFriendly(addrRaw) {
  try {
    return toncore.Address.parseRaw(addrRaw).toString({ bounceable: true });
  } catch (e) {
    console.error("Ошибка конвертации адреса:", e);
    return addrRaw;
  }
}

// ✅ Инициализация TonConnect
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://telegram-scratch-two.vercel.app/tonconnect-manifest.json',
  buttonRootId: 'ton-connect'
});

tonConnectUI.onStatusChange(wallet => {
  const rawAddress = wallet?.account?.address || "";
  currentWalletAddress = rawAddress || null;

  const friendly = rawAddress ? toFriendly(rawAddress) : "";
  const shortAddress = friendly
    ? `${friendly.slice(0, 4)}...${friendly.slice(-3)}`
    : "🔴 Кошелёк не подключён.";

  walletDisplay.textContent = friendly
    ? `🟢 Кошелёк: ${shortAddress}`
    : shortAddress;

  buyBtn.disabled = !friendly;
  document.getElementById("topup").disabled = !friendly;

  status.textContent = friendly
    ? "Нажмите «Купить билет», чтобы начать игру!"
    : "Подключите кошелёк для начала игры.";

  if (friendly) {
    console.log("🧪 Friendly для сервера:", friendly);
    fetchBalance(friendly);
  }
});

// ✅ Купить билет
buyBtn.onclick = async () => {
  if (!currentWalletAddress) {
    alert("Подключите кошелёк.");
    return;
  }
  try {
    buyBtn.disabled = true;
    status.textContent = "⏳ Проверяем баланс...";
    await spendBalance(toFriendly(currentWalletAddress), 0.05);
    currentTicket = generateTicket();
    openedIndices = [];
    status.textContent = "Выберите 3 ячейки";
    renderTicket(currentTicket);
    await fetchBalance(toFriendly(currentWalletAddress));
  } catch (err) {
    console.error("Ошибка покупки:", err);
    alert(`Ошибка: ${err.message}`);
    status.textContent = "❌ Покупка не удалась.";
  } finally {
    buyBtn.disabled = false;
  }
};

// ✅ Пополнить
document.getElementById("topup").onclick = async () => {
  if (!currentWalletAddress) {
    alert("Подключите кошелёк.");
    return;
  }
  const input = prompt("Введите сумму TON:");
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    alert("Некорректная сумма");
    return;
  }
  try {
    status.textContent = "⏳ Ожидаем подтверждение...";
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: "UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g",
          amount: (amount * 1e9).toString()
        }
      ]
    });
    await verifyTopup(toFriendly(currentWalletAddress), amount);
  } catch (err) {
    console.error("Ошибка при пополнении:", err);
    status.textContent = "❌ Пополнение не удалось";
  }
};

// ✅ Вывести
document.getElementById("withdraw").onclick = async () => {
  try {
    const wallet = await tonConnectUI.wallet;
    if (!wallet || !wallet.account || !wallet.account.address) {
      return alert("❌ Кошелёк не подключён");
    }
    const friendly = toFriendly(wallet.account.address);
    const input = prompt("Введите сумму для вывода:");
    const amount = parseFloat(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Некорректная сумма");
      return;
    }
    const res = await fetch(`${SERVER_URL}/api/request-withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: friendly, amount })
    });
    const data = await res.json();
    if (data.success) alert("✅ Заявка принята");
    else alert("❌ Ошибка: " + data.error);
  } catch (e) {
    console.error("Ошибка при выводе:", e);
  }
};

// ✅ Серверные запросы
async function fetchBalance(address) {
  try {
    const res = await fetch(`${SERVER_URL}/api/balance/${address}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");
    document.getElementById("balance-display").textContent =
      `💰 Баланс: ${data.balance.toFixed(2)} TON`;
  } catch (err) {
    console.error("Ошибка загрузки баланса:", err);
    document.getElementById("balance-display").textContent = "💰 Баланс: ошибка";
  }
}

async function spendBalance(address, amount) {
  const res = await fetch(`${SERVER_URL}/api/spend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, amount })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка");
  return data;
}

async function verifyTopup(address, amount) {
  status.textContent = "⏳ Проверяем перевод...";
  const res = await fetch(`${SERVER_URL}/api/verify-topup/${address}/${amount}`);
  const data = await res.json();
  if (data.confirmed) {
    await fetchBalance(address);
    status.textContent = `✅ Пополнение ${amount} TON`;
  } else {
    status.textContent = "❌ Перевод не найден.";
  }
}

// 🎟 Остальные функции (generateTicket, renderTicket, renderHistory) остаются без изменений


function generateTicket() {
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
    container.style.justifyContent = "center";
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
    cell.style.userSelect = "none";
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

    if (currentWalletAddress) {
      sendWinToServer(currentWalletAddress, openedEmojis.join(""), reward);
      fetchWinners();
    }
  } else {
    status.textContent = "😞 К сожалению, вы проиграли. Попробуйте ещё.";
  }

  openedIndices = ticket.map((_, i) => i);
  renderTicket(ticket);

  history.push({ ticket, opened: [...openedIndices], winner: allSame, openedEmojis });
  renderHistory();
}

function renderHistory() {
  let historyDiv = document.getElementById("history");
  if (!historyDiv) {
    historyDiv = document.createElement("div");
    historyDiv.id = "history";
    historyDiv.style.marginTop = "30px";
    historyDiv.style.textAlign = "left";
    document.body.appendChild(historyDiv);
  }

  if (history.length === 0) {
    historyDiv.innerHTML = "<b>История пуста</b>";
    return;
  }

  const listItems = history.map((h, idx) => {
    const statusText = h.winner ? "Выигрыш" : "Проигрыш";
    const color = h.winner ? "green" : "red";
    const openedStr = h.openedEmojis.join(", ");
    return `<div style="color:${color}; margin-bottom:6px;">
      <b>Игра #${idx + 1}:</b> ${statusText} — Открытые: ${openedStr}
    </div>`;
  });

  historyDiv.innerHTML = "<h3>История игр</h3>" + listItems.join("");
}

/*async function sendWinToServer(address, emojis, reward) {
  try {
    await fetch(`${SERVER_URL}/api/wins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, emojis, reward, date: new Date().toISOString() })
    });
  } catch (err) {
    console.error("Ошибка отправки победы:", err);
  }
}

async function fetchWinners() {
  try {
    const res = await fetch(`${SERVER_URL}/api/wins`);
    const data = await res.json();
    renderWinners(data);
  } catch (err) {
    console.error("Ошибка загрузки победителей:", err);
  }
}

function renderWinners(data) {
  let winnersDiv = document.getElementById("winners");
  if (!winnersDiv) {
    winnersDiv = document.createElement("div");
    winnersDiv.id = "winners";
    winnersDiv.style.marginTop = "40px";
    winnersDiv.innerHTML = "<h3>🏆 Победители</h3>";
    document.body.appendChild(winnersDiv);
  }

  if (!data.length) {
    winnersDiv.innerHTML += "<div>Победителей пока нет</div>";
    return;
  }

  const list = data.map(win => {
    const shortAddr = `${win.address.slice(0, 4)}...${win.address.slice(-3)}`;
    const rewardInfo = win.reward ? ` — 💰 ${win.reward} TON` : "";
    return `<div>🎉 ${shortAddr} — ${win.emojis}${rewardInfo} (${new Date(win.date).toLocaleString()})</div>`;
  });

  winnersDiv.innerHTML = "<h3>🏆 Победители</h3>" + list.join("");
}

fetchWinners();
*/