from flask import Blueprint, request, jsonify, current_app
from models.record import LoginRecord
from extensions import db
from datetime import datetime
import json

fingerprint_bp = Blueprint('fingerprint', __name__)

@fingerprint_bp.route('/fingerprint', methods=['POST'])
def collect_fingerprint():
    data = request.get_json()
    username = data.get('username')
    fingerprint = data.get('fingerprint', {})
    delta = data.get('delta_time')

    current_app.logger.info(f"[LOGIN DEBUG] Received delta_time = {delta}")
    current_app.logger.info(f"[LOGIN DEBUG] Raw POST data = {data}")
    url = data.get('url', '')

    ip = request.headers.get('X-Forwarded-For')
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    if not ip:
        ip = request.headers.get('X-Real-IP', request.remote_addr)

    cookie = request.cookies.get('user_cookie', '')

    if not username:
        return jsonify({'success': False, 'message': 'username is required'}), 400

    record = LoginRecord(
        username=username,
        fingerprint=json.dumps(fingerprint, ensure_ascii=False),
        url=url,
        ip=ip,
        cookie=cookie,
        timestamp=datetime.utcnow(),
        delta_time=delta

    )
    db.session.add(record)
    db.session.commit()

    return jsonify({'success': True})


