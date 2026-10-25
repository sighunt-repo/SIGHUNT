# routes/authorize.py
from flask import Blueprint, request, render_template, jsonify, current_app
from datetime import datetime

authorize_bp = Blueprint('authorize', __name__)

@authorize_bp.route('/authorize', methods=['POST'])
def authorize():
    try:
        data = request.get_json() or {}
        js_executed = data.get("js_executed", False)
        beijing_time = data.get("beijing_time", "unknown")

        client_ip = request.remote_addr or "unknown"
        user_agent = request.headers.get("User-Agent", "unknown")

        # ✅ 写入日志
        current_app.logger.info(
            f"[authorize] JS执行={js_executed} | 客户端IP={client_ip} | "
            f"北京时间={beijing_time} | UA={user_agent}"
        )

        # ✅ 如果 JS 执行成功，返回真实页面
        if js_executed:
            return render_template("test_real.html")

        # 否则返回提示
        return jsonify({"success": False, "message": "JS未执行，拒绝访问"}), 403

    except Exception as e:
        current_app.logger.error(f"[/authorize] 处理出错: {e}", exc_info=True)
        return jsonify({"success": False, "message": "服务器内部错误"}), 500
    