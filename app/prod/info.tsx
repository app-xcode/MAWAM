import { hapusProduk } from "@/app/prod/dataProduk"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import ConfirmModal from "@/components/ui/ConfirmModal"
import { BackgroundImage } from "@/components/ui/background-image"
import { ImageLoad } from "@/components/ui/Imageload"
import Alerts from "@/constants/Alerts"
import { copyText } from "@/constants/copyText"
import { formatDisukai } from "@/constants/formatDisukai"
import { isNoHp, nohptowa } from "@/constants/isNoHp"
import { addToCart } from "@/constants/kelolaCart"
import { rupiah } from "@/constants/rupiah"
import { Colors } from '@/constants/theme'
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/utils/auth"
import { useCart } from "@/utils/CartContext"
import { useLikes } from "@/utils/LikeContext"
import { useTheme } from "@/utils/theme"
import Ionicons from "@expo/vector-icons/Ionicons"
import { encode as btoa } from "base-64"
import { Link, router, Stack } from "expo-router"
import * as Sharing from 'expo-sharing'
import React, { useEffect, useState } from "react"
import { Dimensions, Platform, Share, StyleSheet, TouchableOpacity, View } from "react-native"
import Carousel from 'react-native-reanimated-carousel'
const imageDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';

const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;
const width = Dimensions.get('window').width;

export default function InfoProduk({ data, setShowImage, setRatio }: any) {
    const { isDark } = useTheme();
    const iconColor = !isDark ? ColorDark : ColorLight;
    const iconSize = 24;
    const { user } = useAuth();
    const [bisaShare, setBisaShare] = useState(false);
    const [albums, setalbums] = useState<any[]>([]);
    const [active, setActive] = useState(0);
    const { likes, loadLikes } = useLikes();
    const [LikeProduk, setLikeProduk] = useState(likes.has(data.id));
    const [jumlahLike, setJumlahLike] = useState(0);
    const [pemilik, setPemilik] = useState(false);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewCount, setReviewCount] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const { loadCart } = useCart();
    const { cart } = useCart();


    useEffect(() => {
        if (user && data) {
            setPemilik(user.id == data.mawam_toko.user_id)
        }
        if (data) {
            setJumlahLike(data?.jumlah_like ?? 0);
            if (data?.album) {
                setalbums([data?.gambar_produk, ...data?.album])
            } else {
                setalbums([data?.gambar_produk])
            }
        }
    }, [user, data])

    useEffect(() => {
        let active = true;
        const loadReviews = async () => {
            if (!data?.id) return;
            const { data: reviewData, count, error } = await supabase
                .from('mawam_product_reviews')
                .select('id, buyer_id, rating, review, image_url, image_urls, created_at', { count: 'exact' })
                .eq('product_id', data.id)
                .order('created_at', { ascending: false })
                .limit(3);
            if (!error && active) {
                const buyerIds = [...new Set((reviewData ?? []).map((review: any) => review.buyer_id).filter(Boolean))];
                const { data: profiles } = buyerIds.length ? await supabase.from('mawam_profile').select('id, nama').in('id', buyerIds) : { data: [] };
                const names = new Map((profiles ?? []).map((profile: any) => [profile.id, profile.nama]));
                setReviews((reviewData ?? []).map((review: any) => ({ ...review, buyerName: names.get(review.buyer_id) || 'Pembeli' })));
                setReviewCount(count ?? 0);
                const { data: ratings } = await supabase.from('mawam_product_reviews').select('rating').eq('product_id', data.id);
                const average = ratings?.length ? ratings.reduce((total: number, item: any) => total + Number(item.rating || 0), 0) / ratings.length : 0;
                setAverageRating(average);
            }
        };
        void loadReviews();
        return () => { active = false; };
    }, [data?.id]);

    const reviewImages = (review: any): string[] => review?.image_urls?.length ? review.image_urls : (review?.image_url ? [review.image_url] : []);

    Sharing.isAvailableAsync().then((available) => {
        setBisaShare(available);
    })
    const encode = (id: string) => {
        id = btoa(id)
        id = id.replace(/=/g, 'X')
        return id;
    }
    const generateUrl = (id: number) => {
        const domain = 'https://mawam.expo.app/share';
        return domain + '/' + encode(id.toLocaleString());
    }
    const onShare = async (url: string) => {
        try {
            // 1. Cek ketersediaan Sharing API
            const isAvailable = await Sharing.isAvailableAsync();

            if (Platform.OS === 'web') {
                if (isAvailable && navigator.share) {
                    // Menggunakan Web Share API bawaan browser
                    await navigator.share({
                        title: 'Produk MawaM',
                        url: url,
                    });
                } else {
                    copyText(url, 'Url telah disalin')
                    // https://mawam.expo.app/share/YjE3OWViYmMtZTBlMS00NzVkLWIzNzktY2ZlOWI4MDhiNTMy
                }
            } else {
                // 2. Untuk Android & iOS (Mobile)
                // Gunakan Share dari 'react-native' untuk link/teks 
                // karena shareAsync lebih dikhususkan untuk URI file lokal
                await Share.share({
                    message: `Berikut link produk yang menarik:` + (Platform.OS === 'android' ? url : ''),
                    url: url, // Khusus iOS
                });
            }
        } catch (error) {
            console.error("Gagal berbagi:", error)
        }
    };

    const handleHapus = (id: number) => {
        setPendingDeleteId(id);
    }
    const handleCart = async (produk: any) => {
        try {
            await addToCart(produk.id);
            Alerts("Produk ditambahkan ke keranjang.", "success");
        } catch (e: any) {
            Alerts("Produk gagal ditambahkan.", "error");
        }
        user && loadCart(user)
    }


    const toggleLike = async () => {

        try {
            // optimistik UI (langsung berubah duluan biar smooth)
            setLikeProduk(prev => !prev);
            setJumlahLike(prev => LikeProduk ? prev - 1 : prev + 1);

            const res = await supabase.rpc("toggle_favorit", {
                p_id_produk: data?.id
            });

            if (res.error) {
                // rollback kalau gagal
                setTimeout(() => {
                    setLikeProduk(prev => !prev);
                    setJumlahLike(prev => LikeProduk ? prev + 1 : prev - 1);
                }, 2000)
            }
            user && loadLikes(user)

        } catch (err) {
            console.log(err);
        }
    };

    return (
        <>
        <ConfirmModal visible={pendingDeleteId !== null} title="Hapus produk?" message="Produk yang dihapus tidak dapat dikembalikan." confirmText="Hapus" variant="destructive" onCancel={() => setPendingDeleteId(null)} onConfirm={async () => { if (pendingDeleteId === null) return; hapusProduk(pendingDeleteId, () => { setPendingDeleteId(null); router.dismissAll(); router.navigate('/produk?aksi=delete&id=' + pendingDeleteId); }); }} />
        <React.Fragment>
            <Stack.Screen options={{
                title: 'Detail Produk', headerRight: () => (
                    <TouchableOpacity onPress={() => {
                        router.replace('/cart')
                    }} style={{ position: 'relative', marginRight: 30 }}><Ionicons name="cart-outline" size={24} color={iconColor} />
                        {cart && cart.length > 0 && <View style={{ position: 'absolute', backgroundColor: '#ff4a1c', width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', right: -3, top: -3, opacity: 0.9 }}>
                            <ThemedText style={{ color: '#ffffff', fontSize: cart.length < 99 ? 12 : 6 }} numberOfLines={1}>{cart.length < 99 ? cart.length : '99+'}</ThemedText>
                        </View>}
                    </TouchableOpacity>
                )
            }} />


            <View style={{ position: 'relative' }}>
                <Carousel
                    onSnapToItem={(index) => setActive(index)}
                    width={width < 500 ? width - 20 : 500 - 20}
                    height={250}
                    autoPlay={albums.length > 1}
                    data={albums}
                    autoPlayInterval={6000}
                    enabled={albums.length > 1}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    renderItem={({ item, index }: any) => (
                        <View>
                            <BackgroundImage style={{ width: '100%', height: 250, marginBottom: 0, overflow: 'hidden', backgroundColor: '#c3c2c233', position: 'relative' }}
                                source={{
                                    uri:
                                        (item?.startsWith('https://') ?
                                            'https://cros-image.vercel.app/?quest=' + encodeURIComponent(item) + '&size=50' : item) ||
                                        imageDefault
                                }}
                                bgStyle={{ filter: `blur(10px) brightness(0.9)`, objectFit: 'cover', blurRadius: 10 }}
                            >
                                <ImageLoad
                                    contentFit="contain"
                                    source={{
                                        uri:
                                            item ||
                                            imageDefault
                                    }}
                                    style={[styles.image, { pointerEvents: 'none' }]}

                                    onLoad={(e: any) => {

                                        let w = 0;
                                        let h = 0;

                                        if (e?.source) {
                                            // Expo Image (lebih aman)
                                            w = e.source.width ?? 0;
                                            h = e.source.height ?? 0;
                                        }

                                        if (w && h) setRatio(w / h);
                                    }}
                                />
                                <TouchableOpacity
                                    style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: 10,
                                        padding: 8,
                                    }}
                                    onPress={() => setShowImage(item)}
                                >
                                    <Ionicons
                                        name="expand-outline"
                                        size={24}
                                        color="#fff"
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: 40,
                                        padding: 8,
                                    }}
                                    onPress={() => {
                                        onShare(generateUrl(data.id));
                                    }}
                                >
                                    <Ionicons
                                        name="share-outline"
                                        size={24}
                                        color="#fff"
                                    />
                                </TouchableOpacity>
                               {albums.length > 1 && <ThemedView style={{ position: 'absolute', paddingHorizontal: 8, borderRadius: 8, bottom: 10, right: 10 }}>
                                    <ThemedText style={{ fontSize: 11 }}>{index + 1}/{albums.length}</ThemedText>
                                </ThemedView>}
                            </BackgroundImage>
                        </View>
                    )}
                />
               {albums.length > 1 && <View style={{ bottom: 0, padding: 8, position: 'absolute', alignItems: 'center', width: '100%' }}>
                    <View style={{ flexDirection: 'row', gap: 1 }}>
                        {albums.map((_, i) => (
                            <ThemedView
                                key={i}
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    opacity: active === i ? 1 : 0.3,
                                }}
                            />
                        ))}
                    </View>
                </View>}
            </View>

            <ThemedView style={[styles.row, { marginTop: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                    <View style={{ borderRadius: 3, backgroundColor: isDark ? ColorLight : ColorDark, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <ThemedText style={{ fontSize: 12, color: isDark ? ColorDark : ColorLight }}>New</ThemedText>
                    </View>
                    <ThemedText style={{ fontWeight: '500', fontSize: 18 }}>{data.nama_produk}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => {
                    !user && Alerts("Login untuk tambahkan produk favorit", "error")
                    user && toggleLike()
                }} style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                    <View style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 2 }}>
                        <ThemedText style={{ fontSize: 13 }}>
                            {data?.terjual > 0 ? data?.terjual + ' Terjual' : ''}
                        </ThemedText>
                        <View style={{ borderWidth: 0, marginLeft: 4, borderRadius: '50%', padding: 2, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons
                                name={LikeProduk ? "heart" : "heart-outline"}
                                size={17}
                                color={LikeProduk ? '#ff00a8' : iconColor}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.row}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1, maxWidth: '80%' }}>
                        <ThemedText
                            style={{
                                fontSize: 15,
                            }}
                        >
                            Rp
                        </ThemedText>
                        <ThemedText
                            type="title"
                            style={{
                                fontSize: 20,
                            }}
                        >
                            {rupiah(data.discount ? (data.harga - (data.harga * (data.discount / 100))) : data.harga, '')}
                        </ThemedText>
                    </View>
                    {data.discount > 0 &&
                        <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                            <ThemedText style={{ fontSize: 13, marginLeft: 4, textDecorationLine: 'line-through', opacity: 0.8 }}>
                                {rupiah(data.harga, 'Rp')}
                            </ThemedText>
                        </View>}
                </View>
                {
                    data.discount > 0 && <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center', backgroundColor: '#00ff772f', paddingHorizontal: 4, borderRadius: 4 }}>
                        <Ionicons
                            name="ticket-outline"
                            size={16}
                            color={'#05a852'}
                        />
                        <ThemedText style={{ fontSize: 13, color: '#05a852', fontWeight: '600' }}>
                            Diskon -{data.discount}%
                        </ThemedText>
                    </View>
                }
            </ThemedView>
            <ThemedView style={[styles.row, { backgroundColor: '#ffba004f', borderWidth: 1, borderColor: '#ffa600ff' }]}>
                <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center', borderRadius: 8, }}>
                    <Ionicons
                        name="star"
                        size={iconSize}
                        color={'#ffa600ff'}
                    />

                    <ThemedText style={{ fontSize: 14, marginLeft: 20 }}>
                        {/* 4.5 • 235 ulasan */}
                        {reviewCount ? `${averageRating.toFixed(1)} • ${reviewCount} ulasan` : 'Belum ada ulasan'}
                    </ThemedText>
                </View>
                <ThemedView style={{ flexDirection: 'row', gap: 1, alignItems: 'center', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 }}>
                    <Ionicons
                        name="heart-outline"
                        size={17}
                        color={iconColor}
                    />

                    <ThemedText style={{ fontSize: 12, marginLeft: 4 }}>
                        {formatDisukai(jumlahLike)}
                    </ThemedText>
                </ThemedView>
            </ThemedView>
            <ThemedView style={styles.row}>
                <Ionicons name="business-outline" size={iconSize} color={iconColor} />
                <ThemedText style={styles.meta}>Toko</ThemedText>

                <ThemedText style={styles.metas}>
                    {data?.mawam_toko?.nama_toko ?? '-'}
                </ThemedText>
            </ThemedView>
            <ThemedView style={styles.row}>
                <Ionicons name="cash-outline" size={iconSize} color={iconColor} />
                <ThemedText style={styles.meta}>Harga</ThemedText>

                <ThemedText style={[styles.metas]}>
                    {data?.harga
                        ? `${rupiah(data.discount ? (data.harga - (data.harga * (data.discount / 100))) : data.harga, 'Rp')} / ${data?.satuan ?? 'unit'}`
                        : '-'}
                </ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
                <Ionicons name="scale-outline" size={iconSize} color={iconColor} />

                <ThemedText style={styles.meta}>Berat</ThemedText>

                <ThemedText style={styles.metas}>
                    {data?.berat_per_unit
                        ? `${data.berat_per_unit} ${data?.satuan ?? ''}`
                        : '-'}
                </ThemedText>
            </ThemedView>

            <ThemedView style={styles.row}>
                <Ionicons name="cube-outline" size={iconSize} color={iconColor} />
                <ThemedText style={styles.meta}>Stok</ThemedText>

                <ThemedText style={styles.metas}>
                    {Number(data?.stok) > 0
                        ? `Tersedia ${data.stok} ${data.satuan}`
                        : 'Produk habis'}
                </ThemedText>
            </ThemedView>
            <ThemedView
                style={{
                    marginTop: 2,
                    paddingHorizontal: 10,
                    paddingVertical: 10,
                    borderRadius: 8,
                }}
            >
                <ThemedText
                    type="defaultSemiBold"
                    style={{ marginBottom: 4 }}
                >
                    Deskripsi Produk
                </ThemedText>

                <ThemedText style={styles.desc}>
                    {data?.deskripsi?.trim() || 'Tidak ada deskripsi tambahan'}
                </ThemedText>
            </ThemedView>
            <ThemedView style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                    <ThemedText type="defaultSemiBold">Penilaian Produk</ThemedText>
                    {reviewCount > 3 && <TouchableOpacity onPress={() => router.push({ pathname: '/prod/penilaian', params: { productId: data.id, productName: data.nama_produk } })}>
                        <ThemedText style={{ color: iconColor, fontWeight: '600' }}>{reviewCount > 3 ? 'Lihat Semua' : 'Lihat Penilaian'}</ThemedText>
                    </TouchableOpacity>}
                </View>
                {reviews.length === 0 ? <ThemedText style={styles.emptyReview}>Belum ada penilaian untuk produk ini.</ThemedText> : reviews.map((review) => {
                    const images = reviewImages(review);
                    return <View key={review.id} style={styles.reviewCard}>
                        <View style={styles.reviewRating}><ThemedText style={styles.reviewerName}>{review.buyerName}</ThemedText>{[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={15} color="#F59E0B" />)}<ThemedText style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('id-ID')}</ThemedText></View>
                        {!!review.review && <ThemedText style={styles.reviewText}>{review.review}</ThemedText>}
                        {images.length > 0 && <View style={styles.reviewPhotos}>{images.slice(0, 3).map((image: string) => <ImageLoad key={image} source={{ uri: image }} style={styles.reviewPhoto} />)}</View>}
                    </View>;
                })}
            </ThemedView>
            <ThemedView style={{ borderRadius: 8, marginVertical: 8, padding: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <ImageLoad style={{ width: 60, height: 60, borderRadius: '50%' }} contentFit="contain"
                            source={{
                                uri: data.mawam_toko.gambar_toko || imageDefault
                            }} />
                        <View>
                            <ThemedText style={{ fontWeight: '500', fontSize: 15 }}>{data.mawam_toko.nama_toko}</ThemedText>
                            <ThemedText style={{ fontSize: 11 }}>Aktif 1 jam lalu</ThemedText>
                            <ThemedText style={{ fontSize: 11 }}>{data.mawam_toko.alamat_toko}</ThemedText>
                        </View>
                    </View>
                    <View style={{ gap: 4, flexDirection: 'row' }}>
                        {
                            !pemilik &&
                            data?.mawam_toko?.mawam_profile?.no_hp && isNoHp(data?.mawam_toko?.mawam_profile?.no_hp) && <Link target="_blank" href={encodeURI('https://api.whatsapp.com/send?phone=' + nohptowa(data?.mawam_toko?.mawam_profile?.no_hp) + '&text=Halo Admin, Saya mau menanyakan tentang produk ' + data.nama_produk)} style={{ borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderColor: iconColor, flexDirection: 'row', gap: 2 }}>
                                <Ionicons name="logo-whatsapp" size={18} color={iconColor} />
                                <ThemedText style={{ textAlign: 'center' }}> Chat</ThemedText>
                            </Link>}
                        <TouchableOpacity onPress={() => {
                            router.navigate({
                                pathname: '/toko/detail',
                                params: {
                                    toko: data.toko_id
                                }
                            })
                        }} style={{ borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderColor: iconColor }}>
                            <ThemedText style={{ textAlign: 'center' }}>{pemilik ? 'Toko Saya' : 'Kunjungi'}</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8 }}>
                    <View style={{ alignItems: 'center', width: '33.3%', }}>
                        <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{data.mawam_toko.rating_toko}</ThemedText>
                        <ThemedText style={{ fontSize: 12 }}>Penilaian</ThemedText>
                    </View>
                    <View style={{ alignItems: 'center', width: '33.3%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#8b8b8b7c' }}>
                        <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{data.mawam_toko?.total_produk ?? 0}</ThemedText>
                        <ThemedText style={{ fontSize: 12 }}>Produk</ThemedText>
                    </View>
                    <View style={{ alignItems: 'center', width: '33.3%', }}>
                        <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>{data.mawam_toko.orderan ?? 0}</ThemedText>
                        <ThemedText style={{ fontSize: 12 }}>Orderan</ThemedText>
                    </View>
                </View>
            </ThemedView>
            <ThemedView style={{ flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 10, }}>
                {
                    !user && (<Link style={[{
                        width: '33%', flexDirection: 'row',
                        display: 'flex',
                        justifyContent: 'center', gap: 4
                    }, styles.button]}
                        target="_blank" href={encodeURI('https://api.whatsapp.com/send?phone=' + nohptowa(data?.mawam_toko?.mawam_profile?.no_hp) + '&text=Halo Admin, Saya mau menanyakan tentang produk ' + data.nama_produk)}
                    >
                        <Ionicons name="chatbox-outline" size={18} color={ColorLight} />
                        <ThemedText style={styles.buttonText} numberOfLines={1}>Chat</ThemedText>
                    </Link>)
                }
                {
                    !user && (<TouchableOpacity
                        style={[{ width: '33%', flexDirection: 'row', justifyContent: 'center', gap: 4 }, styles.button]}
                        onPress={() => {
                            Alerts('Login untuk mulai berbelanja.');
                            // router.navigate('akun/')
                        }}
                    >
                        <Ionicons name="cart-outline" size={18} color={ColorLight} />
                        <ThemedText style={styles.buttonText} numberOfLines={1}>Tambah</ThemedText>
                    </TouchableOpacity>)
                }
                {
                    user && !pemilik && (
                        <React.Fragment>
                            <TouchableOpacity style={[{ width: '46%' }, styles.button]} onPress={() => {
                                handleCart(data)
                            }}>
                                <ThemedText style={styles.buttonText} numberOfLines={1}>
                                    <Ionicons name="cart-outline" size={18} color={ColorLight} /> Tambah</ThemedText>
                            </TouchableOpacity>
                            <Link style={[{ width: '23%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', display: 'flex', gap: 4 }, styles.button]}
                                target="_blank" href={encodeURI('https://api.whatsapp.com/send?phone=' + nohptowa(data?.mawam_toko?.mawam_profile?.no_hp) + '&text=Halo Admin, Saya mau menanyakan tentang produk ' + data.nama_produk)}
                            >
                                <Ionicons name="chatbox-outline" size={18} color={ColorLight} />
                                <ThemedText style={styles.buttonText} numberOfLines={1}>Chat</ThemedText>
                            </Link>
                        </React.Fragment>
                    )
                }

                <TouchableOpacity style={[{ width: user ? '23%' : (bisaShare ? '30%' : '33%') }, styles.button]} onPress={() => router.back()}>
                    <ThemedText style={styles.buttonText} numberOfLines={1}>Tutup</ThemedText>
                </TouchableOpacity>
                {
                    user && pemilik && (
                        <React.Fragment>
                            <TouchableOpacity style={[{ width: '23%' }, styles.button]} onPress={() => {
                                onShare(generateUrl(data.id))
                            }}>
                                <ThemedText style={styles.buttonText} numberOfLines={1}>Bagikan</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { width: '23%', backgroundColor: '#aa7400cc' }]} onPress={() => {
                                router.replace('/prod/form?id=' + data.id)
                            }}>
                                <ThemedText style={styles.buttonText} numberOfLines={1}>Edit</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { width: '23%', backgroundColor: '#aa0000cc' }]} onPress={() => { handleHapus(data.id) }}>
                                <ThemedText style={styles.buttonText} numberOfLines={1}>Hapus</ThemedText>
                            </TouchableOpacity>
                        </React.Fragment>
                    )
                }

            </ThemedView>
            <ThemedView style={{ marginBottom: 80 }}></ThemedView>
        </React.Fragment>
        </>
    )
}

const styles = StyleSheet.create({

    desc: {
        marginVertical: 5,
        lineHeight: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 2,
        borderRadius: 5,
        width: '100%',
        justifyContent: 'space-between',
        overflow: 'hidden'
    },
    meta: {
        fontWeight: '400',
        width: '30%'
    },
    metas: {
        opacity: 0.8,
        width: '55%',
        textAlign: 'right'
    },
    image: {
        width: '100%',
        height: 250,
        backgroundColor: 'transparent',
        objectFit: 'contain',
    },
    button: {
        backgroundColor: ColorDark,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    buttonText: {
        color: ColorLight,
        fontWeight: '600',
        textAlign: 'center'
    },
    reviewSection: { borderRadius: 8, marginVertical: 8, padding: 10, gap: 8 },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    emptyReview: { opacity: 0.65, paddingVertical: 8 },
    reviewCard: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#88888855', paddingTop: 9, gap: 5 },
    reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    reviewerName: { fontWeight: '600', marginRight: 6 },
    reviewDate: { marginLeft: 7, opacity: 0.6, fontSize: 11 },
    reviewText: { lineHeight: 19 },
    reviewPhotos: { flexDirection: 'row', gap: 7, marginTop: 3 },
    reviewPhoto: { width: 72, height: 72, borderRadius: 6 },
})
