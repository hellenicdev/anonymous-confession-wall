from random import randint


def summarize_article(title, description):
    summary = description[:140]

    return {
        "summary": summary,
        "credibility": randint(70, 99)
    }