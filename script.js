
const submitButton = document.querySelector('#submit');
const input = document.querySelector('#input');
const errorSpan = document.querySelector('#error');
const resultsContainer = document.querySelector('#results');
const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='

let coin;

const getData = () => {

    coin = input.value.toLowerCase();

    fetch(`${url}${coin}`)
        .then(res => { return res.json() })
        .then(data => {
            console.log(data)
            takeParameters(data)
        })
        .catch(err => typo())
}
const typo = () => {
    resultsContainer.textContent = `Name of the coin is wrong typed`
}
const takeParameters = data => {
    data.forEach( params => {
        resultsContainer.innerHTML +=`${params.id} ${params.symbol} ${params.name}  <img src="${params.image}"/>
    ${params.current_price} ${params.market_cap}
    ${params.market_cap_rank} ${params.fully_diluted_valuation} ${params.total_volume} ${params.high_24h} ${params.low_24h} ${params.price_change_percentage_24h} ${params.market_cap_change} ${params.market_cap_change_24h}
    ${params.circulating_supply} ${params.total_supply} ${params.max_supply} ${params.ath} ${params.loath_change_percentagew_24h} ${params.ath_date} ${params.atl} ${params.atl_change_percentage} ${params.atl_date} ${params.last_updated} ${params.price_change_24h}</br>` 
    }) 
}

submitButton.addEventListener('click', getData)

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
//  loath_change_percentagew_24h = data[0].ath_change_percentage,
//  ath_date = data[0].ath_date,.
//  atl = data[0].atl,
//  atl_change_percentage = data[0].atl_change_percentage,
//  atl_date = data[0].atl_date,
//  last_updated = data[0].last_updated,
//  price_change_24h = data[0].price_change_24h,
// }