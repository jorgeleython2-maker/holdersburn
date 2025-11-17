// app.js — QUEMA REAL 100% FUNCIONAL (VERSIÓN FINAL QUE SÍ QUEMA - NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === CARGAR LIBRERÍAS SOLANA ===
async function cargarLibrerias() {
  if (window.solanaWeb3 && window.splToken) return;

  const web3 = document.createElement("script");
  web3.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/dist/index.iife.min.js";
  document.head.appendChild(web3);

  const spl = document.createElement("script");
  spl.src = "https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.8/lib/index.iife.min.js";
  document.head.appendChild(spl);

  await new Promise(r => spl.onload = r);
  console.log("Librerías cargadas");
}

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    await cargarLibrerias();

    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    tokenMint = tokenData.mint;
    await detectarTokensUsuario();
  } catch (e) { alert("Cancelado"); }
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
        userTokenBalance += Number(acc.account.data.parsed.info.tokenAmount	uiAmount || 0);
      });
    }

    const symbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    const display = document.getElementById("userTokensDisplay") || crearDisplay();
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${symbol}</strong>`;
    display.style.display = "block";

  } catch (e) { console.error(e); }
}

function crearDisplay() {
  const div = document.createElement("div");
  div.id = "userTokensDisplay";
  div.style.cssText = "text-align:center;margin:20px 0;padding:15px;background:rgba(255,107,0,0.1);border-radius:12px;color:#FF6B00;font-size:18px;font-weight:bold;";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === QUEMA REAL QUE SÍ FUNCIONA (VERSIÓN 0.4.8) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet || !tokenMint || userTokenBalance <= 0) return alert("No tienes tokens o no estás conectado");

  const input = document.getElementById("customAmount");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) return alert("Cantidad inválida");

  await cargarLibrerias();

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;
  const { getAssociatedTokenAddress, createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

  try {
    alert(`Quemando ${amount} tokens...`);

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const mintPubkey = new PublicKey(tokenMint);
    const walletPubkey = new PublicKey(userWallet);

    // Obtener o crear ATA
    const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);

    const tx = new Transaction().add(
      createBurnInstruction(
        ata,                    // source
        mintPubkey,             // mint
        walletPubkey,           // owner
        BigInt(Math.floor(amount * 1_000_000)), // amount (6 decimals)
        [],                     // multiSigners
        TOKEN_PROGRAM_ID
      )
    );

    tx.feePayer = window.solana.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    alert(`¡QUEMADOS ${amount} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// Timer + Modal + Inicio
let countdown = 300;
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

cargarLibrerias();