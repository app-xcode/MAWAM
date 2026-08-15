export async function cekOngkir(origin = 'village_52.72.05.1001', destination = 'village_53.71.04.1013', weight = 1000) {
  const kurirs = ['jne', 'pos', 'sicepat'];
  // const kurirs = ['jne', 'jnt', 'pos', 'sicepat'];
  let returns: any = [];
  for (const kurir of kurirs) {
    const ongkir = await cek(kurir, origin, destination, weight);
    returns = [...returns, ...ongkir]
  }
  return returns;
}

export async function cek(courier = 'jne', origin = 'village_52.72.05.1001', destination = 'village_53.71.04.1013', weight = 1000) {
  type Courier = "jne" | "sicepat" | "pos";
  // type Courier = "jne" | "jnt" | "sicepat" | "pos";

  const allowServices: Record<Courier, string[]> = {
    jne: ["REG", "JTR"],
    // jnt: ["EZ"],
    sicepat: ["REG", "BEST"],
    pos: ["Pos Reguler", "Pos Kargo Barang"],
  };
  const body = {
    type: "cost",
    courier: courier,
    origin: origin,
    destination: destination,
    weight: weight,
  }
  const res = await fetch(
    "https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/shipping-binderbyte",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const respon = await res.json();
  const response = respon?.success ? respon.data : { code: 404 };

  if (response.code == "200") {
    const ongkir = response.data.results.flatMap((kurir: any) => {
      const code = kurir.code as Courier;
      return kurir.costs.filter((service: any) =>
        allowServices[code]?.includes(service.service)
      );
    });
    return ongkir;
  } else {
    // console.log(respon, body)
  }
  return [];
}

