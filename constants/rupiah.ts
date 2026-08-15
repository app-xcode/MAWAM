export function rupiah(
  nilai: number | string,
  prefix: string = 'Rp'
) {
  const angka = Number(nilai) || 0;

  return (
    prefix +
    angka.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}
export const formatRupiah = (value: any) => {
  value = value.toString();
  const angka = value.replace(/\D/g, "");
  return angka.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};