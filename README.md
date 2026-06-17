# BigQuery Release Navigator

A premium, interactive web application built with **Python Flask** and **Vanilla HTML/CSS/JS** that fetches, formats, and displays the official Google Cloud BigQuery release notes feed. It features a built-in X/Twitter Composer widget for sharing specific updates seamlessly.

👉 Live local development server default: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## ✨ Features

*   🔄 **Smart In-Memory Caching:** Automatically caches Google Cloud feed responses for **5 minutes** to prevent rate limits and speed up page loading. Bypasses the cache instantly via the refresh button.
*   🧩 **Granular Update Parser:** Automatically breaks down daily feed entries (which often bundle multiple updates) into **individual release cards** categorized by update type.
*   🔍 **Instant Filter & Search:**
    *   **Full-Text Search:** Instantly matches titles, dates, or content descriptions.
    *   **Type Badges:** Quickly filter by update types: **Feature** (🚀), **Announcement** (📢), **Issue** (⚠️), **Deprecation** (🛑), or **General** (⚡).
*   🐦 **Interactive X/Twitter Composer:**
    *   Generates a formatted tweet preview on selecting any card.
    *   Calculates characters according to official Twitter guidelines (counting all URLs as exactly 23 characters).
    *   Visualizes space constraints with a custom **SVG progress ring** indicator.
    *   Allows text customisation prior to posting via Twitter Web Intent.
*   🎨 **Premium Aesthetic:** Features a customized dark mode design with glassmorphism layout, smooth animations, customized scrollbars, and vibrant visual hierarchy.

---

## 🛠️ Tech Stack

*   **Backend:** Python 3.x, Flask, requests, feedparser
*   **Frontend:** Vanilla HTML5, Vanilla CSS3 (custom grids, variables, flexbox), ES6+ JavaScript (DOMParser API)
*   **Icons:** Font Awesome 6

---

## 📂 Project Structure

```text
bigquery-release-notes/
├── templates/
│   └── index.html      # Responsive dashboard skeleton and layout
├── static/
│   ├── style.css       # Glassmorphism UI styles and animations
│   └── app.js          # Client-side parsing, filters, and composer logic
├── app.py              # Flask backend server with feed caching
├── requirements.txt    # Python dependencies
└── README.md           # Documentation
```

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.8 or higher installed on your machine.
*   Pip package manager.

### Installation & Setup

1.  **Clone or navigate to the directory:**
    ```bash
    cd C:\Users\Asus\bigquery-release-notes
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Flask application:**
    ```bash
    python app.py
    ```

4.  **Open in your browser:**
    Access the app at [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

---

## 📜 License
Distributed under the MIT License. See local files for details.
