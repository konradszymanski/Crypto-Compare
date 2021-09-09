const submitButton = document.querySelector('#submit');
const input = document.getElementById('input');
const errorSpan = document.querySelector('#error');
const resultsContainer = document.querySelector('#results');
const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='

let coin; //input for single coins
let coins = [] //array with data
let allCoins = [] //for filter

///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////

const unableUI = () => {
    submitButton.disabled = false;
    input.disabled = false;

}
const enableUI = () => {
    submitButton.disabled = true;
    input.disabled = true;
}
const checkInput = value => {
    value = input.value;
    if (value.length != 0) {
        getData()
        console.log('full')
    } else {
        emptyArray(coins)
        console.log('empty')
        coin = ' '
    }
}

const getData = async () => {

    coin = input.value.toLowerCase();
    if (coin != ' ') {
        const json = await fetch(`${url}${coin}`)
        const res = await json.json()
       // console.log(res)
        takeParameters(res)
        createDataColumns(res)
        input.value = ' ';
        displayTable();
    }
}
const displayTable = () => {
    document.querySelector('#table').style.display = 'block'
}
const takeCoins = data =>{
    data.forEach(d => {
        allCoins.push(d.name)
    })
}

const takeParameters = data => {

    data.forEach(p => {
        coins.push(
            p.symbol.toUpperCase(),
            p.current_price,
            p.image = `<img class='holdOnScroll' src = ${p.image}>`,
            p.market_cap_rank,
            p.market_cap,
            p.fully_diluted_valuation,
            p.total_volume,
            p.high_24h,
            p.low_24h,
            p.price_change_24h,
            p.price_change_percentage_24h,
            p.market_cap_change_24h,
            p.market_cap_change_percentage_24h,
            p.circulating_supply,
            p.total_supply,
            p.max_supply,
            p.ath,
            p.ath_change_percentage,
            p.ath_date.toString().slice(0,10),
            p.atl,
            p.atl_change_percentage,
            p.atl_date.toString().slice(0,10),
            p.last_updated.toString().slice(11,19)
        )
    })
}

const button = document.getElementById('change');
const table = document.querySelector('#table .cryptoContainer');

const createDataColumns = data => {
    const header = document.querySelector('#table .cryptoHeader');
    const newDiv = document.createElement('td');
    newDiv.innerHTML = data[0].name;
    header.appendChild(newDiv);
    //console.log(coins)
    let rows = document.querySelectorAll('#table .cryptoContainer .cryptoColumn');
    for (let i = 1; i < (rows.length, coins.length + 1); i++) {
        let row = rows[i];
        let newDiv = document.createElement('td');
        newDiv.setAttribute('class', 'dataCell')
        newDiv.innerHTML = coins[i - 1];
        // setTimeout(function (){
        //     row.appendChild(newDiv);
        // },150*i)
        row.appendChild(newDiv);
    }
    emptyArray(coins)
}
const emptyArray = (array) => {
    return array.length = 0;
}

submitButton.addEventListener('click', checkInput)

