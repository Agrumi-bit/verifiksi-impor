"use client";

import type { AnswerValues } from "./schema";

type QuestionDef = { key: string; no: number; title: string; question: string };

type Props = {
  questions: QuestionDef[];
  answers: Record<string, AnswerValues>;
  onAnswer: (key: string, value: AnswerValues) => void;
};

export function QuestionList({ questions, answers, onAnswer }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-4">
      {questions.map((q) => {
        const answer = answers[q.key] ?? { value: null };
        return (
          <div key={q.key} className="rounded-xl border border-[#dbe4f0] bg-white p-5">
            <div className="mb-1 text-[14.5px] font-bold text-[#1c2530]">
              {q.no}. {q.title}
            </div>
            <div className="mb-3 text-[13px] text-[#4a5568]">{q.question}</div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => onAnswer(q.key, { ...answer, value: "sesuai" })}
                className="rounded-lg px-4 py-2 text-[13px] font-bold"
                style={
                  answer.value === "sesuai"
                    ? { background: "#16a34a", color: "#fff" }
                    : { background: "#fff", color: "#16a34a", border: "1px solid #16a34a" }
                }
              >
                Sesuai
              </button>
              <button
                type="button"
                onClick={() => onAnswer(q.key, { ...answer, value: "tidak" })}
                className="rounded-lg px-4 py-2 text-[13px] font-bold"
                style={
                  answer.value === "tidak"
                    ? { background: "#dc2626", color: "#fff" }
                    : { background: "#fff", color: "#4a4038", border: "1px solid #d7dbe0" }
                }
              >
                Tidak Sesuai
              </button>
            </div>
            {answer.value === "tidak" && (
              <div className="mt-3.5 rounded-[10px] border border-[#f3b8b8] bg-[#fdecec] p-4">
                <div className="mb-2.5 text-[13px] font-bold text-[#b91c1c]">Alasan Ketidaksesuaian</div>
                <textarea
                  value={answer.reason ?? ""}
                  onChange={(e) => onAnswer(q.key, { ...answer, reason: e.target.value })}
                  placeholder="Tuliskan alasan ketidaksesuaian..."
                  className="min-h-[60px] w-full resize-y rounded-lg border border-[#f3b8b8] bg-white p-2.5 text-[13px]"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SurveyorNotes({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-1">
      <div className="mb-2 text-sm font-extrabold text-[#1c2530]">Catatan Surveyor</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[70px] w-full resize-y rounded-[10px] border border-[#dbe4f0] p-3 text-[13.5px]"
      />
    </div>
  );
}
