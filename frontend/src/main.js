import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="container">
    <h1>PulseWire AI</h1>

    <div class="breaking">
      🚨 LIVE NEWS SYSTEM ONLINE
    </div>

    <div id="feed"></div>
  </div>
`

const feed = document.getElementById('feed')

const news = [
  'Breaking: Massive storm approaching Europe',
  'AI company announces new breakthrough',
  'Emergency alerts activated in Athens',
  'Gaming industry shocked by major leak',
  'Scientists reveal major discovery',
]

function addNews() {
  const item = document.createElement('div')

  item.className = 'card'

  item.innerHTML = `
    <h2>${news[Math.floor(Math.random() * news.length)]}</h2>
    <p>Realtime AI-generated summary appearing live.</p>
  `

  feed.prepend(item)
}

addNews()

setInterval(addNews, 3000)