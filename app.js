// app.js — ARREGLADO: DETECCIÓN + QUEMA CON FALLBACK (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const FALLBACK_MINT = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";  // Tu mint real
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let intentosDeteccion = 0;

// === MOSTRAR WALLET DEV FIJA ===
function mostrarWalletDev() {
  document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>HtRMq...9jEm</strong>`;
  console.log("Wallet dev mostrada fija");
}

// === DETECTAR TOKEN CON REINTENTOS ===
async function detectarToken() {
  intentosDeteccion++;
  console.log(`Intento detección ${intentosDeteccion}...`);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/token`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    console.log("Backend respuesta:", data);

    if (data.mint && data.mint !== "undefined") {
      tokenMint = data.mint;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${data.symbol}`;
      document.getElementById("tokenLogo").src = data.image || "https://i.imgur.com/8f3f8fB.png";
      console.log("TOKEN DETECTADO:", data.name);
      return true;
    }
  } catch (e) {
    console.error("Backend error:", e);
  }

  // FALLBACK A TU MINT REAL
  tokenMint = FALLBACK_MINT;
  console.log("Usando mint de respaldo:", FALLBACK_MINT);
  return true;
}

// === DETECTAR BALANCE ===
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
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} tokens</strong>`;
    display.style.display = "block";

  } catch (err) { 
    console.error("Error balance:", err); 
  }
}

function crearDisplayTokens() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.style.cssText = "text-align:center;margin:20px 0;padding:15px;background:rgba(255,107,0,0.1);border-radius:12px;color:#FF6B00;font-size:18px;font-weight:bold;";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === QUEMA REAL ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet");
  if (!tokenMint) return alert("Token no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens");

  const input = document.getElementById("customAmount");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) return alert("Cantidad inválida");

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;
  const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736");
    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);

    const ata = await getAssociatedTokenAddress(mint, owner);
    const ataInfo = await connection.getAccountInfo(ata);

    const tx = new Transaction();
    if (!ataInfo) {
      tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
    }

    tx.add(createBurnInstruction(
      ata,
      mint,
      owner,
      BigInt(Math.floor(amount * Math.pow(10, 9))), // 9 decimales
      [],
      TOKEN_PROGRAM_ID
    ));

    tx.feePayer = owner;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);

    alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
};

// CARGAR INFO
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name) {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.getElementById("tokenLogo").src = token.image;
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}... — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero...</div>";

  } catch (e) { console.log("Cargando..."); }
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
setInterval(cargarTodo, 10000);