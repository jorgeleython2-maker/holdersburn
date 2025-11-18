// app.js — QUEMA REAL 100% FUNCIONAL + DETECCIÓN INMEDIATA (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";

// RPCs ULTRA-RÁPIDOS (detectan tokens nuevos en segundos)
const RPC_LIST = [
  "https://rpc.ankr.com/solana",
  "https://solana-api.projectserum.com",
  "https://api.mainnet-beta.solana.com"
];

let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === ESPERAR QUE CARGUEN LAS LIBRERÍAS (arregla solanaWeb3 is not defined) ===
async function waitForSolanaLibs() {
  while (!window.solanaWeb3 || !window.splToken) {
    await new Promise(r => setTimeout(r, 100));
  }
  console.log("Librerías Solana listas");
}

// === CONEXIÓN RÁPIDA ===
async function getConnection() {
  for (const rpc of RPC_LIST) {
    try {
      const conn = new solanaWeb3.Connection(rpc);
      await conn.getSlot();
      console.log("RPC activo:", rpc);
      return conn;
    } catch (e) {}
  }
  return new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
}

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    await waitForSolanaLibs(); // ← ESTO ARREGLA EL ERROR

    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (tokenData.mint) {
      tokenMint = tokenData.mint;
      detectarTokensUsuario(); // con reintentos
    }
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR BALANCE CON REINTENTOS (para que vea tus tokens rápido) ===
async function detectarTokensUsuario(intentos = 0) {
  if (!userWallet || !tokenMint || intentos > 15) return;

  const connection = await getConnection();

  try {
    const accounts = await connection.getTokenAccountsByOwner(
      new solanaWeb3.PublicKey(userWallet),
      { mint: new solanaWeb3.PublicKey(tokenMint) }
    );

    userTokenBalance = 0;
    if (accounts.value.length > 0) {
      const info = accounts.value[0].account.data.parsed.info;
      userTokenBalance = Number(info.tokenAmount.uiAmount) || 0;
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    const tokenSymbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${tokenSymbol}</strong>`;
    display.style.display = "block";

    if (userTokenBalance === 0 && intentos < 15) {
      setTimeout(() => detectarTokensUsuario(intentos + 1), 2000);
    }

  } catch (err) {
    console.error("Error balance:", err);
    setTimeout(() => detectarTokensUsuario(intentos + 1), 2000);
  }
}

function crearDisplayTokens() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.className = "user-tokens";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === QUEMA REAL 100% MANUAL (siempre funciona, sin depender de APIs externas) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet primero");
  if (!tokenMint) return alert("Token no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens");

  const amount = parseFloat(document.getElementById("customAmount").value);
  if (!amount || amount > userTokenBalance) return alert("Cantidad inválida");

  await waitForSolanaLibs();
  const connection = await getConnection();

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    const { PublicKey, Transaction } = solanaWeb3;
    const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = splToken;

    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);
    const ata = await getAssociatedTokenAddress(mint, owner);

    const tx = new Transaction();
    const ataInfo = await connection.getAccountInfo(ata);
    if (!ataInfo) {
      tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
    }

    tx.add(createBurnInstruction(
      ata, mint, owner,
      BigInt(Math.floor(amount * 1_000_000_000)), // 9 decimales
      [], TOKEN_PROGRAM_ID
    ));

    tx.feePayer = owner;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);

    alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    document.getElementById("customAmount").value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error("Error quema:", err);
    alert("Error: " + (err.message || "Transacción cancelada"));
  }
};

// === CARGAR INFO DEL BACKEND ===
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image || "https://i.imgur.com/8f3f8fB.png";
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

  } catch (e) { console.log("Cargando datos..."); }
}

// Timer + Modal
let countdown = 300;
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// INICIAR
cargarTodo();
setInterval(cargarTodo, 8000);