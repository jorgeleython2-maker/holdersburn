// app.js — SINCRONIZACIÓN TOTAL CON SPIN.PY (2025)
const BACKEND_URL = "spin-production-ddc0.up.railway.app"; // CAMBIA ESTO POR TU IP PÚBLICA O DOMINIO

async function updateAll() {
  try {
    // TOKEN + LOGO
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name) {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";
    }

    // JACKPOT
    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = jackpot.jackpot;

    // TIMER SINCRONIZADO
    const timer = await (await fetch(`${BACKEND_URL}/api/timer`)).json();
    let seconds = timer.seconds;
    const updateTimer = () => {
      const m = String(Math.floor(seconds / 60)).padStart(2, "0");
      const s = String(seconds % 60).padStart(2, "0");
      document.getElementById("timer").innerText = `${m}:${s}`;
      seconds--;
      if (seconds < 0) seconds = 19; // 20s del spin.py
    };
    updateTimer();
    clearInterval(window.timerInterval);
    window.timerInterval = setInterval(updateTimer, 1000);

    // HOLDERS / BURN GRID
    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    const grid = document.getElementById("burnList");
    grid.innerHTML = holders.holders.map((h, i) => `
      <div class="burn-entry">
        #${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens
      </div>
    `).join('');

    // GANADORES
    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    const winnerList = document.getElementById("winnerList");
    winnerList.innerHTML = winners.winners.reverse().map(w => `
      <div class="winner-entry">
        <strong>${w.wallet}</strong> ganó ${w.prize}<br>
        <small>${w.tokens} tokens • ${w.time}</small>
      </div>
    `).join('');

  } catch (e) {
    console.log("Backend no responde aún... reintentando");
  }
}

// ACTUALIZAR CADA 8 SEGUNDOS
setInterval(updateAll, 8000);
updateAll(); // Primera carga

// Phantom (tu código original)
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom!");
  try {
    const resp = await window.solana.connect();
    const wallet = resp.publicKey.toString();
    document.getElementById("connectWallet").innerText = wallet.slice(0,6)+"..."+wallet.slice(-4);
  } catch (e) { alert("Cancelado"); }
};

// Modal y partículas
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";
particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" }, move: { speed: 4 } } });