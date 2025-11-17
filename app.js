// ============ CAMBIA ESTOS DATOS UNA SOLA VEZ ============
const TOKEN_MINT = "AQUÍ_VA_TU_MINT_DE_MRMOON";        // ← TU MINT
const DEV_WALLET = "AQUÍ_VA_TU_DEV_WALLET";           // ← La que recibe las fees
// =========================================================

let connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
let walletAddress = null;
let countdown = 300;

// Conectar wallet
document.getElementById("connectWallet").onclick = async () => {
  if (window.solana?.isPhantom) {
    try {
      const resp = await window.solana.connect();
      walletAddress = resp.publicKey.toString();
      document.getElementById("connectWallet").innerText = walletAddress.slice(0,4) + "..." + walletAddress.slice(-4);
    } catch (e) { alert("Conexión cancelada"); }
  } else {
    alert("¡Instala Phantom!");
    window.open("https://phantom.app", "_blank");
  }
};

// Jackpot = balance real de la dev wallet
async function updateJackpot() {
  try {
    const balance = await connection.getBalance(new solanaWeb3.PublicKey(DEV_WALLET));
    document.getElementById("jackpot").innerText = (balance / 1e9).toFixed(4);
  } catch (e) { console.log(e); }
}
setInterval(updateJackpot, 8000);
updateJackpot();

// Countdown 5 minutos
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, '0');
  const s = String(countdown % 60).padStart(2, '0');
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Partículas de fuego
particlesJS("burnList", {
  particles: { number: { value: 60 }, color: { value: "#FF4500" }, shape: { type: "circle" }, opacity: { value: 0.8 }, size: { value: 5 }, move: { enable: true, speed: 4 } },
  interactivity: { events: { onhover: { enable: true, mode: "repulse" } } }
});

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "block";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";