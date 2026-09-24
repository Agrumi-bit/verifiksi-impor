"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UseFormReturn } from "react-hook-form";

import type { PartnerWizardValues } from "../../schema";

type CompanyMatch = {
  id: string;
  companyName: string;
  companyType: string;
  apiType: string | null;
};

type Props = {
  form: UseFormReturn<PartnerWizardValues>;
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-1.5 text-[13px] font-bold text-[#20180f]">
      {children} {required && <span className="text-[#e0662e]">*</span>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border-none bg-[#f7f2ec] px-3.5 py-2.75 text-[13px] text-[#20180f] outline-none placeholder:text-[#a68f80]";

export function PartnerCompanySyncStep({ form }: Props) {
  const router = useRouter();
  const {
    register,
    setValue,
    formState: { errors },
  } = form;
  const [isSyncing, setIsSyncing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [match, setMatch] = useState<CompanyMatch | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const companyId = form.watch("companyId");

  async function handleSync() {
    const [nib, npwp, sk] = form.getValues(["nibNumber", "npwpInput", "skInput"]);
    if (!nib || !npwp || !sk) {
      await form.trigger(["nibNumber", "npwpInput", "skInput"]);
      return;
    }

    setIsSyncing(true);
    setNotFound(false);
    try {
      const params = new URLSearchParams({ nib, npwp, sk });
      const response = await fetch(`/api/partners/lookup?${params.toString()}`);
      const json = (await response.json()) as { data: CompanyMatch | null };
      if (!json.data) {
        setNotFound(true);
        return;
      }
      setMatch(json.data);
      setShowConfirm(true);
    } catch {
      setNotFound(true);
    } finally {
      setIsSyncing(false);
    }
  }

  function confirmMatch() {
    if (!match) return;
    setValue("companyId", match.id, { shouldValidate: true });
    setValue("companyName", match.companyName);
    setShowConfirm(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[15px] font-extrabold text-[#20180f]">Masukan Data Perusahaan Partner</div>
        <p className="mt-0.5 text-[12.5px] text-[#8a7565]">
          Isi NIB, NPWP, dan SK Kemenkumham untuk mencari dan menyinkronkan perusahaan dari Directory
          Perusahaan.
        </p>
      </div>

      {companyId ? (
        <div className="rounded-lg border border-[#efe2d4] bg-[#f7f2ec] p-3.5">
          <div className="text-[11px] text-[#8a7565]">Perusahaan Tersinkron</div>
          <div className="mt-0.5 text-[13.5px] font-extrabold text-[#20180f]">{form.watch("companyName")}</div>
        </div>
      ) : (
        <>
          <div>
            <FieldLabel required>NIB (Nomor Induk Berusaha)</FieldLabel>
            <input className={inputClass} placeholder="Masukkan nomor NIB (13 digit)" {...register("nibNumber")} />
            {errors.nibNumber && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.nibNumber.message}</p>}
          </div>
          <div>
            <FieldLabel required>NPWP</FieldLabel>
            <input className={inputClass} placeholder="Masukkan nomor NPWP (15 digit)" {...register("npwpInput")} />
            {errors.npwpInput && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.npwpInput.message}</p>}
          </div>
          <div>
            <FieldLabel required>SK Kemenkumham</FieldLabel>
            <input className={inputClass} placeholder="Masukkan nomor SK Kemenkumham" {...register("skInput")} />
            {errors.skInput && <p className="mt-1 text-xs text-[#ba1a1a]">{errors.skInput.message}</p>}
          </div>

          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="self-start rounded-lg bg-[#e0662e] px-5 py-2.75 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {isSyncing ? "Menyinkronkan..." : "Sinkronisasi Perusahaan"}
          </button>

          {notFound && (
            <div className="rounded-lg border border-[#e8b89a] bg-[#fdeadd] p-3.5">
              <p className="text-[12.5px] text-[#c14a1f]">
                Data kredensial tidak sesuai atau perusahaan belum terdaftar di Directory Perusahaan.
              </p>
              <button
                type="button"
                onClick={() => router.push("/company/new")}
                className="mt-2.5 rounded-lg border border-[#e0662e] bg-white px-4 py-2.25 text-[12.5px] font-bold text-[#c14a1f]"
              >
                + Tambah Perusahaan
              </button>
            </div>
          )}
        </>
      )}

      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          className="fixed inset-0 z-20 flex items-center justify-center bg-[rgba(30,18,10,.4)]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] max-w-105 rounded-[14px] bg-white p-6.5"
          >
            <div className="text-[15px] font-extrabold text-[#20180f]">Perusahaan Ditemukan</div>
            <div className="mb-4 mt-1 text-[12.5px] text-[#8a7565]">
              Data berikut sesuai dengan NIB, NPWP, dan SK Kemenkumham yang dimasukkan.
            </div>
            {match && (
              <div className="mb-5 rounded-[10px] border border-[#efe2d4] p-3.5">
                <div className="text-[14px] font-extrabold text-[#20180f]">{match.companyName}</div>
                <div className="mt-1 text-[11.5px] text-[#8a7565]">
                  {match.companyType} · {match.apiType ?? "-"}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmMatch}
                className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white"
              >
                Lanjutkan sebagai Partner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
