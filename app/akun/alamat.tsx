import ThemedInput from '@/components/themed-input'
import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { CustomSelect } from '@/components/ui/CustomSelect'
import Alerts from '@/constants/Alerts'
import { Colors } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/utils/auth'
import { useTheme } from '@/utils/theme'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
const ColorDark = Colors['light'].tint;
const ColorLight = Colors['dark'].tint;
import LeafletMap from '@/components/ui/LeafletMap'
import type { ComponentType } from "react";

type MapPickerProps = {
    onLocationChange?: (latitude: number, longitude: number) => void;
};

let MapPicker: ComponentType<MapPickerProps> | null = null
if (Platform.OS !== "web") {
    MapPicker = require("@/components/ui/MapPicker").default;
}

export default function ModalScreen() {
    const [lat, setLat] = useState(0);
    const [lng, setLng] = useState(0);
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
    const textColor = Colors[colorScheme].text;
    const gambarDefault = 'https://cros-image.vercel.app/?quest=https://mawam.expo.app/kosong.webp';
    const [provinsis, setProvinsis] = useState<any>([]);
    const [kabupatens, setKabupatens] = useState<any>([]);
    const [kecamatans, setKecamatans] = useState<any>([]);
    const [desas, setDesas] = useState<any>([]);
    const [kodeposs, setKodePoss] = useState<any>([]);
    const [provinsi, setProvinsi] = useState<number>(0);
    const [kabupaten, setKabupaten] = useState<number>(0);
    const [kecamatan, setKecamatan] = useState<number>(0);
    const [desa, setDesa] = useState<number>(0);
    const [kode_pos, setKode_Pos] = useState<string>('');
    const [alamat_pos, setAlamat_Pos] = useState<string>('');
    const [prov, setProv] = useState<string>('');
    const [kabu, setKabu] = useState<string>('');
    const [keca, setKeca] = useState<string>('');
    const [des, setDes] = useState<string>('');
    const [pointAlamat, setPointAlamat] = useState<string>('');


    useEffect(() => {
        tampilLokasi(latitude, longitude)
    }, [latitude, longitude]);
    useEffect(() => {
        if (!user) {
            router.replace('produk');
        }
        if (user) {
            fetchAkun();
        }
    }, [user]);

    useEffect(() => {
        fetchKab(provinsi)
    }, [provinsi]);
    useEffect(() => {
        fetchKec(kabupaten)
    }, [kabupaten]);
    useEffect(() => {
        fetchDesa(kecamatan)
    }, [kecamatan]);
    useEffect(() => {
        fetchKodePos([des, keca, prov].join('+'))
    }, [des]);

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
            if (data.longitude) {
                setLongitude(data.longitude)
            }
            if (data.pin_map) {
                setPointAlamat(data.pin_map)
            }
            if (data.kode_alamat) {
                const [pro, kab, kec, des] = data.kode_alamat?.split('.');
                fetchProv(pro);
                pro && fetchKab(pro, kab)
                kab && fetchKec(kab, kec)
                kec && fetchDesa(kec, des)
            } else {
                fetchProv();
            }
            setDataUser(data);
        } else {
            router.push('/toko/form');
        }
    };
    const fetchProv = async (pro: any = null) => {
        const { data } = await supabase
            .from('provinsi')
            .select('*')
            .order('nama');
        if (data) {
            setProvinsis(data.map((item) => {
                pro && pro == item.id && setProvinsi(item.id)
                pro && pro == item.id && setProv(item.nama)
                return { value: item.id, label: item.nama }
            }))
        }
    };
    const fetchKab = async (id_prov: any, kab: any = null) => {
        const { data } = await supabase
            .from('kabupaten')
            .select('*')
            .eq('provinsi_id', id_prov)
            .order('nama');
        if (data) {
            setKabupatens(data.map((item) => {
                kab && kab == item.id && setKabupaten(item.id)
                kab && kab == item.id && setKabu(item.nama)
                return { value: item.id, label: item.nama }
            }))
        }
    };
    const fetchKec = async (id_kab: any, kec: any = null) => {
        const { data } = await supabase
            .from('kecamatan')
            .select('*')
            .eq('kabupaten_id', id_kab)
            .order('nama');
        if (data) {
            setKecamatans(data.map((item) => {
                kec && kec == item.id && setKecamatan(item.id)
                kec && kec == item.id && setKeca(item.nama)
                return { value: item.id, label: item.nama }
            }))
        }
    };
    const fetchDesa = async (id_kec: any, des: any = null) => {
        const { data } = await supabase
            .from('desa')
            .select('*')
            .eq('kecamatan_id', id_kec)
            .order('nama');
        if (data) {
            setDesas(data.map((item) => {
                des && des == item.id && setDesa(item.id)
                des && des == item.id && setDes(item.nama)
                return { value: item.id, label: item.nama }
            }))
        }
    };
    const fetchKodePos = async (data: any, loop: boolean = true) => {
        const keyword = data.replace(/\s/gi, '+').replace('Daerah+Khusus+Ibukota','DKI');
        const res = await fetch(`https://kodepos.vercel.app/search/?q=${keyword}`);
        const json = await res.json();
        if (json && json?.statusCode == 200 && json?.code == 'OK') {
            if (json?.data && json?.data.length) {
                const kodes = json?.data.filter((item: any) => item?.village == des);
                const pos = kodes.map((item: any) => {
                    if((latitude===-10.176596 || item.code!=kode_pos) && item.latitude && item.longitude){
                        setLatitude(item.latitude)
                        setLongitude(item.longitude)
                    }
                    return { value: parseInt(item.code), label: [item.code, item.village, item.district, item.regency, item.province].join(', ') }
                });
                setKodePoss(pos);
                if (!kode_pos) {
                    setKode_Pos(pos[0]?.value)
                }
            } else {
                Alerts('Kode pos tidak ditemukan', 'error');
                loop && fetchKodePos(data, !loop)
            }
        }
    };
    const tampilLokasi = async (lat: number, lng: number) => {
        const res = await fetch('https://crzymkebjvqhqlvjhrwb.supabase.co/functions/v1/proxy?url=' + (encodeURIComponent(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat}%2C${lng}&radius=30&key=AIzaSyB5Zf-tTLdsCoDhVJiv4klSDqpw4cX9U0Y`)), {
            method: "GET"
        });

        const json = await res.json();
        if (json
            && json.status === "OK"
            && json?.results
        ) {
            const tempat = json?.results.filter((r: any) => {
                return r.business_status == "OPERATIONAL" && r.name
            });


            const lokasi = tempat[0]?.geometry?.location
            // setLatitude(lokasi.lat);
            // setLongitude(lokasi.lng);
            setPopup({
                id: tempat[0]?.place_id,
                name: tempat[0]?.name,
                code: tempat[0]?.plus_code?.compound_code,
            });
            setPointAlamat((tempat[0]?.name?tempat[0]?.name+', ':'') + (tempat[0]?.plus_code?.compound_code ?? ''))
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
        if (provinsi && kabupaten && kecamatan && desa && dataUser.nama && dataUser.no_hp && dataUser.alamat) {
            const { error } = await supabase.from('mawam_profile').update({
                nama: dataUser.nama,
                no_hp: dataUser.no_hp,
                alamat: dataUser.alamat.trim() + "\n" + ([kode_pos, des, keca, kabu, prov].join(', ')),
                kode_alamat: [provinsi, kabupaten, kecamatan, desa].join('.'),
                kode_pos: kode_pos,
                latitude,
                longitude,
                pin_map:pointAlamat
            }).eq('id', user.id);
            !error && Alerts('Berhasil Ubah', 'success')
            cart && router.replace({ pathname: 'checkout/checkout', params: { cart } })
            return router.back()
        } else {
            Alerts('Pastikan semua sudah terisi', 'error');
        }
    }

    const selectS = StyleSheet.create({ button: { backgroundColor: bgColor, borderColor: border, padding: 10, marginBottom: 12, height: 40, overflow: 'hidden' }, buttonText: { color: textColor }, overlay: { backgroundColor: bgColor + '71', width: 500, maxWidth: '100%', alignSelf: 'center' }, item: { borderColor: border, backgroundColor: textColor }, itemText: { color: bgColor, textAlign: 'center', fontWeight: 'bold' } })

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
                        <ThemedText style={styles.label}>Provinsi</ThemedText>
                        <CustomSelect
                            defaultValue={provinsi}
                            placeholder='Pilih Provinsi'
                            data={provinsis}
                            onSelect={(item: any) => { setProvinsi(item.value); setProv(item.label) }}
                            inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }}
                        />
                        <ThemedText style={styles.label}>Kabupaten</ThemedText>
                        <CustomSelect
                            defaultValue={kabupaten}
                            placeholder='Pilih Kabupaten'
                            data={kabupatens}
                            onSelect={(item: any) => { setKabupaten(item.value); setKabu(item.label) }}
                            inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }}
                        />
                        <ThemedText style={styles.label}>Kecamatan</ThemedText>
                        <CustomSelect
                            defaultValue={kecamatan}
                            placeholder='Pilih Kecamatan'
                            data={kecamatans}
                            onSelect={(item: any) => { setKecamatan(item.value); setKeca(item.label) }}
                            inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }}
                        />
                        <ThemedText style={styles.label}>Desa</ThemedText>
                        <CustomSelect
                            defaultValue={desa}
                            placeholder='Pilih Desa'
                            data={desas}
                            onSelect={(item: any) => { setDesa(item.value); setDes(item.label) }}
                            inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }}
                        />
                        <ThemedText style={styles.label}>Kode Pos</ThemedText>
                        <CustomSelect
                            defaultValue={kode_pos}
                            placeholder='Pilih Kode Pos'
                            data={kodeposs}
                            onSelect={(item: any) => {
                                setKode_Pos(item.value);
                            }}
                            inputStyle={{ button: selectS.button, buttonText: selectS.buttonText, overlay: selectS.overlay, item: selectS.item, itemText: selectS.itemText }}
                        />
                        <ThemedInput label={<ThemedText style={styles.label}>Alamat Lengkap</ThemedText>} value={dataUser.alamat ?? alamat_pos} onChangeText={(text: string) => { setDataUser({ ...dataUser, alamat: text }) }} placeholder={alamat_pos} style={{ height: 100, textAlignVertical: 'top', }} multiline />
                        {/* nama lengkap, nomor telepon, provinsi, kota, kecamatan, kode pos, nama jalan, gedung, no.rumah, detail lainnya, titik lokasi */}
                        {Platform.OS === "web" &&
                            <View
                                style={{
                                    position: 'relative',
                                }}
                            >
                                <ThemedInput label={<ThemedText style={styles.label}>Pin Point Alamat</ThemedText>} value={pointAlamat} onChangeText={(text: string) => {
                                    setPointAlamat(text)
                                }} placeholder="" />
                                <LeafletMap
                                    // key={Date.now()}
                                    latitude={latitude}
                                    longitude={longitude}
                                    popup={popup}
                                    onLocationChange={(lat, lng) => {
                                        setLatitude(lat);
                                        setLongitude(lng);
                                    }}
                                />
                            </View>
                        }

                        {MapPicker && <MapPicker
                            onLocationChange={(latitude, longitude) => {
                                setLat(latitude);
                                setLng(longitude);
                            }}
                        />}
                    </ThemedView>

                    <ThemedView style={{ flexDirection: 'row', gap: '1%', justifyContent: 'center', alignItems: 'center', paddingBottom: 10, borderRadius: 10, marginTop: 2 }}>
                        <TouchableOpacity style={[{ width: '48%' }, styles.button]} onPress={() => {
                            router.back();
                        }}>
                            <ThemedText style={styles.buttonText}>Batal</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[{ width: '48%' }, styles.button, { opacity: 1 }]} onPress={() => {
                                updateProfile()
                            }}>
                            <ThemedText style={styles.buttonText}>{'Simpan'}</ThemedText>
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
})