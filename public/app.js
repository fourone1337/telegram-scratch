// === Основные элементы ===
const buyBtn = document.getElementById("buy");
const status = document.getElementById("status");
const walletDisplay = document.getElementById("wallet-address");
const SERVER_URL = "https://scratch-lottery.ru";

// 🎟️ Модальное окно для билета
const ticketModal = document.getElementById("ticket-modal");
const closeTicketBtn = document.getElementById("close-ticket");
const buyAgainBtn = document.getElementById("buy-again");

const emojis = ["🍒", "⭐️", "🍋", "🔔", "7️⃣", "💎"];
const emojiRewards = {
  "🍒": 0.15,
  "⭐️": 0.25,
  "🍋": 0.15,
  "🔔": 0.1,
  "7️⃣": 0.1,
  "💎": 0.4
};

let currentWalletAddress = null;
let currentTicket = null;
let openedIndices = [];
const history = [];

// ✅ Обновление баланса ===
function updateBalanceText(balance, isError = false) {
  const el = document.getElementById("balance-text");
  el.textContent = isError ? "Ошибка" : `${balance.toFixed(2)} TON`;
}
//////////////////////////////////////////////////////////////////////////////
// 📌 Получаем параметры из URL
const params = new URLSearchParams(window.location.search);

// 📌 Смотрим, есть ли параметр ref
const refFromLink = params.get('ref');

if (refFromLink) {
  console.log("✅ Найден реферал в ссылке:", refFromLink);
  // Сохраняем его в localStorage, чтобы потом использовать при регистрации
  localStorage.setItem('referrer', refFromLink);
}
////////////////////////////////////////////////////////////////////////

// ✅ Логика кастомного alert
const customAlert = document.getElementById('custom-alert');
const customAlertText = document.getElementById('custom-alert-text');
const customAlertOk = document.getElementById('custom-alert-ok');
const customAlertClose = document.getElementById('close-custom-alert');

function showCustomAlert(text) {
  customAlertText.textContent = text;
  customAlert.style.display = 'block';
}

customAlertOk.onclick = () => {
  customAlert.style.display = 'none';
};

customAlertClose.onclick = () => {
  customAlert.style.display = 'none';
};

window.addEventListener('click', (e) => {
  if (e.target === customAlert) {
    customAlert.style.display = 'none';
  }
});

// ✅ Инициализация TonConnect ===
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://telegram-scratch-two.vercel.app/tonconnect-manifest.json',
  buttonRootId: 'ton-connect'
});

tonConnectUI.onStatusChange(wallet => {
  const raw = wallet?.account?.address || "";
  let friendly = null;
  if (raw) {
    try {
      friendly = new TonWeb.utils.Address(raw).toString(true, true, true);
    } catch {
      try {
        friendly = new TonWeb.utils.Address(raw).toString(true, false, true);
      } catch (e) {
        console.error("Ошибка конвертации адреса:", e);
      }
    }
  }

  const enabled = !!friendly;
  buyBtn.disabled = !enabled;       // ✅ активируем 6-слотовую
  buyBtn9.disabled = !enabled;   // ✅ активируем 9-слотовую
  document.getElementById("topup").disabled = !enabled;
  document.getElementById("withdraw").disabled = !enabled;

  currentWalletAddress = friendly || null;
  status.textContent = enabled
    ? "Нажмите «Купить билет», чтобы начать игру!"
    : "Подключите кошелёк для начала игры.";

  if (friendly) fetchBalance(friendly);

  const referrer = localStorage.getItem('referrer');
if (referrer && referrer !== friendly) {
  fetch(`${SERVER_URL}/api/register-referral`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ referrer, friend: friendly })
  })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
}
});

// === Кнопка копирования реферальной ссылки ===
const copyRefBtn = document.getElementById("copy-ref");
copyRefBtn.onclick = () => {
  if (!currentWalletAddress) {
    alert("Сначала подключите кошелёк!");
    return;
  }
  const link = `${window.location.origin}?ref=${currentWalletAddress}`;

  // Пытаемся скопировать через Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(link)
      .then(() => {
        alert("✅ Ваша реферальная ссылка скопирована!\n" + link);
      })
      .catch(err => {
        console.warn("⚠️ Clipboard API не сработал:", err);
        // Фоллбек
        prompt("Скопируйте ссылку вручную:", link);
      });
  } else {
    // Фоллбек если Clipboard API недоступен
    prompt("Скопируйте ссылку вручную:", link);
  }
};


// === Универсальная покупка билета ===
async function buyTicket() {
  if (!currentWalletAddress) {
    alert("Сначала подключите кошелёк!");
    return;
  }
  try {
    status.textContent = "⏳ Проверяем баланс...";
    buyBtn.disabled = true;
    buyAgainBtn.disabled = true;

    // цена билета
    await spendBalance(currentWalletAddress, 0.05); //✅ цена билета 6 слотов

    // генерация и рендер
    currentTicket = generateTicket();
    openedIndices = [];
    status.textContent = "Выберите 3 ячейки, чтобы открыть";
    renderTicket(currentTicket);

    // открываем модалку
    ticketModal.style.display = "block";

    // обновляем баланс
    await fetchBalance(currentWalletAddress);
  } catch (err) {
    console.error("Ошибка покупки:", err);
    alert(`Ошибка: ${err.message}`);
    status.textContent = "❌ Покупка не удалась.";
  } finally {
    buyBtn.disabled = false;
    buyAgainBtn.disabled = false;
  }
}

// === Кнопки покупки ===
buyBtn.onclick = buyTicket;
buyAgainBtn.onclick = buyTicket;

// === Кнопка бесплатного билета ===
const freeTicketBtn = document.getElementById("free-ticket");
freeTicketBtn.onclick = async () => {
  if (!currentWalletAddress) return alert("Сначала подключите кошелёк!");
  try {
    const res = await fetch(`${SERVER_URL}/api/use-free-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentWalletAddress })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");

    // Генерация билета без списания TON
    currentTicket = generateTicket();
    openedIndices = [];
    status.textContent = "Выберите 3 ячейки, чтобы открыть";
    renderTicket(currentTicket);
    ticketModal.style.display = "block";

    alert(`✅ Бесплатный билет использован! Осталось: ${data.remaining}`);
  } catch (err) {
    alert(`❌ ${err.message}`);
  }
};

// === Закрытие модалки билета ===
closeTicketBtn.onclick = () => ticketModal.style.display = "none";
window.onclick = (e) => {
  if (e.target === ticketModal) ticketModal.style.display = "none";
};

// === Модалка пополнения ===
const topupModal = document.getElementById("topup-modal");
const closeTopupBtn = document.getElementById("close-topup");
const topupOkBtn = document.getElementById("topup-ok");
const topupInput = document.getElementById("topup-input");

document.getElementById("topup").onclick = () => {
  if (!currentWalletAddress) {
    alert("Сначала подключите TON-кошелёк");
    return;
  }
  topupInput.value = "";
  topupModal.style.display = "block";
};

closeTopupBtn.onclick = () => topupModal.style.display = "none";
window.addEventListener("click", e => {
  if (e.target === topupModal) topupModal.style.display = "none";
});

topupOkBtn.onclick = async () => {
  const amount = parseFloat(topupInput.value);
  if (isNaN(amount) || amount <= 0) return alert("Некорректная сумма");
  try {
    status.textContent = "⏳ Ожидаем перевод...";
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [{
        address: "UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g",
        amount: (amount * 1e9).toString()
      }]
    });
    await verifyTopup(currentWalletAddress, amount);
    topupModal.style.display = "none";
  } catch (err) {
    console.error("Ошибка пополнения:", err);
    alert("❌ Пополнение отменено или не удалось");
  }
};

// === Модалка вывода средств ===
const withdrawModal = document.getElementById("withdraw-modal");
const closeWithdrawBtn = document.getElementById("close-withdraw");
const withdrawOkBtn = document.getElementById("withdraw-ok");
const withdrawInput = document.getElementById("withdraw-input");

document.getElementById("withdraw").onclick = () => {
  if (!currentWalletAddress) {
    alert("Сначала подключите кошелёк");
    return;
  }
  withdrawInput.value = "";
  withdrawModal.style.display = "block";
};

closeWithdrawBtn.onclick = () => withdrawModal.style.display = "none";
window.addEventListener("click", e => {
  if (e.target === withdrawModal) withdrawModal.style.display = "none";
});

withdrawOkBtn.onclick = async () => {
  const amount = parseFloat(withdrawInput.value);
  if (isNaN(amount) || amount <= 0) return alert("Некорректная сумма");
  try {
    const res = await fetch(`${SERVER_URL}/api/request-withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: currentWalletAddress, amount })
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ Заявка на вывод принята");
      withdrawModal.style.display = "none";
    } else {
      alert("❌ Ошибка: " + data.error);
    }
  } catch (err) {
    alert("❌ Ошибка при выводе: " + err.message);
  }
};

// === Проверка пополнения ===
async function verifyTopup(address, amount) {
  status.textContent = "⏳ Проверка перевода...";
  const res = await fetch(`${SERVER_URL}/api/verify-topup/${address}/${amount}`);
  const data = await res.json();
  if (data.confirmed) {
    await fetchBalance(address);
    status.textContent = `✅ Пополнение на ${amount} TON`;
  } else {
    status.textContent = "❌ Перевод не найден";
  }
}

// === Баланс ===
async function fetchBalance(address) {
  try {
    const res = await fetch(`${SERVER_URL}/api/balance/${address}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка запроса");
    updateBalanceText(data.balance);
  } catch (err) {
    console.error("Ошибка баланса:", err);
    updateBalanceText(0, true);
  }
}

// === Списание TON ===
async function spendBalance(address, amount) {
  const res = await fetch(`${SERVER_URL}/api/spend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, amount })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка списания");
  return data;
}

// === Генерация и отрисовка билета ===
function generateTicket() {
  return Array.from({ length: 6 }, () => emojis[Math.floor(Math.random() * emojis.length)]);
}

function renderTicket(ticket) {
  const container = document.getElementById("ticket-container");
  container.innerHTML = "";

  ticket.forEach((emoji, idx) => {
    const cell = document.createElement("div");
    cell.textContent = openedIndices.includes(idx) ? emoji : "❓";
    if (openedIndices.includes(idx)) cell.classList.add("opened");

    cell.onclick = () => {
      if (openedIndices.length >= 3 || openedIndices.includes(idx)) return;
      openedIndices.push(idx);
      cell.textContent = emoji;
      cell.classList.add("selected", "opened");
      if (openedIndices.length === 3) checkWin(ticket);
    };
    container.appendChild(cell);
  });
}

// === Проверка выигрыша ===
function checkWin(ticket) {
  const openedEmojis = openedIndices.map(i => ticket[i]);
  const allSame = openedEmojis.every(e => e === openedEmojis[0]);

  if (allSame) {
    const symbol = openedEmojis[0];
    const reward = emojiRewards[symbol] || 0;
    status.textContent = `🎉 Вы выиграли ${reward} TON за ${symbol}!`;
    // здесь можно вызвать sendWinToServer(...)
  } else {
    status.textContent = "😞 К сожалению, вы проиграли.";
  }

  const cells = document.querySelectorAll("#ticket-container div");
  ticket.forEach((emoji, i) => {
    if (!openedIndices.includes(i)) {
      cells[i].textContent = emoji;
      cells[i].classList.add("opened");
    }
  });
  openedIndices = ticket.map((_, i) => i);
}

// Модальное окно условий
const modal = document.getElementById("terms-modal");
const closeBtn = document.getElementById("close-terms");
const acceptBtn = document.getElementById("accept-terms");
const termsText = document.getElementById("terms-text");

document.getElementById("disclaimer-button").addEventListener("click", async () => {
  try {
    const response = await fetch("terms.txt");
    const text = await response.text();
    termsText.textContent = text;
  } catch (err) {
    termsText.textContent = "⚠ Не удалось загрузить условия.";
  }
  modal.style.display = "block";
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

acceptBtn.addEventListener("click", () => {
  modal.style.display = "none";
});


// === 9-слотовый билет ===
const buyBtn9 = document.getElementById("buy9");
const ticketModal9 = document.getElementById("ticket-modal-9");
const closeTicketBtn9 = document.getElementById("close-ticket-9");
const buyAgainBtn9 = document.getElementById("buy-again-9");

let currentTicket9 = null;
let openedIndices9 = [];

// генерируем 9 слотов
function generateTicket9() {
  return Array.from({ length: 9 }, () => emojis[Math.floor(Math.random() * emojis.length)]);
}

function renderTicket9(ticket) {
  const container = document.getElementById("ticket-container-9");
  container.innerHTML = "";

  ticket.forEach((emoji, idx) => {
    const cell = document.createElement("div");
    cell.textContent = openedIndices9.includes(idx) ? emoji : "❓";
    if (openedIndices9.includes(idx)) cell.classList.add("opened");

    cell.onclick = () => {
      if (openedIndices9.length >= 3 || openedIndices9.includes(idx)) return;
      openedIndices9.push(idx);
      cell.textContent = emoji;
      cell.classList.add("selected", "opened");
      if (openedIndices9.length === 3) checkWin9(ticket);
    };
    container.appendChild(cell);
  });
}

function checkWin9(ticket) {
  const openedEmojis = openedIndices9.map(i => ticket[i]);
  const allSame = openedEmojis.every(e => e === openedEmojis[0]);

  if (allSame) {
    const symbol = openedEmojis[0];
    const reward = emojiRewards[symbol] || 0;
    status.textContent = `🎉 (9 слотов) Вы выиграли ${reward} TON за ${symbol}!`;
  } else {
    status.textContent = "😞 (9 слотов) К сожалению, вы проиграли.";
  }

  const cells = document.querySelectorAll("#ticket-container-9 div");
  ticket.forEach((emoji, i) => {
    if (!openedIndices9.includes(i)) {
      cells[i].textContent = emoji;
      cells[i].classList.add("opened");
    }
  });
  openedIndices9 = ticket.map((_, i) => i);
}

async function buyTicket9() {
  if (!currentWalletAddress) {
    alert("Сначала подключите кошелёк!");
    return;
  }
  try {
    status.textContent = "⏳ Проверяем баланс...";
    buyBtn9.disabled = true;
    buyAgainBtn9.disabled = true;

    await spendBalance(currentWalletAddress, 0.1); //✅ цена билета 9 слотов

    currentTicket9 = generateTicket9();
    openedIndices9 = [];
    status.textContent = "Выберите 3 ячейки, чтобы открыть";
    renderTicket9(currentTicket9);

    ticketModal9.style.display = "block";

    await fetchBalance(currentWalletAddress);
  } catch (err) {
    console.error("Ошибка покупки (9 слотов):", err);
    alert(`Ошибка: ${err.message}`);
    status.textContent = "❌ Покупка не удалась.";
  } finally {
    buyBtn9.disabled = false;
    buyAgainBtn9.disabled = false;
  }
}

// Кнопки 9-слотового билета
buyBtn9.onclick = buyTicket9;
buyAgainBtn9.onclick = buyTicket9;

// Закрытие модалки
closeTicketBtn9.onclick = () => ticketModal9.style.display = "none";
window.addEventListener("click", (e) => {
  if (e.target === ticketModal9) ticketModal9.style.display = "none";
});
