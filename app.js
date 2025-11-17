// app.js — VERSIÓN FINAL INDESTRUCTIBLE (FUNCIONA CON O SIN RAILWAY) - NOV 2025
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";

// MINT DE RESPALDO (TU TOKEN REAL - CAMBIA ESTE SI LANZAS OTRO)
const MINT_DE_RESPALDO = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";  // ← TU MINT ACTUAL

let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let tokenSymbol = "TOKEN";

// === CARGAR LIBRERÍAS SOLANA ===
await Promise.all([
  import("https://cdn.jsdelivr.net/npm/@solana/web3.js@1.91.1/dist/index.iife.min.js"),
  import("https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.1/lib/index.iife.min.js")
]);
const { Connection, PublicKey, Transaction } = window.solanaWeb3;
const { createBurnInstruction, TOKEN_PROGRAM_ID } = window.splToken;

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);
    await cargarTokenYBalance();
  } catch (err) {
    alert("Conexión cancelada");
  }
};

// === CARGAR TOKEN (CON RESPALDO SI RAILWAY CAE) ===
async function cargarTokenYBalance() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/token`, { timeout: 8000 });
    if (resp.ok) {
      const data = await resp.json();
      if (data.mint && data.mint !== "undefined") {
        tokenMint = data.mint;
        tokenSymbol = data.symbol || "TOKEN";
        console.log("Token cargado desde backend:", tokenSymbol);
      } else {
        throw new Error("Mint inválido");
      }
    } else {
      throw new Error("Backend no responde");
    }
  } catch (err) {
    console.log("Backend caído → usando mint de respaldo");
    tokenMint = MINT_DE_RESPALDO;
    tokenSymbol = "sdgsdg"; // Cambia si tu token tiene otro símbolo
    alert("Backend temporalmente caído → usando modo offline (todo funciona igual)");
  }

  document.getElementById("tokenName").innerHTML = `Welcome to burn • $${tokenSymbol}`;
  document.title = `Burn to Win • $${tokenSymbol}`;
  document.getElementById("tokenLogo").src = "https://i.ibb.co.com/0jZ6g3f/fire.png";

  await detectarTokensUsuario();
}

// === DETECTAR TOKENS DEL USUARIO ===
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
  div.className = "user-tokens";
  document.querySelector(".dev-wallet").after(div);
  return div;
}

// === QUEMA REAL 100% FUNCIONAL ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Conecta tu wallet primero");
  if (!tokenMint) return alert("Token no cargado");
  if (userTokenBalance <= 0) return alert("No tienes tokens para quemar");

  const input = document.getElementById("customAmount");
  let amount = parseFloat(input.value);
  if (!amount || amount <= 0 || amount > userTokenBalance) {
    return alert(`Cantidad inválida. Tienes: ${userTokenBalance.toLocaleString()}`);
  }

  const amountToBurn = BigInt(Math.floor(amount * 1_000_000));

  try {
    alert(`Quemando ${amount} $${tokenSymbol}...`);

    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

    // Obtener ATA
    const resp = await fetch("https://mainnet.helius-rpc.com/?api-key=95932bca-32bc-465f-912c-b42f7dd31736", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0", id: "1",
        method: "getTokenAccountsByOwner",
        params: [userWallet, { mint: tokenMint }, { encoding: "jsonParsed" }]
      })
    });
    const data = await resp.json();
    if (!data.result?.value?.[0]) return alert("No se encontró tu cuenta de tokens");

    const ata = data.result.value[0].pubkey;

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
    await connection.confirmTransaction(sig, "confirmed");

    alert(`¡QUEMADOS ${amount} $${tokenSymbol}!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// === CARGAR INFO BÁSICA (jackpot, holders, etc.) ===
async function cargarInfo() {
  try {
    const [jackpotResp, holdersResp] = await Promise.all([
      fetch(`${BACKEND_URL}/api/jackpot`),
      fetch(`${BACKEND_URL}/api/holders`)
    ]);

    if (jackpotResp.ok) {
      const j = await jackpotResp.json();
      document.getElementById("jackpot").innerText = Number(j.jackpot).toFixed(4);
    }
    if (holdersResp.ok) {
      const h = await holdersResp.json();
      document.getElementById("burnList").innerHTML = h.holders.length > 0
        ? h.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
        : "<div class='burn-entry'>Sé el primero...</div>";
    }
  } catch (e) { console.log("Backend caído, info parcial"); }
}

// Timer
let countdown = 300;
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// INICIAR
cargarTokenYBalance();
cargarInfo();
setInterval(cargarInfo, 12000);