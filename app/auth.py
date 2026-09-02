from flask import request, redirect, url_for, flash, render_template
from flask_login import login_user, logout_user
from models import db, User

def check_credentials(user, password) -> bool:
    if user and user.check_password(password):
        return True
    return False

def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()

        if check_credentials(user, password):
            login_user(user)
            next_page = request.args.get("next")
            return redirect(next_page) if next_page else redirect(url_for("index"))
        flash("Email ou mot de passe incorrect.", "error")

    return render_template("login.html")

def logout():
    logout_user()
    return redirect(url_for("index"))

def register():
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        role = request.form.get("role", "user").strip()

        if not email or not password:
            flash("Email et mot de passe requis.", "error")
            return redirect(url_for("register"))

        if User.query.filter_by(email=email).first():
            flash("Cet email est déjà utilisé.", "error")
            return redirect(url_for("register"))

        # A tej.
        if role not in ("user", "admin", "partenaire"):
            role = "user"

        user = User(email=email, role=role)
        user.set_password(password)

        if role == "partenaire":
            user.company_name = request.form.get("company_name", "").strip() or None
            user.siret = request.form.get("siret", "").strip() or None

        db.session.add(user)
        db.session.commit()

        flash("Compte créé. Vous pouvez vous connecter.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")