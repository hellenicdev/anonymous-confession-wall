import feedparser

RSS_FEEDS = [
    'http://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'https://feeds.feedburner.com/TechCrunch/'
]


def fetch_articles():
    articles = []

    for url in RSS_FEEDS:
        feed = feedparser.parse(url)

        for entry in feed.entries[:5]:
            articles.append({
                'title': entry.title,
                'description': entry.get('summary', ''),
                'source': feed.feed.title,
            })

    return articles