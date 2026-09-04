from app import create_app
from models import User, db


def setup_db():
    app = create_app()
    app.config["TESTING"] = True
    with app.app_context():
        db.drop_all()
        db.create_all()
    return app


def test_login_rejects_unknown_user():
    app = setup_db()

    with app.app_context():
        user = User(email="alice@example.com", username="alice", role="user")
        user.set_password("secret123")
        db.session.add(user)
        db.session.commit()

    with app.test_client() as client:
        response = client.post(
            "/api/auth/login",
            json={"email": "bob@example.com", "password": "wrong-password"},
        )

    assert response.status_code == 401
    assert "incorrect" in response.get_json()["error"].lower()


def test_register_and_login_success():
    app = setup_db()

    with app.test_client() as client:
        response = client.post(
            "/api/auth/register",
            json={"username": "newuser", "email": "newuser@example.com", "password": "strongpass"},
        )

        assert response.status_code == 201
        payload = response.get_json()
        assert payload["user"]["email"] == "newuser@example.com"

        login_response = client.post(
            "/api/auth/login",
            json={"email": "newuser@example.com", "password": "strongpass"},
        )

        assert login_response.status_code == 200
        assert login_response.get_json()["user"]["email"] == "newuser@example.com"
