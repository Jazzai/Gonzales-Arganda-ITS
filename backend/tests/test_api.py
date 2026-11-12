import re

from fastapi.testclient import TestClient

from app import main
from app.session import reset

client = TestClient(main.app)


def test_exercise_api_lists_activities_and_hides_oracle():
    response = client.get("/api/exercises")
    assert response.status_code == 200
    assert len(response.json()["exercises"]) == 3

    details = client.get("/api/exercises/computation-basics-1").json()
    assert details["category"] == "Computation"
    assert details["sample_tests"][0]["expected_output"] == "20"
    assert all("expected" not in test for cp in details["checkpoints"] for test in cp["tests"])


def test_check_returns_real_runtime_fields_and_logs_participant(monkeypatch, tmp_path):
    log_path = tmp_path / "events.jsonl"
    monkeypatch.setattr(main.settings, "log_path", str(log_path))

    def fake_compile_and_run(source, stdin_text):
        marker = re.search(r'(@@CP [0-9a-f]+)', source).group(1)
        return "4\n", f"{marker}|cp1|4\n", False, 0

    monkeypatch.setattr(main, "compile_and_run", fake_compile_and_run)
    response = client.post("/api/check", json={
        "exercise_id": "function-basics-1",
        "session_id": "test-session",
        "participant_id": "P-test",
        "checkpoint_id": "cp1",
        "test_case": 0,
        "code": main.get_exercise("function-basics-1")["starter_code"],
        "prediction": "4",
        "condition": "generic",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["case"] == "D"
    assert body["comparison"]["expression"] == "doubleValue(value)"
    assert body["stdout"] == "4\n"
    assert body["trace"][0]["value"] == "4"
    log = log_path.read_text(encoding="utf-8")
    assert '"participant_id": "P-test"' in log
    assert '"condition": "generic"' in log
    assert "actual" in client.get("/api/research/export").text


def test_hint_progression_stops_at_fallback(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "log_path", str(tmp_path / "events.jsonl"))
    async def fixed_hint(**_kwargs):
        return "What happens at this checkpoint?"

    monkeypatch.setattr(main, "generate_hint", fixed_hint)
    exercise = main.get_exercise("loop-basics-1")
    code = exercise["starter_code"]
    session_id = "hint-progression-test"
    reset((session_id, "cp1"))

    levels = []
    exhausted = []
    for _ in range(4):
        response = client.post("/api/check", json={
            "exercise_id": "loop-basics-1",
            "session_id": session_id,
            "participant_id": "P-hints",
            "checkpoint_id": "cp1",
            "test_case": 0,
            "code": code,
            "prediction": "0",
            "condition": "eed",
        })
        assert response.status_code == 200
        tutor = response.json()["tutor"]
        levels.append(tutor["level"])
        exhausted.append(tutor["exhausted"])

    assert levels == [1, 2, 3, 4]
    assert exhausted == [False, False, False, True]
    reset((session_id, "cp1"))


def test_eed_classifies_each_supported_error_category(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "log_path", str(tmp_path / "events.jsonl"))

    async def fixed_hint(**_kwargs):
        return "What do you notice at this checkpoint?"

    monkeypatch.setattr(main, "generate_hint", fixed_hint)
    cases = [
        ("loop-basics-1", "1", "Done", "Iteration", True),
        ("function-basics-1", "4", "4", "Function", False),
        ("computation-basics-1", "14", "14", "Computation", False),
    ]

    for exercise_id, actual, stdout, category, output_ok in cases:
        exercise = main.get_exercise(exercise_id)

        def fake_compile_and_run(source, _stdin):
            marker = re.search(r'(@@CP [0-9a-f]+)', source).group(1)
            return stdout, f"{marker}|cp1|{actual}\n", False, 0

        monkeypatch.setattr(main, "compile_and_run", fake_compile_and_run)
        response = client.post("/api/check", json={
            "exercise_id": exercise_id,
            "session_id": f"category-{exercise_id}",
            "participant_id": "P-category",
            "checkpoint_id": "cp1",
            "test_case": 0,
            "code": exercise["starter_code"],
            "prediction": "0",
            "condition": "eed",
        })

        assert response.status_code == 200
        assert response.json()["case"] == "C"
        assert response.json()["category"] == category
        assert response.json()["output_ok"] is output_ok
