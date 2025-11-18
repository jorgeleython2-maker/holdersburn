// app.js — DETECCIÓN DE TOKENS DEL USUARIO CON REINTENTOS + ATA AUTO (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736";
const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";  // Fallback si Helius falla

let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let intentosBalance = 0;

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);

    const tokenData = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (tokenData.mint) {
      tokenMint = tokenData.mint;
      detectarTokensUsuario();  // Inicia con reintentos
    }
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR BALANCE CON REINTENTOS ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint) return;

  intentosBalance++;
  console.log(`Intento balance ${intentosBalance}...`);

  try {
    const resp = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });

    if (!resp.ok) throw new Error(`RPC error: ${resp.status}`);

    const data = await resp.json();
    console.log("Respuesta RPC:", data);  // Abre F12 para ver

    userTokenBalance = 0;

    if (data.result?.value?.length > 0) {
      data.result.value.forEach(acc => {
        const info = acc.account.data.parsed.info;
        if (info.mint === tokenMint) {
          userTokenBalance += Number(info.tokenAmount.uiAmount);
        }
      });
      console.log("Balance detectado:", userTokenBalance);
    } else {
      console.log("No se encontró ATA – balance 0 (reintentando)");
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    const tokenSymbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${tokenSymbol}</strong>`;
    display.style.display = "block";

    // Reintenta si balance es 0 (indexación lenta)
    if (userTokenBalance === 0 && intentosBalance < 10) {
      setTimeout(detectarTokensUsuario, 3000);  // Cada 3s
    }

  } catch (err) {
    console.error("Error RPC:", err);
    if (intentosBalance < 10) setTimeout(detectarTokensUsuario, 3000);
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

// === QUEMA REAL (TU CÓDIGO + ARREGLOS) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  if (!tokenMint) return alert("Token del dev no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens para quemar");

  const input = document.getElementById("customAmount");
  let amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) {
    return alert(`Cantidad inválida. Tienes: ${userTokenBalance.toLocaleString()}`);
  }

  await waitForSolanaLibs();  // ← Espera librerías

  const { Connection, PublicKey, Transaction } = window.solanaWeb3;
  const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    const connection = new Connection(HELIUS_RPC, "confirmed");
    const mint = new PublicKey(tokenMint);
    const owner = new PublicKey(userWallet);

    const ata = await getAssociatedTokenAddress(mint, owner);
    const ataInfo = await connection.getAccountInfo(ata);

    const tx = new Transaction();
    if (!ataInfo) {
      tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint));
    }

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
    console.error("Error quema:", err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

function waitForSolanaLibs() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.solanaWeb3 && window.splToken) {
        clearInterval(check);
        resolve();
      }
    }, 100);
    setTimeout(() => clearInterval(check), 5000);
  });
}

// Timer + Modal
let countdown = 300;
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, "0");
  const s = String(countdown % 60).padStart(2, "0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// INICIAR
cargarTodo();
setInterval(cargarTodo, 8000);