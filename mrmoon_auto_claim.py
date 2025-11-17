import os
import time
import requests
import base64
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction
from dotenv import load_dotenv

# ========= TU PRIVATE KEY (NUNCA la subas a GitHub ni Vercel) =========
load_dotenv()
PRIVATE_KEY = os.getenv("PRIVATE_KEY")  # o ponla directamente aquí si quieres

# Si no usas .env, descomenta y pega tu clave aquí (seguro porque solo corre en tu PC):
# PRIVATE_KEY = "TU_PRIVATE_KEY_AQUI_COMO_STRING"

if not PRIVATE_KEY:
    print("ERROR: Pon tu private key en el archivo .env o directamente en el código")
    exit()

keypair = Keypair.from_base58_string(PRIVATE_KEY)
wallet = keypair.pubkey()
print(f"Wallet dev conectada: {wallet}")
print(f"Buscando tu token creado en pump.fun...")

# === 1. AUTODETECTAR TU TOKEN ===
def detectar_token():
    url = f"https://frontend-api-v3.pump.fun/coins/user-created-coins/{str(wallet)}?limit=1"
    try:
        r = requests.get(url, timeout=10)
        data = r.json()
        if data.get("coins"):
            coin = data["coins"][0]
            print(f"TOKEN DETECTADO: {coin['name']} (${coin['symbol']})")
            print(f"Mint: {coin['mint']}")
            return coin
        else:
            print("No se encontró ningún token creado con esta wallet")
            return None
    except Exception as e:
        print("Error detectando token:", e)
        return None

token = detectar_token()
if not token:
    print("No se pudo continuar. Revisa tu wallet.")
    exit()

MINT = token["mint"]
SYMBOL = token["symbol"]

# === 2. AUTO CLAIM FEES CADA 80 SEGUNDOS ===
def reclamar_fees():
    try:
        print(f"{time.strftime('%H:%M:%S')} → Reclamando fees de ${SYMBOL}...")
        response = requests.post(
            "https://pumpportal.fun/api/trade-local",
            json={
                "publicKey": str(wallet),
                "action": "collectCreatorFee",
                "mint": MINT,
                "priorityFee": 0.0001
            },
            timeout=20
        )

        if response.status_code != 200:
            print("   No hay fees nuevas o ya reclamadas")
            return

        tx = VersionedTransaction.deserialize(response.content)
        tx.sign([keypair])
        sig = requests.post(
            "https://api.mainnet-beta.solana.com",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "sendTransaction",
                "params": [base64.b64encode(bytes(tx)).decode(), {"encoding": "base64"}]
            }
        ).json()

        if "result" in sig:
            print(f"   FEES RECLAMADAS ✓ https://solscan.io/tx/{sig['result']}")
        else:
            print("   Error enviando tx:", sig)

    except Exception as e:
        print("   Error reclamando:", e)

# === BUCLE INFINITO (24/7) ===
print(f"\nAUTO CLAIM ACTIVADO para ${SYMBOL}")
print("Reclamando fees cada 80 segundos... (Ctrl+C para detener)\n")

while True:
    reclamar_fees()
    time.sleep(80)  # 80 segundos = óptimo (ni muy rápido ni muy lento)