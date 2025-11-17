const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const DEV_WALLET = "HtRMq7DGzHdcuJAXtijCBhLTRAGxxo11BoMSk99Y9jEm";

let countdown = 300;

// Mostrar wallet del dev fija
document.getElementById("devWalletDisplay").innerHTML = 
  `Dev Wallet: <strong>${DEV_WALLET.slice(0,6)}...${DEV_WALLET.slice(-4)}</strong>`;

// Actualizar todo desde spin.py
async function updateAll() {
  try {
    // Token + logo
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
    }

    // Jackpot
    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = jackpot.jackpot.toFixed(4);

    // Holders
    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0 
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>No holders yet...</div>";

    // Ganadores
    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.length > 0
      ? winners.winners.map(w => `<div class="winner-entry">GANADOR ${w.wallet} — ${w.prize} | ${w.tokens} tokens | ${w.time}</div>`).join("")
      : "<div class='winner-entry'>Primer ganador pronto...</div>";

  } catch (e) {
    console.log("Backend no responde aún... reintentando");
  }
}

// Timer local
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Actualizar cada 8 segundos
setInterval(updateAll, 8000);
updateAll();

// Phantom
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom!");
  try {
    await window.solana.connect();
    const wallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = wallet.slice(0,6)+"..."+wallet.slice(-4);
  } catch { }
};

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// Partículas
if (typeof particlesJS === 'function') {
  particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" } } });
}