// MRMOON BURN-TO-WIN — 100% AUTOMÁTICO (NOV 2025)
let walletAddress = null;
let myToken = null;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");

// CONECTAR WALLET
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) return alert("¡Instala Phantom!");
  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    document.getElementById("connectWallet").innerText = walletAddress.slice(0,6)+"..."+walletAddress.slice(-4);
    detectarTokenYActivarTodo();
  } catch (e) { alert("Cancelado"); }
};

// AUTODETECCIÓN + TODO AUTOMÁTICO
async function detectarTokenYActivarTodo() {
  try {
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${walletAddress}?limit=1`);
    const data = await r.json();
    if (!data.coins?.length) return alert("Conecta la wallet que creó tu token en pump.fun");

    myToken = data.coins[0];

    // Mostrar token bonito
    document.querySelector("h1").innerText = `Welcome to burn • $${myToken.symbol}`;
    document.title = `${myToken.name} Burn to Win`;
    if (myToken.image_uri) {
      const img = new Image(60,60);
      img.src = myToken.image_uri;
      img.style.cssText = "border-radius:50%; margin-right:12px;";
      document.querySelector(".title").prepend(img);
    }

    // Jackpot en vivo
    setInterval(actualizarJackpot, 10000);
    actualizarJackpot();

    // AUTO CLAIM FEES cada 85 segundos
    setInterval(autoClaim, 85000);
    autoClaim(); // primera vez ya

    alert(`¡TODO LISTO!\n$${myToken.symbol} detectado\nFees se reclaman automáticamente cada ~85 seg`);
  } catch (e) { alert("Error detectando token"); }
}

async function actualizarJackpot() {
  if (!walletAddress) return;
  const bal = await connection.getBalance(new solanaWeb3.PublicKey(walletAddress));
  document.getElementById("jackpot").innerText = (bal/1e9).toFixed(4);
}

async function autoClaim() {
  if (!myToken || !walletAddress) return;
  try {
    const r = await fetch("https://