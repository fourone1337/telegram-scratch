// ==== CONFIG & GLOBAL STATE ====
const SERVER_URL = "https://scratch-lottery.ru";
let currentWalletAddress = null;
let isTicketActive6 = false;

// ==== DOM ELEMENTS ====
const status = document.getElementById("status");
const buyBtn = document.getElementById("buy");
const buyAgainBtn = document.getElementById("buy-again");
const closeTicketBtn = document.getElementById("close-ticket");
const ticketModal = document.getElementById("ticket-modal");
const ticketContainer = document.getElementById("ticket-container");
const freeTicketBtn = document.getElementById("free-ticket");

// Terms Modal
const termsModal = document.getElementById("terms-modal");
const termsText = document.getElementById("terms-text");
const closeTermsBtn = document.getElementById("close-terms");
const acceptTermsBtn = document.getElementById("accept-terms");
const disclaimerBtn = document.getElementById("disclaimer-button");

// Custom alert
const customAlert = document.getElementById("custom-alert");
const customAlertText = document.getElementById("custom-alert-text");
const customAlertOk = document.getElementById("custom-alert-ok");
const customAlertClose = document.getElementById("close-custom-alert");

// ==== TOPUP & WITHDRAW MODALS ====
const topupModal = document.getElementById("topup-modal");
const topupBtn = document.getElementById("topup");
const topupClose = document.getElementById("close-topup");
const topupInput = document.getElementById("topup-input");
const topupOk = document.getElementById("topup-ok");

const withdrawModal = document.getElementById("withdraw-modal");
const withdrawBtn = document.getElementById("withdraw");
const withdrawClose = document.getElementById("close-withdraw");
const withdrawInput = document.getElementById("withdraw-input");
const withdrawOk = document.getElementById("withdraw-ok");

// ==== GAME STATE ====
const emojis = ["🍒","🍋","🍌","⭐️","🔔","💰","💎"];
const emojiRewards = {"🍒":0,25,"🍋":0,25,"🍌":0,25,"⭐️":1,"🔔":1,"💰":5,"💎":10};
const bonusValues = [1,1,1,2,1,4,7];
let state6 = {ticket:null,opened:[],boughtCount:0,bonus:null,bonusOpened:false};

//=== ===
function setupModal(modal,openBtn,closeBtn,input,okBtn,onSubmit){
  openBtn.onclick = ()=>{
    if(!currentWalletAddress){showCustomAlert("Сначала подключите кошелёк!");return;}
    input.value = "";
    modal.style.display = "block";
  };
  closeBtn.onclick = ()=> modal.style.display = "none";
  okBtn.onclick = ()=>{
    const val = parseFloat(input.value);
    if(isNaN(val) || val <= 0){showCustomAlert("Некорректная сумма");return;}
    onSubmit(val,modal);
  };
  window.addEventListener("click",e=>{if(e.target===modal)modal.style.display="none";});
}

setupModal(topupModal, topupBtn, topupClose, topupInput, topupOk, async (amount, modal)=>{
  try{
    status.textContent = "⏳ Ожидаем перевод...";
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now()/1000)+300,
      messages:[{address:"UQDYpGx-Y95M0F-ETSXFwC6YeuJY31qaqetPlkmYDEcKyX8g", amount:(amount*1e9).toString()}]
    });
    await verifyTopup(currentWalletAddress,amount);
    modal.style.display = "none";
  }catch(e){
    console.error("Ошибка пополнения:",e);
    showCustomAlert("❌ Пополнение отменено или не удалось");
  }
});

setupModal(withdrawModal, withdrawBtn, withdrawClose, withdrawInput, withdrawOk, async (amount, modal)=>{
  try{
    const res = await fetch(`${SERVER_URL}/api/request-withdraw`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({address:currentWalletAddress,amount})
    });
    const data = await res.json();
    if(data.success){
      showCustomAlert("✅ Заявка на вывод принята");
      modal.style.display = "none";
    }else{
      showCustomAlert("❌ Ошибка: "+data.error);
    }
  }catch(e){
    showCustomAlert("❌ Ошибка при выводе: "+e.message);
  }
});

// ==== UI HELPERS ====
function showCustomAlert(text){customAlertText.textContent=text;customAlert.style.display='block';}
customAlertOk.onclick = () => customAlert.style.display='none';
customAlertClose.onclick = () => customAlert.style.display='none';
window.addEventListener('click',e=>{if(e.target===customAlert)customAlert.style.display='none';});

function updateFreeTicketVisual(remaining){
  freeTicketBtn.disabled = remaining<=0;
  freeTicketBtn.classList.toggle("no-free",remaining<=0);
}
function updateBalanceText(balance,isError=false){
  document.getElementById("balance-text").textContent = isError ? "Ошибка" : `${balance.toFixed(2)} TON`;
}
function updateModalBalances(balance,isError=false){
  const text = isError ? "Ошибка" : `${balance.toFixed(2)} TON`;
  const el6 = document.getElementById("modal-balance-6");
  if(el6) el6.textContent = text;
}

// ==== NETWORK OPERATIONS ====
async function fetchBalance(address){
  try{
    const res = await fetch(`${SERVER_URL}/api/balance/${address}`);
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Ошибка запроса");
    updateBalanceText(data.balance);
    updateModalBalances(data.balance);
  }catch(e){
    console.error("Ошибка баланса:",e);
    updateBalanceText(0,true);
    updateModalBalances(0,true);
  }
}
async function spendBalance(address,amount){
  const res = await fetch(`${SERVER_URL}/api/spend`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({address,amount})
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error||"Ошибка списания");
  return data;
}
async function sendWinToServer(address,emojis,reward){
  try{
    const res = await fetch(`${SERVER_URL}/api/wins`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({address,emojis,reward,date:new Date().toISOString()})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error||"Ошибка записи выигрыша");
    await fetchBalance(address);
  }catch(e){console.error("Ошибка при отправке выигрыша:",e);}
}

async function checkFreeTickets(address){
  try{
    const res = await fetch(`${SERVER_URL}/api/free-tickets/${address}`);
    const data = await res.json();
    updateFreeTicketVisual(res.ok && typeof data.freeTickets==='number' ? data.freeTickets : 0);
  }catch(e){
    console.error("Ошибка проверки бесплатных билетов:",e);
    updateFreeTicketVisual(0);
  }
}

// ==== GAME LOGIC ====
function generateTicket(count){
  return Array.from({length:count},()=>emojis[Math.floor(Math.random()*emojis.length)]);
}
function renderTicket(ticket,state,container,statusPrefix="",isActive=true){
  container.innerHTML="";
  ticket.forEach((emoji,idx)=>{
    const cell=document.createElement("div");
    cell.textContent = state.opened.includes(idx)?emoji:"❓";
    if(state.opened.includes(idx)) cell.classList.add("opened");
    cell.onclick=()=>{
      if(!isActive || state.opened.length>=4 || state.opened.includes(idx))return;
      state.opened.push(idx);
      cell.textContent=emoji;
      cell.classList.add("selected","opened");
      if(state.opened.length===4)checkWin(ticket,state,container,statusPrefix);
    };
    container.appendChild(cell);
  });
  const bonusCell=document.createElement("div");
  bonusCell.classList.add("bonus-cell");
  bonusCell.textContent = state.bonusOpened ? `x${state.bonus}` : "🎁";
  // Бонус теперь активен только после покупки
  if(!isActive){
    bonusCell.classList.add("disabled");
  } else {
    bonusCell.onclick=()=>{
      if(state.bonusOpened)return;
      state.bonusOpened=true;
      bonusCell.textContent=`x${state.bonus}`;
      bonusCell.classList.add("opened-bonus");
      state.opened.forEach(i=>{
        const c=container.querySelectorAll("div:not(.bonus-cell)")[i];
        c.textContent=ticket[i];
        c.classList.add("opened");
      });
      if(state.opened.length===4)checkWin(ticket,state,container,statusPrefix);
    };
  }
  container.appendChild(bonusCell);
}
function checkWin(ticket,state,container,statusPrefix=""){
  const openedEmojis=state.opened.map(i=>ticket[i]);
  const counts={};
  openedEmojis.forEach(e=>counts[e]=(counts[e]||0)+1);
  let winEmoji=null;
  for(let [emoji,count] of Object.entries(counts)){if(count>=3){winEmoji=emoji;break;}}
  if(winEmoji){
    let reward=emojiRewards[winEmoji]||0;
    if(state.bonusOpened && state.bonus>1){
      reward*=state.bonus;
      status.textContent=`${statusPrefix}🎉 Вы выиграли ${reward} TON за ${winEmoji} (Бонус x${state.bonus})!`;
    }else{
      status.textContent=`${statusPrefix}🎉 Вы выиграли ${reward} TON за ${winEmoji}!`;
    }
    sendWinToServer(currentWalletAddress,openedEmojis,reward);
  }else{
    status.textContent=`${statusPrefix}😞 К сожалению, вы проиграли.`;
  }
  if(state.bonusOpened){
    container.querySelectorAll("div").forEach((cell,i)=>{
      if(!state.opened.includes(i)&&!cell.classList.contains("bonus-cell")){
        cell.textContent=ticket[i];cell.classList.add("opened");
      }
    });
  }
}

// ==== BUY TICKET MODAL ====
buyBtn.onclick=()=>{
  isTicketActive6=false;
  state6.ticket=generateTicket(6);
  state6.opened=[];
  state6.bonus=null;
  state6.bonusOpened=false;
  state6.boughtCount = 0;
  renderTicket(state6.ticket,state6,ticketContainer,"",false);
  ticketModal.style.display="block";
  buyAgainBtn.textContent=state6.boughtCount===0?"Купить билет":"Купить ещё один";
};
async function handleBuyInModal6(){
  if(state6.boughtCount>0 && (state6.opened.length<4||!state6.bonusOpened)){
    showCustomAlert("❌ Сначала откройте 4 поля и бонус!");return;
  }
  if(!currentWalletAddress){showCustomAlert("Сначала подключите кошелёк!");return;}
  try{
    status.textContent="⏳ Проверяем баланс...";
    buyAgainBtn.disabled=true;
    await spendBalance(currentWalletAddress,0.05);
    state6.ticket=generateTicket(6);
    state6.opened=[];
    state6.boughtCount++;
    state6.bonus=bonusValues[Math.floor(Math.random()*bonusValues.length)];
    state6.bonusOpened=false;
    renderTicket(state6.ticket,state6,ticketContainer,"",true);
    status.textContent="Выберите 4 ячейки";
    buyAgainBtn.textContent="Купить ещё один";
    await fetchBalance(currentWalletAddress);
  }catch(e){showCustomAlert(`Ошибка: ${e.message}`);status.textContent="❌ Покупка не удалась.";}
  finally{buyAgainBtn.disabled=false;}
}
buyAgainBtn.onclick=handleBuyInModal6;
closeTicketBtn.onclick=()=>ticketModal.style.display="none";

// ==== FREE TICKET ====
freeTicketBtn.onclick=async()=>{
  if(!currentWalletAddress){showCustomAlert("Сначала подключите кошелёк!");return;}
  try{
    status.textContent="⏳ Проверяем бесплатные билеты...";
    freeTicketBtn.disabled=true;
    const res=await fetch(`${SERVER_URL}/api/use-free-ticket`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({address:currentWalletAddress})
    });
    const data=await res.json();
    if(!res.ok){
      updateFreeTicketVisual(0);
      showCustomAlert(`❌ ${data.error||"Нет бесплатных билетов."}`);
      status.textContent="❌ Бесплатный билет недоступен.";
    }else{
      state6.ticket=generateTicket(6);
      state6.opened=[];
      state6.boughtCount++;
      state6.bonus=bonusValues[Math.floor(Math.random()*bonusValues.length)];
      state6.bonusOpened=false;
      renderTicket(state6.ticket,state6,ticketContainer,"",true);
      ticketModal.style.display="block";
      status.textContent="Выберите 3 ячейки";
      updateFreeTicketVisual(data.remaining);
      showCustomAlert(`✅ Бесплатный билет использован! Осталось: ${data.remaining}`);
    }
  }catch(e){showCustomAlert(`❌ Ошибка: ${e.message}`);status.textContent="❌ Ошибка бесплатного билета.";}
  finally{freeTicketBtn.disabled=false;}
};

// ==== TERMS MODAL ====
disclaimerBtn.onclick=async()=>{
  try{
    const res=await fetch("terms.txt");
    if(!res.ok)throw new Error("Не удалось загрузить условия");
    termsText.textContent=await res.text();
  }catch(e){termsText.textContent="⚠ Не удалось загрузить условия.";}
  termsModal.style.display="block";
};
closeTermsBtn.onclick=()=>termsModal.style.display="none";
acceptTermsBtn.onclick=()=>termsModal.style.display="none";
window.addEventListener("click",e=>{if(e.target===termsModal)termsModal.style.display="none";});

// ==== WALLET CONNECTION ====
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl:'https://telegram-scratch-two.vercel.app/tonconnect-manifest.json',
  buttonRootId:'ton-connect'
});
tonConnectUI.onStatusChange(wallet=>{
  const raw=wallet?.account?.address||"";
  let friendly=null;
  if(raw){
    try{friendly=new TonWeb.utils.Address(raw).toString(true,true,true);}catch{try{friendly=new TonWeb.utils.Address(raw).toString(true,false,true);}catch(e){console.error("Ошибка конвертации:",e);}}
  }
  const enabled=!!friendly;
  buyBtn.disabled=!enabled;
  document.getElementById("topup").disabled=!enabled;
  document.getElementById("withdraw").disabled=!enabled;
  currentWalletAddress=friendly||null;
  status.textContent=enabled?"Нажмите «Купить билет»":"Подключите кошелёк";
  if(friendly){fetchBalance(friendly);checkFreeTickets(friendly);}
});

// ==== REFERRAL ====
document.getElementById("copy-ref").onclick=()=>{
  if(!currentWalletAddress){showCustomAlert("Сначала подключите кошелёк!");return;}
  const link=`${window.location.origin}?ref=${currentWalletAddress}`;
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(link).then(()=>showCustomAlert("✅ Скопировано!\n"+link)).catch(()=>prompt("Скопируйте:",link));
  }else prompt("Скопируйте:",link);
};

// ==== PARSE REF FROM URL ====
const params=new URLSearchParams(window.location.search);
const ref=params.get('ref');
if(ref)localStorage.setItem('referrer',ref);

// ==== CLOSE MODALS OUTSIDE CLICK ====
window.addEventListener("click",e=>{if(e.target===ticketModal)ticketModal.style.display="none";});
