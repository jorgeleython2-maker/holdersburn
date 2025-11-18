// app.js — FALLBACK A MINT REAL + QUEMA 100% (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const FALLBACK_MINT = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";  // Tu mint sdgsdg
const FALLBACK_SYMBOL = "sdgsdg";

let userWallet = null;
let tokenMint = FALLBACK_MINT;  // Fallback inmediato
let userTokenBalance = 0;

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    detectarTokensUsuario();  // Usa fallback mint
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR BALANCE ===
async function detectarTokensUsuario() {
  if (!userWallet) return;

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
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${FALLBACK_SYMBOL}</strong>`;
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

// === QUEMA REAL ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet");
  if (userTokenBalance <= 0) return alert("No tienes tokens");

  const amount = parseFloat(document.getElementById("customAmount").value);
  if (!amount || amount > userTokenBalance) return alert("Cantidad inválida");

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;
  const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

  try {
    alert(`Quemando ${amount.toLocaleString()} $${FALLBACK_SYMBOL}...`);

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

    alert(`¡QUEMADOS ${amount.toLocaleString()} $${FALLBACK_SYMBOL}!\nhttps://solscan.io/tx/${sig}`);
    document.getElementById("customAmount").value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// === CARGAR INFO ===
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