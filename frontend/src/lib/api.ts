const API = process.env.NEXT_PUBLIC_API_URL!;

export type Checkpoint = { 
    id: string; 
    line: number; 
    question: string 
};

export type Exercise = {
    id: string; 
    title: string;
    statement: string;
    starter_code: string;
    checkpoints: Checkpoint[];
};

export type CheckResult = {
    status: "ok" | "compile_error" | "checkpoint_not_reached" | "not_sure";
    case?: "A" | "B" | "C" | "D";
    comparison?: { prediction: string; actual: string; required: string };
    category?: string | null;
    tutor?: { level: number; message: string } | null;
    detail?: string;
};

export type CheckBody = {
    exercise_id: string;
    session_id: string;
    checkpoint_id: string;
    test_case: number;
    code: string;
    prediction: string | null;
    condition: "eed" | "generic";
};

export async function getExercise(id: string): Promise<Exercise> {
    const r = await fetch(`${API}/api/exercise/${id}`);
    if (!r.ok) throw new Error(`Exercise load failed (${r.status})`);
    return r.json();
};

export async function check(body: CheckBody): Promise<CheckResult> {
    const r = await fetch(`${API}/api/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Check failed (${r.status})`);
    return r.json();
};