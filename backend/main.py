from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from socketio import ASGIApp
import asyncio

from websocket_manager import sio
from rss_fetcher import fetch_articles
from ai import summarize_article

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/')
async def root():
    return {
        'status': 'PulseWire AI backend running'
    }


async def news_loop():
    while True:
        articles = fetch_articles()

        for article in articles:
            ai = summarize_article(
                article['title'],
                article['description']
            )
socket_app = ASGIApp(sio, app)