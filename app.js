// app.js — QUEMA REAL 100% FUNCIONAL CON TU INDEX.HTML ACTUAL (2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736";

let userWallet = null;
let tokenMint = null;
let tokenDecimals = 9;
let userTokenBalance = 0;

// === ESPERAR LIBRERÍAS ===
async function waitForLibs() {
  while (!window.solanaWeb3 || !window.splToken) await new Promise(r => setTimeout(r, 100));
}

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom Wallet");
  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    await cargarTokenYBalance();
  } catch (e) { alert("Cancelado"); }
};

// === CARGAR TOKEN + BALANCE ===
async function cargarTokenYBalance() {
  await waitForLibs();
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.mint) {
      tokenMint = token.mint;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.getElementById("pageTitle").textContent = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
      await detectarBalance();
    }
  } catch (e) { console.log("Backend lento..."); }
}

// === DETECTAR BALANCE ===
async function detectarBalance() {
  if (!userWallet || !tokenMint) return;
  const connection = new solanaWeb3.Connection(HELIUS_RPC);
  try {
    const accounts = await connection.getTokenAccountsByOwner(new solanaWeb3.PublicKey(userWallet), { mint: new solanaWeb3.PublicKey(tokenMint) });
    userTokenBalance = 0;
    if (accounts.value.length > 0) {
      const info = accounts.value[0].account.data.parsed.info;
      userTokenBalance = info.tokenAmount.uiAmount;
      tokenDecimals = info.tokenAmount.decimals;
    }
    const symbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    const display = document.getElementById("userTokensDisplay");
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${symbol}</strong>`;
    display.style.display = "block";
  } catch (e) { console.error(e); }
}

// === QUEMA REAL 100% (BOTÓN ROJO) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet || !tokenMint || userTokenBalance <= 0) return alert("No tienes tokens o no estás conectado");

  const input = document.getElementById("customAmount");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) return alert("Cantidad inválida");

  await waitForLibs();
  const connection = new solanaWeb3.Connection(HELIUS_RPC);
  const { PublicKey, Transaction } = solanaWeb3;
  const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = splToken;

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);
    const ata = await getAssociatedTokenAddress(mint, owner);

    const tx = new Transaction();
    const ataInfo = await connection.getAccountInfo(ata);
    if (!ataInfo) tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint));

    tx.add(createBurnInstruction(
      ata,
      mint,
      owner,
      BigInt(Math.floor(amount * Math.pow(10, tokenDecimals))),
      [],
      TOKEN_PROGRAM_ID
    ));

    tx.feePayer = owner;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, "confirmed");

    alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarBalance();
    cargarDatos(); // actualiza jackpot y holders

  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// === CARGAR JACKPOT + HOLDERS ===
async function cargarDatos() {
  try {
    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}... — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero...</div>";
  } catch (e) {}
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
cargarDatos();
setInterval(cargarDatos, 10000);
cargarTokenYBalance();