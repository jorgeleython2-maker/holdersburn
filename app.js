// app.js — 100% SINCRONIZADO CON TU SPIN.PY EN RAILWAY (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let countdown = 300;

// === CARGA TODO DESDE TU SPIN.PY ===
async function cargarTodo() {
  try {
    console.log("Cargando datos desde spin.py...");

    // 1. TOKEN + LOGO + NOMBRE
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      console.log("Token cargado:", token.name, "($"+token.symbol+")");
    }

    // 2. DEV WALLET (desde spin.py)
    if (token.creator) {
      document.getElementById("devWalletDisplay").innerHTML = 
        `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
    }

    // 3. JACKPOT REAL
    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    // 4. HOLDERS / BURN GRID
    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h, i) => 
          `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`
        ).join("")
      : `<div class="burn-entry">No hay holders aún...</div>`;

    // 5. GANADORES
    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.length > 0
      ? winners.winners.map(w => 
          `<div class="winner-entry">GANADOR ${w.wallet} ganó ${w.prize} | ${w.tokens} tokens | ${w.time}</div>`
        ).join("")
      : `<div class="winner-entry">Primer ganador pronto...</div>`;

    console.log("Todo sincronizado con spin.py");

  } catch (error) {
    console.log("Aún cargando spin.py... (reintentando en 5s)");
  }
}

// === TIMER 5 MINUTOS ===
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, "0");
  const s = String(countdown % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// === PHANTOM CONNECT ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");
  try {
    await window.solana.connect();
    const wallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = wallet.slice(0,6) + "..." + wallet.slice(-4);
    console.log("Phantom conectado:", wallet);
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === MODAL DE QUEMA ===
document.getElementById("openBurnModal").onclick = () => {
  document.getElementById("burnModal").style.display = "flex";
};
document.querySelector(".close").onclick = () => {
  document.getElementById("burnModal").style.display = "none";
};

// === PARTÍCULAS DE FUEGO ===
if (typeof particlesJS === "function") {
  particlesJS("burnList", {
    particles: {
      number: { value: 80 },
      color: { value: "#FF4500" },
      shape: { type: "circle" },
      opacity: { value: 0.8 },
      size: { value: 4 },
      move: { enable: true, speed: 6 }
    },
    interactivity: { events: { onhover: { enable: true, mode: "repulse" } } }
  });
}

// === INICIAR TODO ===
cargarTodo();
setInterval(cargarTodo, 8000); // Actualiza cada 8 segundos

console.log("Página iniciada – 100% sincronizada con spin.py");