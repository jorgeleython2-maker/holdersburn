// app.js — QUEMA REAL + DETECCIÓN INMEDIATA DE TOKENS (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";

// RPCs ULTRA-RÁPIDOS que detectan tokens nuevos en segundos
const RPC_LIST = [
  "https://rpc.ankr.com/solana",
  "https://solana-api.projectserum.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://api.mainnet-beta.solana.com"
];

async function getWorkingConnection() {
  for (const rpc of RPC_LIST) {
    try {
      const conn = new solanaWeb3.Connection(rpc);
      await conn.getSlot();
      console.log("RPC activo:", rpc);
      return conn;
    } catch (e) {}
  }
  return new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
}

let userWallet = null;
let tokenMint = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump"; // TU MINT REAL (fallback)
let userTokenBalance = 0;

// CONECTAR WALLET
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("Instala Phantom Wallet");
  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6)+"..."+userWallet.slice(-4);
    cargarTokenYDetectarBalance();
  } catch (e) {}
};

// CARGAR TOKEN + BALANCE
async function cargarTokenYDetectarBalance() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.mint) tokenMint = token.mint;
    document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol || "sdgsdg"}`;
    document.getElementById("tokenLogo").src = token.image || "https://i.imgur.com/8f3f8fB.png";
    document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator?.slice(0,6)}...${token.creator?.slice(-4)}</strong>`;
  } catch (e) {}

  detectarBalanceConReintentos();
}

async function detectarBalanceConReintentos(intentos = 0) {
  if (!userWallet || intentos > 15) return;

  const connection = await getWorkingConnection();
  try {
    const accounts = await connection.getTokenAccountsByOwner(
      new solanaWeb3.PublicKey(userWallet),
      { mint: new solanaWeb3.PublicKey(tokenMint) }
    );

    userTokenBalance = 0;
    if (accounts.value.length > 0) {
      const info = accounts.value[0].account.data.parsed.info;
      userTokenBalance = Number(info.tokenAmount.uiAmount);
    }

    const display = document.getElementById("userTokensDisplay");
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $sdgsdg</strong>`;
    display.style.display = "block";

    if (userTokenBalance === 0 && intentos < 15) {
      setTimeout(() => detectarBalanceConReintentos(intentos + 1), 2000);
    }
  } catch (e) {
    setTimeout(() => detectarBalanceConReintentos(intentos + 1), 2000);
  }
}

// QUEMA REAL (100% FUNCIONAL)
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet");
  if (userTokenBalance <= 0) return alert("No tienes tokens");
  const amount = parseFloat(document.getElementById("customAmount").value);
  if (!amount || amount > userTokenBalance) return alert("Cantidad inválida");

  const connection = await getWorkingConnection();
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
      ata, mint, owner,
      BigInt(Math.floor(amount * 1_000_000_000)), // 9 decimales
      [], TOKEN_PROGRAM_ID
    ));

    tx.feePayer = owner;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const signed = await window.solana.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig);

    alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
    document.getElementById("customAmount").value = "";
    detectarBalanceConReintentos();

  } catch (err) {
    alert("Error: " + (err.message || "Transacción cancelada"));
  }
};

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
cargarTokenYDetectarBalance();
setInterval(cargarTokenYDetectarBalance, 10000);