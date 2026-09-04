from flask import jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from models import User, db

DEFAULT_CARD_STYLE = {
    "color": "#1b3a6b",
    "text": "#ffffff",
    "pattern": "waves",
    "metalness": 20,
}


def check_credentials(user, password):
    return bool(user and user.is_active and user.check_password(password))


def _profile(user):
    return {
        "audience": user.audience,
        "username": user.username or user.email.split("@")[0],
        "email": user.email,
        "partner": user.partner_data or {},
        "cardStyle": {**DEFAULT_CARD_STYLE, **(user.card_style or {})},
    }


def _serialize_user(user):
    profile = _profile(user)
    return {
        "id": user.id,
        "username": profile["username"],
        "email": profile["email"],
        "role": user.role,
        "isActive": user.is_active,
        "profile": profile,
        "balanceCents": round(user.solde * 100),
    }


def _request_data():
    return request.get_json(silent=True) or {}


def _current_user():
    return db.session.get(User, int(get_jwt_identity()))


def _token_response(user, status=200, message="Success"):
    return jsonify({
        "message": message,
        "access_token": create_access_token(identity=str(user.id), additional_claims={"role": user.role}),
        "user": _serialize_user(user),
    }), status


def api_login():
    data = _request_data()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not check_credentials(user, password):
        return jsonify({"error": "Email or password is incorrect."}), 401
    return _token_response(user, message="Login successful.")


def api_register():
    data = _request_data()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    username = (data.get("username") or "").strip()
    audience = data.get("audience", "employee")
    partner = data.get("partner") or {}

    if not email or not password or not username:
        return jsonify({"error": "Username, email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400
    if audience not in ("employee", "partner"):
        return jsonify({"error": "Invalid account type."}), 400
    if User.query.filter_by(email=email).first() or User.query.filter_by(username=username).first():
        return jsonify({"error": "This email or username is already in use."}), 409

    user = User(
        email=email,
        username=username,
        audience=audience,
        role="partenaire" if audience == "partner" else "user",
        partner_data=partner if audience == "partner" else {},
        card_style=DEFAULT_CARD_STYLE.copy(),
    )
    user.set_password(password)
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "This email or username is already in use."}), 409
    return _token_response(user, 201, "Account created successfully.")


@jwt_required()
def api_me():
    user = _current_user()
    if not user or not user.is_active:
        return jsonify({"error": "User not found."}), 404
    return jsonify({"user": _serialize_user(user)}), 200


@jwt_required()
def api_update_profile():
    user = _current_user()
    if not user or not user.is_active:
        return jsonify({"error": "User not found."}), 404
    data = _request_data()
    profile = data.get("profile") or data
    username = (profile.get("username") or "").strip()
    email = (profile.get("email") or "").strip().lower()
    if not username or not email:
        return jsonify({"error": "Username and email are required."}), 400
    if User.query.filter(User.email == email, User.id != user.id).first() or User.query.filter(User.username == username, User.id != user.id).first():
        return jsonify({"error": "This email or username is already in use."}), 409

    user.username = username
    user.email = email
    if user.audience == "partner" and isinstance(profile.get("partner"), dict):
        user.partner_data = profile["partner"]
    if isinstance(profile.get("cardStyle"), dict):
        user.card_style = {**DEFAULT_CARD_STYLE, **profile["cardStyle"]}
    db.session.commit()
    return jsonify({"user": _serialize_user(user)}), 200


@jwt_required()
def api_change_password():
    user = _current_user()
    data = _request_data()
    if not user or not user.is_active:
        return jsonify({"error": "User not found."}), 404
    if not check_credentials(user, data.get("currentPassword") or ""):
        return jsonify({"error": "Current password is incorrect."}), 401
    new_password = data.get("newPassword") or ""
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters long."}), 400
    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password changed successfully."}), 200


@jwt_required()
def api_delete_account():
    user = _current_user()
    if not user:
        return jsonify({"error": "User not found."}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account deleted successfully."}), 200


def api_logout():
    return jsonify({"message": "Logged out. Remove the JWT on the client."}), 200
