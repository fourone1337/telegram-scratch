const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];

const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");
const ticketContainer = document.getElementById("ticket-container");
const historyDiv = document.getElementById("history");

let currentTicket = null;
let openedIndices = [];
let openedCount = 0;

function createScratchCell(emoji, idx) {
  const wrapper = document.createElement("div");
  wrapper.className = "cell-wrapper";

  const emojiDiv = document.createElement("div");
  emojiDiv.className = "emoji";
  emojiDiv.textContent = emoji;

  const canvas = document.createElement("canvas");
  canvas.width = 60;
  canvas.height = 60;
  canvas.style.position = "absolute";
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.borderRadius = "8px";
  canvas.style.userSelect = "none";
  canvas.style.touchAction = "none";

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#888";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let isDrawing = false;

  function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function scratch(e) {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  function checkCleared() {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let visiblePixels = 0;
    for(let i = 3; i < imgData.data.length; i += 4){
      if(imgData.data[i] > 0) visiblePixels++;
    }
    return visiblePixels < 1800;
  }

  function finishCell() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.pointerEvents = "none";
    openedIndices.push(idx);
    openedCount++;
    if (openedCount === 3) {
      finishGame();
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (openedIndices.includes(idx)) return;
    if (openedCount >= 3) return;
    isDrawing = true;
    scratch(e);
  });
  canvas.addEventListener("pointermove", scratch);
  canvas.addEventListener("pointerup", () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (checkCleared()) {
      finishCell();
    }
  });
  canvas.addEventListener("pointerleave", () => {
    if (isDrawing) {
      isDrawing = false;
      if (checkCleared()) {
        finishCell();
      }
    }
  });

  wrapper.appendChild(emojiDiv);
  wrapper.appendChild(canvas);

  return wrapper;
}

function generateTicket() {
  const ticket = [];
  for (let i = 0; i < 6; i++) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    ticket.push(emoji);
  }
  return ticket;
}

function renderTicket(ticket) {
  ticketContainer.innerHTML = "";
  openedIndices = [];
  openedCount = 0;

  ticket.forEach((emoji, idx) => {
    const cell = createScratchCell(emoji, idx);
    ticketContainer.appendChild(cell);
  });
}

function finishGame() {
  const openedEmojis = openedIndices.map(i => currentTicket[i]);
  const allSame = openedEmojis.every(e => e === openedEmojis[0]);

  if (allSame) {
    status.textContent = "🎉 Поздравляем! Вы выиграли!";
  } else {
    status.textContent = "😞 К сожалению, вы проиграли. Попробуйте ещё.";
  }

  history.push({
    ticket: currentTicket,
    opened: [...openedIndices],
    winner: allSame,
    openedEmojis
  });

  renderHistory();
  buyBtn.disabled = false;
}

function renderHistory() {
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
  buyBtn.disabled = true;
  status.textContent = "Стирайте покрытие на 3 ячейках, чтобы открыть!";
  currentTicket = generateTicket();
  renderTicket(currentTicket);
};

const history = [];
