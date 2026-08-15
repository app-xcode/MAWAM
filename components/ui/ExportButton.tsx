import { Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import XLSX from 'xlsx-js-style';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const exportToExcel = async (data: any[], setIsExporting: any, fileName = "DataExport") => {
    const ws = XLSX.utils.json_to_sheet(data);

    // 1. Definisikan Style
    const headerStyle = {
        fill: { fgColor: { rgb: "000000" } }, // Warna Background Hijau
        font: { color: { rgb: "FFFFFF" }, bold: true }, // Teks Putih & Tebal
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
        }
    };

    const bodyStyle = {
        alignment: { vertical: "center", horizontal: "left", wrapText: true, indent: 1 },
        border: {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
        }
    };

    // 2. Terapkan Style ke Cell
    const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellAddress]) continue;

            // Jika baris ke-0 (Header), pakai headerStyle, sisanya bodyStyle
            ws[cellAddress].s = (R === 0) ? headerStyle : bodyStyle;
        }
    }

    // Atur lebar kolom
    ws['!cols'] = [
        { wch: 6 }, { wch: 35 }, { wch: 15 }, { wch: 8 },
        { wch: 15 }, { wch: 25 }, { wch: 50 }, { wch: 18 }, { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produk");

    // 3. Export (Web/Mobile)
    if (Platform.OS === 'web') {
        XLSX.writeFile(wb, `${fileName.replace(/\s/g,'_')}.xlsx`);
    } else {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.cacheDirectory + `${fileName.replace(/\s/g,'_')}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(fileUri);
    }
    setIsExporting(false);
};

const handleExportExcel = (rawData: any[], setIsExporting: any, judul:string) => {

    // Filter data agar header Excel lebih rapi
    const dataToExport = rawData.map((item, index) => ({
        "NO": index + 1,
        "Nama Produk": item.nama_produk,
        "Harga": item.harga,
        "Stok": item.stok,
        "Satuan": item.satuan,
        "Berat per Unit": item.berat_per_unit,
        "Deskripsi": item.deskripsi,
        "Tanggal Dibuat": new Date(item.created_at).toLocaleDateString('id-ID'),
        "Link Gambar": {
            f: `=HYPERLINK("${item.gambar_produk}", "Lihat Gambar")`
        },
    }));

    // Panggil fungsi export yang kita buat di Tahap 1
    exportToExcel(dataToExport, setIsExporting, judul);
};

const loadImage = (url: string, useProxy = false): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        // const timeout = setTimeout(() => {
        //     reject(new Error("Image load timeout"));
        // }, 10000);
        const img = new Image();
        img.crossOrigin = "anonymous";

        const finalUrl = useProxy
            ? "https://cros-image.vercel.app/?quest=" + encodeURIComponent(url) + '&size=300'
            : url;

        img.onload = () => {
            if (!img.src.startsWith("data:image") && !img.complete) {
                reject("Invalid image");
            }
            resolve(img);
        }

        img.onerror = (error) => {
            if (!useProxy) {
                // coba lagi pakai proxy
                resolve(loadImage(url, true));
            } else {
                reject(error);
            }
        };

        img.src = finalUrl;
    });
};


const getBase64ImageFromURL = (url: string): Promise<object> => {
    return new Promise(async (resolve, reject) => {
        const image: any = await loadImage(url, !url.includes('supabase.co'));
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(image, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        resolve({ img: dataURL, width: image.width, height: image.height });
    });
};

const exportToPDFWeb = async (rawData: any[], setIsExporting: any, judul:string) => {
    const base64Data = 'data:image/jpeg;base64,...'; // (Base64 fallback Anda)
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(judul, 105, 10, { align: "center", baseline: "middle" });

    const tableRows = await Promise.all(rawData.map(async (item) => {
        let base64: any = { img: '', width: 15, height: 15 };
        try {
            base64 = await getBase64ImageFromURL(item.gambar_produk);
        } catch (e) {
            console.error("Gagal memuat gambar untuk ID:", item.id);
        }
        return {
            ...item,
            base64Image: base64.img.length > 0 ? base64.img : base64Data,
            width: base64 ? base64.width : 15,
            height: base64 ? base64.height : 15,
        };
    }));

    autoTable(doc, {
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center',
            minCellHeight: 10
        },
        margin: { top: 20, right: 10, bottom: 10, left: 10 },
        startY: 20,
        // 1. Tambahkan 'Deskripsi' di Header
        head: [['NO', 'Nama Produk', 'Harga', 'Stok', 'Deskripsi', 'Gambar Produk']],

        // 2. Petakan data deskripsi ke body
        body: tableRows.map((d, i) => [
            i + 1,
            d.nama_produk,
            d.harga,
            d.stok + ' '+d.satuan,
            d.deskripsi || "-", // Menampilkan field deskripsi
            ""
        ]),

        // 3. Atur Column Styles agar teks deskripsi rapi
        columnStyles: {
            0: { cellWidth: 10 }, // ID (kecil saja)
            1: { cellWidth: 30, fontStyle: 'bold' }, // Deskripsi
            2: { cellWidth: 20 }, // Kategori
            3: { cellWidth: 15 }, // Tahun
            4: { fontSize: 7 }, // Deskripsi
            5: { cellWidth: 25 }, // Kolom gambar sedikit diperlebar agar aman
        },

        styles: {
            minCellHeight: 25, // Ditingkatkan sedikit agar deskripsi panjang punya ruang
            valign: 'middle',
            fontSize: 9, // Ukuran font sedikit dikecilkan agar muat banyak kolom
            overflow: 'linebreak', // Teks deskripsi akan turun ke bawah jika panjang
            textColor: '#000000',
            lineWidth: 0.1,
            lineColor: '#000000'
        },
        didDrawCell: (data) => {
            // Pastikan index kolom gambar disesuaikan (sekarang index ke-5)
            if (data.column.index === 5 && data.cell.section === 'body') {
                const item = tableRows[data.row.index];
                if (item?.base64Image) {
                    const scale = item.width ? 18 / Math.max(item.width, item.height) : 1;
                    const imgW = item.width * scale;
                    const imgH = item.height * scale;
                    const posX = data.cell.x + (data.cell.width - imgW) / 2;
                    const posY = data.cell.y + (data.cell.height - imgH) / 2;
                    doc.addImage(
                        item.base64Image,
                        'PNG',
                        posX,
                        posY,
                        imgW,
                        imgH,
                    );
                }
            }
        },
    });

    doc.save(judul.replace(/\s/g,'_')+".pdf");
    setIsExporting(false)
};

const exportToPDF = async (rawData: any[], setIsExporting: any, judul:string) => {
    // 1. Generate baris tabel secara dinamis
    const tableRows = rawData.map((item, index) => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;"><b>${item.nama_produk}</b></td>
            <td style="border: 1px solid #ddd; padding: 8px;text-align:center;">${item.harga}</td>
            <td style="border: 1px solid #ddd; padding: 8px;text-align:center;">${item.stok} ${item.satuan}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 10px;">${item.deskripsi}</td>
            <td style="border: 1px solid #ddd; padding: 8px;text-align:center;">
                <img src="https://cros-image.vercel.app/?quest=` + encodeURIComponent(item.gambar_produk) + `&size=300" style="width: 80px; border-radius: 4px;" />
            </td>
        </tr>
    `).join('');

    // 2. Susun Template HTML Lengkap
    const htmlContent = `
    <html>
        <head>
            <style>
                @media print {
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }

                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    page-break-inside: auto; /* Memungkinkan tabel pecah ke halaman baru */
                }

                tr { 
                    page-break-inside: avoid; /* Mencegah satu baris terpotong di tengah */
                    page-break-after: auto; 
                }

                thead { 
                    display: table-header-group; 
                }

                th { 
                    background-color: #000000ff !important; /* !important untuk memastikan warna muncul */
                    color: white !important;
                    -webkit-print-color-adjust: exact; /* Memaksa browser/PDF cetak warna */
                }
            </style>
        </head>
        <body>
            <h2 style="text-align: center;">Laporan Produk</h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">NO</th>
                        <th style="width: 15%;">Nama Produk</th>
                        <th style="width: 15%;">Harga</th>
                        <th style="width: 10%;">Stok</th>
                        <th style="width: 35%;">Deskripsi</th>
                        <th style="width: 20%;">Gambar</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </body>
    </html>

    `;

    try {

        if (Platform.OS === 'web') {
            exportToPDFWeb(rawData, setIsExporting, judul);
        } else {
            // Mobile: Generate file temporary lalu buka menu share
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            setIsExporting(false)
        }
    } catch (error) {
        console.error("Gagal export PDF:", error);
    }
};

export const ExportButton = ({ iconColor, produk, setIsExporting, judul }: { iconColor: string, produk: any[], setIsExporting: React.Dispatch<React.SetStateAction<boolean>>, judul?:string }) => {
    const { showActionSheetWithOptions } = useActionSheet();
    const judul_ = judul ?? 'Laporan Produk';

    const handleExport = (format: 'excel' | 'pdf') => {
        setIsExporting(true);
        if (format === 'excel') {
            handleExportExcel(produk, setIsExporting, judul_);
        } else {
            exportToPDF(produk, setIsExporting, judul_);
        }
    };

    const onPress = () => {
        const options = ['Excel', 'PDF', 'Batal'];
        const cancelButtonIndex = 2;
        showActionSheetWithOptions({
            options,
            cancelButtonIndex,
            title: 'Export Data',
            message: 'Pilih format yang diinginkan:'
        }, (selectedIndex) => {
            switch (selectedIndex) {
                case 0:
                    handleExport('excel');
                    break;
                case 1:
                    handleExport('pdf');
                    break;
            }
        });
    };

    return (
        <TouchableOpacity onPress={onPress} style={{width:25}}>
            <Ionicons name="download-outline" size={24} color={iconColor} />
        </TouchableOpacity>
    );
};
