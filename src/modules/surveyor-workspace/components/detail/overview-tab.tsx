import { MaterialIcon } from "../material-icon";
import type { AssignmentDetailData } from "../assignment-detail";

type Props = { data: AssignmentDetailData };

function Row({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <MaterialIcon name={icon} className="mt-0.5 text-sv-primary-container" />
      <div>
        <div className="text-[10.5px] uppercase tracking-wide text-[#a68f80]">{label}</div>
        <div className="text-sm font-semibold">{value || "—"}</div>
      </div>
    </div>
  );
}

export function OverviewTab({ data }: Props) {
  const { payload } = data.application;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
        <h3 className="mb-5 font-sv-headline-lg text-lg font-bold">Ringkasan Penugasan</h3>
        <div className="grid grid-cols-2 gap-5">
          <Row icon="apartment" label="Perusahaan" value={payload.companyName} />
          <Row icon="category" label="Tipe Verifikasi" value={data.application.verificationType} />
          <Row
            icon="event_available"
            label="Tanggal Verifikasi"
            value={data.scheduledDate ? new Date(data.scheduledDate).toLocaleDateString("id-ID") : undefined}
          />
          <Row icon="schedule" label="Jatuh Tempo" value={data.dueDate ? new Date(data.dueDate).toLocaleDateString("id-ID") : undefined} />
        </div>
      </div>
      <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
        <h3 className="mb-5 font-sv-headline-lg text-lg font-bold">Kontak Penanggung Jawab</h3>
        <div className="grid grid-cols-2 gap-5">
          <Row icon="person" label="Nama" value={payload.contactFullName} />
          <Row icon="badge" label="Jabatan" value={payload.contactDesignation} />
          <Row icon="mail" label="Email" value={payload.contactEmail} />
          <Row icon="phone" label="Telepon" value={payload.contactPhone} />
        </div>
      </div>
    </div>
  );
}
