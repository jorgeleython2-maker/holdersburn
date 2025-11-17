// app.js — TOKEN DEL DEV + SYNC SPIN.PY (NOV 2025)
const DEV_WALLET = "HtRMq7DGzHdcuJAXtijCBhLTRAGxxo11BoMSk99Y9jEm";
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let tokenInfo = null;
let countdown = 300;
let intentosDeteccion = 0;

// === MOSTRAR WALLET DEV FIJA ===
function mostrarWalletDev() {
  document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${DEV_WALLET.slice(0,6)}...${DEV_WALLET.slice(-4)}</strong>`;
  console.log("Wallet dev mostrada fija");
}

// === DETECTAR TOKEN CON REINTENTOS ===
async function detectarToken() {
  try {
    console.log(`Intento ${intentosDeteccion + 1}...`);
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${DEV_WALLET}?offset=0&limit=10&includeNsfw=false`);
    const data = await r.json();
    console.log("Respuesta API:", data);

    if (data.coins && data.coins.length > 0) {
      const coin = data.coins[data.coins.length - 1];
      tokenInfo = {
        name: coin.name,
        symbol: coin.symbol,
        mint: coin.mint,
        image: coin.image_uri || "https://i.ibb.co.com/0jZ6g3f/fire.png"
      };

      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenInfo.symbol}`;
      document.title = `${tokenInfo.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = tokenInfo.image;

      console.log("TOKEN DETECTADO:", tokenInfo);
      alert(`¡Token del dev detectado! ${tokenInfo.name} ($${tokenInfo.symbol})`);
      return true;
    } else {
      console.log("No token, reintentando...");
      intentosDeteccion++;
      if (intentosDeteccion < 10) setTimeout(detectarToken, 30000);
    }
  } catch (e) {
    console.error("Error detección:", e);
    intentosDeteccion++;
    if (intentosDeteccion < 10) setTimeout(detectarToken, 30000);
  }
}

// === SYNC CON SPIN.PY ===
async function updateFromBackend() {
  try {
    // Token from backend (fallback)
    const backendToken = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (backendToken.name && !tokenInfo) {
      tokenInfo = backendToken;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenInfo.symbol}`;
      document.getElementById("tokenLogo").src = tokenInfo.image;
    }

    // Jackpot
    const jackpotData = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = jackpotData.jackpot.toFixed(4);

    // Holders
    const holdersData = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holdersData.holders.length > 0 
      ? holdersData.holders.map((h, i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Cargando holders...</div>";

    // Winners
    const winnersData = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winnersData.winners.length > 0
      ? winnersData.winners.map(w => `<div class="winner-entry">GANADOR ${w.wallet} — ${w.prize} | ${w.tokens} tokens | ${w.time}</div>`).join("")
      : "<div class='winner-entry'>Primer ganador pronto...</div>";
  } catch (e) {
    console.error("Error backend:", e);
  }
}

// === TIMER ===
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, "0");
  const s = String(countdown % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// === PHANTOM ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom!");
  try {
    await window.solana.connect();
    const wallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = wallet.slice(0,6) + "..." + wallet.slice(-4);
  } catch { }
};

// === INICIAR ===
mostrarWalletDev();
detectarToken();
setInterval(detectarToken, 30000);
setInterval(updateFromBackend, 10000);
updateFromBackend();

// Partículas y modal
if (typeof particlesJS === 'function') {
  particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" } } });
}
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

console.log("PÁGINA INICIADA – Wallet dev + detección + sync backend...");