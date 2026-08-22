import { ActivityIndicator, FlatList, StyleProp, StyleSheet, TextInput, TextStyle, TouchableOpacity } from 'react-native'

import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Fonts } from '@/constants/theme'

import { ImageLoad } from '@/components/ui/Imageload'
import { rupiah } from '@/constants/rupiah'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { ClearProduk, produkCache } from '@/utils/cache'
import { useTheme } from '@/utils/theme'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useCart } from '@/utils/CartContext'
import { useLikes } from '@/utils/LikeContext'
import { isProdukBaru } from '@/constants/isProdukBaru'
const imageDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';


export default function ProdukScreen() {
    interface Produk {
        id: string;
        toko_id: string;
        nama_produk: string;
        harga: number;
        stok: number;
        satuan: string;
        berat_per_unit: number;
        deskripsi: string;
        gambar_produk: string;
    }

    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const [produk, setProduk] = useState<Produk[]>([]);
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [showSearch, setShowSearch] = useState(false)
    const [querys, setQuerys] = useState('')
    const [statusLoad, setStatusLoad] = useState('Memuat...')
    const router = useRouter()
    const { q, aksi, id } = useLocalSearchParams()
    const iconColor = Colors[colorScheme ?? 'light'].tint;
    const ColorDark = Colors['light'].tint;
    const ColorLight = Colors['dark'].tint;
    const BgDark = Colors['light'].background;
    const BgLight = Colors['dark'].background;
    const { user } = useAuth();
    const delaySearch = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useRef(true);
    const [loading, setLoading] = useState(false);
    const isFetchingMore = useRef(false);
    const requestId = useRef(0);
    const [isExporting, setIsExporting] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [filterPro, setFilterPro] = useState('Populer');
    const [hargaAsc, setHargaAsc] = useState(true);
    const [myLikes, setMyLikes] = useState(false);
    const { cart } = useCart();
    const { likes } = useLikes();

    const LIMIT = 6
    const getInputStyle = (colorScheme: 'light' | 'dark'): StyleProp<TextStyle> => ({
        flex: 1,
        color: colorScheme === 'light' ? ColorDark : ColorLight,
        backgroundColor: colorScheme === 'dark' ? ColorDark : ColorLight,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colorScheme === 'light' ? ColorDark : ColorLight,
        width: '90%'
    });

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);


    // useEffect jadi lebih bersih
    useEffect(() => {
        if (aksi === 'reload') {
            ClearProduk();
            router.setParams({ aksi: '' });
            resetAndFetch();
        }
        else if (aksi === 'cari') {
            resetAndFetch();
        }
        else if (aksi === 'delete' && id) {
            setProduk(prev => prev.filter(item => item.id !== id));
            router.setParams({ aksi: 'not', id: '' });
        }
        else if (aksi === 'edit' && id) {
            // Ambil data kiriman dari screen edit
            (async () => {
                let { data: updatedData } = await supabase.from('mawam_produk').select(`*, mawam_toko:toko_id(*)`).eq('id', id).single();
                if (updatedData) {
                    setProduk(prev => prev.map(item => item.id === id ? { ...item, ...updatedData } : item));
                    produkCache[updatedData.id] = updatedData;
                    router.setParams({ aksi: 'not', id: '' });
                }
            })();
        }
        else if (aksi === 'tambah' && id) {
            // Tambah ke paling atas agar langsung terlihat
            (async () => {
                let { data: newData } = await supabase.from('mawam_produk').select(`*, mawam_toko:toko_id(*)`).eq('id', id).single();
                if (newData) {
                    setProduk(prev => [newData, ...prev]);
                    produkCache[newData.id] = newData;
                    router.setParams({ aksi: 'not', id: '' });
                }
            })();
        }
        else if (aksi !== 'not' && aksi !== '') {
            resetAndFetch();
        }
    }, [q, aksi, id]); // Tambahkan id dan data sebagai dependency


    useEffect(() => {
        setShowGrid(!myLikes)
    }, [myLikes])
    useEffect(() => {
        if (delaySearch.current) clearTimeout(delaySearch.current);
        delaySearch.current = setTimeout(() => {
            router.setParams({ q: querys.trim(), aksi: 'cari' });
        }, 400);

        return () => {
            if (delaySearch.current) clearTimeout(delaySearch.current);
        };
    }, [querys]);


    /* const fetchIds = () => {
        if (delayProduk.current) clearTimeout(delayProduk.current);
        delayProduk.current = setTimeout(async () => {
            // console.log('fetchIds ' + (Date.now().toLocaleString() || ''));
            if (isFetchingIds.current) return;
            isFetchingIds.current = true; // Set true di sini
            setLoading(true);
            try {
                // const keyword = q as string | undefined;
                // let idTokos = [];

                let query = supabase
                    .from('mawam_produk')
                    .select(`id`)
                // if (!user) {
                //     query = query.gt('stok', 0);
                // }
                if (myLikes) {
                    query = query.in('id', [...likes]);
                }
                if (typeof q == 'string' && q?.trim()) {
                    query = query.or(
                        `nama_produk.ilike.%${q}%,deskripsi.ilike.%${q}%`
                    );
                }

                const { data, error } = await query;

                if (!isMounted.current) return; // ⛔ cegah crash
                if (error) {
                    // console.error(error)
                    setStatusLoad('Gagal memuat data')
                } else {
                    // console.log('fetchIds1', data)
                    setAllIds(data?.map(item => item.id) || [])
                    setPage(0);
                }
            } catch (error) {
                console.error(error);
                setStatusLoad('Gagal memuat data');
            }
            finally {
                isFetchingIds.current = false; // Set false setelah selesai
                setLoading(false);
            }
        }, 500)
    }

    useEffect(() => {
        router.setParams({ aksi: 'reload' });
    }, [filterPro, myLikes]);

    const fetchMore = async () => {
        setStatusLoad("Memuat...")
        // console.log('fetchMore')
        if (isFetchingMore.current) return;
        isFetchingMore.current = true;
        setLoading(true);
        try {
            // if (allIds.length === 0) return;
            const start = page * LIMIT;
            const end = start + LIMIT;

            if (start >= allIds.length) return;

            const ids = allIds.slice(start, end);

            const results: any[] = [];

            const cached = ids.map(id => produkCache[id]).filter(Boolean);
            if (cached.length === ids.length) {
                results.push(...cached);
            } else {
                let query = supabase
                    .from('mawam_produk')
                    .select(`*, mawam_toko(*)`)
                    .in('id', ids)

                if (filterPro == "Populer") {
                    query = query.order("view", { ascending: false });
                }
                else if (filterPro == "Terbaru") {
                    query = query.order("created_at", {
                        ascending: false,
                    });
                }
                else if (filterPro == "Terlaris") {
                    query = query.order("terjual", {
                        ascending: false,
                    });
                }
                else if (filterPro == "Harga") {
                    query = query.order("harga", {
                        ascending: hargaAsc,
                    });
                } else {
                    query = query.order('created_at', { ascending: false })
                }
                const { data, error } = await query;

                if (error) {
                    setStatusLoad("Gagal get Toko");
                    return;
                }

                if (data) {
                    const flatData = data?.map(item => ({
                        ...item,
                    })) || [];

                    flatData.forEach(item => {
                        produkCache[item.id] = item;
                        results.push(item);
                    });
                }
            }

            if (!isMounted.current) return;

            setProduk(prev => {
                const existingIds = new Set(prev.map(item => item.id));
                const filtered = results.filter(item => !existingIds.has(item.id));
                return [...prev, ...filtered];
            });

            setPage(prev => prev + 1);

        }
        catch (error) {
            console.error(error);
            setStatusLoad("Gagal memuat data");
        }
        finally {
            isFetchingMore.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        if (allIds.length > 0) {
            fetchMore()
        }
    }, [allIds]) */

    const fetchMore = async (pageToLoad = page, replace = false) => {
        if ((isFetchingMore.current && !replace) || (!hasMore && !replace)) return;

        const currentRequestId = replace ? ++requestId.current : requestId.current;
        isFetchingMore.current = true;
        setLoading(true);
        setStatusLoad('Memuat...');

        try {
            if (myLikes && likes.size === 0) {
                if (replace) setProduk([]);
                setHasMore(false);
                return;
            }

            const start = pageToLoad * LIMIT;
            let query: any = supabase
                .from('mawam_produk')
                .select('*, mawam_toko(*)');

            if (myLikes) query = query.in('id', [...likes]);
            if (typeof q === 'string' && q.trim()) {
                query = query.or(`nama_produk.ilike.%${q}%,deskripsi.ilike.%${q}%`);
            }

            if (filterPro === 'Populer') query = query.order('view', { ascending: false });
            else if (filterPro === 'Terbaru') query = query.order('created_at', { ascending: false });
            else if (filterPro === 'Terlaris') query = query.order('terjual', { ascending: false });
            else if (filterPro === 'Harga') query = query.order('harga', { ascending: hargaAsc });
            else query = query.order('created_at', { ascending: false });

            const { data, error } = await query
                .order('id', { ascending: false })
                .range(start, start + LIMIT - 1);

            if (currentRequestId !== requestId.current || !isMounted.current) return;
            if (error) {
                setStatusLoad('Gagal memuat produk');
                return;
            }

            const results = data || [];
            results.forEach((item: any) => { produkCache[item.id] = item; });
            setProduk((prev) => replace ? results : [...prev, ...results]);
            setPage(pageToLoad + 1);
            setHasMore(results.length === LIMIT);
        } catch (error) {
            console.error(error);
            setStatusLoad('Gagal memuat produk');
        } finally {
            if (currentRequestId === requestId.current) {
                isFetchingMore.current = false;
                setLoading(false);
            }
        }
    };

    const resetAndFetch = () => {
        setProduk([]);
        setPage(0);
        setHasMore(true);
        setStatusLoad('Memuat...');
        fetchMore(0, true);
    };

    useEffect(() => {
        router.setParams({ aksi: 'reload' });
    }, [filterPro, myLikes, hargaAsc]);

    const renderItem = ({ item }: any) => {
        const isLiked = likes.has(item.id);
        const pemilik = user && item?.mawam_toko?.user_id === user.id
        return (
            <Link
                href={{
                    pathname: "/prod/detail",
                    params: { id: item.id }
                }}
                asChild
                style={{ marginHorizontal: 4, marginVertical: showGrid ? 4 : 2, backgroundColor: isDark ? BgLight : BgDark, position: 'relative' }}
            >
                <TouchableOpacity style={showGrid ? { width: '48%', borderRadius: 8, overflow: 'hidden', } : styles.card}>
                    <ImageLoad
                        source={item.gambar_produk && item.gambar_produk != '' && item.gambar_produk.startsWith('http')
                            ? { uri: item.gambar_produk } : {uri:imageDefault}}
                        style={[{ borderRadius: 10, backgroundColor: isDark ? BgLight : BgDark }, showGrid ? { width: '100%', height: 200 } : styles.image]}
                        contentFit='cover'
                        contentPosition='top'
                    />

                    <View style={{ position: 'absolute', width: '100%', padding: 5, flexDirection: 'row', gap: 1, alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
                        <ThemedView style={{ borderRadius: 4, paddingHorizontal: 4 }}>
                            {isProdukBaru(item.created_at) &&
                                <ThemedText style={{ fontSize: showGrid ? 12 : 10, }}>
                                    Baru
                                </ThemedText>
                            }
                        </ThemedView>
                        <ThemedView style={{ height: 20, width: 20, borderRadius: '50%', justifyContent: 'center', alignItems: 'center', paddingTop: 2, }}>
                            {pemilik && <Ionicons
                                name="person-outline"
                                size={13}
                                color={iconColor}
                            />}
                            {!pemilik && <Ionicons
                                name={isLiked ? "heart" : "heart-outline"}
                                size={13}
                                color={isLiked ? '#ff00a8' : iconColor}
                            />}
                        </ThemedView>
                    </View>

                    <ThemedView style={[showGrid ? { gap: 5 } : { gap: 0 }, styles.info]}>
                        <ThemedText numberOfLines={1} style={{ flex: 1, fontSize: 16 }} >
                            {item.nama_produk}
                        </ThemedText>

                        <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center', justifyContent: 'space-between', marginTop: user ? 0 : 'auto', flexWrap: 'nowrap' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: user ? 0 : 'auto', flexWrap: 'wrap', flex: 3, gap: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ThemedText type='defaultSemiBold' style={{ fontSize: 12 }}>Rp</ThemedText>
                                    <ThemedText type='defaultSemiBold' style={{ fontSize: 16 }}>{rupiah(item.discount ? item.harga - (item.harga * item.discount / 100) : item.harga, '')}</ThemedText>
                                </View>
                                {
                                    item.discount > 0 &&
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                                        <ThemedText type='default' numberOfLines={1} style={{ fontSize: 10, opacity: 0.6, textDecorationLine: 'line-through' }}>{rupiah(item.harga, 'Rp')}
                                        </ThemedText>
                                        <ThemedView style={{ borderWidth: 1, borderColor: iconColor, opacity: 0.5, paddingHorizontal: 3, borderRadius: 4 }}>
                                            <ThemedText numberOfLines={1} style={{ fontSize: 9, }}>
                                                -{item.discount}%
                                            </ThemedText>
                                        </ThemedView>
                                    </View>
                                }
                            </View>
                            {showGrid && <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center', flex: 1, flexWrap: 'wrap-reverse', justifyContent: 'flex-end' }}>
                                <Ionicons
                                    name="bag-handle-outline"
                                    size={13}
                                    color={iconColor}
                                />
                                <ThemedText style={{ fontSize: 11 }}>
                                    {item?.terjual}
                                </ThemedText>
                                <ThemedText style={{ fontSize: 11 }}>
                                    Terjual
                                </ThemedText>
                            </View>}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'space-between', opacity: 0.7, marginTop: 'auto' }}>
                            <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                <Ionicons
                                    name="storefront-outline"
                                    size={13}
                                    color={iconColor}
                                />
                                <ThemedText numberOfLines={1} style={{ fontSize: 12 }}>
                                    {item.mawam_toko?.nama_toko || '-'}
                                </ThemedText>
                            </View>
                            {user ? <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                <Ionicons
                                    name="cube-outline"
                                    size={13}
                                    color={iconColor}
                                />
                                <ThemedText numberOfLines={1} style={{ fontSize: 12 }}>
                                    {item.stok > 0
                                        ? `Stok ${item.stok} ${item.satuan}`
                                        : 'Produk habis'}
                                </ThemedText>
                            </View> : <View style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
                                <Ionicons
                                    name="location-outline"
                                    size={13}
                                    color={iconColor}
                                />
                                <ThemedText
                                    numberOfLines={1}
                                    style={{ fontSize: 12 }}
                                >
                                    {item.mawam_toko?.alamat_toko || '-'}
                                </ThemedText>
                            </View>}
                        </View>
                    </ThemedView>
                </TouchableOpacity>
            </Link>
        )
    }

    const handleSearch = () => {
        router.setParams({ q: querys.trim() })
    }

    const footerContent = () => (<ThemedView style={{ marginBottom: 5 }}></ThemedView>)
    const headerContent = () => (
        <ThemedView style={styles.header}>
            <ThemedView style={styles.headerTop}>

                {!showSearch ? (
                    <React.Fragment>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <ThemedText
                                type="title"
                                style={{ fontFamily: Fonts.rounded }}
                                numberOfLines={1}
                            >
                                {myLikes ? 'Favorit Saya' : 'Bawang Merah'}

                            </ThemedText>
                            {myLikes &&
                                <Ionicons name={"heart-outline"} size={13} color={'#ff00a8'} />}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 4 }}>
                            {/* <TouchableOpacity onPress={() => setShowGrid(!showGrid)}>
                                <Ionicons
                                    name={showGrid ? 'list-outline' : 'grid-outline'}
                                    size={24}
                                    color={iconColor}
                                />
                            </TouchableOpacity> */}
                            <TouchableOpacity onPress={() => setShowSearch(true)}>
                                <Ionicons name="search" size={24} color={iconColor} />
                            </TouchableOpacity>
                            {!myLikes && <React.Fragment>
                                {/* {
                                    user && (
                                        <Link
                                            href={{
                                                pathname: "/prod/form",
                                                params: { id: '' }
                                            }}
                                            asChild
                                        >
                                            <TouchableOpacity>
                                                <Ionicons name="add" size={24} color={iconColor} />
                                            </TouchableOpacity>
                                        </Link>
                                    )
                                } */}
                                {/* {user && <ExportButton iconColor={iconColor} produk={produk} setIsExporting={setIsExporting} />} */}
                                {/* <TouchableOpacity onPress={() => {
                                    router.setParams({ aksi: 'reload' })
                                }}>
                                    <Ionicons name="reload" size={24} color={iconColor} />
                                </TouchableOpacity> */}
                                <TouchableOpacity onPress={() => {
                                    router.navigate('/cart')
                                }} style={{ position: 'relative' }}><Ionicons name="cart-outline" size={24} color={iconColor} />
                                    {cart && cart.length > 0 && <View style={{ position: 'absolute', backgroundColor: Colors[colorScheme].accent, width: 15, height: 15, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', right: -3, top: -3, opacity: 0.9 }}>
                                        <ThemedText style={{ color: '#ffffff', fontSize: cart.length < 99 ? 12 : 6 }} numberOfLines={1}>{cart.length < 99 ? cart.length : '99+'}</ThemedText>
                                    </View>}
                                </TouchableOpacity>
                            </React.Fragment>}
                            {!myLikes && <TouchableOpacity onPress={() => {
                                setMyLikes(true)
                            }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="heart-outline" size={24} color={iconColor} />
                            </TouchableOpacity>}
                            {myLikes && <TouchableOpacity onPress={() => { setMyLikes(false); }}>
                                <Ionicons name="arrow-forward" size={24} color={iconColor} />
                            </TouchableOpacity>}
                        </View>

                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <TextInput
                            placeholder="Cari produk..."
                            value={querys}
                            onChangeText={setQuerys}
                            style={getInputStyle(colorScheme)}
                            // autoFocus
                            onSubmitEditing={handleSearch}
                        />
                        <TouchableOpacity style={{ width: 25 }} onPress={() => { querys.trim() != '' ? setQuerys('') : undefined; setShowSearch(false); }}>
                            <Ionicons name="close" size={24} color={iconColor} />
                        </TouchableOpacity>
                        {/* {produk.length > 0 && user && !myLikes && <ExportButton iconColor={iconColor} produk={produk} setIsExporting={setIsExporting} />} */}
                    </React.Fragment>
                )}

            </ThemedView>
        </ThemedView>
    )

    const tabs = ['Populer', 'Terbaru', 'Terlaris', 'Harga']

    return (
        <React.Fragment>
            {headerContent()}

            <ThemedView style={{ marginBottom: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', }}>
                    {tabs.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => {
                                if (tab == 'Harga') {
                                    setFilterPro(tab);
                                    setHargaAsc(prev => !prev);
                                } else {
                                    setFilterPro(tab)
                                }
                            }} style={[{ alignItems: 'center', width: '25%', paddingVertical: 8, borderRightWidth: tab != 'Harga' ? 1 : 0, borderBottomWidth: 1, borderColor: '#8b8b8b7c' }, filterPro == tab ? { borderBottomWidth: 3, borderBottomColor: iconColor } : undefined]}>
                            <ThemedText style={{ fontWeight: filterPro == tab ? '600' : undefined, fontSize: 14 }} numberOfLines={1}>
                                {tab != 'Harga' && tab}
                                {tab == 'Harga' && <React.Fragment>
                                    Harga <Ionicons name={hargaAsc ? 'arrow-up' : 'arrow-down'} />
                                </React.Fragment>}
                            </ThemedText>
                        </TouchableOpacity>))}
                </View>
                {/* Kategoris */}
                {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, width: '100%' }}>
                    <TouchableOpacity style={{ width: '25%', alignItems: 'center', borderRightWidth: 1, borderColor: '#8b8b8b7c' }}>
                        <ThemedText style={{ fontSize: 14 }}>Populer</ThemedText>
                    </TouchableOpacity>
                </View> */}
            </ThemedView>

            {loading && (<ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', zIndex: 2, bottom: produk.length ? 0 : '60%', width: '100%', height: '20%', opacity: 1, pointerEvents: 'none', backgroundColor: 'transparent' }}><ActivityIndicator size="large" color={iconColor} />
                <ThemedText style={{ marginTop: 10 }}>{statusLoad}</ThemedText></ThemedView>)}

            {isExporting && (<ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', zIndex: 2, top: 0, width: '100%', height: '100%', opacity: 1, pointerEvents: 'none', backgroundColor: isDark ? ColorDark + '33' : ColorLight + '33' }}><ActivityIndicator size="large" color={iconColor} />
                <ThemedText type='subtitle' style={{ marginTop: 10 }}>Sedang Export..</ThemedText></ThemedView>)}


            {(produk.length > 0 && (<FlatList
                key={showGrid ? 'grid' : 'list'}
                data={produk}
                keyExtractor={(item) => item?.id?.toString()}
                renderItem={renderItem}
                ListFooterComponent={footerContent}
                onEndReached={() => {
                    if (isFetchingMore.current) return;
                    fetchMore();
                }}
                onEndReachedThreshold={0.5}
                contentContainerStyle={{
                    gap: 0
                }}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                numColumns={showGrid ? 2 : 1}
            />))}
            {!loading && produk.length === 0 && (
                <View style={{ flex: 1, alignItems: 'center', marginTop: 50 }}>
                    <ThemedText>{myLikes ? 'Belum tambah favorit' : !loading ? 'Tidak ada produk ditemukan' : ''}</ThemedText>
                    {aksi === 'cari' && <TouchableOpacity onPress={() => {
                        setQuerys('');
                        setShowSearch(false);
                    }} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: ColorDark, borderRadius: 8 }}>
                        <ThemedText style={{ color: ColorLight }}>Batal Cari</ThemedText>
                    </TouchableOpacity>}
                </View>
            )}

        </React.Fragment>
    )
}
const styles = StyleSheet.create({
    header: {
        backgroundColor: '#fff',
        paddingTop: 0,

        borderBottomWidth: 1,
        borderBottomColor: '#eee',

        elevation: 4, // Android
        shadowColor: '#000', // iOS
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerImage: {
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    titleContainer: {
        flexDirection: 'row',
        marginTop: 40,
        marginBottom: 10,
        padding: 20
    },
    card: {
        flexDirection: 'row',
        borderRadius: 10,
        overflow: 'hidden',
    },
    image: {
        width: 89,
        height: 89,
        backgroundColor: '#ccc',
        marginVertical: 'auto',
    },
    info: {
        flex: 1,
        padding: 10,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexWrap: 'wrap', gap: 4
    }
})

