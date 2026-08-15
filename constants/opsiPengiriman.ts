const ApiKirim = 'https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/shipping-binderbyte';
export async function getOpsiPengiriman() {
  const datas = {
    origin_latitude: -10.1787,
    origin_longitude: 123.5976,
    destination_latitude: -10.16,
    destination_longitude: 123.6,
    weight: 1000,
    courier: "jne"
  }
  const get = await fetch(ApiKirim, { method: 'post', body: JSON.stringify({ action: "rates", datas }), })
  const { success, data }: any = await get.json();
  return success ? data : [];
}

export const formatService = (serviceName: string) => {
  const serviceMap: { [key: string]: string } = {
    'EZ': 'Reguler',
    'REG': 'Reguler',
    'SIUNTUNG': 'Reguler',
    'YES': 'Ekspres (Esok Sampai)',
    'BEST': 'Ekspres (Esok Sampai)',
    'ND': 'Ekspres (Esok Sampai)',
    'ECO': 'Ekonomis',
    'HALU': 'Ekonomis',
    'OKE': 'Ekonomis',
    'JTR': 'Kargo (Trucking)',
    'GOKIL': 'Kargo (Trucking)',
    'SD': 'Same Day (Hari Ini Sampai)'
  };

  // Jika kode tidak ada di map, tampilkan teks aslinya
  return serviceMap[(serviceName??'').toUpperCase()] || serviceName; 
};
