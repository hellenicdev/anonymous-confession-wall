async function loadNews() {
  const res = await fetch('https://niobic-omari-boastingly.ngrok-free.dev/api')
  const data = await res.json()

  feed.innerHTML = ''

  data.forEach(item => {
    const div = document.createElement('div')

    div.className = 'card'

    div.innerHTML = `
      <h2>${item.title}</h2>
      <p>${item.source}</p>
    `

    feed.appendChild(div)
  })
}

loadNews()
setInterval(loadNews, 10000)
