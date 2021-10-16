const submitButton = document.querySelector('#submit');
const input = document.getElementById('input');
const errorSpan = document.querySelector('#error');
const resultsContainer = document.querySelector('#results');

const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids='

//let coin; //input for single coins
const coins = [] //array with data
const allCoins = [] //for filter

///////////////////////////////////////////////////////////////////////////////////
// search = input
const matchList = document.getElementById('match-list');
const dropDownAllList = document.querySelector('.droppedCoins')
const searchCoins = async searchText => {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=');
    const dropDownCoins = await res.json();
    //console.log(states)

    let matches = dropDownCoins.filter(state => {

        const regex = new RegExp(`^${searchText}`, 'gi');
        return state.name.match(regex) || state.id.match(regex)
    });
    if (searchText.length === 0){
        matches = [];
        matchList.innerHTML = '';
    } 
    
    //console.log(matches)
    
    outputHtml(matches);
}

const outputHtml = matches => {
    if(matches.length > 0){
        const html = matches.map(match =>`
        <div class='dropDown' onClick="getData('${match.id}')" >
        <img class='dropImg' src= ${match.image}>
        <span class='droppedCoins' value='${match.id} '>
        ${match.id} (${match.name})
        </span>
        </div>
        `).join('')
       // console.log(html)
        matchList.innerHTML = html;
        
    }
}


input.addEventListener('input', () => searchCoins(input.value))


///////////////////////////////////////////////////////////////////////////////////
const toggleUI = () => {
    submitButton.disabled = !submitButton.disabled
    input.disabled = !input.disabled
}

const checkInput = () => {
    if (input.value.length != 0) {
        getData()
        console.log('input full')
    } else {
        emptyArray(coins)
        console.log('input is empty')
        coin = ''
    }
}
///////////////////////////////////////////////////////////////////////////////////

const getData = async (coin) => {

  //  coin = input.value.toLowerCase();
  
    if (coin != ' ') {

        const json = await (await fetch(`${url}${coin}`)).json()
        takeParameters(json)
        createDataColumns(json)
        input.value = '';
        displayTable();
        //console.log(json)
    }  
}

const displayTable = () => {
    document.querySelector('#table').style.display = 'block';
    matchList.innerHTML = '';

}
const takeCoins = data => data.forEach(d => { allCoins.push(d.name) ,console.log(allCoins) })

const takeParameters = data => {

    data.forEach(p => {
        coins.push(
          
            new Intl.NumberFormat().format(p.current_price),
            p.symbol.toUpperCase(),
            p.image = `<img class='holdOnScroll' src = ${p.image}>`,
            p.market_cap_rank,
            new Intl.NumberFormat().format(p.market_cap),
            new Intl.NumberFormat().format(p.fully_diluted_valuation),
            new Intl.NumberFormat().format(p.total_volume),
            new Intl.NumberFormat().format(p.high_24h),
            new Intl.NumberFormat().format(p.low_24h),
            new Intl.NumberFormat().format(p.price_change_24h),
            p.price_change_percentage_24h,
            new Intl.NumberFormat().format(p.market_cap_change_24h),
            p.market_cap_change_percentage_24h,
            new Intl.NumberFormat().format(p.circulating_supply),
            new Intl.NumberFormat().format(p.total_supply),
            new Intl.NumberFormat().format(p.max_supply),
            new Intl.NumberFormat().format(p.ath),
            p.ath_change_percentage,
            new Date(p.ath_date).toLocaleDateString(),
            new Intl.NumberFormat().format(p.atl),
            p.atl_change_percentage,
            new Date(p.atl_date).toLocaleDateString(),
            new Date(p.last_updated).toLocaleTimeString()
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
const emptyArray = (array) => (array.length = 0);

const handleKeyEvent = e => { e.key === 'Enter' || e.key === 13 ? getData() : null }
const submitByEnterKey = () => {
    input.addEventListener('keydown', handleKeyEvent);
    //handleKeyEvent for keydown to stop to fire function every key is down
    submitButton.addEventListener('click', getData);
}

submitByEnterKey();