// CAMBIA ESTO CON TU INFO
const TOKEN_MINT = "PON_TU_MINT_AQUI";
const DEV_WALLET = "PON_TU_DEV_WALLET_AQUI";

let connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
let wallet = null;
let countdown = 300;

// Conectar wallet
document.getElementById("connectWallet").onclick = async () => {
  if (window.solana?.isPhantom) {
    try {
      const resp = await window.solana.connect();
      wallet = resp.publicKey.toString();
      document.getElementById("connectWallet").innerText = wallet.slice(0,4) + "..." + wallet.slice(-4);
    } catch (e) { alert("Cancelled"); }
  } else {
    alert("Phantom not found!");
  }
};

// Jackpot = balance real de la dev wallet
async function updateJackpot() {
  try {
    const bal = await connection.getBalance(new solanaWeb3.PublicKey(DEV_WALLET));
    document.getElementById("jackpot").innerText = (bal / 1e9).toFixed(4);
  } catch (e) {}
}
setInterval(updateJackpot, 10000);
updateJackpot();

// Countdown
setInterval(() => {
  countdown--;
  if (countdown < 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, '0');
  const s = String(countdown % 60).padStart(2, '0');
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Modal
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

// Partículas
particlesJS("burnList", { particles: { number: { value: 50 }, color: { value: "#FF4500" }, size: { value: 4 }, move: { speed: 3 } } });