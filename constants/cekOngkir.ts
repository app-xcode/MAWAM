export async function cekOngkir(origin = '85111', destination = '84111', items = [
  {
    name: "Produk",
    description: "Contoh produk",
    value: 100000,
    weight: 1000,
    length: 10,
    width: 10,
    height: 10,
    quantity: 1
  }

]) {
  // const kurirs = ['jne', 'jntcargo', 'jnt', 'sicepat', 'pos'];
  const kurirs = ['jne', 'jntcargo', 'jnt', 'sicepat'];
  let returns: any = [];
  const ongkir = await cek(kurirs.join(','), origin.toString(), destination.toString(), items);
  if (ongkir && ongkir.length) {
    ongkir.map((items: any) => {
      const maps = [{
        code: items.company || items.courier_code,
        name: items.courier_name,
        estimated: items.duration.replace(/days/g, 'hari'),
        price: items.price,
        // service:items.courier_service_code,
        service: items.courier_service_name,
        // type: items.service_type,
        type: items.type,
        description: items.description,
      }]
      returns = [...returns, ...maps]
    })
  }
  return returns;
}

export async function cek(couriers = 'jne', origin_postal_code = '85111', destination_postal_code = '85111', items:any = []) {
  type Courier = "jne" | "sicepat" | "pos";

  const allowServices: Record<Courier, string[]> = {
    jne: ["REG", "JTR"],
    // jnt: ["EZ"],
    sicepat: ["REG", "BEST"],
    pos: ["Pos Reguler", "Pos Kargo Barang"],
  };
  const body = {
    type: "rates",
    origin_postal_code,
    destination_postal_code,
    couriers,
    items
  }

  const res = await fetch(
    "https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/biteship",
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

  if (response.code == 20001003) {
    const ongkir = response?.pricing;
    // const ongkir = response?.data?.pricing?.flatMap((kurir: any) => {
    //   const code = kurir.courier_code as Courier;
    //   return kurir.courier_service_code.filter((service: any) =>
    //     allowServices[code]?.includes(service)
    //   );
    // });
    return ongkir;
  }
  return [];
}

