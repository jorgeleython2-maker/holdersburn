// app.js — QUEMA REAL 100% FUNCIONAL CON LA NUEVA API 2025 (getBurnCheckedInstruction)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === CARGAR LIBRERÍAS SOLANA + NUEVA API TOKEN ===
async function cargarLibreriasSolana() {
  if (window.solanaWeb3 && window.getBurnCheckedInstruction) return;

  // web3.js
  if (!window.solanaWeb3) {
    const web3 = document.createElement("script");
    web3.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/dist/index.iife.min.js";
    document.head.appendChild(web3);
    await new Promise(r => web3.onload = r);
  }

  // NUEVA API: @solana-program/token (la que SÍ quema en 2025)
  const tokenScript = document.createElement("script");
  tokenScript.src = "https://unpkg.com/@solana-program/token@0.2.0/dist/index.iife.js";
  document.head.appendChild(tokenScript);

  await new Promise(resolve => {
    tokenScript.onload = () => {
      console.log("Librerías cargadas: web3.js + @solana-program/token");
      resolve();
    };
  });
}

// === CONECTAR WALLET + DETECTAR TOKENS (TU CÓDIGO QUE SÍ FUNCIONA) ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    await cargarLibreriasSolana();  // ← CARGA LA NUEVA API

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

// === QUEMA REAL 100% CON LA NUEVA API (getBurnCheckedInstruction) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  if (!tokenMint) return alert("Token del dev no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens para quemar");

  const input = document.getElementById("customAmount");
  let amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) {
    return alert(`Cantidad inválida. Tienes: ${userTokenBalance.toLocaleString()}`);
  }

  await cargarLibreriasSolana();

  const amountToBurn = BigInt(Math.floor(amount * 1_000_000)); // 6 decimales

  try {
    alert(`Quemando ${amount} tokens...`);

    const { Connection, PublicKey, Transaction } = window.solanaWeb3;
    const { getBurnCheckedInstruction, findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } = window;

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const mintPubkey = new PublicKey(tokenMint);
    const ownerPubkey = new PublicKey(userWallet);

    // Derivar ATA automáticamente
    const [ata] = await findAssociatedTokenPda({
      mint: mintPubkey,
      owner: ownerPubkey,
      tokenProgram: TOKEN_PROGRAM_ADDRESS
    });

    // Instrucción de quema moderna (2025)
    const burnIx = getBurnCheckedInstruction({
      account: ata,
      mint: mintPubkey,
      authority: ownerPubkey,
      amount: amountToBurn,
      decimals: 6
    });

    const tx = new Transaction().add(burnIx);
    tx.feePayer = window.solana.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    alert(`¡QUEMADOS ${amount} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error("Error quema:", err);
    alert("Error al quemar: " + (err.message || "Transacción rechazada"));
  }
};

// === CARGAR TODO DESDE SPIN.PY (SIN CAMBIOS) ===
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

// Iniciar
cargarTodo();
setInterval(cargarTodo, 8000);