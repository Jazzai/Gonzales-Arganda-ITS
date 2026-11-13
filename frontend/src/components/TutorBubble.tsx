export function TutorBubble({ level, message}: { level: number; message: string }){
    const label = level === 0 ? "Re-trace" : level >= 4 ? "Explanation" : `Hint ${level} of 3`;
    return (
        <div className="rounded-lg border border-blue-500 bg-blue-50 p-3 text-sm text-gray-900">
            <div className="mb-1 font-semibold">{label}</div>
            {message}
        </div>
    );
}