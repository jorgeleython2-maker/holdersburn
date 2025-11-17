// app.js — REINTENTOS AGRESIVOS + TOKEN DEL DEV (NOV 2025)
const DEV_WALLET = "HtRMq7DGzHdcuJAXtijCBhLTRAGxxo11BoMSk99Y9jEm";
let tokenInfo = null;
let countdown = 300;
let intentosDeteccion = 0;

// === DETECTAR TOKEN CON REINTENTOS AGRESIVOS ===
async function detectarToken() {
  try {
    console.log(`Intento ${intentosDeteccion + 1}... (esperando indexación pump.fun)`);
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${DEV_WALLET}?offset=0&limit=10&includeNsfw=false`);
    const data = await r.json();
    console.log("Respuesta API:", data);  // Abre F12 para ver logs

    if (data.coins && data.coins.length > 0) {
      const coin = data.coins[data.coins.length - 1];  // El más reciente
      tokenInfo = {
        name: coin.name,
        symbol: coin.symbol,
        mint: coin.mint,
        image: coin.image_uri || "https://i.ibb.co.com/0jZ6g3f/fire.png"
      };

      // Cambiar "Detecting token..." por el token real
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenInfo.symbol}`;
      document.title = `${tokenInfo.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = tokenInfo.image;

      console.log("TOKEN DETECTADO:", tokenInfo);
      alert(`¡Token del dev detectado! ${tokenInfo.name} ($${tokenInfo.symbol})`);
      return true;
    } else {
      console.log("No token encontrado, reintentando en 15s...");
      intentosDeteccion++;
      if (intentosDeteccion < 20) {  // Max 5 min
        setTimeout(detectarToken, 15000);  // Reintenta en 15s (más agresivo)
      }
    }
  } catch (e) {
    console.error("Error detección:", e);
    intentosDeteccion++;
    if (intentosDeteccion < 20) setTimeout(detectarToken, 15000);
  }
  return false;
}

// === JACKPOT EN VIVO ===
async function updateJackpot() {
  try {
    const resp = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getBalance", params: [DEV_WALLET]
      })
    });
    const data = await resp.json();
    const sol = (data.result.value / 1e9).toFixed(4);
    document.getElementById("jackpot").innerText = sol;
    console.log("Jackpot actualizado:", sol + " SOL");
  } catch (e) { console.error("Error jackpot:", e); }
}

// === TIMER 5 MIN ===
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, "0");
  const s = String(countdown % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// === CONEXIÓN PHANTOM ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom!");
  try {
    const resp = await window.solana.connect();
    const wallet = resp.publicKey.toString();
    document.getElementById("connectWallet").innerText = wallet.slice(0,6) + "..." + wallet.slice(-4);
    console.log("PHANTOM CONECTADO:", wallet);
  } catch (e) { alert("Cancelado"); }
};

// === INICIAR ===
detectarToken();  // Primera detección
setInterval(detectarToken, 15000);  // Reintenta cada 15s
setInterval(updateJackpot, 10000);  // Jackpot cada 10s
updateJackpot();  // Primera carga

// Partículas y modal
if (typeof particlesJS === 'function') {
  particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" }, move: { speed: 4 } } });
}
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

console.log("PÁGINA INICIADA – Reintentos agresivos para token del dev...");