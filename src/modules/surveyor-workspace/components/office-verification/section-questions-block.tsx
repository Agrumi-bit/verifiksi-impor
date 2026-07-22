"use client";

import { SectionShell } from "./section-shell";
import { QuestionList, SurveyorNotes } from "./question-list";
import type { AnswerValues } from "./schema";

type QuestionDef = { key: string; no: number; title: string; question: string };

type Props = {
  index: number;
  title: string;
  description: string[];
  listLabel: string;
  questions: QuestionDef[];
  answers: Record<string, AnswerValues>;
  notes: string;
  notesPlaceholder: string;
  onAnswer: (key: string, value: AnswerValues) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function SectionQuestionsBlock({
  index,
  title,
  description,
  listLabel,
  questions,
  answers,
  notes,
  notesPlaceholder,
  onAnswer,
  onNotesChange,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  return (
    <SectionShell index={index} title={title} onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      {description.map((p, i) => (
        <p key={i} className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568] last:mb-4">
          {p}
        </p>
      ))}
      <div className="mb-3.5 text-sm font-extrabold text-[#1c2530]">{listLabel}</div>
      <QuestionList questions={questions} answers={answers} onAnswer={onAnswer} />
      <SurveyorNotes value={notes} onChange={onNotesChange} placeholder={notesPlaceholder} />
    </SectionShell>
  );
}
