const submitButton = document.querySelector('#submit');
const input = document.querySelector('#input');
const errorSpan = document.querySelector('#error');
const resultsContainer = document.querySelector('#results');
const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='

let coin;

const getData = async () => {

    coin = input.value.toLowerCase();
    const json = await fetch(`${url}${coin}`)
    const res = await json.json()
    console.log(res)
    takeParameters(res)
    createDataColumns(res)
}
let coins = []
const takeParameters = data => {
 
    data.forEach(p => {
        coins.push(
            p.current_price,
            p.image = `<img src = ${p.image}>`,
            p.market_cap_rank,
            p.market_cap,
            p.fully_diluted_valuation,
            p.total_volume,
            p.high_24h,
            p.low_24h,
            p.price_change_percentage_24h,
            p.market_cap_change_24h,
            p.market_cap_change_percentage_24h,
            p.circulating_supply,
            p.total_supply,
            p.max_supply,
            p.ath,
            p.ath_change_percentage,
            p.ath_date,
            p.atl,
            p.atl_change_percentage,
            p.atl_date,
            p.last_updated,
            p.price_change_24h,
        )
    })
    // document.getElementById('data').innerHTML += temp;
    // //    document.getElementById('cryptoTable').innerHTML += temp;


}
const button = document.getElementById('change');
const table = document.querySelector('#table .cryptoContainer');

const createDataColumns = data => {
    const header = document.querySelector('#table .cryptoHeader');
    const newDiv = document.createElement('td');
    newDiv.innerHTML = data[0].name;
    header.appendChild(newDiv);
    console.log(coins)
    let rows = document.querySelectorAll('#table .cryptoContainer .cryptoColumn');
     for (let i = 1; i < (rows.length, coins.length +1); i++) {
         let row = rows[i];
         let newDiv = document.createElement('td');
    newDiv.innerHTML = coins[i-1];
       row.appendChild(newDiv);
    }
<<<<<<< HEAD
    coins.length = 0;
=======
    emptyArray(coins)
}
const emptyArray = (array) =>{
return array.length = 0;
>>>>>>> 772f50790982edb7aca716687da2ffe5726e45a5
}

submitButton.addEventListener('click', getData)
//data.forEach(params => {
    //     resultsContainer.innerHTML += `
    //         ${params.id}</br>
    //         ${params.symbol}</br>
    //         ${params.name}</br>  
    //         <img src="${params.image}"/></br>
    //         ${params.current_price}</br> 
    //         ${params.market_cap}</br>
    //         ${params.market_cap_rank}</br> 
    //         ${params.fully_diluted_valuation}</br> 
    //         ${params.total_volume}</br> 
    //         ${params.high_24h}</br> 
    //         ${params.low_24h}</br> 
    //         ${params.price_change_percentage_24h}</br> 
    //         ${params.market_cap_change_24h}</br> 
    //         ${params.market_cap_change_percentage_24h}</br>
    //         ${params.circulating_supply}</br> 
    //         ${params.total_supply}</br> 
    //         ${params.max_supply}</br> 
    //         ${params.ath}</br> 
    //         ${params.ath_change_percentage}</br> 
    //         ${params.ath_date}</br> 
    //         ${params.atl}</br> 
    //         ${params.atl_change_percentage}</br> 
    //         ${params.atl_date}</br> 
    //         ${params.last_updated}</br> 
    //         ${params.price_change_24h}</br>`
    // })



// {
//  id = data[0].id,
//  symbol = data[0].symbol,
//  name = data[0].name,
//  image = data[0].image,
//  current_price = data[0].current_price,
//  market_cap = data[0].market_cap,
//  market_cap_rank = data[0].market_cap_rank,
//  fully_diluted_valuation = data[0].fully_diluted_valuation,
//  total_volume = data[0].total_volume,
//  high_24h = data[0].high_24h,
//  low_24h = data[0].low_24h,
//  price_change_percentage_24h = data[0].price_change_percentage_24h,
//  market_cap_change = data[0].market_cap_change_24h,
//  market_cap_change_24h = data[0].market_cap_change_percentage_24h,
//  circulating_supply = data[0].circulating_supply,
//  total_supply = data[0].total_supply,
//  max_supply = data[0].max_supply,
//  ath = data[0].ath,
//  loath_change_percentage_24h = data[0].ath_change_percentage,
//  ath_date = data[0].ath_date,.
//  atl = data[0].atl,
//  atl_change_percentage = data[0].atl_change_percentage,
//  atl_date = data[0].atl_date,
//  last_updated = data[0].last_updated,
//  price_change_24h = data[0].price_change_24h,
// }
