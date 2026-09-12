// One-time seed for the TrademarkClassMasterData reference table (Nice
// Classification / Klasifikasi Internasional Merek per DJKI's Sistem
// Klasifikasi Merek — https://skm.dgip.go.id/), safe to run on every deploy:
// it uses createMany({ skipDuplicates: true }) keyed on the unique
// `classNumber`, so it never overwrites admin edits to existing rows (see
// /system-configuration/trademark-class) and only fills in classes that are
// missing.
//
// Source: WIPO Nice Classification class headings (11th edition), Indonesian
// wording as published by DJKI — classes 1-34 are goods ("Barang"), 35-45
// are services ("Jasa").
//
// Run locally with: npx tsx --env-file=.env scripts/seed-trademark-classes.mjs
// Runs automatically in production as part of the migrate container's start command.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

/** @type {{ classNumber: string; title: string; category: string; description: string }[]} */
const TRADEMARK_CLASSES = [
  { classNumber: "01", title: "Bahan Kimia Industri", category: "Barang", description: "Bahan kimia untuk industri, ilmu pengetahuan dan fotografi, pertanian, hortikultura dan kehutanan." },
  { classNumber: "02", title: "Cat dan Pernis", category: "Barang", description: "Cat, pernis, lak; bahan pencegah karat dan kerusakan kayu; bahan pewarna, mordan; damar alam mentah; logam foil dan serbuk untuk keperluan pelukis, dekorator, percetakan dan seniman." },
  { classNumber: "03", title: "Kosmetik dan Sediaan Cuci", category: "Barang", description: "Sediaan pemutih dan bahan lain untuk mencuci; sediaan membersihkan, mengkilatkan, membuang lemak dan menggosok; sabun; wangi-wangian, minyak esensi, kosmetik, losion rambut; bahan pemeliharaan gigi." },
  { classNumber: "04", title: "Minyak, Pelumas dan Bahan Bakar", category: "Barang", description: "Minyak dan lemak untuk industri; bahan pelumas; komposisi penyerap, pembasah dan pengikat debu; bahan bakar dan bahan penerangan; lilin dan sumbu penerangan." },
  { classNumber: "05", title: "Farmasi dan Kesehatan", category: "Barang", description: "Sediaan farmasi, kedokteran hewan dan kesehatan; substansi diet medis, makanan bayi; suplemen makanan; plester, bahan pembalut; bahan pengisi gigi; disinfektan; sediaan pembasmi hama; fungisida, herbisida." },
  { classNumber: "06", title: "Logam Biasa dan Bahan Bangunan Logam", category: "Barang", description: "Logam biasa dan campurannya, bijih-bijih; bahan bangunan dan konstruksi dari logam; bangunan yang dapat dipindahkan dari logam; kabel dan kawat bukan listrik dari logam biasa; brankas." },
  { classNumber: "07", title: "Mesin dan Perkakas Mesin", category: "Barang", description: "Mesin, perkakas mesin, mesin bertenaga listrik; motor dan mesin penggerak (kecuali untuk kendaraan darat); kopling dan komponen transmisi mesin; peralatan pertanian bermesin; mesin penjual otomatis." },
  { classNumber: "08", title: "Perkakas Tangan dan Alat Potong", category: "Barang", description: "Perkakas dan peralatan tangan yang dioperasikan dengan tangan; alat potong; senjata tajam pribadi; pisau cukur." },
  { classNumber: "09", title: "Perangkat Elektronik dan Ilmiah", category: "Barang", description: "Peralatan dan instrumen ilmiah, penelitian, navigasi, survei, fotografi, audiovisual, optik, penimbangan, pengukuran dan pendeteksian; peralatan kelistrikan; komputer dan perangkat lunak; alat pemadam kebakaran." },
  { classNumber: "10", title: "Alat Kesehatan dan Kedokteran", category: "Barang", description: "Peralatan dan instrumen bedah, medis, gigi dan kedokteran hewan; anggota badan, mata dan gigi palsu; barang ortopedi; bahan jahitan luka; alat terapi dan bantu disabilitas." },
  { classNumber: "11", title: "Peralatan Penerangan dan Sanitasi", category: "Barang", description: "Peralatan dan instalasi untuk penerangan, pemanasan, pendinginan, pembangkitan uap, memasak, pengeringan, ventilasi, penyediaan air dan tujuan sanitasi." },
  { classNumber: "12", title: "Kendaraan", category: "Barang", description: "Kendaraan; alat-alat untuk bergerak di darat, udara atau air." },
  { classNumber: "13", title: "Senjata Api dan Bahan Peledak", category: "Barang", description: "Senjata api; amunisi dan proyektil; bahan peledak; kembang api." },
  { classNumber: "14", title: "Perhiasan dan Logam Mulia", category: "Barang", description: "Logam mulia dan campurannya; perhiasan, batu permata dan batu mulia; instrumen pencatat waktu." },
  { classNumber: "15", title: "Alat Musik", category: "Barang", description: "Alat musik; dudukan dan wadah untuk alat musik; tongkat konduktor." },
  { classNumber: "16", title: "Kertas, Percetakan dan Alat Tulis", category: "Barang", description: "Kertas dan karton; barang cetakan; bahan penjilidan buku; foto; alat tulis dan perlengkapan kantor; perekat alat tulis/rumah tangga; bahan seniman; bahan pengajaran; plastik untuk pengemasan." },
  { classNumber: "17", title: "Karet, Plastik dan Bahan Isolasi", category: "Barang", description: "Karet, gutta-percha, karet gum, asbes, mika mentah/setengah jadi dan penggantinya; plastik dan resin ekstrusi untuk pembuatan; bahan pengepakan, penyekat dan isolasi; pipa dan selang fleksibel bukan logam." },
  { classNumber: "18", title: "Kulit dan Barang dari Kulit Imitasi", category: "Barang", description: "Kulit dan kulit imitasi; kulit hewan; koper dan tas untuk membawa barang; payung dan payung matahari; tongkat jalan; cambuk, tali kekang dan pelana; kalung dan pakaian untuk hewan." },
  { classNumber: "19", title: "Bahan Bangunan Bukan Logam", category: "Barang", description: "Bahan bangunan bukan dari logam; pipa kaku bukan logam untuk bangunan; aspal, ter dan bitumen; bangunan yang dapat dipindahkan bukan dari logam; monumen bukan dari logam." },
  { classNumber: "20", title: "Perabot dan Wadah Non-Logam", category: "Barang", description: "Perabot, cermin, bingkai foto; wadah bukan dari logam untuk penyimpanan atau pengangkutan; tulang, tanduk, balein atau kulit mutiara; kerang; buih laut; amber kuning." },
  { classNumber: "21", title: "Peralatan Rumah Tangga dan Dapur", category: "Barang", description: "Peralatan dan wadah rumah tangga atau dapur; peralatan masak dan makan (kecuali garpu, pisau, sendok); sisir dan spons; sikat; peralatan pembersih; kaca, porselen dan barang tembikar." },
  { classNumber: "22", title: "Tali, Jaring dan Terpal", category: "Barang", description: "Tali dan benang untuk keperluan bukan tekstil; jaring; tenda dan terpal; awning; layar kapal; karung untuk pengangkutan barang curah; bahan pengisi bantal; serat tekstil mentah." },
  { classNumber: "23", title: "Benang Tekstil", category: "Barang", description: "Benang dan filamen untuk keperluan tekstil." },
  { classNumber: "24", title: "Tekstil dan Kain Rumah Tangga", category: "Barang", description: "Tekstil dan barang pengganti tekstil; perlengkapan rumah tangga dari kain; tirai dari tekstil atau plastik." },
  { classNumber: "25", title: "Pakaian, Alas Kaki, dan Tutup Kepala", category: "Barang", description: "Pakaian, alas kaki, tutup kepala." },
  { classNumber: "26", title: "Renda, Sulaman dan Aksesori Jahit", category: "Barang", description: "Renda, tali kepang dan sulaman, pita hias; kancing, kancing kait dan mata kait, jarum pentul dan jarum jahit; bunga buatan; hiasan dan rambut palsu." },
  { classNumber: "27", title: "Karpet dan Penutup Lantai", category: "Barang", description: "Karpet, permadani, keset dan alas kaki, linoleum dan bahan lain untuk melapisi lantai; penutup dinding bukan dari tekstil." },
  { classNumber: "28", title: "Mainan dan Alat Olahraga", category: "Barang", description: "Permainan, mainan dan barang mainan; peralatan permainan video; barang senam dan olahraga; hiasan pohon Natal." },
  { classNumber: "29", title: "Daging, Ikan dan Produk Olahan Makanan", category: "Barang", description: "Daging, ikan, unggas dan buruan; ekstrak daging; buah dan sayuran diawetkan/dibekukan/dikeringkan/dimasak; jeli, selai, kompot; telur; susu dan produk susu; minyak dan lemak untuk makanan." },
  { classNumber: "30", title: "Kopi, Teh dan Produk Sereal", category: "Barang", description: "Kopi, teh, kakao dan pengganti kopi; beras, pasta dan mi; tepung dan sediaan sereal; roti dan produk pastry; cokelat; es krim; gula, madu; garam, bumbu dan rempah; cuka dan saus." },
  { classNumber: "31", title: "Produk Pertanian dan Hewan Hidup", category: "Barang", description: "Produk pertanian, budidaya perairan, hortikultura dan kehutanan yang mentah/belum diproses; biji dan benih; buah dan sayuran segar; tanaman dan bunga alami; hewan hidup; pakan hewan; malt." },
  { classNumber: "32", title: "Minuman Non-Alkohol", category: "Barang", description: "Bir; minuman non-alkohol; air mineral dan air soda; minuman berbahan dasar buah dan jus buah; sirup dan sediaan lain untuk membuat minuman non-alkohol." },
  { classNumber: "33", title: "Minuman Beralkohol", category: "Barang", description: "Minuman beralkohol, kecuali bir; sediaan beralkohol untuk membuat minuman." },
  { classNumber: "34", title: "Tembakau dan Perlengkapan Rokok", category: "Barang", description: "Tembakau dan pengganti tembakau; rokok dan cerutu; rokok elektrik dan vaporizer oral untuk perokok; barang untuk perokok; korek api." },
  { classNumber: "35", title: "Periklanan dan Manajemen Usaha", category: "Jasa", description: "Periklanan; manajemen usaha; administrasi usaha; fungsi kantor." },
  { classNumber: "36", title: "Asuransi dan Jasa Keuangan", category: "Jasa", description: "Asuransi; urusan keuangan; urusan moneter; urusan real estat." },
  { classNumber: "37", title: "Konstruksi dan Perbaikan", category: "Jasa", description: "Jasa konstruksi bangunan; instalasi dan perbaikan; pertambangan, pengeboran minyak dan gas." },
  { classNumber: "38", title: "Telekomunikasi", category: "Jasa", description: "Jasa telekomunikasi." },
  { classNumber: "39", title: "Transportasi dan Penyimpanan", category: "Jasa", description: "Jasa transportasi; pengemasan dan penyimpanan barang; pengaturan perjalanan." },
  { classNumber: "40", title: "Perlakuan Bahan dan Daur Ulang", category: "Jasa", description: "Perlakuan bahan; daur ulang sampah dan limbah; pemurnian udara dan perlakuan air; jasa percetakan; pengawetan makanan dan minuman." },
  { classNumber: "41", title: "Pendidikan dan Hiburan", category: "Jasa", description: "Jasa pendidikan; penyediaan pelatihan; hiburan; kegiatan olahraga dan budaya." },
  { classNumber: "42", title: "Jasa Ilmiah dan Teknologi", category: "Jasa", description: "Jasa ilmiah dan teknologi serta penelitian dan perancangan terkait; jasa analisis dan penelitian industri; perancangan dan pengembangan perangkat keras dan perangkat lunak komputer." },
  { classNumber: "43", title: "Jasa Makanan dan Akomodasi", category: "Jasa", description: "Jasa penyediaan makanan dan minuman; akomodasi sementara." },
  { classNumber: "44", title: "Jasa Medis dan Perawatan", category: "Jasa", description: "Jasa medis; jasa kedokteran hewan; perawatan kebersihan dan kecantikan untuk manusia atau hewan; jasa pertanian, hortikultura dan kehutanan." },
  { classNumber: "45", title: "Jasa Hukum dan Keamanan", category: "Jasa", description: "Jasa hukum; jasa keamanan untuk perlindungan fisik atas properti dan individu; jasa pribadi dan sosial yang diberikan pihak lain untuk memenuhi kebutuhan individu." },
];

async function main() {
  console.log(`Seeding ${TRADEMARK_CLASSES.length} trademark classes...`);
  const result = await db.trademarkClassMasterData.createMany({
    data: TRADEMARK_CLASSES,
    skipDuplicates: true,
  });
  console.log(`Inserted ${result.count} new rows (${TRADEMARK_CLASSES.length - result.count} already present).`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
