// HOLDERSBURN.VERCEL.APP — TOKEN AUTODETECTADO Y MOSTRADO EN VIVO
let walletAddress = null;
let myToken = null;
const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");

// === CONECTAR WALLET ===
document.getElementById("connectWallet").onclick = async () => {
  if (!window.solana?.isPhantom) {
    alert("¡Instala Phantom Wallet!");
    return;
  }
  try {
    const resp = await window.solana.connect();
    walletAddress = resp.publicKey.toString();
    document.getElementById("connectWallet").innerText = walletAddress.slice(0,6)+"..."+walletAddress.slice(-4);
    detectarYMostrarToken(); // ¡Aquí pasa la magia!
  } catch (e) {
    alert("Conexión cancelada");
  }
};

// === DETECTAR TOKEN Y MOSTRARLO EN LA PÁGINA ===
async function detectarYMostrarToken() {
  try {
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/user-created-coins/${walletAddress}?limit=1&includeNsfw=false`);
    const data = await res.json();

    if (!data.coins || data.coins.length === 0) {
      alert("No se encontró token creado con esta wallet.\nConecta la wallet que usaste en pump.fun");
      return;
    }

    myToken = data.coins[0];

    // === MOSTRAR EL TOKEN EN LA PÁGINA ===
    // Logo grande
    if (myToken.image_uri) {
      let logo = document.querySelector("#tokenLogo");
      if (!logo) {
        logo = document.createElement("img");
        logo.id = "tokenLogo";
        logo.style.cssText = "width:120px; height:120px; border-radius:50%; border:4px solid #FF6B00; box-shadow:0 0 30px #FF6B00; margin:20px auto; display:block;";
        document.querySelector(".center-section").before(logo);
      }
      logo.src = myToken.image_uri;
    }

    // Nombre y símbolo
    const title = document.querySelector("h1") || document.querySelector(".title h1");
    if (title) title.innerText = `${myToken.name}`;

    const subtitle = document.querySelector(".title p") || document.createElement("p");
    subtitle.innerText = `$${myToken.symbol} • Burn to Win Lottery`;
    subtitle.style.cssText = "font-size:20px; color:#FFD700; margin-top:10px;";
    if (!document.querySelector(".title p")) document.querySelector(".title").appendChild(subtitle);

    // Mint (opcional, bonito)
    const mintDiv = document.createElement("div");
    mintDiv.innerHTML = `Mint: <span style="color:#FF6B00; font-family:monospace;">${myToken.mint.slice(0,8)}...${myToken.mint.slice(-6)}</span>`;
    mintDiv.style.cssText = "text-align:center; margin:15px 0; font-size:14px; color:#aaa;";
    document.querySelector(".center-section").before(mintDiv);

    // Jackpot en vivo
    setInterval(actualizarJackpot, 10000);
    actualizarJackpot();

    alert(`¡TOKEN CARGADO!\n${myToken.name} ($${myToken.symbol})\nTodo listo en tu página`);

  } catch (e) {
    console.error(e);
    alert("Error cargando tu token");
  }
}

async function actualizarJackpot() {
  if (!walletAddress) return;
  try {
    const bal = await connection.getBalance(new solanaWeb3.PublicKey(walletAddress));
    document.getElementById("jackpot").innerText = (bal/1e9).toFixed(4);
  } catch (e) {}
}

// Countdown 5 min
let c = 300;
setInterval(() => {
  c--; if(c<=0) c=300;
  const m = String(Math.floor(c/60)).padStart(2,'0');
  const s = String(c%60).padStart(2,'0');
  document.getElementById("timer").innerText = m+":"+s;
},1000);

// Modal y partículas
document.getElementById("openBurnModal").onclick = () => document.getElementById("burnModal").style.display = "flex";
document.querySelector(".close").onclick = () => document.getElementById("burnModal").style.display = "none";
particlesJS("burnList", {particles:{number:{value:70},color:{value:"#FF6B00"},move:{speed:3}}});