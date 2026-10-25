# app.py
import logging
from flask import Flask
from config import *
from extensions import db
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config.from_object('config')  # ✅ 确保加载 config.py

    db.init_app(app)
    CORS(app, resources={r"/*": {"origins": "https://magnus-unix.github.io"}}, supports_credentials=True)

    # 注册蓝图
    from routes.login import login_bp
    from routes.authorize import authorize_bp
    app.register_blueprint(login_bp)
    app.register_blueprint(authorize_bp)
    # ✅ 初始化数据库（仅当不存在）
    with app.app_context():
        db.create_all()

    # ✅ 日志配置（重点）
    setup_logging(app)

    return app


def setup_logging(app):
    """确保 Flask 所有日志写入 app.log"""
    log_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s",
        "%Y-%m-%d %H:%M:%S"
    )
    file_handler = logging.FileHandler("app.log", encoding="utf-8")
    file_handler.setFormatter(log_formatter)
    file_handler.setLevel(logging.INFO)

    # 避免重复添加 handler
    if not app.logger.handlers:
        app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info("✅ Flask logging initialized.")


if __name__ == '__main__':
    app = create_app()
    # ✅ 确保 Flask 日志也输出到文件
    app.run(host='0.0.0.0', port=8080, debug=True)
