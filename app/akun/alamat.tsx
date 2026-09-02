import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import Alerts from '@/constants/Alerts'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState, useRef } from 'react'
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;
import MapPicker from "@/components/ui/MapPicker";

export default function ModalScreen() {
    const KEY_GOOGLE = "AIzaSyB5Zf-tTLdsCoDhVJiv4klSDqpw4cX9U0Y";
    const [latitude, setLatitude] = useState(-10.176596);
    const [longitude, setLongitude] = useState(123.6224666);
    const [popup, setPopup] = useState<any>(null);
    const { cart } = useLocalSearchParams();
    const { user } = useAuth();
    const [dataUser, setDataUser] = useState<any>(null)
    const { isDark } = useTheme();
    const colorScheme = isDark ? 'dark' : 'light';
    const iconColor = Colors[colorScheme].icon;
    const border = Colors[colorScheme].border;
    const bgColor = Colors[colorScheme].inputBg;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [kodeposs, setKodePoss] = useState<any>([]);
    const [kode_pos, setKode_Pos] = useState<string>('');
    const [alamat_pos, setAlamat_Pos] = useState<string>('');
    const [prov, setProv] = useState<string>('');
    const [kabu, setKabu] = useState<string>('');
    const [keca, setKeca] = useState<string>('');
    const [des, setDes] = useState<string>('');
    const [pointAlamat, setPointAlamat] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any>([]);
    const searchTimeout = useRef<any>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchController = useRef<AbortController | null>(null);
    const [hasilLokasi, setHasilLokasi] = useState<any[]>([]);
    const [isSearchingPostalCode, setIsSearchingPostalCode] = useState(false);
    const [postalSearchError, setPostalSearchError] = useState(false);
    const [isSavingAddress, setIsSavingAddress] = useState(false);

    useEffect(() => {
        tampilLokasi(latitude, longitude)
    }, [latitude, longitude]);
    useEffect(() => {
        if (user === null) {
            router.replace('produk');
        }
        if (user) {
            fetchAkun();
        }
    }, [user]);


    const fetchAddressByQuery = async (q: string, allowCoords: boolean = true) => {
        if (!q) return;
        try {
            const res = await fetch(`https://kodepos.vercel.app/search/?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            const first = (json?.data || [])[0];
            if (!first) return;

            const village = first.village || '';
            const district = first.district || '';
            const regency = first.regency || '';
            const province = first.province || '';
            const code = String(first.code || first.postal || '');
            const lat = Number(first.latitude);
            const lng = Number(first.longitude);

            setDes(village);
            setKeca(district);
            setKabu(regency);
            setProv(province);
            setKode_Pos(code);
            setKodePoss([{ value: code, label: [code, village, district, regency, province].filter(Boolean).join(', '), latitude: lat, longitude: lng }]);

            if (allowCoords && Number.isFinite(lat) && Number.isFinite(lng)) {
                setLatitude(lat);
                setLongitude(lng);
            }

            setPointAlamat([village, district, regency, province].filter(Boolean).join(', '));
        } catch (e) {
            console.log('fetchAddressByQuery error', e);
        }
    }

    const fetchAkun = async () => {
        const { data, error } = await supabase
            .from('mawam_profile')
            .select('*')
            .eq('id', user.id)
            .single()

        if (error) {
            console.log(error);
            return;
        }

        if (data) {
            if (data.alamat) {
                const newAlamat = data.alamat.trim().split("\n")
                if (newAlamat.length > 1) { newAlamat.pop() }
                data.alamat = newAlamat.join(' ');
            }
            if (data.kode_pos) {
                setKode_Pos(data.kode_pos)
            }
            if (data.latitude) {
                setLatitude(data.latitude)
            }
        }
        if (data.longitude) {
            if (data.longitude) {
                setLongitude(data.longitude)
            }
            if (data.pin_map) {
                setPointAlamat(data.pin_map)
            }
            if (data.kode_alamat) {
                const [pro, kab, kec, des] = data.kode_alamat?.split('.');
            } else {
            }
            setDataUser(data);
            // Jika profil memiliki kode_pos atau alamat/desa, coba isi field dari API kodepos
            const profileQuery = (data.kode_pos ? String(data.kode_pos) : '') + ' ' + (data.desa ? String(data.desa).split('\n').join(' ') : '');
            if (profileQuery.trim()) {
                // Prioritaskan kode_pos bila ada
                const q = data.kode_pos ? `${data.kode_pos} ${data.desa ?? ''}` : data.desa;
                console.log(q, profileQuery)
                const hasDbCoords = (data.latitude !== undefined && data.latitude !== null) && (data.longitude !== undefined && data.longitude !== null);
                fetchAddressByQuery(q?.toString().trim() ?? profileQuery, !hasDbCoords);
            }
        } else {
            router.push('/toko/form');
        }
    };


    const tampilLokasi = async (
        lat: number,
        lng: number,
        lok?: string
    ): Promise<any> => {

        // Jika sedang mencari berdasarkan nama
        if (lok) {

            // Batalkan timer sebelumnya
            if (searchTimer.current) {
                clearTimeout(searchTimer.current);
            }

            // Batalkan request sebelumnya
            searchController.current?.abort();

            return new Promise((resolve, reject) => {

                searchTimer.current = setTimeout(async () => {

                    try {
                        searchController.current = new AbortController();

                        const url =
                            `https://maps.googleapis.com/maps/api/place/textsearch/json` +
                            `?query=${encodeURIComponent(lok)}` +
                            `&location=${lat}%2C${lng}` +
                            `&radius=5000` +
                            `&key=${KEY_GOOGLE}`;

                        const res = await fetch(
                            'https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/proxy?url=' +
                            encodeURIComponent(url),
                            {
                                signal: searchController.current.signal,
                            }
                        );

                        const json = await res.json();

                        resolve(json);

                    } catch (error: any) {

                        // Request sebelumnya memang dibatalkan
                        if (error?.name === 'AbortError') {
                            return;
                        }

                        reject(error);
                    }

                }, 500); // tunggu 500ms setelah berhenti mengetik
            });
        }

        // =========================
        // PENCARIAN BERDASARKAN GPS
        // =========================

        const url =
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
            `?location=${lat}%2C${lng}` +
            `&radius=30` +
            `&key=${KEY_GOOGLE}`;

        const res = await fetch(
            'https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/proxy?url=' +
            encodeURIComponent(url)
        );

        const json = await res.json();

        // Koordinat sudah berubah, abaikan hasil request lama
        if (
            lat !== latitude ||
            lng !== longitude
        ) {
            return;
        }

        if (json?.status === "OK" && json?.results) {

            const tempat = json.results.filter(
                (r: any) =>
                    r.business_status === "OPERATIONAL" &&
                    r.name
            );

            const lokasi = tempat[0];

            setPopup({
                id: lokasi?.place_id,
                name: lokasi?.name,
                code: lokasi?.plus_code?.compound_code,
            });

            setPointAlamat(
                (lokasi?.name ? lokasi.name + ', ' : '') +
                (lokasi?.plus_code?.compound_code ?? '')
            );

        } else if (dataUser?.pin_map) {

            setPopup({
                id: undefined,
                name: dataUser?.pin_map,
                code: undefined,
            });

            setPointAlamat(dataUser?.pin_map);
        }
    };


    if (!dataUser) {
        return (
            <View style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <ActivityIndicator size="large" color={iconColor} />
                <ThemedText>Atur Alamat...</ThemedText>
            </View>
        )
    }

    async function updateProfile() {
        if (isSavingAddress) return;
        const hasTextAreas = prov && kabu && keca && des;

        if (hasTextAreas && dataUser.nama && dataUser.no_hp && dataUser.alamat) {
            setIsSavingAddress(true);
            try {
                const { error } = await supabase.from('mawam_profile').update({
                    nama: dataUser.nama,
                    no_hp: dataUser.no_hp,
                    alamat: dataUser.alamat.trim() + "\n" + ([kode_pos, des, keca, kabu, prov].join(', ')),
                    kode_alamat: [prov, kabu, keca, des].join(' '),
                    kode_pos: kode_pos,
                    latitude,
                    longitude,
                    pin_map: pointAlamat,
                    desa: des
                }).eq('id', user.id);
                if (error) {
                    console.log(error);
                    Alerts('Gagal menyimpan alamat', 'error');
                    return;
                }
                Alerts('Berhasil Ubah', 'success')
                cart && router.replace({ pathname: 'checkout/checkout', params: { cart } })
                return router.back()
            } finally {
                setIsSavingAddress(false);
            }
        } else {
            Alerts('Pastikan semua sudah terisi', 'error');
        }
    }

    const fetchAddressSuggestions = async (q: string) => {
        if (!q || q.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearchingPostalCode(true);
        setPostalSearchError(false);
        try {
            const res = await fetch(`https://kodepos.vercel.app/search/?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            const items = (json?.data || []).map((it: any, idx: number) => ({
                value: JSON.stringify(it),
                label: [it.village, it.district, it.regency, it.province, it.code].filter(Boolean).join(', ')
            }));
            setSearchResults(items);
        } catch (e) {
            console.log('fetchAddressSuggestions error', e);
            setPostalSearchError(true);
            setSearchResults([]);
        } finally {
            setIsSearchingPostalCode(false);
        }
    }

    const handleSelectSuggestion = (item: any) => {
        try {
            const obj = typeof item.value === 'string' ? JSON.parse(item.value) : item;
            const village = obj.village || '';
            const district = obj.district || '';
            const regency = obj.regency || '';
            const province = obj.province || '';
            const code = String(obj.code || obj.postal || '');
            const lat = Number(obj.latitude);
            const lng = Number(obj.longitude);

            setDes(village);
            setKeca(district);
            setKabu(regency);
            setProv(province);

            setKode_Pos(code);
            setKodePoss([{ value: code, label: [code, village, district, regency, province].filter(Boolean).join(', '), latitude: lat, longitude: lng }]);

            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setLatitude(lat);
                setLongitude(lng);
            }

            setPointAlamat([village, district, regency, province].filter(Boolean).join(', '));
            setSearchResults([]);
            setSearchQuery('');
        } catch (e) {
            console.log('handleSelectSuggestion error', e);
        }
    }


    const fetchAreaCoords = async (table: string, id: any) => {
        if (!id) return;
        try {
            const { data } = await supabase.from(table).select('latitude,longitude').eq('id', id).single();
            if (data) {
                const latVal = Number(data.latitude);
                const lngVal = Number(data.longitude);
                if (Number.isFinite(latVal) && Number.isFinite(lngVal)) {
                    setLatitude(latVal);
                    setLongitude(lngVal);
                }
            }
        } catch (e) {
            // ignore if columns don't exist or request fails
            console.log('fetchAreaCoords error', e);
        }
    }


    return (
        <React.Fragment>
            <Stack.Screen options={{ title: 'Atur Alamat', }} />
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <ThemedView style={{ borderRadius: 8, padding: 8, gap: 8 }}>
                        <ThemedInput label={<ThemedText style={styles.label}>Nama Lengkap</ThemedText>} value={dataUser.nama} onChangeText={(text: string) => {
                            setDataUser({ ...dataUser, nama: text })
                        }} placeholder="" />
                        <ThemedInput label={<ThemedText style={styles.label}>No Hp</ThemedText>} value={dataUser.no_hp} onChangeText={(text: string) => {
                            setDataUser({ ...dataUser, no_hp: text })
                        }} placeholder="" />
                        <ThemedInput label={<ThemedText style={styles.label}>Cari Alamat (desa/kode pos)</ThemedText>} value={searchQuery} onChangeText={(text: string) => {
                            setSearchQuery(text);
                            setPostalSearchError(false);
                            if (searchTimeout.current) clearTimeout(searchTimeout.current);
                            searchTimeout.current = setTimeout(() => fetchAddressSuggestions(text), 350);
                        }} placeholder="Ketik nama desa atau kecamatan..." />

                        {isSearchingPostalCode ? (
                            <View style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator size="small" color={iconColor} />
                                <ThemedText>Mencari kode pos...</ThemedText>
                            </View>
                        ) : null}
                        {postalSearchError ? (
                            <ThemedText style={{ color: '#d9534f', marginBottom: 8 }}>Gagal mencari kode pos</ThemedText>
                        ) : null}
                        {searchResults.length > 0 ? (
                            <View style={{ maxHeight: 160, borderRadius: 8, overflow: 'hidden' }}>
                                {searchResults.map((it: any, idx: number) => (
                                    <TouchableOpacity key={idx} onPress={() => handleSelectSuggestion(it)} style={{ padding: 8, borderBottomWidth: 1, borderColor: border, backgroundColor: bgColor }}>
                                        <ThemedText>{it.label}</ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : null}
                        {[
                            ['Provinsi', prov],
                            ['Kabupaten', kabu],
                            ['Kecamatan', keca],
                            ['Desa', des],
                            ['Kode Pos', kode_pos],
                        ].map(([label, value]) =>
                            value ? (
                                <React.Fragment key={label}>
                                    <ThemedText style={styles.label}>{label}</ThemedText>
                                    <ThemedInput value={value} editable={false} />
                                </React.Fragment>
                            ) : null
                        )}
                        {kodeposs.length === 0 && des ? (
                            <ThemedText style={{ color: '#d9534f', marginBottom: 8 }}>Kode pos tidak ditemukan</ThemedText>
                        ) : null}
                        <ThemedInput label={<ThemedText style={styles.label}>Alamat Lengkap</ThemedText>} value={dataUser.alamat ?? alamat_pos} onChangeText={(text: string) => { setDataUser({ ...dataUser, alamat: text }) }} placeholder={alamat_pos} style={{ height: 100, textAlignVertical: 'top', }} multiline />
                        {/* nama lengkap, nomor telepon, provinsi, kota, kecamatan, kode pos, nama jalan, gedung, no.rumah, detail lainnya, titik lokasi */}
                        <View
                            style={{
                                position: 'relative',
                            }}
                        >
                            <ThemedInput
                                label={<ThemedText style={styles.label}>Pin Point Alamat</ThemedText>}
                                value={pointAlamat}
                                onChangeText={(text: string) => {
                                    setPointAlamat(text);

                                    if (!text.trim()) {
                                        setHasilLokasi([]);
                                        return;
                                    }

                                    tampilLokasi(latitude, longitude, text)
                                        .then((json) => {
                                            setHasilLokasi(json?.results ?? []);
                                        });
                                }}
                                placeholder="Ketik nama tempat..."
                            />
                            {hasilLokasi.length > 0 && (
                                <View style={styles.suggestionContainer}>
                                    {hasilLokasi.map((item) => (
                                        <TouchableOpacity
                                            key={item.place_id}
                                            style={styles.suggestionItem}
                                            onPress={() => {
                                                const lat = item.geometry?.location?.lat;
                                                const lng = item.geometry?.location?.lng;

                                                if (lat != null && lng != null) {
                                                    setLatitude(lat);
                                                    setLongitude(lng);
                                                }
                                                setPointAlamat(
                                                    `${item.name}, ${item.formatted_address ?? item.vicinity ?? ''}`
                                                );

                                                setPopup({
                                                    id: item.place_id,
                                                    name: item.name,
                                                    code: item.plus_code?.compound_code,
                                                });

                                                setHasilLokasi([]);
                                            }}
                                        >
                                            <ThemedText style={styles.suggestionName}>
                                                {item.name}
                                            </ThemedText>

                                            <ThemedText style={styles.suggestionAddress}>
                                                {item.formatted_address ?? item.vicinity}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <MapPicker
                                initialLocation={{
                                    latitude,
                                    longitude,
                                }}
                                popup={popup}
                                onLocationChange={(lat, lng) => {
                                    setLatitude(lat);
                                    setLongitude(lng);
                                }}
                            />
                        </View>


                    </ThemedView>

                    <ThemedView style={{ flexDirection: 'row', gap: '1%', justifyContent: 'center', alignItems: 'center', paddingBottom: 10, borderRadius: 10, marginTop: 2 }}>
                        <TouchableOpacity style={[{ width: '48%' }, styles.button]} onPress={() => {
                            router.back();
                        }}>
                            <ThemedText style={styles.buttonText}>Batal</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={isSavingAddress}
                            style={[{ width: '48%' }, styles.button, { opacity: isSavingAddress ? 0.7 : 1 }]} onPress={() => {
                                updateProfile()
                            }}>
                            {isSavingAddress ? <ActivityIndicator size="small" color={ColorLight} /> : <ThemedText style={styles.buttonText}>{'Simpan'}</ThemedText>}
                        </TouchableOpacity>
                    </ThemedView>
                </View>
            </KeyboardAwareScrollView>
        </React.Fragment>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 8,
    },
    label: {
        marginVertical: 4,
        fontWeight: '600'
    },
    button: {
        marginTop: 10,
        backgroundColor: ColorDark,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    buttonText: {
        color: ColorLight,
        fontWeight: '600',
    },
    suggestionContainer: {
        marginTop: 4,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
    },

    suggestionItem: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },

    suggestionName: {
        fontSize: 15,
        fontWeight: '600',
    },

    suggestionAddress: {
        marginTop: 3,
        fontSize: 13,
        opacity: 0.6,
    },
})
