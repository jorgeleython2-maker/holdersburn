// app.js — QUEMA REAL + DETECCIÓN DE TOKENS 100% FUNCIONAL (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let connection = null;

// === CARGAR SOLANA CORRECTAMENTE ===
async function cargarSolanaLibs() {
  if (window.solanaWeb3 && window.splToken) return;
  
  const web3Script = document.createElement("script");
  web3Script.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/dist/index.iife.min.js";
  document.head.appendChild(web3Script);

  const splScript = document.createElement("script");
  splScript.src = "https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.1/lib/index.iife.min.js";
  document.head.appendChild(splScript);

  await new Promise(resolve => {
    splScript.onload = () => {
      connection = new window.solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
      console.log("Solana Web3 + SPL Token cargados correctamente");
      resolve();
    };
  });
}

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    await cargarSolanaLibs();
    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (tokenData.mint) {
      tokenMint = tokenData.mint;
      await detectarTokensUsuario();
    }
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR BALANCE (FUNCIONA AUNQUE NO TENGA ATA) ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint || !connection) return;

  try {
    const { PublicKey, getAssociatedTokenAddress } = window.solanaWeb3;
    const { getAccount } = window.splToken;

    const mintPubkey = new PublicKey(tokenMint);
    const walletPubkey = new PublicKey(userWallet);

    const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    
    let balance = 0;
    try {
      const account = await getAccount(connection, ata);
      balance = Number(account.amount) / 1_000_000;
    } catch (e) {
      console.log("No tiene ATA aún → balance 0");
    }

    userTokenBalance = balance;

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    const tokenSymbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    display.innerHTML = `Tienes <strong>${balance.toLocaleString(undefined, {maximumFractionDigits: 0})} $${tokenSymbol}</strong>`;
    display.style.display = "block";

  } catch (err) {
    console.error("Error detectando balance:", err);
  }
}

function crearDisplayTokens() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.className = "user-tokens";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === QUEMA REAL 100% FUNCIONAL ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  if (!tokenMint) return alert("Token no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens para quemar");

  const input = document.getElementById("customAmount");
  let amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) {
    return alert(`Cantidad inválida. Tienes: ${userTokenBalance.toLocaleString()}`);
  }

  const amountToBurn = BigInt(Math.floor(amount * 1_000_000));

  try {
    alert(`Quemando ${amount} tokens...`);

    const { PublicKey, Transaction, getAssociatedTokenAddress } = window.solanaWeb3;
    const { createBurnInstruction, getAccount } = window.splToken;

    const mintPubkey = new PublicKey(tokenMint);
    const walletPubkey = new PublicKey(userWallet);
    const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);

    // Verificar que exista la cuenta
    await getAccount(connection, ata);

    const transaction = new Transaction().add(
      createBurnInstruction(
        ata,
        mintPubkey,
        walletPubkey,
        amountToBurn,
        [],
        window.splToken.TOKEN_PROGRAM_ID
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
    alert("Error: " + (err.message || "Transacción rechazada"));
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
      : "<div class='burn-entry'>Sé el primero...</div>";

    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.length > 0
      ? winners.winners.map(w => `<div class="winner-entry">GANADOR ${w.wallet} • ${w.prize} • ${w.tokens} tokens • ${w.time}</div>`).join("")
      : "<div class='winner-entry'>Primer ganador pronto...</div>";

  } catch (e) { console.log("Cargando..."); }
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