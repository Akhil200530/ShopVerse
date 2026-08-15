"""Payment tests: sandbox (no keys) and Stripe (mocked SDK) flows.

Runs standalone:  python tests/test_payments.py
Uses a temp SQLite database in a scratch dir so the real shopverse.db is untouched.
"""
import os
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

_SCRATCH = tempfile.mkdtemp(prefix="shopverse_test_")
os.chdir(_SCRATCH)
os.environ.pop("STRIPE_SECRET_KEY", None)
os.environ.pop("STRIPE_WEBHOOK_SECRET", None)
os.environ.pop("SQLITE_FALLBACK", None)

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


def _fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


class FakeStripeError(Exception):
    pass


class SignatureVerificationError(FakeStripeError):
    pass


class FakeSessions:
    def __init__(self):
        self.created = []

    def create(self, **params):
        self.created.append(params)
        return type("Session", (), {"url": "https://checkout.stripe.com/c/pay/FAKE"})

    def retrieve(self, session_id, **kwargs):
        return type("Session", (), {"payment_status": "paid", "metadata": {"order_id": "1", "reference": "x"}})()


class FakeStripeClient:
    def __init__(self, key):
        self.key = key
        self.checkout = type("Checkout", (), {"sessions": FakeSessions()})()


class FakeWebhook:
    fail = False

    @staticmethod
    def construct_event(payload, sig_header, secret, **kwargs):
        import json

        if FakeWebhook.fail:
            raise SignatureVerificationError("bad sig")
        return json.loads(payload)


def _fake_stripe_module():
    return type(
        "stripe",
        (),
        {
            "StripeClient": FakeStripeClient,
            "StripeError": FakeStripeError,
            "SignatureVerificationError": SignatureVerificationError,
            "Webhook": FakeWebhook,
        },
    )


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _place_card_order(client, token, product_id):
    client.post("/api/cart/items", json={"product_id": product_id, "quantity": 1}, headers=_headers(token))
    r = client.post(
        "/api/orders/checkout",
        json={"address": "12 Test Street, Yaba", "city": "Lagos", "phone": "08012345678", "payment_method": "card"},
        headers=_headers(token),
    )
    assert r.status_code == 201, r.text
    return r.json()


class PaymentFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _fresh_db()
        cls.client = TestClient(app)

        admin = cls.client.post(
            "/api/auth/login", json={"email": "admin@shopverse.com", "password": "admin123"}
        )
        assert admin.status_code == 200, admin.text
        atoken = admin.json()["access_token"]

        prod = cls.client.post(
            "/api/admin/products",
            json={
                "name": "Test Widget",
                "slug": "test-widget",
                "category_slug": "electronics",
                "brand": "Test",
                "description": "A test product",
                "price": 1200.0,
                "image_url": "https://example.com/w.png",
                "stock": 50,
            },
            headers=_headers(atoken),
        )
        assert prod.status_code == 201, prod.text
        cls.product_id = prod.json()["id"]

        reg = cls.client.post(
            "/api/auth/register",
            json={"name": "Test Buyer", "email": "buyer@test.com", "password": "secret123"},
        )
        assert reg.status_code == 201, reg.text
        cls.token = _login(cls.client, "buyer@test.com", "secret123")

    def setUp(self):
        _fresh_db()
        # Re-create the admin product + buyer in the fresh db (cheap: reuse seed admin).
        admin = self.client.post(
            "/api/auth/login", json={"email": "admin@shopverse.com", "password": "admin123"}
        )
        prod = self.client.post(
            "/api/admin/products",
            json={
                "name": "Test Widget",
                "slug": "test-widget",
                "category_slug": "electronics",
                "brand": "Test",
                "description": "A test product",
                "price": 1200.0,
                "image_url": "https://example.com/w.png",
                "stock": 50,
            },
            headers=_headers(admin.json()["access_token"]),
        )
        assert prod.status_code == 201, prod.text
        self.product_id = prod.json()["id"]

        self.client.post(
            "/api/auth/register",
            json={"name": "Test Buyer", "email": "buyer@test.com", "password": "secret123"},
        )
        self.token = _login(self.client, "buyer@test.com", "secret123")

    # ---------- Sandbox (no keys) ----------
    def test_sandbox_flow_success_and_failure(self):
        token = self.token
        pid = self.product_id

        # success path
        order = _place_card_order(self.client, token, pid)
        init = self.client.post("/api/payments/initialize", json={"order_id": order["id"]}, headers=_headers(token))
        assert init.status_code == 200, init.text
        body = init.json()
        self.assertTrue(body["sandbox"])
        self.assertEqual(body["authorization_url"], "/sandbox/pay")

        ok = self.client.post(
            "/api/payments/sandbox/complete",
            json={"reference": body["reference"], "success": True},
            headers=_headers(token),
        )
        assert ok.status_code == 200, ok.text
        self.assertEqual(ok.json()["payment_status"], "paid")
        self.assertEqual(ok.json()["status"], "confirmed")

        # failure path
        order2 = _place_card_order(self.client, token, pid)
        init2 = self.client.post("/api/payments/initialize", json={"order_id": order2["id"]}, headers=_headers(token))
        body2 = init2.json()
        fail = self.client.post(
            "/api/payments/sandbox/complete",
            json={"reference": body2["reference"], "success": False},
            headers=_headers(token),
        )
        assert fail.status_code == 200, fail.text
        self.assertEqual(fail.json()["payment_status"], "failed")

    def test_sandbox_unknown_reference_404(self):
        token = self.token
        r = self.client.post(
            "/api/payments/sandbox/complete", json={"reference": "SV0-DOESNOTEXIST", "success": True}, headers=_headers(token)
        )
        self.assertEqual(r.status_code, 404)

    def test_verify_without_keys_is_503(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        init = self.client.post(
            "/api/payments/initialize", json={"order_id": order["id"]}, headers=_headers(self.token)
        ).json()
        r = self.client.get(f"/api/payments/verify/{init['reference']}", headers=_headers(self.token))
        self.assertEqual(r.status_code, 503)

    # ---------- Stripe (mocked SDK) ----------
    def _stripe_context(self, webhook_secret=""):
        return (
            mock.patch("app.routers.payments.stripe", _fake_stripe_module()),
            mock.patch("app.routers.payments.settings.stripe_secret_key", "sk_test_FAKE"),
            mock.patch("app.routers.payments.settings.stripe_webhook_secret", webhook_secret),
        )

    def test_stripe_initialize_returns_session_url(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        with mock.patch("app.routers.payments.stripe", _fake_stripe_module()), \
             mock.patch("app.routers.payments.settings.stripe_secret_key", "sk_test_FAKE"):
            init = self.client.post(
                "/api/payments/initialize", json={"order_id": order["id"]}, headers=_headers(self.token)
            )
            assert init.status_code == 200, init.text
            body = init.json()
            self.assertFalse(body["sandbox"])
            self.assertEqual(body["authorization_url"], "https://checkout.stripe.com/c/pay/FAKE")

    def test_stripe_verify_by_session_id_marks_paid(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        with mock.patch("app.routers.payments.stripe", _fake_stripe_module()), \
             mock.patch("app.routers.payments.settings.stripe_secret_key", "sk_test_FAKE"):
            r = self.client.get("/api/payments/verify/cs_test_abc", headers=_headers(self.token))
            assert r.status_code == 200, r.text
            self.assertEqual(r.json()["payment_status"], "paid")

    def test_stripe_webhook_completed_marks_paid(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        payload = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_abc",
                    "client_reference_id": None,
                    "metadata": {"order_id": str(order["id"])},
                }
            },
        }
        import json

        with mock.patch("app.routers.payments.stripe", _fake_stripe_module()), \
             mock.patch("app.routers.payments.settings.stripe_secret_key", "sk_test_FAKE"):
            r = self.client.post(
                "/api/payments/webhook",
                data=json.dumps(payload),
                headers={"Content-Type": "application/json", "Stripe-Signature": "sig"},
            )
            assert r.status_code == 200, r.text
            self.assertTrue(r.json()["received"])

        orders = self.client.get("/api/orders", headers=_headers(self.token)).json()
        o = next(o for o in orders if o["id"] == order["id"])
        self.assertEqual(o["payment_status"], "paid")

    def test_stripe_webhook_bad_signature_400(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        payload = {
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_x", "metadata": {"order_id": str(order["id"])}}},
        }
        import json

        FakeWebhook.fail = True
        try:
            with mock.patch("app.routers.payments.stripe", _fake_stripe_module()), \
                 mock.patch("app.routers.payments.settings.stripe_secret_key", "sk_test_FAKE"), \
                 mock.patch("app.routers.payments.settings.stripe_webhook_secret", "whsec_FAKE"):
                r = self.client.post(
                    "/api/payments/webhook",
                    data=json.dumps(payload),
                    headers={"Content-Type": "application/json", "Stripe-Signature": "bad"},
                )
                self.assertEqual(r.status_code, 400)
        finally:
            FakeWebhook.fail = False

    def test_initialize_without_keys_returns_sandbox(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        init = self.client.post(
            "/api/payments/initialize", json={"order_id": order["id"]}, headers=_headers(self.token)
        )
        assert init.status_code == 200, init.text
        self.assertTrue(init.json()["sandbox"])

    def test_payment_reference_stored_on_order(self):
        order = _place_card_order(self.client, self.token, self.product_id)
        init = self.client.post(
            "/api/payments/initialize", json={"order_id": order["id"]}, headers=_headers(self.token)
        ).json()
        orders = self.client.get("/api/orders", headers=_headers(self.token)).json()
        o = next(o for o in orders if o["id"] == order["id"])
        self.assertEqual(o["payment_reference"], init["reference"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
