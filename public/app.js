// === Основные элементы ===
const status = document.getElementById("status");
const SERVER_URL = "https://scratch-lottery.ru";
let currentWalletAddress = null;
let isTicketActive6 = false;
let isTicketActive9 = false;

// === 6 слотов ===
const buyBtn = document.getElementById("buy");
const buyAgainBtn = document.getElementById("buy-again");
const closeTicketBtn = document.getElementById("close-ticket");
const ticketModal = document.getElementById("ticket-modal");
const ticketContainer = document.getElementById("ticket-container");

// === 9 слотов ===
const buyBtn9 = document.getElementById("buy9");
const buyAgainBtn9 = document.getElementById("buy-again-9");
const closeTicketBtn9 = document.getElementById("close-ticket-9");
const ticketModal9 = document.getElementById("ticket-modal-9");
const ticketContainer9 = document.getElementById("ticket-container-9");

// === Бесплатный билет ===
const freeTicketBtn = document.getElementById("free-ticket");

// === Универсальные данные и состояния ===
const emojis = ["🍒","⭐️","🍋","🔔","7️⃣","💎"];
const emojiRewards = { "🍒":5, "⭐️":10, "🍋":15, "🔔":20, "7️⃣":25, "💎":30 };
const state6 = { ticket:null, opened:[], boughtCount:0 };
const state9 = { ticket:null, opened:[], boughtCount:0 };

// === Модалка с условиями ===
const termsModal = document.getElementById("terms-modal");
const termsText = document.getElementById("terms-text");
const closeTermsBtn = document.getElementById("close-terms");
const acceptTermsBtn = document.getElementById("accept-terms");
const disclaimerBtn = document.getElementById("disclaimer-button");

// открыть модалку по кнопке
disclaimerBtn.onclick = async () => {
  try {
    // загружаем текст условий
    const response = await fetch("terms.txt");
    if (!response.ok) {
      throw new Error("Не удалось загрузить условия");
    }
    const text = await response.text();
    termsText.textContent = text;
  } catch (err) {
    console.error("Ошибка загрузки условий:", err);
    termsText.textContent = "⚠ Не удалось загрузить условия.";
  }
  termsModal.style.display = "block";
};

// закрыть по крестику
closeTermsBtn.onclick = () => {
  termsModal.style.display = "none";
};

// закрыть по кнопке «Принять»
acceptTermsBtn.onclick = () => {
  termsModal.style.display = "none";
};

// закрыть по клику вне модалки
window.addEventListener("click", (e) => {
  if (e.target === termsModal) {
    termsModal.style.display = "none";
  }
});


// === Функция обновления визуала кнопки бесплатного билета ===
function updateFreeTicketVisual(remaining) {
  if (remaining > 0) {
    freeTicketBtn.disabled = false;
    freeTicketBtn.classList.remove("no-free");
  } else {
    freeTicketBtn.disabled = true;
    freeTicketBtn.classList.add("no-free");
  }
}

// === Баланс ===
function updateBalanceText(balance,isError=false){
  document.getElementById("balance-text").textContent = isError ? "Ошибка" : `${balance.toFixed(2)} TON`;
}
async function fetchBalance(address) {
  try {
    const res = await fetch(`${SERVER_URL}/api/balance/${address}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка запроса");

    updateBalanceText(data.balance);
    updateModalBalances(data.balance); // 🔥 добавляем вызов
  } catch (err) {
    console.error("Ошибка баланса:", err);
    updateBalanceText(0, true);
    updateModalBalances(0, true);
  }
}
//==Обновление баланса в модалке
function updateModalBalances(balance, isError = false) {
  const text = isError ? "Ошибка" : `${balance.toFixed(2)} TON`;

  const el6 = document.getElementById("modal-balance-6");
  if (el6) el6.textContent = text;

  const el9 = document.getElementById("modal-balance-9");
  if (el9) el9.textContent = text;
}

async function spendBalance(address,amount){
  const res = await fetch(`${SERVER_URL}/api/spend`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({address,amount})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error||"Ошибка списания");
  return data;
}

// == Отправка выигрыша на сервер
async function sendWinToServer(address, emojis, reward) {
  try {
    const res = await fetch(`${SERVER_URL}/api/wins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        emojis,
        reward,
        date: new Date().toISOString()
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка при записи выигрыша");
    console.log("✅ Выигрыш записан:", data);
    await fetchBalance(address); // обновляем баланс в реальном времени
  } catch (e) {
    console.error("❌ Ошибка при отправке выигрыша:", e);
  }
}

// === Проверка количества бесплатных билетов ===
async function checkFreeTickets(address) {
  try {
    const res = await fetch(`${SERVER_URL}/api/free-tickets/${address}`);
    const data = await res.json();
    console.log("Ответ по бесплатным билетам:", data); // можно удалить после теста

    if (res.ok && typeof data.freeTickets === 'number') {
      updateFreeTicketVisual(data.freeTickets); // ✅ используем freeTickets
    } else {
      updateFreeTicketVisual(0);
    }
  } catch (e) {
    console.error("Ошибка проверки бесплатных билетов:", e);
    updateFreeTicketVisual(0);
  }
}
// === Генерация и рендер билета ===
function generateTicket(slotCount){
  return Array.from({length:slotCount},()=>emojis[Math.floor(Math.random()*emojis.length)]);
}
function renderTicket(ticket, state, container, statusPrefix = "", isActive = true) {
  container.innerHTML = "";
  ticket.forEach((emoji, idx) => {
    const cell = document.createElement("div");
    cell.textContent = state.opened.includes(idx) ? emoji : "❓";
    if (state.opened.includes(idx)) cell.classList.add("opened");

    cell.onclick = () => {
      if (!isActive) return; // 🚫 если поле не активно — игнорируем клики
      if (state.opened.length >= 4 || state.opened.includes(idx)) return;
      state.opened.push(idx);
      cell.textContent = emoji;
      cell.classList.add("selected", "opened");
      if (state.opened.length === 4) checkWin(ticket, state, container, statusPrefix);
    };
    container.appendChild(cell);
  });
}
function checkWin(ticket,state,container,statusPrefix=""){
  const openedEmojis = state.opened.map(i=>ticket[i]);
  const allSame = openedEmojis.every(e=>e===openedEmojis[0]);
  if (allSame) {
  const symbol = openedEmojis[0];
  const reward = emojiRewards[symbol] || 0;
  status.textContent = `🎉 Вы выиграли ${reward} TON за ${symbol}!`;

  // 🔥 Отправляем выигрыш на сервер
  sendWinToServer(currentWalletAddress, openedEmojis, reward);
} else {
  status.textContent = "😞 К сожалению, вы проиграли.";
}
  ticket.forEach((emoji,i)=>{
    if(!state.opened.includes(i)){
      container.children[i].textContent = emoji;
      container.children[i].classList.add("opened");
    }
  });
  state.opened = ticket.map((_,i)=>i);
}

// === Логика модалки 6 слотов ===
buyBtn.onclick = () => {
  isTicketActive6 = false; // 🚫 пока не куплен
  state6.ticket = generateTicket(6);
  state6.opened = [];
  renderTicket(state6.ticket, state6, ticketContainer, "", false); // передаем false
  
  ticketModal.style.display = "block";
  buyAgainBtn.textContent = state6.boughtCount === 0 ? "Купить билет" : "Купить ещё один";
};
async function handleBuyInModal6(){
  if(!currentWalletAddress){ showCustomAlert("Сначала подключите кошелёк!"); return; }
  try{
    status.textContent="⏳ Проверяем баланс...";
    buyAgainBtn.disabled=true;
    await spendBalance(currentWalletAddress,0.05);
    state6.ticket = generateTicket(6);
    state6.opened = [];
    state6.boughtCount++;
    isTicketActive6 = true; // ✅ теперь можно кликать
    renderTicket(state6.ticket, state6, ticketContainer, "", true);
    buyAgainBtn.textContent = state6.boughtCount === 0 ? "Купить билет" : "Купить ещё один";
    await fetchBalance(currentWalletAddress);
  }catch(err){
    console.error("Ошибка покупки:",err);
    showCustomAlert(`Ошибка: ${err.message}`);
    status.textContent="❌ Покупка не удалась.";
  }finally{
    buyAgainBtn.disabled=false;
  }
}
buyAgainBtn.onclick = handleBuyInModal6;
closeTicketBtn.onclick = ()=>ticketModal.style.display="none";

// === Логика модалки 9 слотов ===
buyBtn9.onclick = () => {
  isTicketActive9 = false; // 🚫 пока не куплен
  state9.ticket = generateTicket(9);
  state9.opened = [];
  renderTicket(state9.ticket, state9, ticketContainer9, "(9 слотов) ", false);
  
  ticketModal9.style.display = "block";
  buyAgainBtn9.textContent = state9.boughtCount === 0 ? "Купить билет" : "Купить ещё один";
};
async function handleBuyInModal9(){
  if(!currentWalletAddress){ showCustomAlert("Сначала подключите кошелёк!"); return; }
  try{
    status.textContent="⏳ Проверяем баланс...";
    buyAgainBtn9.disabled=true;
    await spendBalance(currentWalletAddress,0.1);
    state9.ticket = generateTicket(9);
    state9.opened = [];
    state9.boughtCount++;
    isTicketActive9 = true; // ✅ теперь можно кликать
    renderTicket(state9.ticket, state9, ticketContainer9, "(9 слотов) ", true);
    buyAgainBtn9.textContent = state9.boughtCount === 0 ? "Купить билет" : "Купить ещё один";
    await fetchBalance(currentWalletAddress);
  }catch(err){
    console.error("Ошибка покупки:",err);
    showCustomAlert(`Ошибка: ${err.message}`);
    status.textContent="❌ Покупка не удалась.";
  }finally{
    buyAgainBtn9.disabled=false;
  }
}
buyAgainBtn9.onclick = handleBuyInModal9;
closeTicketBtn9.onclick = ()=>ticketModal9.style.display="none";

// === Бесплатный билет ===
freeTicketBtn.onclick = async () => {
  if(!currentWalletAddress){ showCustomAlert("Сначала подключите кошелёк!"); return; }
  try{
    status.textContent="⏳ Проверяем бесплатные билеты...";
    freeTicketBtn.disabled=true;
    const res = await fetch(`${SERVER_URL}/api/use-free-ticket`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({address:currentWalletAddress})
    });
    const data = await res.json();
    if(!res.ok){
      updateFreeTicketVisual(0);
      showCustomAlert(`❌ ${data.error || "Нет доступных бесплатных билетов."}`);
      status.textContent="❌ Бесплатный билет недоступен.";
    }else{
      state6.ticket = generateTicket(6);
      state6.opened = [];
      state6.boughtCount++;
      renderTicket(state6.ticket,state6,ticketContainer);
      ticketModal.style.display = "block";
      status.textContent="Выберите 3 ячейки, чтобы открыть";
      updateFreeTicketVisual(data.remaining);
      showCustomAlert(`✅ Бесплатный билет использован! Осталось: ${data.remaining}`);
    }
  }catch(err){
    console.error("Ошибка бесплатного билета:",err);
    showCustomAlert(`❌ Ошибка: ${err.message}`);
    status.textContent="❌ Ошибка при получении бесплатного билета.";
  }finally{
    freeTicketBtn.disabled=false;
  }
};

// === Закрытие модалок кликом вне области
window.addEventListener("click",e=>{
  if(e.target===ticketModal) ticketModal.style.display="none";
  if(e.target===ticketModal9) ticketModal9.style.display="none";
});

// === Универсальная настройка модалок для пополнения/вывода ===
function setupModal(modalId,openBtnId,closeBtnId,inputId,okBtnId,onSubmit){
  const modal=document.getElementById(modalId);
  const openBtn=document.getElementById(openBtnId);
  const closeBtn=document.getElementById(closeBtnId);
  const input=document.getElementById(inputId);
  const okBtn=document.getElementById(okBtnId);

  openBtn.onclick=()=>{
    if(!currentWalletAddress){showCustomAlert("Сначала подключите кошелёк!");return;}
    input.value="";
    modal.style.display="block";
  };
  closeBtn.onclick=()=>modal.style.display="none";
  okBtn.onclick=()=>{
    const val=parseFloat(input.value);
    if(isNaN(val)||val<=0){showCustomAlert("Некорректная сумма");return;}
    onSubmit(val,modal);
  };
  window.addEventListener("click",(e)=>{ if(e.target===modal) modal.style.display="none"; });
}

// Пополнение
setupModal("topup-modal","topup","close-topup","topup-input","topup-ok",async(amount,modal)=>{
  try{
    status.textContent="⏳ Ожидаем перевод...";
    await tonConnectUI.sendTransaction({
      validUntil:Math.floor(Date.now()/1000)+300,
      messages:[{address:"UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g",amount:(amount*1e9).toString()}]
    });
    await verifyTopup(currentWalletAddress,amount);
    modal.style.display="none";
  }catch(err){
    console.error("Ошибка пополнения:",err);
    showCustomAlert("❌ Пополнение отменено или не удалось");
  }
});

// Вывод
setupModal("withdraw-modal","withdraw","close-withdraw","withdraw-input","withdraw-ok",async(amount,modal)=>{
  try{
    const res=await fetch(`${SERVER_URL}/api/request-withdraw`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({address:currentWalletAddress,amount})
    });
    const data=await res.json();
    if(data.success){
      showCustomAlert("✅ Заявка на вывод принята");
      modal.style.display="none";
    }else{
      showCustomAlert("❌ Ошибка: "+data.error);
    }
  }catch(err){
    showCustomAlert("❌ Ошибка при выводе: "+err.message);
  }
});

// === Проверка пополнения ===
async function verifyTopup(address,amount){
  status.textContent="⏳ Проверка перевода...";
  const res=await fetch(`${SERVER_URL}/api/verify-topup/${address}/${amount}`);
  const data=await res.json();
  if(data.confirmed){
    await fetchBalance(address);
    status.textContent=`✅ Пополнение на ${amount} TON`;
  }else{
    status.textContent="❌ Перевод не найден";
  }
}

// === Кастомный алерт ===
const customAlert=document.getElementById('custom-alert');
const customAlertText=document.getElementById('custom-alert-text');
const customAlertOk=document.getElementById('custom-alert-ok');
const customAlertClose=document.getElementById('close-custom-alert');
function showCustomAlert(text){ customAlertText.textContent=text; customAlert.style.display='block'; }
customAlertOk.onclick=()=>customAlert.style.display='none';
customAlertClose.onclick=()=>customAlert.style.display='none';
window.addEventListener('click',(e)=>{ if(e.target===customAlert)customAlert.style.display='none'; });

// === TonConnect и рефералы ===
const tonConnectUI=new TON_CONNECT_UI.TonConnectUI({
  manifestUrl:'https://telegram-scratch-two.vercel.app/tonconnect-manifest.json',
  buttonRootId:'ton-connect'
});
tonConnectUI.onStatusChange(wallet=>{
  const raw=wallet?.account?.address||"";
  let friendly=null;
  if(raw){
    try{ friendly=new TonWeb.utils.Address(raw).toString(true,true,true); }
    catch{ try{ friendly=new TonWeb.utils.Address(raw).toString(true,false,true); }catch(e){ console.error("Ошибка конвертации адреса:",e); } }
  }
  const enabled=!!friendly;
  buyBtn.disabled=!enabled;
  buyBtn9.disabled=!enabled;
  document.getElementById("topup").disabled=!enabled;
  document.getElementById("withdraw").disabled=!enabled;

  currentWalletAddress=friendly||null;
  status.textContent=enabled?"Нажмите «Купить билет», чтобы начать игру!":"Подключите кошелёк для начала игры.";

  if(friendly){
    fetchBalance(friendly);
    checkFreeTickets(friendly); // 🔥 проверяем доступные бесплатные билеты
  }
});

// === Реферальная кнопка ===
document.getElementById("copy-ref").onclick=()=>{
  if(!currentWalletAddress){ showCustomAlert("Сначала подключите кошелёк!"); return; }
  const link=`${window.location.origin}?ref=${currentWalletAddress}`;
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(link).then(()=>{
      showCustomAlert("✅ Ваша реферальная ссылка скопирована!\n"+link);
    }).catch(err=>{
      console.warn("⚠️ Clipboard API не сработал:",err);
      prompt("Скопируйте ссылку вручную:",link);
    });
  }else{
    prompt("Скопируйте ссылку вручную:",link);
  }
};

// === Парсинг ref из URL ===
const params=new URLSearchParams(window.location.search);
const refFromLink=params.get('ref');
if(refFromLink){ localStorage.setItem('referrer',refFromLink); console.log("✅ Найден реферал:",refFromLink); }
