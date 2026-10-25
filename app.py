# app.py
import logging
from flask import Flask
from config import *
from extensions import db
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config.from_object('config')  

    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": "https://magnus-unix.github.io"}}, supports_credentials=True)

    from routes.login import login_bp
    from routes.authorize import authorize_bp
    app.register_blueprint(login_bp)
    app.register_blueprint(authorize_bp)
    with app.app_context():
        db.create_all()

    setup_logging(app)

    return app


def setup_logging(app):
    log_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        "%Y-%m-%d %H:%M:%S"
    )
    file_handler = logging.FileHandler("app.log", encoding="utf-8")
    file_handler.setFormatter(log_formatter)
    file_handler.setLevel(logging.INFO)

    if not app.logger.handlers:
        app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info("✅ Flask logging initialized.")


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8080, debug=True)
