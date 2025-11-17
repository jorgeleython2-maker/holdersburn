// app.js — 100% AUTOMÁTICO CON TU WALLET (NOV 2025)
const DEV_WALLET = "HtRMq7DGzHdcuJAXtijCBhLTRAGxxo11BoMSk99Y9jEm";
let tokenInfo = null;
let countdown = 300;

// === DETECCIÓN AUTOMÁTICA DEL TOKEN ===
async function detectarToken() {
  try {
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${DEV_WALLET}?limit=1`);
    const data = await r.json();
    if (data.coins && data.coins.length > 0) {
      const coin = data.coins[data.coins.length - 1]; // el más reciente
      tokenInfo = {
        name: coin.name,
        symbol: coin.symbol,
        mint: coin.mint,
        image: coin.image_uri || "https://i.ibb.co.com/0jZ6g3f/fire.png"
      };

      // Actualizar página
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenInfo.symbol}`;
      document.getElementById("pageTitle").innerText = `${tokenInfo.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = tokenInfo.image;

      console.log("TOKEN DETECTADO:", tokenInfo.name, "$${tokenInfo.symbol}");
    }
  } catch (e) { console.log("Reintentando detección..."); }
}

// === JACKPOT EN VIVO (balance de tu wallet) ===
async function updateJackpot() {
  try {
    const resp = await fetch(`https://api.mainnet-beta.solana.com`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getBalance", params: [DEV_WALLET]
      })
    });
    const data = await resp.json();
    const sol = (data.result.value / 1e9).toFixed(4);
    document.getElementById("jackpot").innerText = sol;
  } catch (e) {}
}

// === TIMER 5 MIN ===
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, "0");
  const s = String(countdown % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// === INICIAR TODO ===
detectarToken();
setInterval(detectarToken, 30000); // reintenta cada 30s
setInterval(updateJackpot, 10000);
updateJackpot();

// Partículas y modal (tu código original)
particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" }, move: { speed: 4 } } });

document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";