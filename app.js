// app.js — DETECCIÓN + QUEMA REAL 100% FUNCIONAL (VERSIÓN FINAL - NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === CARGAR LIBRERÍAS SOLANA CORRECTAMENTE (ARREGLO DEL ERROR) ===
const solanaWeb3 = window.solanaWeb3 || window.SolanaWeb3 || await import("https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/dist/index.iife.min.js");
const splToken = window.splToken || window.SplToken || await import("https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.1/lib/index.iife.min.js");

// === CONECTAR WALLET + DETECTAR TOKENS (TU CÓDIGO QUE SÍ FUNCIONA) ===
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

// === DETECTAR CUÁNTOS TOKENS TIENE EL USUARIO (TU CÓDIGO QUE SÍ FUNCIONA) ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint) return;

  try {
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

  } catch (err) { 
    console.error("Error detectando balance:", err);
  }
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

// === QUEMA REAL 100% FUNCIONAL (ARREGLADO) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  if (!tokenMint) return alert("Token del dev no detectado aún");

  const input = document.getElementById("customAmount");
  let amount = input.value.trim();
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Ingresa una cantidad válida");
  if (Number(amount) > userTokenBalance) return alert(`No tienes suficientes tokens. Tienes: ${userTokenBalance.toLocaleString()}`);

  const amountToBurn = Math.floor(Number(amount) * 1_000_000);

  try {
    alert(`Quemando ${amount} tokens...`);

    const { Connection, PublicKey, Transaction } = window.solanaWeb3;
    const { createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    // Obtener ATA del usuario
    const tokenAccountResp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });
    const tokenAccounts = await tokenAccountResp.json();
    if (!tokenAccounts.result?.value?.[0]) return alert("No tienes tokens o ATA no encontrada");

    const tokenAccountPubkey = tokenAccounts.result.value[0].pubkey;

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
    await connection.confirmTransaction(signature, "confirmed");

    alert(`¡QUEMADOS ${amount} TOKENS!\nTx: https://solscan.io/tx/${signature}`);
    input.value = "";
    detectarTokensUsuario();
    cargarTodo();

  } catch (err) {
    console.error(err);
    alert("Error al quemar: " + (err.message || "Transacción rechazada"));
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

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// Iniciar
cargarTodo();
setInterval(cargarTodo, 8000);