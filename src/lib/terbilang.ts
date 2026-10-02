const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function angkaKeTerbilang(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${angkaKeTerbilang(n - 10)} Belas`.trim();
  if (n < 100) {
    const sisa = n % 10;
    return `${angkaKeTerbilang(Math.floor(n / 10))} Puluh${sisa ? ` ${angkaKeTerbilang(sisa)}` : ""}`.trim();
  }
  if (n < 200) return `Seratus${n > 100 ? ` ${angkaKeTerbilang(n - 100)}` : ""}`.trim();
  if (n < 1000) {
    const sisa = n % 100;
    return `${angkaKeTerbilang(Math.floor(n / 100))} Ratus${sisa ? ` ${angkaKeTerbilang(sisa)}` : ""}`.trim();
  }
  if (n < 2000) return `Seribu${n > 1000 ? ` ${angkaKeTerbilang(n - 1000)}` : ""}`.trim();
  if (n < 1_000_000) {
    const sisa = n % 1000;
    return `${angkaKeTerbilang(Math.floor(n / 1000))} Ribu${sisa ? ` ${angkaKeTerbilang(sisa)}` : ""}`.trim();
  }
  if (n < 1_000_000_000) {
    const sisa = n % 1_000_000;
    return `${angkaKeTerbilang(Math.floor(n / 1_000_000))} Juta${sisa ? ` ${angkaKeTerbilang(sisa)}` : ""}`.trim();
  }
  if (n < 1_000_000_000_000) {
    const sisa = n % 1_000_000_000;
    return `${angkaKeTerbilang(Math.floor(n / 1_000_000_000))} Miliar${sisa ? ` ${angkaKeTerbilang(sisa)}` : ""}`.trim();
  }
  const sisa = n % 1_000_000_000_000;
  return `${angkaKeTerbilang(Math.floor(n / 1_000_000_000_000))} Triliun${sisa ? ` ${angkaKeTerbilang(sisa)}` : ""}`.trim();
}

/**
 * Converts a non-negative Rupiah amount into Indonesian words — e.g. 5000000 -> "Lima Juta
 * Rupiah". Accepts the numeric string a form field stores or a plain number. Returns "" for
 * empty/invalid/negative input so callers can decide whether to render anything (never throws on
 * a half-typed amount).
 */
export function terbilangRupiah(value: string | number): string {
  if (typeof value === "string" && value.trim() === "") return "";
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (amount === 0) return "Nol Rupiah";
  return `${angkaKeTerbilang(Math.floor(amount))} Rupiah`;
}
