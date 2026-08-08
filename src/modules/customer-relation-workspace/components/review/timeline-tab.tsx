"use client";

import { CheckCircle2, ChevronRight, Circle, CircleDot } from "lucide-react";

type Stage = { key: string; label: string; done: boolean; active: boolean };

export function TimelineTab({ stages }: { stages: Stage[] }) {
  const doneCount = stages.filter((s) => s.done).length;
  const progressPct = stages.length > 0 ? Math.round((doneCount / stages.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-[#f0ded0] bg-white p-6.5">
      <div className="text-[15px] font-extrabold text-[#20180f]">Verification Workflow Progress</div>
      <div className="mb-6 mt-0.5 text-[12.5px] text-[#8a7565]">Status penugasan terkini untuk permohonan ini.</div>

      <div className="flex items-start">
        {stages.map((stage, index) => {
          const circleColor = stage.done ? "#1a9850" : stage.active ? "#e0662e" : "#c9c2b8";
          const circleBg = stage.done ? "#e2f7ea" : stage.active ? "#fdeadd" : "#f2ece5";
          const Icon = stage.done ? CheckCircle2 : stage.active ? CircleDot : Circle;
          return (
            <div key={stage.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className="flex size-13 items-center justify-center rounded-full border-2"
                  style={{ background: circleBg, borderColor: circleColor }}
                >
                  <Icon className="size-6" style={{ color: circleColor }} />
                </div>
                <div className="mt-2 text-[12.5px] font-bold text-[#20180f]">{stage.label}</div>
                <div className="mt-px text-[11.5px]" style={{ color: stage.done ? "#1a9850" : stage.active ? "#e0662e" : "#a68f80" }}>
                  {stage.done ? "Completed" : stage.active ? "In Progress" : "Pending"}
                </div>
              </div>
              {index < stages.length - 1 && (
                <ChevronRight className="mx-2 mt-4 size-4.5 shrink-0 self-start text-[#c9c2b8]" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-2 mt-6.5 flex items-center justify-between">
        <div className="text-[12.5px] text-[#4a4038]">Overall Progress</div>
        <div className="text-[12.5px] font-bold text-[#20180f]">{progressPct}%</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#e8e2da]">
        <div className="h-full rounded-full bg-[#20180f]" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}
