"use client";
import { useEffect, useState } from "react";
import { Exercise, getExercise } from "@/lib/api";

export function useExercise(id: string) {
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getExercise(id).then(setExercise).catch((e) => setError(String(e)));
    }, [id]);

    return { exercise, error };
}