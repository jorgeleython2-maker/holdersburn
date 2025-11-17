// app.js — TODO VIENE DEL SPIN.PY EN RAILWAY (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let countdown = 300;

// === ACTUALIZAR TODO DESDE EL SPIN.PY ===
async function updateAllFromSpin() {
  try {
    // 1. Token + Logo + Mint (todo del spin)
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando token...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      // Wallet del dev también la sacamos del spin (por si cambias de wallet)
      document.getElementById("devWalletDisplay").innerHTML = 
        `Dev Wallet: <strong>${token.creator?.slice(0,6)}...${token.creator?.slice(-4) || "HtRMq...9jEm"}</strong>`;
    }

    // 2. Jackpot real
    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    // 3. Holders / Burn Grid
    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h, i) => 
          `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`
        ).join("")
      : `<div class="burn-entry">No holders yet...</div>`;

    // 4. Ganadores
    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.length > 0
      ? winners.winners.map(w => 
          `<div class="winner-entry">GANADOR ${w.wallet} — ${w.prize} | ${w.tokens} tokens | ${w.time}</div>`
        ).join("")
      : `<div class="winner-entry">Primer ganador pronto...</div>`;

    console.log("Todo actualizado desde spin.py");
  } catch (e) {
    console.log("Spin.py no responde aún... reintentando en 8s");
  }
}

// Timer local (backup)
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, "0");
  const s = String(countdown % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Actualizar cada 8 segundos
setInterval(updateAllFromSpin, 8000);
updateAllFromSpin(); // Primera carga inmediata

// Phantom (opcional, solo para el usuario)
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom!");
  try {
    await window.solana.connect();
    const w = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = w.slice(0,6) + "..." + w.slice(-4);
  } catch { }
};

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// Partículas
if (typeof particlesJS === "function") {
  particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" } } });
}