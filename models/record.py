# models/record.py
from extensions import db
from sqlalchemy.dialects.mysql import LONGTEXT

class LoginRecord(db.Model):
    __tablename__ = 'login_records'

    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(80), nullable=False)

    fingerprint = db.Column(LONGTEXT, nullable=False)  # 指纹可能很长，用 LONGTEXT

    url = db.Column(db.String(1024), nullable=True)

    timestamp = db.Column(db.DateTime, nullable=False)

    ip = db.Column(db.String(45), nullable=True)

    cookie = db.Column(db.Text, nullable=True)

    # ⭐ 新增：GET → POST 的时间差（单位：秒，浮点数）
    delta_time = db.Column(db.Float, nullable=True)

