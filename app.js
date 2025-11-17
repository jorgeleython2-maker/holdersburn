// app.js — QUEMA REAL 100% FUNCIONAL CON @solana-program/token (2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

// === CARGAR LIBRERÍAS MODERNAS (solana-program/token) ===
async function cargarLibreriasModernas() {
  if (window.getBurnCheckedInstruction) return;

  const script = document.createElement("script");
  script.src = "https://unpkg.com/@solana-program/token@0.2.0/dist/index.iife.js";
  document.head.appendChild(script);

  await new Promise(r => script.onload = r);
  console.log("Librería moderna @solana-program/token cargada");
}

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom Wallet");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    await cargarLibreriasModernas();

    const data = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    tokenMint = data.mint;
    await detectarBalance();
  } catch (e) {
    alert("Conexión cancelada");
  }
};

// === DETECTAR BALANCE ===
async function detectarBalance() {
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

// === QUEMA REAL 100% FUNCIONAL CON getBurnCheckedInstruction (2025) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet || !tokenMint || userTokenBalance <= 0) return alert("No tienes tokens");

  const input = document.getElementById("customAmount");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) return alert("Cantidad inválida");

  await cargarLibreriasModernas();

  const {
    getBurnCheckedInstruction,
    findAssociatedTokenPda,
    TOKEN_PROGRAM_ADDRESS
  } = window;

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;

  try {
    alert(`Quemando ${amount} tokens...`);

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);

    // Derivar ATA
    const [ata] = await findAssociatedTokenPda({
      mint,
      owner,
      tokenProgram: TOKEN_PROGRAM_ADDRESS
    });

    // Crear instrucción de quema
    const burnIx = getBurnCheckedInstruction({
      account: ata,
      mint,
      authority: owner,
      amount: BigInt(Math.floor(amount * 1_000_000)), // 6 decimals
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
    detectarBalance();

  } catch (err) {
    console.error("Error quema:", err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

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
cargarLibreriasModernas();