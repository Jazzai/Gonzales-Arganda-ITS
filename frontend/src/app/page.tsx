"use Client";
import { ComparisonCards } from "@/components/ComparisonCards";
import { TutorBubble } from "@/components/TutorBubble";
import { useExercise } from "@/hooks/useExercise";
import { useTutor } from "@/hooks/useTutor";

export default function Home() {
  const { exercise, error: loadError } = useExercise("loop-basics-1");
  const t = useTutor(exercise, "eed");

  if (loadError) return <p className="p-6 text-red-600">{loadError}</p>;
  if (!exercise) return <p className="p-6">Loading...</p>;
  const cp = exercise.checkpoints[0];

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">{exercise.title}</h1>
      <p>{exercise.statement}</p>

      <textarea
        className="h-64 w-full rounded border p-2 font-mono text-sm"
        value={t.code}
        onChange={(e) => t.setCode(e.target.value)}
        spellCheck={false}
      />

      <div className="space-y-2 rounded border p-3">
        <div className="text-sm">
          Checkpoint (line {cp.line}): <b>{cp.question}</b>
        </div>
        <div className="flex gap-2">
          <input 
          className="flex-1 rounded border p-2"
          value={t.prediction}
          onChange={(e) => t.setPrediction(e.target.value)}
          placeholder="Your prediction"
          />
          <button 
            className="rounded bg-blue-600 px-3 text-white disabled:opacity-50"
            disabled={t.loading || !t.prediction.trim()}
            onClick={() => t.submit()}
          > 
            Submit Prediction
          </button>
          <button className="rounded border px-3" disabled={t.loading} onClick={() => t.submit(true)}>
            Not sure
          </button>
        </div>
      </div>

      {t.error && <p className="text-red-600">{t.error}</p>}
      {t.result?.status === "compile_error" && (
        <pre className="overflow-x-auto rounded bg-red-50 p-3 text-xs text-red-800">{t.result.detail}</pre>
      )}
      {t.result?.status === "checkpoint_not_reached" && <p>The program never reached the checkpoint.</p>}
      {t.result?.status === "not_sure" && <p>No problem. Trace the code by hand and try a prediction.</p>}
      {t.result?.status === "ok" && (
        <>
          <ComparisonCards result={t.result} />
          {t.result.tutor && <TutorBubble {...t.result.tutor} />}
        </>
      )}
    </main>
  );
}