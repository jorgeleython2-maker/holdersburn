// app.js — FALLBACK + REINTENTOS + QUEMA 100% (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736";
const FALLBACK_MINT = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";  // Tu mint sdgsdg
const FALLBACK_SYMBOL = "sdgsdg";

let userWallet = null;
let tokenMint = FALLBACK_MINT;  // Fallback inmediato
let userTokenBalance = 0;
let intentosBackend = 0;
let intentosBalance = 0;

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    detectarTokenConReintentos();
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR TOKEN CON REINTENTOS ===
async function detectarTokenConReintentos() {
  intentosBackend++;
  console.log(`Intento backend ${intentosBackend}...`);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/token`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    console.log("Backend respuesta:", data);

    if (data.mint && data.mint !== "undefined") {
      tokenMint = data.mint;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${data.symbol}`;
      document.getElementById("tokenLogo").src = data.image || "https://i.imgur.com/8f3f8fB.png";
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${data.creator.slice(0,6)}...${data.creator.slice(-4)}</strong>`;
      console.log("TOKEN DETECTADO:", data.name);
      detectarTokensUsuario();  // Ahora detecta balance
      return;
    }
  } catch (e) {
    console.error("Backend error:", e);
  }

  // FALLBACK A TU MINT REAL
  console.log("Usando mint de respaldo:", FALLBACK_MINT);
  document.getElementById("tokenName").innerHTML = `Welcome to burn • $${FALLBACK_SYMBOL}`;
  document.getElementById("tokenLogo").src = "https://i.imgur.com/8f3f8fB.png";
  document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>HtRMq...9jEm</strong>`;
  detectarTokensUsuario();  // Detecta balance con fallback

  // Reintenta backend cada 15s (máx 10 intentos)
  if (intentosBackend < 10) setTimeout(detectarTokenConReintentos, 15000);
}

// === DETECTAR BALANCE CON REINTENTOS ===
async function detectarTokensUsuario() {
  intentosBalance++;
  console.log(`Intento balance ${intentosBalance}...`);

  if (!userWallet) return;

  try {
    const resp = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });
    const data = await resp.json();
    console.log("Respuesta RPC:", data);

    userTokenBalance = 0;

    if (data.result?.value?.length > 0) {
      data.result.value.forEach(acc => {
        const info = acc.account.data.parsed.info;
        if (info.mint === tokenMint) {
          userTokenBalance += Number(info.tokenAmount.uiAmount);
        }
      });
      console.log("Balance detectado:", userTokenBalance);
    } else {
      console.log("No ATA encontrada – reintentando...");
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} tokens</strong>`;
    display.style.display = "block";

    // Reintenta si balance es 0 (indexación lenta)
    if (userTokenBalance === 0 && intentosBalance < 10) {
      setTimeout(detectarTokensUsuario, 3000);
    }

  } catch (err) {
    console.error("Error RPC:", err);
    if (intentosBalance < 10) setTimeout(detectarTokensUsuario, 3000);
  }
}

function crearDisplayTokens() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.className = "user-tokens";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === QUEMA REAL ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet");
  if (!tokenMint) return alert("Token no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens");

  const amount = parseFloat(document.getElementById("customAmount").value);
  if (!amount || amount > userTokenBalance) return alert("Cantidad inválida");

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;
  const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736");
    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);
    const ata = await getAssociatedTokenAddress(mint, owner);

    const tx = new Transaction();
    const ataInfo = await connection.getAccountInfo(ata);
    if (!ataInfo) tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint));

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
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// CARGAR INFO
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
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

  } catch (e) { console.log("Cargando datos..."); }
}

// TIMER
let countdown = 300;
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// MODAL
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// INICIAR
cargarTodo();
setInterval(cargarTodo, 8000);