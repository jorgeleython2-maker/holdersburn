// app.js — QUEMA REAL ROBUSTA + IMPORT SOLANA (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === ESPERAR IMPORT DE SOLANA ===
async function esperarSolana() {
  return new Promise((resolve) => {
    if (window.solanaWeb3) {
      resolve();
    } else {
      const check = setInterval(() => {
        if (window.solanaWeb3) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => clearInterval(check), 5000);  // Timeout 5s
    }
  });
}

// === CONECTAR WALLET + DETECTAR TOKENS ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (tokenData.mint) {
      tokenMint = tokenData.mint;
      await detectarTokensUsuario();
    }
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR BALANCE DE TOKENS ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint) return;

  try {
    await esperarSolana();  // Espera import
    const { Connection, PublicKey } = solanaWeb3;
    const connection = new Connection("https://api.mainnet-beta.solana.com");

    const resp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });
    const data = await resp.json();
    userTokenBalance = 0;

    if (data.result?.value?.length > 0) {
      data.result.value.forEach(acc => {
        const info = acc.account.data.parsed.info;
        if (info.mint === tokenMint) {
          userTokenBalance += Number(info.tokenAmount.uiAmount);
        }
      });
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    const tokenSymbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${tokenSymbol}</strong>`;
    display.style.display = "block";

  } catch (err) { console.error("Error detectando balance:", err); }
}

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

// === QUEMA REAL DE TOKENS (BOTÓN FUNCIONAL) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  if (!tokenMint) return alert("Token del dev no detectado aún");
  if (userTokenBalance <= 0) return alert("No tienes tokens para quemar");

  const input = document.getElementById("customAmount");
  let amount = input.value.trim();
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Ingresa una cantidad válida");
  if (Number(amount) > userTokenBalance) return alert(`No tienes suficientes. Tienes: ${userTokenBalance.toLocaleString()}`);

  const amountToBurn = Math.floor(Number(amount) * 1_000_000); // 6 decimals

  try {
    alert(`Quemando ${amount} tokens... ¡Esto es real en mainnet!`);

    await esperarSolana();  // Espera import
    const { Connection, PublicKey, Transaction, TOKEN_PROGRAM_ID } = solanaWeb3;
    const { createBurnInstruction } = splToken;
    const connection = new Connection("https://api.mainnet-beta.solana.com");

    // Obtener ATA del usuario
    const ataResp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });
    const ataData = await ataResp.json();
    if (ataData.result.value.length === 0) return alert("No tienes ATA para este token. Crea una primero.");

    const tokenAccountPubkey = ataData.result.value[0].pubkey;

    const transaction = new Transaction().add(
      createBurnInstruction(
        new PublicKey(tokenAccountPubkey),
        new PublicKey(tokenMint),
        new PublicKey(userWallet),
        BigInt(amountToBurn),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    transaction.feePayer = window.solana.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);

    alert(`¡QUEMADOS ${amount} TOKENS! Tx: https://solscan.io/tx/${signature}`);
    input.value = "";
    detectarTokensUsuario();  // Actualiza balance
    cargarTodo();  // Actualiza grid

  } catch (err) {
    console.error(err);
    alert("Error al quemar: " + (err.message || "Transacción rechazada. Verifica saldo SOL y tokens."));
  }
};

// === CARGAR TODO DESDE SPIN.PY ===
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
      tokenMint = token.mint;
      if (userWallet) detectarTokensUsuario();
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

// Iniciar
cargarTodo();
setInterval(cargarTodo, 8000);

// Partículas y modal
if (typeof particlesJS === 'function') {
  particlesJS("burnList", { particles: { number: { value: 80 }, color: { value: "#FF4500" } } });
}
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";