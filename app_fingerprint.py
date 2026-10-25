from flask import Flask
from flask_cors import CORS
from config import *
from fingerprint.api import fingerprint_bp
from extensions import db

def create_fingerprint_app():
    app = Flask(__name__)
    app.config.from_object('config')  # ✅ 确保加载 config.py
    db.init_app(app)

    # ✅ 限制允许的跨域来源
    CORS(app, resources={r"/*": {"origins": "https://magnus-unix.github.io"}}, supports_credentials=True)

    app.register_blueprint(fingerprint_bp)
    return app

if __name__ == '__main__':
    app = create_fingerprint_app()
    app.run(host='0.0.0.0', port=8081, debug=True)
