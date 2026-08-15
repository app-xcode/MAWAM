import { supabase } from "@/lib/supabase";

export const getKodeWilayah = async (full: string = "") => {
  const parts = full.split(".").filter(Boolean);

  let desa:any, kecamatan, kabupaten, prov;
  if (parts.length === 4) {
    const [pro, kab, kec, des] = parts;
    const { data: dd } = await supabase
    .from('desa')
    .select('*')
    .eq('id', des)
    .single()
    if (dd) {
      desa = dd.nama
    }
    const { data: dke } = await supabase
    .from('kecamatan')
    .select('*')
    .eq('id', kec)
    .single()
    if (dke) {
      kecamatan = dke.nama
    }
    // const { data: dka } = await supabase
    //   .from('kabupaten')
    //   .select('*')
    //   .eq('id', kab)
    //   .single()
    // if (dka) {
      //   kabupaten = dka.nama
      // }
    const { data: provinsi } = await supabase
      .from('provinsi')
      .select('*')
      .eq('id', pro)
      .single()
      if (provinsi) {
        prov = provinsi.nama
      }
      // village
      const dataPos = await fetchKodePos([desa, kecamatan].join('+'));
      if(dataPos && dataPos?.data?.length){
        const dp = dataPos?.data.filter((item:any)=>{
          return item.village == desa   
        })
        return {
        level: "desa",
        kode: dp[0]?.code || dataPos?.data[0]?.code
      };
    }

  }
  return null;
}
const fetchKodePos = async (keyword: any) => {
  keyword = keyword.replace(/\s/gi, '+');
  const res = await fetch(`https://kodepos.vercel.app/search/?q=${keyword}`);
  const json = await res.json();
  return json;
};


export const getKodeWilayahBinder = (full: string = "") => {
  const parts = full.split(".").filter(Boolean);

  if (parts.length === 1) {
    return {
      level: "provinsi",
      kode: `prov_${parts[0]}`
    };
  }

  if (parts.length === 2) {
    const [pro, kab] = parts;

    return {
      level: "kabupaten",
      kode: `city_${pro}.${kab.replace(pro, "")}`
    };
  }

  if (parts.length === 3) {
    const [pro, kab, kec] = parts;

    return {
      level: "kecamatan",
      kode: `dist_${pro}.${kab.replace(pro, "")}.${kec.replace(kab, "")}`
    };
  }

  if (parts.length === 4) {
    const [pro, kab, kec, des] = parts;

    return {
      level: "desa",
      kode: `village_${pro}.${kab.replace(pro, "")}.${kec.replace(kab, "")}.${des.replace(kec, "")}`
    };
  }

  return null;
}

export function setKodeOngkir(full: string = "53.5371.537101.5371011011") {
  const [pro, ka, ke, de] = full.split('.');
  const kab = ka?.replace(pro, '');
  const kec = ke?.replace(ka, '');
  const des = de?.replace(ke, '');
  const result = [pro, kab, kec, des].join('.');
  return result;
}