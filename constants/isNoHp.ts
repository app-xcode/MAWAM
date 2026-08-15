/**
 * Memvalidasi apakah input merupakan nomor HP Indonesia yang valid.
 * @param noHp - String nomor HP yang akan dicek
 * @returns boolean - true jika valid, false jika tidak
 */
/**
 * Memvalidasi apakah input merupakan nomor HP Indonesia yang valid.
 * @param noHpToWa - String nomor HP yang akan dicek
 * @returns string - contoh 62 bukan lagi 08
 */
export function isNoHp(noHp: string): boolean {
  // Membersihkan spasi, strip (-), dan tanda kurung jika ada
  const cleanNoHp = noHp.replace(/[\s\-\(\)]/g, '');

  // Regex untuk mencocokkan format nomor HP Indonesia:
  // - Diawali +62, 62, atau 0
  // - Diikuti angka 8 (ciri khas nomor seluler / HP)
  // - Diikuti oleh 9 hingga 12 digit angka berikutnya
  const regexNoHp = /^(?:\+62|62|0)8[1-9][0-9]{7,10}$/;

  return regexNoHp.test(cleanNoHp);
}
export function nohptowa(nohp: string): string {
  // Membersihkan spasi, strip (-), dan tanda kurung jika ada
  if(!nohp){
    return '';
  }
  let cleannohp = nohp.replace(/[\s\-\(\)]/g, '');

  // Menghapus tanda + di awal jika ada
  if (cleannohp.startsWith('+')) {
    cleannohp = cleannohp.slice(1);
  }

  // Mengubah awalan 0 atau 08 menjadi 62
  if (cleannohp.startsWith('0')) {
    cleannohp = '62' + cleannohp.slice(1);
  }

  return cleannohp;
}
