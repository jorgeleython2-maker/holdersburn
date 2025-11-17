// app.js — QUEMA REAL + ENVÍO AUTOMÁTICO DE PREMIOS (NOV 2025)
const BACKEND_URL = "https://spin-production-ddc0.up.railway.app";
let countdown = 300;
let userWallet = null;

// === CONECTAR PHANTOM ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom!");
  try {
    await window.solana.connect();
    userWallet = window.solana.publicKey.toString();
    document.getElementById("connectWallet").innerText = userWallet.slice(0,6) + "..." + userWallet.slice(-4);
    console.log("Usuario conectado:", userWallet);
  } catch (err) { console.log("Cancelado"); }
};

// === QUEMAR TOKENS (cantidad personalizada) ===
document.getElementById("burnNow").onclick = async () => {
  if (!userWallet) return alert("Primero conecta tu wallet");
  
  const customInput = document.getElementById("customAmount");
  let amount = customInput.value.trim();
  if (!amount || isNaN(amount) || Number(amount) <= 0) return alert("Ingresa una cantidad válida");

  amount = Math.floor(Number(amount) * 1_000_000); // 6 decimals

  try {
    alert(`Quemando ${amount / 1_000_000} tokens...`);

    const response = await fetch(`${BACKEND_URL}/api/token`);
    const token = await response.json();
    if (!token.mint) return alert("Token no detectado aún");

    const tx = new window.solanaWeb3.Transaction();
    
    // Instrucción de quemado (burn SPL token)
    tx.add(
      window.solanaWeb3.SystemProgram.transfer({
        fromPubkey: window.solana.publicKey,
        toPubkey: new window.solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Burn address
        lamports: 0
      }),
      window.solanaWeb3.createBurnInstruction(
        new window.solanaWeb3.PublicKey(await getAssociatedTokenAddress(token.mint, userWallet)),
        new window.solanaWeb3.PublicKey(token.mint),
        window.solana.publicKey,
        amount
      )
    );

    const { signature } = await window.solana.signAndSendTransaction(tx);
    await window.solanaWeb3.getSignatureStatuses([signature]);

    alert(`¡Quemados ${amount / 1_000_000} tokens! Participas en el sorteo`);
    customInput.value = "";
    cargarTodo(); // Refresca holders
  } catch (err) {
    console.error(err);
    alert("Error al quemar: " + err.message);
  }
};

// === CARGAR TODO DESDE SPIN.PY ===
async function cargarTodo() {
  try {
    const token = await (await fetch(`${BACKEND_URL}/api/token`)).json();
    if (token.name && token.name !== "Detectando...") {
      document.getElementById("tokenName").innerHTML = `Welcome to burn • $${token.symbol}`;
      document.title = `${token.name} • Burn to Win`;
      document.getElementById("tokenLogo").src = token.image;
      document.getElementById("devWalletDisplay").innerHTML = `Dev Wallet: <strong>${token.creator.slice(0,6)}...${token.creator.slice(-4)}</strong>`;
    }

    const jackpot = await (await fetch(`${BACKEND_URL}/api/jackpot`)).json();
    document.getElementById("jackpot").innerText = Number(jackpot.jackpot).toFixed(4);

    const holders = await (await fetch(`${BACKEND_URL}/api/holders`)).json();
    document.getElementById("burnList").innerHTML = holders.holders.length > 0
      ? holders.holders.map((h,i) => `<div class="burn-entry">#${i+1} ${h[0].slice(0,6)}...${h[0].slice(-4)} — ${Number(h[1]).toLocaleString()} tokens</div>`).join("")
      : "<div class='burn-entry'>Sé el primero en quemar...</div>";

    const winners = await (await fetch(`${BACKEND_URL}/api/winners`)).json();
    document.getElementById("winnerList").innerHTML = winners.winners.map(w => 
      `<div class="winner-entry">GANADOR ${w.wallet} ganó ${w.prize} • ${w.tokens} tokens • ${w.time}</div>`
    ).join("") || "<div class='winner-entry'>Primer ganador pronto...</div>";

  } catch (e) { console.log("Cargando..."); }
}

// Timer
setInterval(() => {
  countdown--; if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown/60)).padStart(2,"0");
  const s = String(countdown%60).padStart(2,"0");
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// Iniciar
cargarTodo();
setInterval(cargarTodo, 8000);