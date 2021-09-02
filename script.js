
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
}

const typo = () => {
    resultsContainer.textContent = `Name of the coin is wrong typed`
}
const takeParameters = data => {
    let temp = "";
    data.forEach(params => {
        temp += "<tr>";
        temp += `<tr>${params.id}</tr>`
        temp += `<tr> ${params.symbol}</tr>`
        temp += `<tr>${params.name}</tr>`
        temp += `<tr><img src="${params.image}"/></tr>`
        temp += `<tr>${params.current_price}</tr>`
    })
    document.getElementById('data').innerHTML += temp;
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