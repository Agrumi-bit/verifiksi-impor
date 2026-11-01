import { deadlineNote, type OutputContentItem, type OutputDeadline } from "../../output-review";
import { SCHEME_META, type ComplianceScheme } from "../../scheme";
import { DataTable, StageCard, TD, VerdictPill } from "./stage-ui";

export type OutputReviewData = { content: OutputContentItem[]; deadlines: OutputDeadline[]; scheme: ComplianceScheme };

const CONTENT_BASIS: Record<ComplianceScheme, string> = { vki: "Pasal 32 ayat (3)", konsumsi: "Pasal 39 ayat (5)" };

/** Last stage (LHVKI / LHVIU): the output's minimum content and the time limits of the process. */
export function OutputReview({ data }: { data: OutputReviewData }) {
  const output = SCHEME_META[data.scheme].output;
  return (
    <>
      <StageCard
        title={`Kelengkapan Isi ${output}`}
        description={`Informasi yang paling sedikit dimuat ${output} (${CONTENT_BASIS[data.scheme]} Permenperin 27/2025), dan ketersediaan datanya.`}
      >
        <DataTable caption={`Kelengkapan isi ${output}`} minWidth={900} headers={["Huruf", "Informasi", "Data Tercatat", "Status"]}>
          {data.content.map((entry) => (
            <tr key={entry.letter}>
              <td className={`${TD} font-mono text-[12.5px] text-[#64748B]`}>{entry.letter}</td>
              <th scope="row" className={`${TD} max-w-[380px] text-left font-semibold`}>{entry.label}</th>
              <td className={`${TD} max-w-[360px]`}>{entry.value}</td>
              <td className={TD}><VerdictPill verdict={entry.verdict} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
      <StageCard title="Batas Waktu Proses" description={deadlineNote(data.scheme)}>
        <DataTable caption="Batas waktu proses" minWidth={900} headers={["Tahapan", "Periode", "Lama", "Batas", "Dasar", "Status"]}>
          {data.deadlines.map((entry) => (
            <tr key={entry.label}>
              <th scope="row" className={`${TD} text-left font-semibold`}>{entry.label}</th>
              <td className={TD}>{entry.period}</td>
              <td className={`${TD} tabular-nums`}>{entry.days === null ? "—" : `${entry.days} ${entry.unit}`}</td>
              <td className={`${TD} tabular-nums`}>{entry.limit} {entry.unit}</td>
              <td className={TD}>{entry.regulation}</td>
              <td className={TD}><VerdictPill verdict={entry.verdict} /></td>
            </tr>
          ))}
        </DataTable>
      </StageCard>
    </>
  );
}
