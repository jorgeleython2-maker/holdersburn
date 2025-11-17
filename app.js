// app.js — DETECCIÓN DE TOKENS 100% FUNCIONAL (incluso tokens recién minteados)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === CONECTAR WALLET Y FORZAR DETECCIÓN ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    // CARGAR LIBRERÍAS SOLANA
    if (!window.solanaWeb3 || !window.splToken) {
      await new Promise(r => setTimeout(r, 1000)); // Espera carga
    }

    // OBTENER MINT DEL TOKEN DEL DEV
    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (!tokenData.mint || tokenData.mint === "undefined") {
      alert("Token del dev aún no detectado. Espera 1-2 min y reconecta.");
      return;
    }

    tokenMint = tokenData.mint;
    console.log("Mint detectado:", tokenMint);

    // FORZAR DETECCIÓN DE BALANCE CADA 3 SEGUNDOS HASTA QUE SALGA
    let intentos = 0;
    const intervalo = setInterval(async () => {
      intentos++;
      const balance = await obtenerBalanceReal();
      if (balance > 0 || intentos > 30) {
        clearInterval(intervalo);
        userTokenBalance = balance;
        mostrarBalance(balance, tokenData.symbol || "TOKEN");
      }
    }, 3000);

  } catch (err) {
    console.log("Cancelado");
  }
};

// === OBTENER BALANCE REAL (FUNCIONA CON TOKENS NUEVOS) ===
async function obtenerBalanceReal() {
  if (!userWallet || !tokenMint) return 0;

  try {
    const resp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
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

    const data = await resp.json();
    let total = 0;

    if (data.result?.value?.length > 0) {
      data.result.value.forEach(acc => {
        const amount = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
        total += Number(amount);
      });
    }

    return total;

  } catch (err) {
    console.log("Error RPC, reintentando...");
    return 0;
  }
}

// === MOSTRAR BALANCE EN PANTALLA ===
function mostrarBalance(balance, symbol) {
  let display = document.getElementById("userTokensDisplay");
  if (!display) {
    display = document.createElement("div");
    display.id = "userTokensDisplay";
    display.className = "user-tokens";
    document.querySelector(".dev-wallet").after(display);
  }

  if (balance > 0) {
    display.innerHTML = `Tienes <strong>${balance.toLocaleString(undefined, {maximumFractionDigits: 0})} $${symbol}</strong>`;
    display.style.display = "block";
    console.log(`¡TOKENS DETECTADOS! → ${balance} $${symbol}`);
  } else {
    display.innerHTML = `Tienes <strong>0</strong> $${symbol} (o aún no indexado)`;
    display.style.display = "block";
  }
}

// === RECARGAR TODO (token, jackpot, holders, etc.) ===
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
      tokenMint = token.mint;
      if (userWallet) obtenerBalanceReal().then(b => mostrarBalance(b, token.symbol));
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Cargando holders...</div>";

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

// INICIAR
cargarTodo();
setInterval(cargarTodo, 10000);