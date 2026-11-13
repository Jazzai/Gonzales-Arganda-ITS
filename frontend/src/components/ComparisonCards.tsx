import { CheckResult } from "@/lib/api";

const LABELS = [
    ["prediction", "Student Prediction (p)"],
    ["actual", "Actual Execution (a)"],
    ["required", "Required Result e"],
] as const;

export function ComparisonCards({ result }: { result: CheckResult }) {
    if (!result.comparison) return null;
    const diverged = result.case === "B" || result.case === "C";
    return (
        <div className="grid grid-cols-3 gap-3">
            {LABELS.map(([key, label]) => (
                <div 
                key={key} 
                className={`rounded border p-3 ${
                    key === "actual" && diverged ? "border-red-500" : "border-green-600"
                }`}>
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="font-mono text-lg">{result.comparison![key]}</div>
                </div>
            ))}
        </div>
    );
}