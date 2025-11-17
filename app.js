// app.js — ARREGLADO: REINTENTOS + FALLBACK TOKEN + SYNC BACKEND (NOV 2025)
const DEV_WALLET = "HtRMq7DGzHdcuJAXtijCBhLTRAGxxo11BoMSk99Y9jEm";
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let tokenInfo = null;
let countdown = 300;
let intentosDeteccion = 0;

// === MOSTRAR WALLET DEV FIJA (mientras carga token) ===
function mostrarWalletDev() {
  document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${DEV_WALLET.slice(0,6)}...${DEV_WALLET.slice(-4)}</strong>`;
  console.log("Wallet dev mostrada fija");
}

// === DETECTAR TOKEN CON REINTENTOS AGRESIVOS ===
async function detectarToken() {
  try {
    console.log(`Intento ${intentosDeteccion + 1}... (reintentando detección)`);
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${DEV_WALLET}?offset=0&limit=10&includeNsfw=false`);
    const data = await r.json();
    console.log("Respuesta pump.fun API:", data);  // Abre F12 para ver logs

    if (data.coins && data.coins.length > 0) {
      const coin = data.coins[data.coins.length - 1];  // El más reciente
      tokenInfo = {
        name: coin.name,
        symbol: coin.symbol,
        mint: coin.mint,
        image: coin.image_uri || "https://i.ibb.co.com/0jZ6g3f/fire.png"
      };

      // Actualizar página
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenInfo.symbol}`;
      document.title = `${tokenInfo.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = tokenInfo.image;

      console.log("TOKEN DETECTADO:", tokenInfo);
      alert(`¡Token detectado! ${tokenInfo.name} ($${tokenInfo.symbol})`);
      return true;
    } else {
      console.log("No token en pump.fun, probando backend...");
      // Fallback al backend spin.py
      const backendToken = await (await fetch(`${BACKEND_URL}/api/token`)).json();
      if (backendToken.name && backendToken.name !== "Detectando...") {
        tokenInfo = backendToken;
        document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenInfo.symbol}`;
        document.getElementById("tokenLogo").src = tokenInfo.image;
        console.log("TOKEN DETECTADO DESDE BACKEND:", tokenInfo);
        return true;
      }
      console.log("No token, reintentando en 15s...");
      intentosDeteccion++;
      if (intentosDeteccion < 20) setTimeout(detectarToken, 15000);  // Reintenta en 15s
    }
  } catch (e) {
    console.error("Error detección:", e);
    intentosDeteccion++;
    if (intentosDeteccion < 20) setTimeout(detectarToken, 15000);
  }
  return false;
}

// === SYNC CON SPIN.PY (holders, winners, jackpot) ===
async function updateFromBackend() {
  try {
    // Holders / Burn Grid
    const holdersData = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    const grid = document.getElementById("burnList");
    grid.innerHTML = holdersData.holders.length > 0
      ? holdersData.holders.map((h, i) => 
          `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`
        ).join("")
      : "<div class='burn-entry'>Cargando holders...</div>";

    // Winners
    const winnersData = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    const winnerList = document.getElementById("winnerList");
    winnerList.innerHTML = winnersData.winners.length > 0
      ? winnersData.winners.map(w => 
          `<div class="winner-entry">GANADOR ${w.wallet} — ${w.prize} | ${w.tokens} tokens | ${w.time}</div>`
        ).join("")
      : "<div class='winner-entry'>Primer ganador pronto...</div>";

    // Jackpot
    const jackpotData = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = jackpotData.jackpot.toFixed(4);

    console.log("Sync backend OK");
  } catch (e) {
    console.error("Error backend:", e);
  }
}

// === TIMER 5 MIN ===
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
    const w = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = w.slice(0,6) + "..." + w.slice(-4);
  } catch { }
};

// === INICIAR ===
mostrarWalletDev();
detectarToken();
setInterval(detectarToken, 15000);
setInterval(updateFromBackend, 10000);
updateFromBackend();

// Partículas y modal
if (typeof particlesJS === 'function') {
  particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" } } });
}
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

console.log("PÁGINA INICIADA – Reintentos + sync backend cada 10s...");