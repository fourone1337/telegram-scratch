// === Данные для игры ===
export const emojis = ["🍒","⭐️","🍋","🔔","7️⃣","💎"];
export const emojiRewards = { "🍒":5, "⭐️":10, "🍋":15, "🔔":20, "7️⃣":25, "💎":30 };
export const bonusValues = [1, 1, 1, 2, 1, 4];

export const state6 = {
  ticket: null,
  opened: [],
  boughtCount: 0,
  bonus: null,
  bonusOpened: false
};

// === Генерация билета ===
export function generateTicket(slotCount) {
  return Array.from({length: slotCount}, () =>
    emojis[Math.floor(Math.random() * emojis.length)]
  );
}

// === Рендер ячеек ===
export function renderTicket(ticket, state, container, statusPrefix = "", isActive = true, onCheckWin) {
  container.innerHTML = "";
  ticket.forEach((emoji, idx) => {
    const cell = document.createElement("div");
    cell.textContent = state.opened.includes(idx) ? emoji : "❓";
    if (state.opened.includes(idx)) cell.classList.add("opened");

    cell.onclick = () => {
      if (!isActive) return;
      if (state.opened.length >= 4 || state.opened.includes(idx)) return;
      state.opened.push(idx);
      cell.textContent = emoji;
      cell.classList.add("selected", "opened");
      if (state.opened.length === 4) onCheckWin(ticket, state, container, statusPrefix);
    };
    container.appendChild(cell);
  });

  // Бонусная ячейка
  const bonusCell = document.createElement("div");
  bonusCell.classList.add("bonus-cell");
  bonusCell.textContent = state.bonusOpened ? `x${state.bonus}` : "🎁";
  bonusCell.onclick = () => {
    if (state.bonusOpened) return;
    state.bonusOpened = true;
    bonusCell.textContent = `x${state.bonus}`;
    bonusCell.classList.add("opened-bonus");

    // Раскрываем выбранные
    const allCells = container.querySelectorAll("div:not(.bonus-cell)");
    state.opened.forEach(i => {
      const c = allCells[i];
      c.textContent = ticket[i];
      c.classList.add("opened");
    });

    if (state.opened.length === 4) onCheckWin(ticket, state, container, statusPrefix);
  };
  container.appendChild(bonusCell);
}

// === Проверка выигрыша ===
export function checkWin(ticket, state, container, statusPrefix = "", statusEl, sendWinCb) {
  const openedEmojis = state.opened.map(i => ticket[i]);
  const counts = {};
  for (let emoji of openedEmojis) {
    counts[emoji] = (counts[emoji] || 0) + 1;
  }
  let winEmoji = null;
  for (let [emoji, count] of Object.entries(counts)) {
    if (count >= 3) {
      winEmoji = emoji;
      break;
    }
  }
  if (winEmoji) {
    let reward = emojiRewards[winEmoji] || 0;
    if (state.bonusOpened && state.bonus > 1) {
      reward *= state.bonus;
      statusEl.textContent = `${statusPrefix}🎉 Вы выиграли ${reward} TON за ${winEmoji} (Бонус x${state.bonus})!`;
    } else {
      statusEl.textContent = `${statusPrefix}🎉 Вы выиграли ${reward} TON за ${winEmoji}!`;
    }
    sendWinCb(openedEmojis, reward);
  } else {
    statusEl.textContent = `${statusPrefix}😞 К сожалению, вы проиграли.`;
  }
}
