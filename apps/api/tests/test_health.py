from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_readiness_does_not_expose_secrets() -> None:
    response = client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert "OPENAI_API_KEY" not in str(body)
    assert "GEMINI_API_KEY" not in str(body)
