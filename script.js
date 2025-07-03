const tg = window.Telegram.WebApp;
tg.expand(); // разворачивает окно на весь экран

const userInfo = document.getElementById("user-info");
const btn = document.getElementById("buy-button");

if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
  const user = tg.initDataUnsafe.user;
  userInfo.innerText = `Привет, ${user.first_name}! (ID: ${user.id})`;
} else {
  userInfo.innerText = "Не удалось получить данные Telegram.";
}

btn.addEventListener("click", () => {
  alert("Здесь будет оплата TON и запуск скретч-карты 💸🎮");
});
