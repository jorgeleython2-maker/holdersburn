// app.js — DETECCIÓN AGRESIVA + FALLBACK + QUEMA REAL (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
const FALLBACK_MINT = "E1kjpery9wkprYe9phhwSHKtCmQwMNaoy6soa3Wfpump";  // ← TU MINT REAL (sdgsdg)
const FALLBACK_SYMBOL = "sdgsdg";

let userWallet = null;
let tokenMint = null;
let userTokenBalance = 0;
let intentosDeteccion = 0;

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom Wallet!");

  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Wallet conectada:", userWallet);
    await detectarTokenYBalance();
  } catch (err) {
    console.log("Conexión cancelada");
  }
};

// === DETECTAR TOKEN + BALANCE (CON REINTENTOS Y FALLBACK) ===
async function detectarTokenYBalance() {
  intentosDeteccion++;
  console.log(`Intento detección ${intentosDeteccion}...`);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/token`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json();
    console.log("Backend respuesta:", data);

    if (data.mint && data.mint !== "undefined") {
      tokenMint = data.mint;
      await detectarTokensUsuario();
      return;
    }
  } catch (e) {
    console.log("Backend no responde, probando fallback...");
  }

  // FALLBACK A TU MINT REAL
  tokenMint = FALLBACK_MINT;
  console.log("Usando mint de respaldo:", FALLBACK_MINT);
  await detectarTokensUsuario();
}

// === DETECTAR BALANCE DE TOKENS ===
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
        const info = acc.account.data.parsed.info;
        if (info.mint === tokenMint) {
          userTokenBalance += Number(info.tokenAmount.uiAmount);
        }
      });
    }

    const display = document.getElementById("userTokensDisplay") || crearDisplayTokens();
    display.innerHTML = `Tienes <strong>${userTokenBalance.toLocaleString()} $${FALLBACK_SYMBOL}</strong>`;
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
    alert(`Quemando ${amount} $${FALLBACK_SYMBOL}...`);

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

    alert(`¡QUEMADOS ${amount} $${FALLBACK_SYMBOL}!\nhttps://solscan.io/tx/${sig}`);
    input.value = "";
    detectarTokensUsuario();

  } catch (err) {
    console.error(err);
    alert("Error: " + (err.message || "Transacción rechazada"));
  }
};

// === CARGAR INFO BÁSICA ===
async function cargarInfo() {
  try {
    const [j, h] = await Promise.all([
      fetch(`${BACKEND_URL}/api/jackpot`).then(r => r.ok ? r.json() : {jackpot: 0}),
      fetch(`${BACKEND_URL}/api/holders`).then(r => r.ok ? r.json() : {holders: []})
    ]);
    document.getElementById("jackpot").innerText = Number(j.jackpot).toFixed(4);
    document.getElementById("burnList").innerHTML = h.holders.length > 0
      ? h.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}... — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero...</div>";
  } catch (e) {}
}

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
cargarInfo();
setInterval(cargarInfo, 15000);