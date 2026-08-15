export const Estimasi = (waktu : any, minmax:{min:number,max:number}={min:5,max:8}) => {
    const estimate = new Date(waktu);
    estimate.setDate(estimate.getDate() + minmax.min);
    const estimate2 = new Date(waktu);
    estimate2.setDate(estimate2.getDate() + minmax.max);
    return estimate.toLocaleDateString("id-ID", {
        month: "long",
        day: "numeric",
    }) + ' - ' + estimate2.toLocaleDateString("id-ID", {
        month: "long",
        day: "numeric",
    })
}
export const ekstrakEstimasi = (string_hari : any) => {
    if(string_hari){
        const string_ = typeof string_hari == 'object' ? string_hari[0] :string_hari;
        const digit = string_.replace(/hari|\s/g,'');
        if(digit.includes('-')){
            const [min, max] = digit.split('-')?.map((d:any)=>parseInt(d));
            return {min, max}
        }else{
            const min = parseInt(digit);
            const max = min + 5;
            return {min, max}
        }
    }
    return {min:5, max:8}
}
