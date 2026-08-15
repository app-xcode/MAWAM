import { decode as atob } from "base-64"
import { router, useLocalSearchParams } from 'expo-router'
export default function Detail() {
    const { id } = useLocalSearchParams()
    const hasWord = !(/[a-z]/i.test(id.toLocaleString()))
    const decode = (id: string) => {
        id = id.replace(/X/g, '=')
        return atob(id);
    }
    return router.replace({ pathname: '/prod/detail', params: { id: hasWord ? id : decode(id.toLocaleString()) } })
}