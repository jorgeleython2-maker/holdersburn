// app.js — QUEMA REAL CON FALLBACK (SIN CORS + SOL INCINERATOR FAIL-SAFE) - NOV 2025
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736";

let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;

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
      await detectarTokensUsuario();
    }
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR BALANCE (TU CÓDIGO QUE SÍ FUNCIONA) ===
async function detectarTokensUsuario() {
  if (!userWallet || !tokenMint) return;

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
    const data = await resp.json();
    userTokenBalance = 0;

    if (data.result?.value?.length > 0) {
      data.result.value.forEach(acc => {
        const info = acc.account.data.parsed.info;
        if (info.mint === tokenMint) {
          userTokenBalance += Number(info.tokenAmount.uiAmount);
        }
      });
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    const tokenSymbol = (await (await fetch(`${BACKEND_URL}/api/token`)).json()).symbol || "TOKEN";
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${tokenSymbol}</strong>`;
    display.style.display = "block";

  } catch (err) { 
    console.error("Error detectando balance:", err); 
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

// === QUEMA REAL CON FALLBACK (SOL INCINERATOR → MANUAL) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  if (!tokenMint) return alert("Token del dev no detectado");
  if (userTokenBalance <= 0) return alert("No tienes tokens para quemar");

  const input = document.getElementById("customAmount");
  let amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) {
    return alert(`Cantidad inválida. Tienes: ${userTokenBalance.toLocaleString()}`);
  }

  try {
    alert(`Quemando ${amount.toLocaleString()} tokens...`);

    // === MÉTODO 1: SOL INCINERATOR (rápido + rent) ===
    try {
      const status = await (await fetch(`${INCINERATOR_API}/`)).json();
      if (status.status === "ok") {
        const resp = await fetch(`${INCINERATOR_API}/burn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: tokenMint,
            amount: Math.floor(amount * Math.pow(10, 9)), // 9 decimales
            userPublicKey: userWallet
          })
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.transaction) {
            const { Transaction } = solanaWeb3;
            const tx = Transaction.from(Buffer.from(data.transaction, "base64"));
            const signed = await window.solana.signTransaction(tx);
            const { Connection } = solanaWeb3;
            const connection = new Connection(HELIUS_RPC);
            const sig = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(sig);

            alert(`¡QUEMADOS ${amount.toLocaleString()} TOKENS!\nhttps://solscan.io/tx/${sig}`);
            input.value = "";
            detectarTokensUsuario();
            return; // Éxito, no hace fallback
          }
        }
      }
    } catch (e) {
      console.log("Sol Incinerator falló, usando quema manual...");
    }

    // === MÉTODO 2: QUEMA MANUAL (siempre funciona) ===
    const { Connection, PublicKey, Transaction } = solanaWeb3;
    const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createBurnInstruction, TOKEN_PROGRAM_ID } = splToken;

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
      BigInt(Math.floor(amount * Math.pow(10, 9))), // 9 decimales
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

// === CARGAR TODO ===
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
      tokenMint = token.mint;
      if (userWallet) detectarTokensUsuario();
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero en quemar...</div>";

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
setInterval(cargarTodo, 8000);