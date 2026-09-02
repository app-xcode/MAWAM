import { supabase } from '@/lib/supabase'

export type CheckoutShipping = {
    target_toko: string
    courier_code?: string | null
    courier_name?: string | null
    service?: string | null
    shipping_cost?: number | null
    estimated_days?: string | null
    type?: string | null
    weight?: number | string | null
    origin?: string | { kode?: string | null } | null
    destination?: string | { kode?: string | null } | null
    penerima?: string | null
    telepon_penerima?: string | null
    alamat_penerima?: string | null
}

export async function createMawamCheckout({
    cartIds,
    paymentMethod,
    bank,
    shipping,
}: {
    cartIds: Array<number | string>
    paymentMethod: string
    bank?: string | null
    shipping: CheckoutShipping[]
}) {
    const normalizedCartIds = cartIds.map((id) => Number(id))

    if (normalizedCartIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        throw new Error('ID keranjang tidak valid')
    }

    const shippingPayload = shipping.map((item) => ({
        ...item,
        origin: typeof item.origin === 'object' && item.origin !== null
            ? item.origin.kode ?? null
            : item.origin ?? null,
        destination: typeof item.destination === 'object' && item.destination !== null
            ? item.destination.kode ?? null
            : item.destination ?? null,
        weight: item.weight == null || item.weight === '' ? null : Number(item.weight),
    }))

    const { data, error } = await supabase.rpc('create_mawam_checkout', {
        p_cart_ids: normalizedCartIds,
        p_payment_method: paymentMethod,
        p_bank: bank ?? null,
        p_shipping: shippingPayload,
    })

    if (error) throw error
    if (!data?.payment_id) throw new Error('Payment ID tidak ditemukan')

    return data
}