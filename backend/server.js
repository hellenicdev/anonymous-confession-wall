const express = require('express')
const cors = require('cors')
const Parser = require('rss-parser')

const app = express()
const parser = new Parser()

app.use(cors())

const FEEDS = [
  {
    name: "BBC",
    url: "https://feeds.bbci.co.uk/news/rss.xml"
  },
  {
    name: "NYTimes",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
  },
  {
    name: "TechCrunch",
    url: "https://feeds.feedburner.com/TechCrunch"
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml"
  }
]

// health check
app.get('/', (req, res) => {
  res.json({ status: "PulseWire API running 🚀" })
})

// main news endpoint
app.get('/api/news', async (req, res) => {
  try {
    let all = []

    for (const feed of FEEDS) {
      const data = await parser.parseURL(feed.url)

      const items = data.items.slice(0, 5).map(item => ({
        title: item.title,
        link: item.link,
        source: feed.name,
        published: item.pubDate || null
      }))

      all.push(...items)
    }

    // shuffle slightly + limit
    all = all
      .sort(() => Math.random() - 0.5)
      .slice(0, 25)

    res.json(all)

  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: "Failed to fetch RSS feeds"
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`PulseWire API running on port ${PORT}`)
})
