const load = async () => {
  const res = await fetch("https://api.biteship.com/v2/maps/areas?countries=ID&input=85111&type=single", {
    "headers": {
      "accept": "application/json",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTYwNWJjMzk5M2NjYjYzNTU3YTQ2MGEiLCJpYXQiOjE3ODQ3MDAwMTcsImV4cCI6MTc4NDc4NjQxNywiaXNzIjoiYml0ZXNoaXAvY29yZSJ9.kMMqEnAIjTxLVBIQHdXlX57NkQqPjX9Wf-RJMkNsye4",
      "content-type": "application/json",
    },
    "body": null,
    "method": "GET"
  });

  const json = await res.json();
  console.log(json);
}
const load2 = async () => {
  const res = await fetch("https://api.biteship.com/v2/rates/couriers?channel=web_dashboard", {
    "headers": {
      "accept": "application/json",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTYwNWJjMzk5M2NjYjYzNTU3YTQ2MGEiLCJpYXQiOjE3ODQ3MDAwMTcsImV4cCI6MTc4NDc4NjQxNywiaXNzIjoiYml0ZXNoaXAvY29yZSJ9.kMMqEnAIjTxLVBIQHdXlX57NkQqPjX9Wf-RJMkNsye4",
      "content-type": "application/json",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Google Chrome\";v=\"150\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "Referer": "https://dashboard.biteship.com/"
    },
    "body": "{\"origin_postal_code\":\"40111\",\"origin_country_id\":\"ID\",\"destination_postal_code\":\"80351\",\"destination_country_id\":\"ID\",\"couriers\":\"jne,sicepat,jnt,jntcargo\",\"items\":[{\"height\":\"10\",\"length\":\"10\",\"weight\":\"1000\",\"width\":\"10\",\"hs_code\":\"\"}]}",
    "method": "POST"
  });

  const json = await res.json();
  console.log(json);
}
load2();

// https://api.biteship.com/v1/public/trackings/CM73191594831/couriers/jne
