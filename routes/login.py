from flask import Blueprint, request, render_template, redirect, url_for, jsonify, session
from models.user import User
from models.record import LoginRecord
from extensions import db
import json
from datetime import datetime
from flask import current_app

login_bp = Blueprint('login', __name__)

@login_bp.route('/')
def index():
    return redirect(url_for('login.login'))  

from flask import make_response,current_app

@login_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter_by(username=username).first()
    success = user and user.password == password
    resp = make_response(jsonify({
        'success': success,
        'message': 'Success' if success else 'wrong username or password'
    }))

    if success:
        cookie_value = f"{username}:{password}"  
        resp.set_cookie(
            key='user_cookie',
            value=cookie_value,
            max_age=30*24*60*60,
            secure=True,
            httponly=True,
            samesite='None'
        )
    return resp

@login_bp.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@login_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already exists"}), 200

    new_user = User(username=username, password=password, fingerprint="{}")
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"success": True, "message": "Registration successful"}), 200

@login_bp.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@login_bp.route('/test')
def test_page():
    try:
        current_app.logger.info("[/test] Accessed from %s", request.remote_addr)
        return render_template('test.html')
    except Exception as e:
        current_app.logger.error("[/test] Error: %s", str(e), exc_info=True)
        return f"Error rendering test.html: {e}", 500

