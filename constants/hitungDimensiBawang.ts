/**
 * Fungsi pembulatan kustom sesuai aturan:
 * 20-22 -> 20
 * 23-26 -> 25
 * 27-30 -> 30
 */
function bulatkanKeKelipatanLima(angka: number) {
    const integer = Math.ceil(angka);
    const sisa = integer % 10;

    if (sisa >= 1 && sisa <= 2) {
        return integer - sisa;
    } else if (sisa >= 3 && sisa <= 6) {
        return integer - sisa + 5;
    } else if (sisa >= 7 && sisa <= 9) {
        return integer - sisa + 10;
    }

    return integer;
}

/**
 * Menghitung dimensi kemasan bawang merah berdasarkan berat (kg)
 * Output sesuai format Biteship:
 * - length (cm)
 * - width (cm)
 * - height (cm)
 */
export default function hitungDimensiBawang(berat: number) {
    if (berat <= 0) {
        return {
            length: 0,
            width: 0,
            height: 0,
        };
    }

    const faktorSkala = Math.cbrt(berat);

    const widthDasar = 15;
    const lengthDasar = 20;
    const heightDasar = 10;

    return {
        length: bulatkanKeKelipatanLima(lengthDasar * faktorSkala),
        width: bulatkanKeKelipatanLima(widthDasar * faktorSkala),
        height: bulatkanKeKelipatanLima(heightDasar * faktorSkala),
    };
}