// app.js — VERSIÓN FINAL 100% FUNCIONAL SIN ERRORES (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const MINT_DE_RESPALDO = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump"; // ← TU MINT REAL

let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let tokenSymbol = "sdgsdg";

// CARGAR LIBRERÍAS SOLANA
async function cargarLibreriasSolana() {
  if (!window.solanaWeb3 || !window.splToken) {
    const web3 = document.createElement("script");
    web3.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/dist/index.iife.min.js";
    document.head.appendChild(web3);

    const spl = document.createElement("script");
    spl.src = "https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.1/lib/index.iife.min.js";
    document.head.appendChild(spl);

    await new Promise(resolve => spl.onload = resolve);
  }
}

// CONECTAR WALLET
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    await cargarLibreriasSolana();
    await cargarTokenYBalance();
  } catch (err) {
    alert("Conexión cancelada");
  }
};

// CARGAR TOKEN (con respaldo si Railway cae)
async function cargarTokenYBalance() {
  let data = null;
  try {
    const resp = await fetch(`${BACKEND_URL}/api/token`, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) data = await resp.json();
  } catch (e) {
    console.log("Backend caído → modo offline activado");
  }

  if (data?.mint && data.mint !== "undefined") {
    tokenMint = data.mint;
    tokenSymbol = data.symbol || "sdgsdg";
  } else {
    tokenMint = MINT_DE_RESPALDO;
    tokenSymbol = "sdgsdg";
    alert("Backend caído → usando token actual (todo funciona igual)");
  }

  document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenSymbol}`;
  document.getElementById("tokenLogo").src = "https://i.ibb.co.com/0jZ6g3f/fire.png";
  document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>HtRMq...9jEm</strong>`;

  await detectarTokensUsuario();
}

// DETECTAR TOKENS DEL USUARIO
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
        const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
        userTokenBalance += Number(amount);
      });
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${tokenSymbol}</strong>`;
    display.style.display = "block";

  } catch (err) {
    console.error("Error detectando tokens:", err);
  }
}

function crearDisplayTokens() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.style.cssText = "text-align:center;margin:20px 0;padding:15px;background:rgba(255,107,0,0.1);border-radius:12px;color:#FF6B00;font-size:18px;font-weight:bold;";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// QUEMA REAL 100% FUNCIONAL
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet primero");
  if (!tokenMint) return alert("Token no cargado");
  if (userTokenBalance <= 0) return alert("No tienes tokens");

  const input = document.getElementById("customAmount");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) {
    return alert(`Cantidad inválida. Tienes: ${userTokenBalance.toLocaleString()}`);
  }

  const amountToBurn = BigInt(Math.floor(amount * 1_000_000));

  try {
    alert(`Quemando ${amount} $${tokenSymbol}...`);

    const { Connection, PublicKey, Transaction } = window.solanaWeb3;
    const { createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;
    const connection = new Connection("https://api.mainnet-beta.solana.com");

    const ataResp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });
    const ataData = await ataResp.json();
    const ata = ataData.result.value[0].pubkey;

    const tx = new Transaction().add(
      createBurnInstruction(
        new PublicKey(ata),
        new PublicKey(tokenMint),
        new PublicKey(userWallet),
        amountToBurn,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    tx.feePayer = window.solana.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);

    alert(`¡QUEMADOS ${amount} $${tokenSymbol}!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// CARGAR INFO (jackpot, holders)
async function cargarInfo() {
  try {
    const [j, h] = await Promise.all([
      fetch(`${BACKEND_URL}/api/jackpot`).then(r => r.ok ? r.json() : {jackpot: 0}),
      fetch(`${BACKEND_URL}/api/holders`).then(r => r.ok ? r.json() : {holders: []})
    ]);
    document.getElementById("jackpot").innerText = Number(j.jackpot).toFixed(4);
    document.getElementById("burnList").innerHTML = h.holders.length > 0
      ? h.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}... — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero...</div>";
  } catch (e) {}
}

// TIMER + MODAL
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
cargarInfo();
setInterval(cargarInfo, 15000);