const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];

const connectBtn = document.getElementById("connect");
const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");

const history = [];

let currentTicket = null;
let openedIndices = [];

function generateTicket() {
  // Случайно выбираем 6 эмодзи с повторами
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
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.margin = "20px 0";
    container.style.gap = "10px";
    document.body.insertBefore(container, status);
  }
  container.innerHTML = "";

  ticket.forEach((emoji, idx) => {
    const cell = document.createElement("div");
    cell.style.width = "50px";
    cell.style.height = "50px";
    cell.style.backgroundColor = "#888";
    cell.style.borderRadius = "8px";
    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    cell.style.fontSize = "32px";
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
  // Получаем открытые эмодзи
  const openedEmojis = openedIndices.map(i => ticket[i]);
  // Проверяем, все ли три совпадают
  const allSame = openedEmojis.every(e => e === openedEmojis[0]);

  if (allSame) {
    status.textContent = "🎉 Поздравляем! Вы выиграли!";
  } else {
    status.textContent = "😞 К сожалению, вы проиграли. Попробуйте ещё.";
  }

  // Сохраняем в историю
  history.push({
    ticket: ticket,
    opened: [...openedIndices],
    winner: allSame,
    openedEmojis: openedEmojis
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

  historyDiv.innerHTML = `<h3>История игр</h3>` + listItems.join("");
}

buyBtn.onclick = () => {
  currentTicket = generateTicket();
  openedIndices = [];
  status.textContent = "Выберите 3 ячейки, чтобы открыть";
  renderTicket(currentTicket);
};

buyBtn.disabled = false;
status.textContent = "Нажмите «Купить билет», чтобы начать игру!";
