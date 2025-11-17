const TOKEN_MINT = "AQUÍ_PONES_EL_MINT_DE_TU_TOKEN"; // ← Cambia esto
let walletAddress = null;
let countdown = 300; // 5 minutos

document.getElementById("connectWallet").onclick = connectWallet;
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "block";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";

async function connectWallet() {
  if (window.solana && window.solana.isPhantom) {
    try {
      const resp = await window.solana.connect();
      walletAddress = resp.publicKey.toString();
      document.getElementById("connectWallet").innerText = walletAddress.slice(0,4) + "..." + walletAddress.slice(-4);
    } catch (err) { alert("Conexión cancelada"); }
  } else {
    alert("Instala Phantom Wallet!");
    window.open("https://phantom.app", "_blank");
  }
}

// Countdown
setInterval(() => {
  countdown--;
  if (countdown <= 0) countdown = 300;
  const m = String(Math.floor(countdown / 60)).padStart(2, '0');
  const s = String(countdown % 60).padStart(2, '0');
  document.getElementById("timer").innerText = `${m}:${s}`;
}, 1000);

// Simulación de jackpot (en producción lo sacas del contrato)
setInterval(() => {
  const jackpot = (Math.random() * 50 + 10).toFixed(2);
  document.getElementById("jackpot").innerText = jackpot;
}, 10000);

// Particles de fuego
particlesJS("grid", {
  "particles": {
    "number": { "value": 80 },
    "color": { "value": "#FF4500" },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.8 },
    "size": { "value": 4 },
    "move": { "enable": true, "speed": 3, "direction": "top" }
  },
  "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "repulse" } } }
});