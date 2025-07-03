const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];

const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");

const history = [];

let currentTicket = null;
let openedIndices = [];

function generateTicket() {
  // 9 эмодзи для 3x3, с повторами
  const ticket = [];
  for (let i = 0; i < 9; i++) {
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
