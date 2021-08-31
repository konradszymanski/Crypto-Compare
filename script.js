
const submitButton = document.querySelector('#submit');
const input = document.querySelector('#input');

const errorSpan = document.querySelector('#error');
const resultsContainer = document.querySelector('#results');
const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='

let coin;

const getData = ()=>{

    coin = input.value.toLowerCase();

    fetch(`${url}${coin}`)
    .then(res=>{return res.json()})
    .then(data => {
        console.log(data)
        takeParameters(data)
    }) 
    .catch(err => typo())
}
const typo = () => {
    resultsContainer.textContent = `Name of the coin is wrong typed`
}
const takeParameters = data =>{
    const id = data[0].id;
    const name = data[0].name;
    const ath = data[0].ath;
    const current_price = data[0].current_price;
    const market_cap = data[0].market_cap;
    const max_supply = data[0].max_supply;
    resultsContainer.textContent = `${id} ${name} ${ath} ${current_price} ${market_cap} ${max_supply}`
}

submitButton.addEventListener('click', getData)
// id: "ripple",
// symbol: "xrp",
// name: "XRP",
// image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1605778731",
// current_price: 1.2,
// market_cap: 55591574376,
// market_cap_rank: 6,
// fully_diluted_valuation: 119516804972,
// total_volume: 5646020763,
// high_24h: 1.24,
// low_24h: 1.1,
// price_change_24h: 0.058847,
// price_change_percentage_24h: 5.13701,
// market_cap_change_24h: 2385506659,
// market_cap_change_percentage_24h: 4.48352,
// circulating_supply: 46513604835,
// total_supply: 100000000000,
// max_supply: 100000000000,
// ath: 3.4,
// ath_change_percentage: -64.48309,
// ath_date: "2018-01-07T00:00:00.000Z",
// atl: 0.00268621,
// atl_change_percentage: 44834.15693,
// atl_date: "2014-05-22T00:00:00.000Z",
// roi: null,
// last_updated: "2021-08-31T20:28:34.909Z"