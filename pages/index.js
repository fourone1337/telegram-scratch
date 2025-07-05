
'use client';
import { useEffect, useRef, useState } from 'react';
import { TonConnectUI } from '@tonconnect/ui';

export default function Home() {
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState('Подключите кошелёк для начала игры.');
  const [ticket, setTicket] = useState([]);
  const [opened, setOpened] = useState([]);
  const [history, setHistory] = useState([]);
  const [winners, setWinners] = useState([]);
  const [address, setAddress] = useState(null);

  const emojis = ['🍒', '⭐️', '🍋', '🔔', '7️⃣', '💎'];
  const tonConnectRef = useRef(null);

  useEffect(() => {
    tonConnectRef.current = new TonConnectUI({
      manifestUrl: 'https://telegram-scratch-yhgb.vercel.app/tonconnect-manifest.json',
      buttonRootId: 'ton-connect'
    });

    tonConnectRef.current.onStatusChange(wallet => {
      const fullAddress = wallet?.account?.address || '';
      setAddress(fullAddress);
      setWallet(wallet);
      setStatus(fullAddress
        ? 'Нажмите «Купить билет», чтобы начать игру!'
        : 'Подключите кошелёк для начала игры.');
    });

    fetchWinners();
  }, []);

  function generateTicket() {
    const newTicket = Array.from({ length: 6 }, () =>
      emojis[Math.floor(Math.random() * emojis.length)]
    );
    return newTicket;
  }

  function startGame() {
    if (!wallet) {
      alert('Пожалуйста, подключите TON-кошелёк перед покупкой билета.');
      return;
    }
    const newTicket = generateTicket();
    setTicket(newTicket);
    setOpened([]);
    setStatus('Выберите 3 ячейки, чтобы открыть');
  }

  function clickCell(i) {
    if (opened.includes(i) || opened.length >= 3) return;
    const newOpened = [...opened, i];
    setOpened(newOpened);

    if (newOpened.length === 3) {
      checkWin(ticket, newOpened);
    }
  }

  async function checkWin(ticket, openedIndices) {
    const openedEmojis = openedIndices.map(i => ticket[i]);
    const allSame = openedEmojis.every(e => e === openedEmojis[0]);

    if (allSame) {
      setStatus('🎉 Поздравляем! Вы выиграли!');
      if (address) {
        await sendWinToServer(address, openedEmojis.join(''));
        fetchWinners();
      }
    } else {
      setStatus('😞 К сожалению, вы проиграли. Попробуйте ещё.');
    }

    setHistory(prev => [
      ...prev,
      {
        ticket,
        opened: openedIndices,
        winner: allSame,
        openedEmojis
      }
    ]);
  }

  async function sendWinToServer(address, emojis) {
    try {
      await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, emojis, date: new Date().toISOString() })
      });
    } catch (err) {
      console.error('Ошибка отправки победы:', err);
    }
  }

  async function fetchWinners() {
    try {
      const res = await fetch('/api/wins');
      const data = await res.json();
      setWinners(data);
    } catch (err) {
      console.error('Ошибка загрузки победителей:', err);
    }
  }

  return (
    <main style={{ textAlign: 'center', padding: 20 }}>
      <h1>🎟️ Скретч-Лотерея</h1>
      <div id="ton-connect"></div>
      <div style={{ fontWeight: 'bold', margin: 10 }}>
        {address ? `🟢 Кошелёк: ${address.slice(0, 4)}...${address.slice(-3)}` : '🔴 Кошелёк не подключён.'}
      </div>

      <button onClick={startGame} disabled={!wallet} style={{ fontSize: 18, padding: '10px 20px' }}>
        💸 Купить билет за 1 TON
      </button>

      <div style={{ marginTop: 20 }}>{status}</div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 60px)',
        gridGap: 10,
        justifyContent: 'center',
        marginTop: 20
      }}>
        {ticket.map((emoji, idx) => (
          <div key={idx} onClick={() => clickCell(idx)} style={{
            width: 60, height: 60, backgroundColor: '#888', borderRadius: 8,
            fontSize: 36, display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'white', cursor: 'pointer', userSelect: 'none'
          }}>
            {opened.includes(idx) ? emoji : '❓'}
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: 30, textAlign: 'left', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3>История игр</h3>
          {history.map((h, idx) => (
            <div key={idx} style={{ color: h.winner ? 'green' : 'red', marginBottom: 6 }}>
              <b>Игра #{idx + 1}:</b> {h.winner ? 'Выигрыш' : 'Проигрыш'} — Открытые: {h.openedEmojis.join(', ')}
            </div>
          ))}
        </div>
      )}

      {winners.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3>🏆 Победители</h3>
          {winners.map((win, idx) => (
            <div key={idx}>🎉 {win.address.slice(0, 4)}...{win.address.slice(-3)} — {win.emojis} ({new Date(win.date).toLocaleString()})</div>
          ))}
        </div>
      )}
    </main>
  );
}
