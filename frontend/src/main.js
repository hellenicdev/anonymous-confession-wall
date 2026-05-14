import './style.css'

document.querySelector('#app').innerHTML = `
  <div class="container">

    <header>
      <h1>PulseWire AI</h1>
      <p class="subtitle">Realtime Global News</p>
    </header>

    <div class="status">
      LIVE NEWS STREAM
    </div>

    <div id="feed"></div>

  </div>
`

const feed = document.getElementById('feed')

async function loadNews() {
  try {
    const response = await fetch(
      'https://YOUR-RENDER-BACKEND.onrender.com/api/news'
    )

    const articles = await response.json()

    feed.innerHTML = ''

    articles.forEach(article => {
      const card = document.createElement('div')

      card.className = 'card'

      card.innerHTML = `
        <h2>${article.title}</h2>

        <div class="meta">
          ${article.source}
        </div>

        <a href="${article.link}" target="_blank">
          Open Article
        </a>
      `

      feed.appendChild(card)
    })
  } catch (err) {
    feed.innerHTML = `
      <div class="error">
        Failed to load live news backend.
      </div>
    `
  }
}

loadNews()

setInterval(loadNews, 60000)
