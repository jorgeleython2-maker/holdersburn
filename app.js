// app.js — QUEMA REAL 100% FUNCIONAL (SIN ERRORES) - NOV 2025
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let tokenDecimals = 9; // Cambia a 6 si tu token tiene 6 decimales

// === ESPERAR A QUE LAS LIBRERÍAS ESTÉN CARGADAS ===
async function waitForLibs() {
  while (!window.solanaWeb3 || !window.splToken) {
    console.log("Esperando librerías Solana...");
    await new Promise(r => setTimeout(r, 200));
  }
  console.log("Librerías listas: web3.js + spl-token");
}

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom Wallet");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    await waitForLibs(); // ← Esto arregla el error

    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (tokenData.mint) {
      tokenMint = tokenData.mint;
      await detectarTokensUsuario();
    }
  } catch (e) {
    alert("Conexión cancelada");
  }
};

// === DETECTAR BALANCE ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint) return;

  try {
    const resp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
      method: "POST",
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
        userTokenBalance += Number(acc.account.data.parsed.info.tokenAmount.uiAmount || 0);
      });
    }

    const display = document.getElementById("userTokensDisplay");
    if (display) {
      const symbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
      display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${symbol}</strong>`;
      display.style.display = "block";
    }
  } catch (e) { console.error(e); }
}

// === QUEMA REAL 100% FUNCIONAL (MANUAL + ATA + DECIMALES AUTOMÁTICOS) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet");
  if (!tokenMint) return alert("Token no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens");

  const input = document.getElementById("customAmount");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) return alert("Cantidad inválida");

  await waitForLibs(); // ← Seguro total

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;
  const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);

    // === DETECTAR DECIMALES REALES DEL TOKEN ===
    const mintInfo = await connection.getParsedAccountInfo(mint);
    tokenDecimals = mintInfo.value.data.parsed.info.decimals;
    console.log("Decimales detectados:", tokenDecimals);

    // === ATA + CREAR SI NO EXISTE ===
    const ata = await getAssociatedTokenAddress(mint, owner);
    const ataInfo = await connection.getAccountInfo(ata);

    const tx = new Transaction();

    if (!ataInfo) {
      tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
      console.log("ATA no existía → se crea");
    }

    // === INSTRUCCIÓN DE QUEMA ===
    tx.add(createBurnInstruction(
      ata,
      mint,
      owner,
      BigInt(Math.floor(amount * Math.pow(10, tokenDecimals))),
      [],
      TOKEN_PROGRAM_ID
    ));

    tx.feePayer = window.solana.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
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
      document.getElementById("pageTitle").textContent = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
      tokenMint = token.mint;
      if (userWallet) detectarTokensUsuario();
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}... — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero...</div>";

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
setInterval(cargarTodo, 10000);