import jwt
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone
from config import Config

def generate_ephemeral_qr(user_id: int):
    # Logique JWT avec expiration à 30 minutes[cite: 1]
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")
    # Génération de l'image (doit s'effectuer en moins de 2 secondes)[cite: 1]
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8"), token