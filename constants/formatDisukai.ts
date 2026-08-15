export function formatDisukai(jumlah: number) {
    if (!jumlah || jumlah <= 0) {
        return "Belum ada yang menyukai";
    }

    if (jumlah < 1000) {
        return `Disukai ${jumlah}+ orang`;
    }

    if (jumlah < 1000000) {
        return `Disukai ${(jumlah / 1000).toFixed(1).replace('.0','')}K+ orang`;
    }

    return `Disukai ${(jumlah / 1000000).toFixed(1).replace('.0','')}M+ orang`;
}