const full = "53.5371.537101.5371011011";
const [pro,ka,ke,de] = full.split('.');
const kab= ka.replace(pro, '');
const kec= ke.replace(ka, '');
const des= de.replace(ke, '');
const result = [pro, kab, kec, des].join('.')

// 31.3173.317302.3173021001

// console.log(pr,ka,ke,de)
// console.log(pr)
// console.log(kab)
// console.log(kec)
// console.log(des)
console.log(result)

// https://kodepos.vercel.app/detect/?latitude=-6.547052&longitude=107.3980201
// https://kodepos.vercel.app/search/?q=danasari
// https://kodepos.vercel.app/search/?q=oebobo+kupang


// fetch("https://api.biteship.com/v2/maps/areas?countries=ID&input=kupang&type=single", {
//   "headers": {
//     "accept": "application/json",
//     "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
//     "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTYwNWJjMzk5M2NjYjYzNTU3YTQ2MGEiLCJpYXQiOjE3ODQ3MDAwMTcsImV4cCI6MTc4NDc4NjQxNywiaXNzIjoiYml0ZXNoaXAvY29yZSJ9.kMMqEnAIjTxLVBIQHdXlX57NkQqPjX9Wf-RJMkNsye4",
//     "content-type": "application/json",
//     "priority": "u=1, i",
//     "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Google Chrome\";v=\"150\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"Windows\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-site"
//   },
//   "referrer": "https://dashboard.biteship.com/",
//   "body": null,
//   "method": "GET",
//   "mode": "cors",
//   "credentials": "include"
// });

// Nmr rek 7273345854
// Ats: Nurhasanah