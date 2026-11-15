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

    async def fixed_hint(**_kwargs):
        return "Which part of the function determines its returned value?"

    def fake_compile_and_run(source, stdin_text):
        marker = re.search(r'(@@CP [0-9a-f]+)', source).group(1)
        return "4\n", f"{marker}|cp1|4\n", False, 0

    monkeypatch.setattr(main, "generate_hint", fixed_hint)
    monkeypatch.setattr(main, "compile_and_run", fake_compile_and_run)
    response = client.post("/api/check", json={
        "exercise_id": "function-basics-1",
        "session_id": "test-session",
        "participant_id": "P-test",
        "checkpoint_id": "cp1",
        "test_case": 0,
        "code": main.get_exercise("function-basics-1")["starter_code"],
        "condition": "generic",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["goal_met"] is False
    assert body["tutor"]["message"] == "Which part of the function determines its returned value?"
    assert "case" not in body
    assert body["comparison"]["actual"] == "4"
    assert body["condition"] == "generic"
    assert body["comparison"]["expression"] == "doubleValue(value)"
    assert body["stdout"] == "4\n"
    assert body["trace"][0]["value"] == "4"
    log = log_path.read_text(encoding="utf-8")
    assert '"participant_id": "P-test"' in log
    assert '"condition": "generic"' in log
    assert "actual" in client.get("/api/research/export").text


def test_eed_still_requires_a_prediction(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "log_path", str(tmp_path / "events.jsonl"))
    response = client.post("/api/check", json={
        "exercise_id": "loop-basics-1",
        "session_id": "eed-prediction-required",
        "participant_id": "P-eed",
        "checkpoint_id": "cp1",
        "test_case": 0,
        "code": main.get_exercise("loop-basics-1")["starter_code"],
        "condition": "eed",
    })

    assert response.status_code == 200
    assert response.json() == {"status": "not_sure"}


def test_generic_success_needs_no_prediction_and_returns_no_hint(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "log_path", str(tmp_path / "events.jsonl"))
    exercise = main.get_exercise("loop-basics-1")

    def fake_compile_and_run(source, _stdin):
        marker = re.search(r'(@@CP [0-9a-f]+)', source).group(1)
        return "Done\n", f"{marker}|cp1|0\n", False, 0

    monkeypatch.setattr(main, "compile_and_run", fake_compile_and_run)
    code = exercise["starter_code"].replace("int count = 1;", "int count = 0;")
    response = client.post("/api/check", json={
        "exercise_id": "loop-basics-1",
        "session_id": "generic-success-test",
        "participant_id": "P-generic",
        "checkpoint_id": "cp1",
        "test_case": 0,
        "code": code,
        "condition": "generic",
    })

    assert response.status_code == 200
    body = response.json()
    assert body["goal_met"] is True
    assert body["condition"] == "generic"
    assert body["tutor"] is None
    assert "case" not in body


def test_hint_progression_stops_at_fallback(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "log_path", str(tmp_path / "events.jsonl"))
    async def fixed_hint(**_kwargs):
        return "What happens at this checkpoint?"

    monkeypatch.setattr(main, "generate_hint", fixed_hint)
    exercise = main.get_exercise("loop-basics-1")
    code = exercise["starter_code"]
    session_id = "hint-progression-test"
    reset((session_id, "cp1", "eed"))

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
    reset((session_id, "cp1", "eed"))


def test_tutor_condition_is_forwarded_and_hint_progress_is_separate(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "log_path", str(tmp_path / "events.jsonl"))
    seen_conditions = []

    async def fixed_hint(**kwargs):
        seen_conditions.append(kwargs["condition"])
        return f"Guidance for {kwargs['condition']}."

    def fake_compile_and_run(source, _stdin):
        marker = re.search(r'(@@CP [0-9a-f]+)', source).group(1)
        return "Done\n", f"{marker}|cp1|1\n", False, 0

    monkeypatch.setattr(main, "generate_hint", fixed_hint)
    monkeypatch.setattr(main, "compile_and_run", fake_compile_and_run)
    exercise = main.get_exercise("loop-basics-1")
    session_id = "condition-switch-test"
    reset((session_id, "cp1", "generic"))
    reset((session_id, "cp1", "eed"))

    responses = []
    for condition in ("generic", "eed"):
        response = client.post("/api/check", json={
            "exercise_id": "loop-basics-1",
            "session_id": session_id,
            "participant_id": "P-condition",
            "checkpoint_id": "cp1",
            "test_case": 0,
            "code": exercise["starter_code"],
            "prediction": "0",
            "condition": condition,
        })
        assert response.status_code == 200
        responses.append(response.json())

    assert seen_conditions == ["generic", "eed"]
    assert [response["condition"] for response in responses] == ["generic", "eed"]
    assert [response["tutor"]["level"] for response in responses] == [1, 1]
    assert responses[0]["tutor"]["message"] == "Guidance for generic."
    assert responses[1]["tutor"]["message"] == "Guidance for eed."


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
