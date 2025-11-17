// app.js — DETECCIÓN AGRESIVA DE WALLET DEV + TOKEN (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const DEV_WALLET = "HtRMq7DGzHdcuJAXtijCBhLTRAGxxo11BoMSk99Y9jEm";  // ← TU WALLET DEV FIJA
let tokenInfo = null;
let countdown = 300;
let intentosDeteccion = 0;

// === MOSTRAR WALLET DEV FIJA (mientras carga token) ===
function mostrarWalletDev() {
  const display = document.getElementById("devWalletDisplay");
  display.innerHTML = `Dev Wallet: <strong>${DEV_WALLET.slice(0,6)}...${DEV_WALLET.slice(-4)}</strong>`;
  console.log("Wallet dev mostrada fija:", DEV_WALLET);
}

// === DETECTAR TOKEN CON REINTENTOS AGRESIVOS ===
async function detectarToken() {
  intentosDeteccion++;
  console.log(`Intento detección ${intentosDeteccion}...`);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/token`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    console.log("Backend respuesta:", data);

    if (data.name && data.name !== "Detectando...") {
      tokenInfo = data;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${data.symbol}`;
      document.title = `${data.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = data.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";

      console.log("TOKEN DETECTADO:", tokenInfo);
      alert(`¡Token del dev detectado! ${data.name} ($${data.symbol})`);
      return true;
    } else {
      console.log("Token aún cargando, reintentando en 15s...");
      if (intentosDeteccion < 20) setTimeout(detectarToken, 15000);
    }
  } catch (e) {
    console.error("Error detección:", e);
    if (intentosDeteccion < 20) setTimeout(detectarToken, 15000);
  }
  return false;
}

// === JACKPOT EN VIVO ===
async function updateJackpot() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/jackpot`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    document.getElementById("jackpot").innerText = Number(data.jackpot).toFixed(4);
    console.log("Jackpot actualizado:", data.jackpot + " SOL");
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
    await window.solana.connect();
    const wallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = wallet.slice(0,6) + "..." + wallet.slice(-4);
    console.log("PHANTOM CONECTADO:", wallet);
  } catch (e) { alert("Cancelado"); }
};

// === INICIAR ===
mostrarWalletDev();  // Muestra wallet dev fija
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

console.log("PÁGINA INICIADA – Detección agresiva + wallet dev fija...");