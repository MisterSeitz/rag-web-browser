# 🌐 RAG Web Browser

**Give your AI agent live web access.** This Apify Actor searches Google, scrapes the top result pages, and returns clean Markdown (or plain text / HTML) ready for LLM consumption. Optional **chunked output** splits content into embedding-ready segments for direct ingestion into vector databases.

Built for **OpenAI Assistants, custom GPTs, LangChain, CrewAI, LlamaIndex**, and any RAG pipeline that needs real-time web data.

---

## Quick Start

### 1. Run via Apify API (one-liner)

```bash
curl -X POST "https://api.apify.com/v2/acts/YOUR_USERNAME~rag-web-browser/runs?token=YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "latest AI news 2026", "maxResults": 3}'
```

### 2. Run via Apify Client (Node.js)

```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_API_TOKEN' });
const run = await client.actor('YOUR_USERNAME/rag-web-browser').call({
    query: 'best practices for RAG pipelines',
    maxResults: 3,
    outputFormats: ['markdown'],
});
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items[0].markdown);
```

### 3. Run via Apify Client (Python)

```python
from apify_client import ApifyClient

client = ApifyClient("YOUR_API_TOKEN")
run = client.actor("YOUR_USERNAME/rag-web-browser").call(
    run_input={"query": "best practices for RAG pipelines", "maxResults": 3}
)
for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(item["markdown"][:500])
```

---

## Main Features

| Feature | Description |
| :--- | :--- |
| **Real-Time Grounding** | Queries Google Search for up-to-date information — no stale training data. |
| **Clean Markdown Output** | Strips navigation, ads, modals, and scripts. Returns LLM-ready Markdown. |
| **Chunked Output for RAG** | Optionally splits each page into overlapping chunks, perfect for embedding into vector DBs. |
| **Hybrid Scraping** | Fast `raw-http` mode by default; falls back to full Playwright browser for JS-heavy sites. |
| **Standby / HTTP Mode** | Run as a persistent HTTP service with a `/search` endpoint for real-time queries. |
| **MCP Support** | Built-in Model Context Protocol server for native AI tool integration. |
| **OpenAPI Spec Included** | Plug directly into OpenAI custom GPTs as an Action. |

---

## 💰 Pay-per-Event (PPE) Pricing

You pay only for the pages you actually get — no CU charges for the Actor run itself.

| Event Name | Title | Unit | Price | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page-crawled` | Page crawled | Per page | **$0.007** | Charged each time a web page is successfully crawled and its content is extracted. Failed or skipped pages are not charged. |

**Example cost:** A search with `maxResults: 3` that successfully scrapes all 3 pages costs **$0.021**.

**Cost comparison vs. alternatives:**

| Service | Typical cost (3 results) | Clean Markdown | Chunking | Proxy included |
| :--- | :--- | :--- | :--- | :--- |
| **This Actor** | **~$0.021** | Yes | Yes | Yes |
| Tavily Search API | ~$0.005 (snippets only) | Partial | No | N/A |
| SerpAPI | ~$0.01 (SERP only) | No | No | Yes |
| Brave Search API | ~$0.005 (snippets only) | No | No | N/A |

---

## ⚙️ Input Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `query` | string | *(required)* | Google Search keywords **or** a specific URL to scrape. Supports [advanced operators](https://blog.apify.com/how-to-scrape-google-like-a-pro/). |
| `maxResults` | integer | `3` | Number of top SERP results to scrape (1–100). Ignored when `query` is a URL. |
| `outputFormats` | array | `["markdown"]` | One or more of: `text`, `markdown`, `html`. |
| `scrapingTool` | string | `raw-http` | `raw-http` (fast) or `browser-playwright` (handles JS-heavy sites). |
| `requestTimeoutSecs` | integer | `40` | Max seconds for the entire request. |
| `maxRequestRetries` | integer | `1` | Retries per target page on failure. |
| `removeCookieWarnings` | boolean | `true` | Attempt to dismiss cookie consent dialogs. |
| `debugMode` | boolean | `false` | Include timing/debug info in output. |

---

## 📤 Output Format

Each result in the dataset is a JSON object:

```json
{
  "metadata": {
    "url": "https://example.com/article",
    "title": "Example Article Title",
    "description": "Meta description of the page",
    "author": "Jane Doe",
    "languageCode": "en"
  },
  "searchResult": {
    "title": "Example Article Title",
    "description": "Google snippet for this result",
    "url": "https://example.com/article",
    "resultType": "ORGANIC",
    "rank": 1
  },
  "markdown": "# Example Article Title\n\nThe full content of the page in clean Markdown...",
  "text": null,
  "html": null,
  "query": "example search query"
}
```

---

## 🔗 Integration Examples

### OpenAI Assistants / Custom GPTs

This Actor ships with an [OpenAPI specification](.actor/openapi.json) you can import directly as a **GPT Action**:

1. In the GPT editor, go to **Configure → Actions → Create new action**.
2. Import the schema from `.actor/openapi.json`.
3. Set the server URL to your Standby endpoint or the Apify API.
4. Your GPT can now call `searchWeb` to get live search results.

### LangChain (Python)

```python
from langchain_community.utilities import ApifyWrapper

apify = ApifyWrapper()
loader = apify.call_actor(
    actor_id="YOUR_USERNAME/rag-web-browser",
    run_input={"query": "LangChain RAG tutorial", "maxResults": 3},
    dataset_mapping_function=lambda item: item.get("markdown", ""),
)
docs = loader.load()
# docs is a list of Document objects ready for your chain
```

### CrewAI

```python
from crewai_tools import ApifyActorTool

search_tool = ApifyActorTool(
    actor_id="YOUR_USERNAME/rag-web-browser",
    input={"query": "{query}", "maxResults": 3},
    output_key="markdown",
)
# Use search_tool in your CrewAI agent definition
```

### LlamaIndex

```python
from llama_index.readers.apify import ApifyActor

reader = ApifyActor("YOUR_USERNAME/rag-web-browser")
documents = reader.load_data(
    run_input={"query": "vector database comparison 2026", "maxResults": 5}
)
# Feed documents into your LlamaIndex pipeline
```

### Direct HTTP (Standby Mode)

When the Actor runs in Standby mode, query it like any REST API:

```bash
curl "https://YOUR_STANDBY_URL/search?query=latest+AI+news&maxResults=3"
```

---

## 🤖 Use Cases

- **Ground LLM responses** with fresh web data to eliminate hallucinations
- **Build research agents** that autonomously gather and synthesize information
- **Power AI chatbots** with real-time search (like ChatGPT's browse feature)
- **Feed RAG pipelines** with up-to-date documents for question answering
- **Monitor topics** by periodically searching and extracting content
- **Create datasets** of clean web content for fine-tuning or evaluation

---

## License

ISC
