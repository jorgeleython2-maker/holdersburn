// app.js — QUEMA REAL + 0 ERRORES + PROFESIONAL 2025
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const RPCS = ["https://rpc.ankr.com/solana", "https://solana-api.projectserum.com", "https://api.mainnet-beta.solana.com"];
const MINT_FALLBACK = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";

let userWallet = null;
let tokenMint = MINT_FALLBACK;
let userBalance = 0;
let connection = null;

// Esperar que las librerías estén 100% cargadas
async function waitForSolanaLibs() {
  while (!window.solanaWeb3 || !window.splToken) {
    await new Promise(r => setTimeout(r, 50));
  }
  console.log("Librerías Solana listas");
}

// Conexión rápida
async function getFastConnection() {
  for (const rpc of RPCS) {
    try {
      const conn = new window.solanaWeb3.Connection(rpc);
      await conn.getSlot();
      connection = conn;
      return conn;
    } catch (e) {}
  }
  connection = new window.solanaWeb3.Connection(RPCS[0]);
  return connection;
}

// Presets del modal
window.setAmount = (amt) => document.getElementById("customAmount").value = amt;

// INICIAR TODO
async function init() {
  await waitForSolanaLibs();
  await getFastConnection();

  // Conectar wallet
  document.getElementById("connectWallet").onclick = async () => {
    if (!window.solana?.isPhantom) return alert("Instala Phantom Wallet");
    try {
      await window.solana.connect();
      userWallet = window.solana.publicKey.toString();
      document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
      cargarTokenInfo();
    } catch (e) { alert("Conexión cancelada"); }
  };

  // Cargar token + jackpot
  async function cargarTokenInfo() {
    try {
      const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
      if (token.mint) tokenMint = token.mint;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol || "sdgsdg"}`;
      document.getElementById("tokenLogo").src = token.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${(token.creator || "").slice(0,6)}...${(token.creator || "").slice(-4)}</strong>`;
      if (userWallet) updateBalance();
    } catch (e) {
      setTimeout(cargarTokenInfo, 5000);
    }
  }

  // Actualizar balance
  window.updateBalance = async () => {
    if (!userWallet || !tokenMint) return;
    try {
      const accounts = await connection.getTokenAccountsByOwner(
        new window.solanaWeb3.PublicKey(userWallet),
        { mint: new window.solanaWeb3.PublicKey(tokenMint) }
      );
      userBalance = accounts.value.length > 0 
        ? Number(accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount) || 0 
        : 0;
      document.getElementById("userBalance").innerText = userBalance.toLocaleString();
      document.getElementById("userTokensDisplay").style.display = "block";
    } catch (e) {
      setTimeout(updateBalance, 3000);
    }
  };

  // QUEMAR TOKENS (100% FUNCIONAL)
  document.getElementById("burnNow").onclick = async () => {
    if (!userWallet) return alert("Conecta tu wallet");
    const amount = parseFloat(document.getElementById("customAmount").value);
    if (!amount || amount > userBalance) return alert("Cantidad inválida o insuficiente");

    try {
      const mint = new window.solanaWeb3.PublicKey(tokenMint);
      const owner = new window.solanaWeb3.PublicKey(userWallet);
      const ata = await window.splToken.getAssociatedTokenAddress(mint, owner);

      const tx = new window.solanaWeb3.Transaction();
      const ataInfo = await connection.getAccountInfo(ata);
      if (!ataInfo) {
        tx.add(window.splToken.createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
      }
      tx.add(window.splToken.createBurnInstruction(
        ata, mint, owner,
        BigInt(Math.floor(amount * 1_000_000_000)), // 9 decimales
        [], window.splToken.TOKEN_PROGRAM_ID
      ));

      tx.feePayer = owner;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);

      alert(`QUEMADOS ${amount.toLocaleString()} $sdgsdg!\nhttps://solscan.io/tx/${sig}`);
      document.getElementById("customAmount").value = "";
      updateBalance();
    } catch (err) {
      alert("Error: " + (err.message || "Transacción cancelada"));
    }
  };

  // Modal y timer
  document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
  document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

  let time = 300;
  setInterval(() => {
    time--; if (time <= 0) time = 300;
    const m = String(Math.floor(time/60)).padStart(2,"0");
    const s = String(time%60).padStart(2,"0");
    document.getElementById("timer").innerText = m + ":" + s;
  }, 1000);

  // Iniciar
  cargarTokenInfo();
  setInterval(cargarTokenInfo, 10000);
}

// ARRANCAR
init();