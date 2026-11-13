"use client"
import { useCallback, useEffect, useState } from "react";
import { check, CheckResult, Exercise } from "@/lib/api";

export function useTutor(exercise: Exercise | null, condition: "eed" | "generic" = "eed") {
    const [sessionId] = useState (() => crypto.randomUUID());
    const [code, setCode] = useState("");
    const [prediction, setPrediction] = useState("");
    const [result, setResult] = useState<CheckResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<String | null>(null);

    useEffect(() => {
        if (exercise) setCode(exercise.starter_code);
    }, [exercise]);

    const submit = useCallback(
        async (notSure = false) => {
            if (!exercise) return;
            setLoading(true);
            setError(null);
            try {
                setResult(
                    await check({
                        exercise_id: exercise.id,
                        session_id: sessionId,
                        checkpoint_id: exercise.checkpoints[0].id,
                        test_case: 0,
                        code,
                        prediction: notSure ? null : prediction,
                        condition,
                    })
                );
            } catch (e) {
                setError(e instanceof Error ? e.message : "Request failed");
            } finally {
                setLoading(false);
            }
        },
        [exercise, sessionId, code, prediction, condition]
    );

return { code, setCode, prediction, setPrediction, result, loading, error, submit };
}