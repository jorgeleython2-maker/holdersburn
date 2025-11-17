# spin.py — DETECCIÓN 100% AUTOMÁTICA CON TU PRIVATE KEY (NOV 2025)
import os
import time
import requests
import threading
import base64
import json
import random
from datetime import datetime
from flask import Flask, render_template, jsonify
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import VersionedTransaction

app = Flask(__name__)

# TU PRIVATE KEY (solo esto necesitas)
PRIVATE_KEY = "4Py7FVCqTTe8npFxiWRZ15bT5kr1tDXWAdZJyDzJwDwn85NZ22QhPp5bnRDvyAe2ydBsreVXYD8cPGf8fjEYzPU9"
HELIUS_KEY = "95932bca-32bc-465f-912c-b42f7dd31736"

# Config
REWARD_SOL = 0.01
MIN_TOKENS = 1000
ROULETTE_INTERVAL = 20
FEE_INTERVAL = 90

keypair = Keypair.from_base58_string(PRIVATE_KEY)
dev_wallet = str(keypair.pubkey())
print(f"Wallet dev: {dev_wallet}")

token_info = None
holders = []

# === DETECCIÓN AUTOMÁTICA CON REINTENTOS ===
def detectar_token_auto():
    global token_info
    try:
        url = f"https://frontend-api-v3.pump.fun/coins/user-created-coins/{dev_wallet}?offset=0&limit=10&includeNsfw=false"
        r = requests.get(url, timeout=15)
        data = r.json()
        if data.get("coins"):
            # Toma el más reciente (último en la lista)
            coin = data["coins"][-1]
            token_info = {
                "name": coin["name"],
                "symbol": coin["symbol"],
                "mint": coin["mint"],
                "image": coin.get("image_uri", ""),
                "creator": coin.get("creator", dev_wallet),
                "supply": coin.get("total_supply", 0),
                "market_cap": coin.get("market_cap", 0),
                "created": coin.get("created_timestamp", 0)
            }
            print(f"TOKEN DETECTADO AUTOMÁTICAMENTE: {token_info['name']} (${token_info['symbol']})")
            print(f"Mint: {token_info['mint']}")
            print(f"Supply: {token_info['supply']:,}")
            print(f"Market Cap: ${token_info['market_cap']:,.2f}")
            return True
        else:
            print("No se detectó token. Reintentando...")
            return False
    except Exception as e:
        print(f"Error en detección: {e}")
        return False

# Reintenta hasta detectar (para tokens nuevos)
def esperar_deteccion():
    global token_info
    intentos = 0
    max_intentos = 10  # 5 minutos total
    while not token_info and intentos < max_intentos:
        if detectar_token_auto():
            break
        intentos += 1
        print(f"Intento {intentos}/{max_intentos}... (tokens nuevos tardan 2-5 min)")
        time.sleep(30)
    if not token_info:
        print("No se detectó token. Verifica en pump.fun si la wallet es creator.")
        exit()

# === RECLAMAR FEES ===
last_fee = 0
def reclamar_fees():
    global last_fee
    if not token_info or time.time() - last_fee < FEE_INTERVAL:
        return
    try:
        print(f"{datetime.now().strftime('%H:%M:%S')} → Reclamando fees de ${token_info['symbol']}...")
        r = requests.post("https://pumpportal.fun/api/trade-local", json={
            "publicKey": dev_wallet,
            "action": "collectCreatorFee",
            "mint": token_info["mint"],
            "priorityFee": 0.0001
        })
        if r.status_code == 200:
            tx = VersionedTransaction.deserialize(r.content)
            tx.sign([keypair])
            sig_resp = requests.post("https://api.mainnet-beta.solana.com", json={
                "jsonrpc": "2.0", "id": 1, "method": "sendTransaction",
                "params": [base64.b64encode(bytes(tx)).decode(), {"encoding": "base64"}]
            }).json()
            if "result" in sig_resp:
                print(f"Fees reclamadas: https://solscan.io/tx/{sig_resp['result']}")
                last_fee = time.time()
    except Exception as e:
        print("No fees o error:", e)

# === TRAER HOLDERS ===
def actualizar_holders():
    global holders
    if not token_info:
        return
    try:
        url = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_KEY}"
        payload = {
            "jsonrpc": "2.0", "id": 1, "method": "getTokenLargestAccounts",
            "params": [token_info["mint"]]
        }
        r = requests.post(url, json=payload)
        accounts = r.json().get("result", {}).get("value", [])
        mapa = {}
        for acc in accounts[:50]:
            amount = acc["amount"] / 10**6
            if amount >= MIN_TOKENS:
                mapa[acc["address"]] = amount
        holders = sorted(mapa.items(), key=lambda x: x[1], reverse=True)
        print(f"{len(holders)} holders con +{MIN_TOKENS} ${token_info['symbol']}")
    except Exception as e:
        print("Error holders:", e)

# === LOOP PRINCIPAL ===
def loop_principal():
    while True:
        actualizar_holders()
        reclamar_fees()
        if holders:
            weights = [h[1] for h in holders]
            ganador = random.choices(holders, weights=weights, k=1)[0]
            print(f"GANADOR: {ganador[0][:8]}... ({ganador[1]:,.0f} tokens) - Premio: {REWARD_SOL} SOL")
        time.sleep(ROULETTE_INTERVAL)

# === RUTAS WEB ===
@app.route("/")
def index():
    return f"""
    <h1>Holders Roulette para {token_info.get('name', 'Detectando...')} (${token_info.get('symbol', '???')})</h1>
    <p>Mint: {token_info.get('mint', 'N/A')}</p>
    <p>Holders: {len(holders)}</p>
    <p>Próximo sorteo en {ROULETTE_INTERVAL}s</p>
    <script>setTimeout(() => location.reload(), 20000);</script>
    """

@app.route("/api/token")
def api_token():
    return jsonify(token_info or {})

@app.route("/api/holders")
def api_holders():
    return jsonify({"holders": holders[:50], "total": len(holders)})

# === INICIO ===
if __name__ == "__main__":
    print("Iniciando detección automática...")
    esperar_deteccion()
    threading.Thread(target=loop_principal, daemon=True).start()
    print(f"Bot 100% automático para {token_info['name']} – Abre http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)