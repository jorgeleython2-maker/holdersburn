// app.js — DETECCIÓN AUTOMÁTICA DE TOKENS DEL DEV AL CONECTAR WALLET
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null; // Se llena con el mint del token del dev

// === CONECTAR PHANTOM + DETECTAR TOKENS DEL DEV ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    // Obtener el mint del token del dev
    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (tokenData.mint) {
      tokenMint = tokenData.mint;
      console.log("Token del dev detectado:", tokenData.symbol, tokenMint);
      detectarTokensUsuario();
    } else {
      alert("Token del dev aún no detectado. Espera unos segundos...");
    }

  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR CUÁNTOS TOKENS TIENE EL USUARIO DEL TOKEN DEL DEV ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint) return;

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getTokenAccountsByOwner",
        params: [
          userWallet,
          { mint: tokenMint },
          { encoding: "jsonParsed" }
        ]
      })
    });

    const data = await response.json();
    let balance = 0;

    if (data.result?.value?.length > 0) {
      for (let account of data.result.value) {
        const info = account.account.data.parsed.info;
        if (info.mint === tokenMint) {
          balance += Number(info.tokenAmount.uiAmount);
        }
      }
    }

    // Mostrar en pantalla
    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    const tokenSymbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    display.innerHTML = `Tienes <strong>${balance.toLocaleString()} $${tokenSymbol}</strong>`;
    display.style.display = "block";
    console.log(`Usuario tiene ${balance} tokens del dev`);

  } catch (err) {
    console.error("Error detectando tokens:", err);
  }
}

// === CREAR EL DISPLAY SI NO EXISTE ===
function crearDisplayTokens() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.style.textAlign = "center";
  div.style.margin = "20px 0";
  div.style.padding = "15px";
  div.style.background = "rgba(255,107,0,0.1)";
  div.style.borderRadius = "12px";
  div.style.color = "#FF6B00";
  div.style.fontSize = "18px";
  div.style.fontWeight = "bold";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === CARGAR TODO DESDE SPIN.PY (como antes) ===
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
      tokenMint = token.mint; // Actualiza el mint global
      if (userWallet) detectarTokensUsuario(); // Revisa si ya está conectado
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero en quemar...</div>";

    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.length > 0
      ? winners.winners.map(w => `<div class="winner-entry">GANADOR ${w.wallet} • ${w.prize} • ${w.tokens} tokens • ${w.time}</div>`).join("")
      : "<div class='winner-entry'>Primer ganador pronto...</div>";

  } catch (e) { console.log("Cargando datos..."); }
}

// Timer
let countdown = 300;
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// Iniciar
cargarTodo();
setInterval(cargarTodo, 8000);