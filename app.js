
const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];

const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");
const walletDisplay = document.getElementById("wallet-address");

const history = [];

let currentTicket = null;
let openedIndices = [];

// Инициализация TON Connect UI
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://telegram-scratch-yhgb.vercel.app/tonconnect-manifest.json',
  buttonRootId: 'ton-connect'
});

// Обновление статуса при изменении подключения
tonConnectUI.onStatusChange(wallet => {
  const fullAddress = wallet?.account?.address || "";
  const shortAddress = fullAddress
    ? `${fullAddress.slice(0, 4)}...${fullAddress.slice(-3)}`
    : "🔴 Кошелёк не подключён.";

  walletDisplay.textContent = fullAddress ? `🟢 Кошелёк: ${shortAddress}` : shortAddress;
  buyBtn.disabled = !wallet;
  status.textContent = fullAddress
    ? "Нажмите «Купить билет», чтобы начать игру!"
    : "Подключите кошелёк для начала игры.";
});

// Проверка подключения перед покупкой билета
buyBtn.onclick = () => {
  const wallet = tonConnectUI.connected;
  if (!wallet) {
    alert("Пожалуйста, подключите TON-кошелёк перед покупкой билета.");
    return;
  }

  currentTicket = generateTicket();
  openedIndices = [];
  status.textContent = "Выберите 3 ячейки, чтобы открыть";
  renderTicket(currentTicket);
};

function generateTicket() {
  const ticket = [];
  for (let i = 0; i < 6; i++) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    ticket.push(emoji);
  }
  return ticket;
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
    cell.style.backgroundColor = "#888";
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

      if (openedIndices.length === 3) {
        checkWin(ticket);
      }
    };

    container.appendChild(cell);
  });
}

function checkWin(ticket) {
  const openedEmojis = openedIndices.map(i => ticket[i]);
  const allSame = openedEmojis.every(e => e === openedEmojis[0]);

  if (allSame) {
    status.textContent = "🎉 Поздравляем! Вы выиграли!";

    const address = tonConnectUI.connected?.account?.address;
    const emojis = openedEmojis.join('');
    if (address) {
      sendWinToServer(address, emojis);
      fetchWinners();
      window.addEventListener("focus", fetchWinners);
    }
  } else {
    status.textContent = "😞 К сожалению, вы проиграли. Попробуйте ещё.";
  }

  history.push({
    ticket,
    opened: [...openedIndices],
    winner: allSame,
    openedEmojis
  });

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

async function sendWinToServer(address, emojis) {
  try {
    await fetch('/api/wins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        emojis,
        date: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error("Ошибка отправки победы:", err);
  }
}

async function fetchWinners() {
  try {
    const res = await fetch('/api/wins');
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
    return `<div>🎉 ${shortAddr} — ${win.emojis} (${new Date(win.date).toLocaleString()})</div>`;
  });

  winnersDiv.innerHTML = "<h3>🏆 Победители</h3>" + list.join("");
}

// Загрузка победителей при запуске
fetchWinners();
