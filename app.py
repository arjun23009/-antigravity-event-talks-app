import os
import time
from flask import Flask, jsonify, render_template, request
import feedparser

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple cache dictionary
feed_cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def fetch_feed_data(force_refresh=False):
    now = time.time()
    
    # Check if cache is valid and we are not forcing refresh
    if not force_refresh and feed_cache["data"] is not None and (now - feed_cache["last_fetched"] < CACHE_DURATION):
        return feed_cache["data"], False

    try:
        # Fetch and parse the feed
        feed = feedparser.parse(FEED_URL)
        entries = []
        
        for entry in feed.entries:
            # Get content, falling back to summary if content is not present
            content_val = ""
            if hasattr(entry, 'content') and len(entry.content) > 0:
                content_val = entry.content[0].value
            elif hasattr(entry, 'summary'):
                content_val = entry.summary
            
            entries.append({
                "id": getattr(entry, 'id', ''),
                "title": getattr(entry, 'title', ''),
                "link": getattr(entry, 'link', ''),
                "updated": getattr(entry, 'updated', ''),
                "content": content_val
            })
            
        feed_cache["data"] = entries
        feed_cache["last_fetched"] = now
        return entries, True
    except Exception as e:
        # Fall back to cache if feed parsing fails
        if feed_cache["data"] is not None:
            return feed_cache["data"], False
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def api_release_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        entries, fetched_new = fetch_feed_data(force_refresh)
        return jsonify({
            "status": "success",
            "fetched_new": fetched_new,
            "last_fetched": feed_cache["last_fetched"],
            "data": entries
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    # In production/deployment host should be 0.0.0.0, port can be set by env
    app.run(host="127.0.0.1", port=5000, debug=True)
