import Alerts from '@/constants/Alerts';
import { supabase } from '@/lib/supabase';

export const simpanProduk = async (datas: any, callback?: () => void) => {
    const deskripsiLengkap = [
        datas.creditLine && `Sumber: ${datas.creditLine}`,
        datas.artistNationality && `Asal Seniman: ${datas.artistNationality}`,
        datas.medium && `Bahan: ${datas.medium}`,
        datas.dimensions && `Dimensi: ${datas.dimensions}`,
        datas.repository && `Lokasi: ${datas.repository}`,
        datas.accessionNumber && `No. Inventaris: ${datas.accessionNumber}`,
        datas.department && `Departemen: ${datas.department}`
    ]
        .filter(Boolean)
        .join('\n');
    const { data, error } = await supabase
        .from('mawam_produk')
        .insert([
            {
                nama_koleksi: datas.title,
                pembuat: datas.artistDisplayName,
                kategori: datas.classification || 'lainnya',
                tahun: datas.objectDate,
                asal: datas.culture || '-',
                gambar: datas.primaryImageSmall,
                deskripsi: deskripsiLengkap,
            }
        ]);

    if (error) {
        const text = 'Gagal menyimpan koleksi ';
        Alerts(text);
    } else {
        if (callback) {
            callback();
        } else {
            Alerts('Koleksi berhasil disimpan');
        }
    }
}
export const hapusProduk = async (id: number, callback: () => void) => {
    const { data } = await supabase
        .from('mawam_produk')
        .select('gambar')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('mawam')
        .delete()
        .eq('id', id);

    if (error) {
        const text = 'Gagal menghapus koleksi ';
        Alerts(text);
    } else {
        if (data?.gambar) {
            await deleteImage(data.gambar);
        }
        callback();
    }
}

const getFilePath = (url: string) => {
    const parts = url.split('/mawam/');
    return parts[1];
};

export const deleteImage = async (url: string) => {
    if (!url) return false;
    const filePath = getFilePath(url);
    if (!filePath) return false;
    const { data, error } = await supabase.storage
    .from('mawam')
    .remove([filePath]);

    if (error) {
        console.log('Gagal hapus gambar:', error);
        return false;
    }
    return true;
}

export default function getDataProduk() {
    return null;
}
