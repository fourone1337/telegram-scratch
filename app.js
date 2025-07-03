// Предположим, TON Connect пока отключен, просто для логики игры

const connectBtn = document.getElementById("connect");
const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");

// Массив истории билетов
const history = [];

// Генератор билета
function buyTicket() {
  const chance = Math.floor(Math.random() * 100);
  const isWinner = chance < 20; // 20% шанс выиграть
  const ticketNumber = Math.floor(Math.random() * 1_000_000);
  return { number: ticketNumber, winner: isWinner };
}

// Функция для обновления истории в UI
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
  
  const listItems = history.map(ticket => {
    const color = ticket.winner ? "green" : "red";
    const statusText = ticket.winner ? "Выигрыш" : "Проигрыш";
    return `<div style="color:${color}; margin-bottom:4px;">
      🎫 Билет #${ticket.number} — <b>${statusText}</b>
    </div>`;
  });
  
  historyDiv.innerHTML = `<h3>История билетов</h3>` + listItems.join("");
}

// Обработка нажатия кнопки «Купить билет»
buyBtn.onclick = () => {
  const ticket = buyTicket();
  history.push(ticket);

  if (ticket.winner) {
    status.textContent = `🎉 Поздравляем! Ваш билет #${ticket.number} выиграл!`;
  } else {
    status.textContent = `😞 Увы, билет #${ticket.number} проиграл. Попробуйте ещё!`;
  }
  
  renderHistory();
};

// Пока кнопка «Купить билет» активна по умолчанию
buyBtn.disabled = false;

// Статус пока пустой
status.textContent = "Нажмите «Купить билет», чтобы сыграть!";
