const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let countdown = 300;

async function updateAll() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = jackpot.jackpot;

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.map((h,i) => 
      `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`
    ).join("") || "<div class='burn-entry'>Cargando holders...</div>";

    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.map(w => 
      `<div class="winner-entry">GANADOR ${w.wallet} — ${w.prize} | ${w.tokens} tokens | ${w.time}</div>`
    ).join("") || "<div class='winner-entry'>Primer ganador pronto...</div>";

  } catch (e) { console.log("Backend no responde aún...") }
}

setInterval(updateAll, 8000);
updateAll();

setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Phantom
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom!");
  try {
    const resp = await window.solana.connect();
    const w = resp.publicKey.toString();
    document.getElementById("connectWallet").innerText = w.slice(0,6)+"..."+w.slice(-4);
  } catch { alert("Cancelado"); }
};

document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";