// app.js — QUEMA REAL + DETECCIÓN INMEDIATA + PROFESIONAL (2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const RPCS = ["https://rpc.ankr.com/solana", "https://solana-api.projectserum.com", "https://api.mainnet-beta.solana.com"];

let userWallet = null;
let tokenMint = null;
let userBalance = 0;
let connection = null;

// Esperar librerías (GRACIAS AL defer, esto nunca falla)
async function waitForLibs() {
  while (!window.solanaWeb3 || !window.splToken) await new Promise(r => setTimeout(r, 50));
  console.log("Librerías listas");
}

// Conexión rápida
async function getConnection() {
  for (const rpc of RPCS) {
    try {
      const conn = new solanaWeb3.Connection(rpc);
      await conn.getSlot();
      connection = conn;
      return conn;
    } catch (e) {}
  }
  connection = new solanaWeb3.Connection(RPCS[2]);
  return connection;
}

// Presets del modal
window.setAmount = (amount) => document.getElementById("customAmount").value = amount;

// INICIAR TODO
async function init() {
  await waitForLibs();
  await getConnection();

  document.getElementById("connectWallet").onclick = async () => {
    if (!window.solana?.isPhantom) return alert("Instala Phantom");
    try {
      await window.solana.connect();
      userWallet = window.solana.publicKey.toString();
      document.getElementById("connectWallet").innerText = userWallet.slice(0,6)+"..."+userWallet.slice(-4);
      cargarToken();
    } catch (e) { alert("Cancelado"); }
  };

  async function cargarToken() {
    try {
      const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
      tokenMint = token.mint;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol || "TOKEN"}`;
      document.getElementById("tokenLogo").src = token.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator?.slice(0,6)}...${token.creator?.slice(-4)}</strong>`;
      if (userWallet) updateBalance();
    } catch (e) { setTimeout(cargarToken, 5000); }
  }

  window.updateBalance = async () => {
    if (!userWallet || !tokenMint) return;
    try {
      const accounts = await connection.getTokenAccountsByOwner(new solanaWeb3.PublicKey(userWallet), { mint: new solanaWeb3.PublicKey(tokenMint) });
      userBalance = accounts.value.length > 0 ? Number(accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount) || 0 : 0;
      document.getElementById("userBalance").innerText = userBalance.toLocaleString();
      document.getElementById("userTokensDisplay").style.display = "block";
    } catch (e) { setTimeout(updateBalance, 3000); }
  };

  document.getElementById("burnNow").onclick = async () => {
    if (!userWallet) return alert("Conecta tu wallet");
    const amount = parseFloat(document.getElementById("customAmount").value);
    if (!amount || amount > userBalance) return alert("Cantidad inválida");

    try {
      const mint = new solanaWeb3.PublicKey(tokenMint);
      const owner = new solanaWeb3.PublicKey(userWallet);
      const ata = await splToken.getAssociatedTokenAddress(mint, owner);

      const tx = new solanaWeb3.Transaction();
      if (!await connection.getAccountInfo(ata)) {
        tx.add(splToken.createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
      }
      tx.add(splToken.createBurnInstruction(ata, mint, owner, BigInt(Math.floor(amount * 1_000_000_000)), [], splToken.TOKEN_PROGRAM_ID));

      tx.feePayer = owner;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);

      alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
      document.getElementById("customAmount").value = "";
      updateBalance();
    } catch (err) {
      alert("Error: " + (err.message || "Transacción cancelada"));
    }
  };

  document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
  document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

  // Timer
  let time = 300;
  setInterval(() => {
    time--; if (time <= 0) time = 300;
    const m = String(Math.floor(time/60)).padStart(2,"0");
    const s = String(time%60).padStart(2,"0");
    document.getElementById("timer").innerText = m + ":" + s;
  }, 1000);

  cargarToken();
  setInterval(cargarToken, 10000);
}

init();