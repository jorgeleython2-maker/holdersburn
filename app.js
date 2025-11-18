// app.js — QUEMA REAL + 0 ERRORES + FUNCIONA EN VERCEL 100%
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const RPC = "https://rpc.ankr.com/solana";
const MINT_FALLBACK = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";

let userWallet = null;
let tokenMint = MINT_FALLBACK;
let userBalance = 0;
let connection = null;

// FORZAR QUE LAS LIBRERÍAS ESTÉN CARGADAS
function waitForLibs() {
  return new Promise(resolve => {
    const check = () => {
      if (window.solanaWeb3 && window.splToken) {
        console.log("Librerías listas");
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

// INICIAR
async function init() {
  await waitForLibs();
  connection = new window.solanaWeb3.Connection(RPC);

  // Presets
  document.querySelectorAll('.presets button').forEach(btn => {
    btn.onclick = () => document.getElementById('customAmount').value = btn.dataset.amount;
  });

  // Conectar wallet
  document.getElementById("connectWallet").onclick = async () => {
    if (!window.solana?.isPhantom) return alert("Instala Phantom");
    try {
      await window.solana.connect();
      userWallet = window.solana.publicKey.toString();
      document.getElementById("connectWallet").innerText = userWallet.slice(0,6)+"..."+userWallet.slice(-4);
      cargarToken();
    } catch (e) { alert("Cancelado"); }
  };

  // Cargar info del token
  async function cargarToken() {
    try {
      const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
      if (token.mint) tokenMint = token.mint;
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol || "sdgsdg"}`;
      document.getElementById("tokenLogo").src = token.image || "https://i.ibb.co.com/0jZ6g3f/fire.png";
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${(token.creator||"").slice(0,6)}...${(token.creator||"").slice(-4)}</strong>`;
      if (userWallet) updateBalance();
    } catch (e) { setTimeout(cargarToken, 5000); }
  }

  // Balance
  window.updateBalance = async () => {
    if (!userWallet) return;
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
    } catch (e) { setTimeout(updateBalance, 3000); }
  };

  // QUEMAR
  document.getElementById("burnNow").onclick = async () => {
    if (!userWallet) return alert("Conecta tu wallet");
    const amount = parseFloat(document.getElementById("customAmount").value);
    if (!amount || amount > userBalance) return alert("Cantidad inválida");

    try {
      const mint = new window.solanaWeb3.PublicKey(tokenMint);
      const owner = new window.solanaWeb3.PublicKey(userWallet);
      const ata = await window.splToken.getAssociatedTokenAddress(mint, owner);

      const tx = new window.solanaWeb3.Transaction();
      if (!await connection.getAccountInfo(ata)) {
        tx.add(window.splToken.createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
      }
      tx.add(window.splToken.createBurnInstruction(ata, mint, owner, BigInt(amount * 1_000_000_000), [], window.splToken.TOKEN_PROGRAM_ID));

      tx.feePayer = owner;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await window.solana.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);

      alert(`QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
      document.getElementById("customAmount").value = "";
      updateBalance();
    } catch (err) {
      alert("Error: " + (err.message || "Cancelado"));
    }
  };

  // Modal + Timer
  document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
  document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

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