# 📖 User Guide

A step-by-step guide to running and using the **Autonomous Social Media Agent**. No prior experience needed — the app runs fully offline in mock mode, so you can explore every feature without any API keys.

> There is also an in-app version of this guide — click **Guide** in the dashboard sidebar.

---

## 1. Start the app

Open a terminal **in the project folder** (the path has spaces, so keep the quotes):

```bash
cd "C:\Users\DELL\Desktop\AI Manager\Asur\Autonomous Social Media Agent"
npm install      # only needed the first time
npm run dev
```

Then open:
- **Dashboard** → http://localhost:3000
- **API** → http://localhost:4000 (e.g. http://localhost:4000/api/health)

Press **Ctrl + C** in the terminal to stop. To run only one side: `npm run dev:backend` or `npm run dev:frontend`.

---

## 2. The dashboard at a glance

The left sidebar has everything:

| Page | What it's for |
|------|---------------|
| **Dashboard** | Overall stats + agent fleet status + the Manual vs AI vs Autonomous comparison |
| **Compose** | The main workflow — generate a draft or run a full automated campaign |
| **Posts** | Every post the agent has created, with engagement |
| **Analytics** | Performance breakdown + the research comparison table |
| **Trends** | Content ideas from the Trend Detection engine |
| **Memory** | Search the AI's long-term memory (RAG / self-learning) |
| **Accounts** | Connect the client social accounts you want to automate |
| **Media** | Upload, generate, and manage images |
| **Agents** | Status and run counts of all 6 agents |
| **Guide** | This guide, inside the app |

---

## 3. Connect a client's social account

Go to **Accounts**.

1. In **Connect a new account**, choose the **Platform** (LinkedIn, Instagram, Facebook, X/Twitter, Threads, Pinterest).
2. Enter the **Handle** (e.g. `bright_smile`) and a **Label / Brand name** (e.g. `Bright Smile Dental`) — this is how you'll recognize the client.
3. **Access token** is optional:
   - Leave it **blank** → the account works in **demo (mock)** mode — perfect for testing.
   - Paste a real token → the system is ready to publish live to that platform.
4. Click **Connect**. The account appears below.

For each connected account you can:
- **Pause / Activate** — paused accounts can't be used for campaigns.
- **Disconnect** — removes the account (asks for confirmation).

Accounts are saved to disk (`data/accounts.json`), so they persist across restarts. Tokens are stored server-side and never shown — you only ever see a masked value.

---

## 4. Use the Media Library

Go to **Media**. Two ways to add an image:

- **Upload** — click Upload and choose an image (PNG, JPEG, WEBP or GIF, up to 5 MB).
- **Generate** — type a prompt (e.g. "modern dental clinic interior"), optionally set a business type and platform, and click Generate. The **Image Agent** creates a visual. *(In mock mode this returns a placeholder image; with an image API key configured it generates a real one.)*

Each image card shows whether it was **uploaded** or **generated**, the prompt used, and a **Delete** button. Uploaded files are removed from disk when you delete them.

You can attach any of these images to a post on the Compose page (see next section).

---

## 5. Run a campaign (the main feature)

Go to **Compose**. This is where the agents work together.

1. **Business Type** — e.g. `Dental Clinic`
2. **Goal** — e.g. `Generate Leads`
3. **Tone** — Professional, Friendly, Witty, Inspirational, or Bold
4. **Platform** — pick one, **or** choose a **Target account** (then the account's platform is used automatically)
5. **Image** — leave on **Auto-generate**, or choose **Attach from library** to pick one of your media assets
6. Click one of:
   - **Generate Draft** → runs **Content → SEO → Image** and shows you the post, image, hashtags and SEO score *without publishing*.
   - **Run Full Campaign** → runs **all 6 agents** end-to-end and publishes.

After **Run Full Campaign** you'll see:
- The **agent timeline** — each agent, in order, with how long it took.
- The **published post** (text, hashtags, image, platform, scheduled time).
- **Analytics** — reach, impressions, clicks, likes, engagement rate.
- **Recommendations** — concrete suggestions for next time.

The new post now shows up on the **Posts** page, and its outcome is stored in **Memory**.

---

## 6. What the 6 agents do

1. **Content Agent** — writes the post + hashtags. First it *recalls* your best past posts from memory (RAG) and uses them as inspiration.
2. **SEO Agent** — extracts keywords, pulls trending topics, scores the content 0–100.
3. **Image Agent** — creates (or reuses) a visual for the post.
4. **Publishing Agent** — saves the post, schedules it for the platform's best hour, and publishes.
5. **Analytics Agent** — measures performance (reach, clicks, likes, engagement).
6. **Recommendation Agent** — proposes improvements **and writes the result back into memory** so the next post is smarter. This is the **auto-learning loop**.

---

## 7. Analytics & the research comparison

Go to **Analytics**:
- **Totals** — posts, reach, impressions, clicks, average engagement.
- **By platform** — engagement per platform.
- **Manual vs AI vs Autonomous** — the thesis comparison. The *Autonomous* number is the live average your system is achieving; *Manual* and *AI Generated* are study baselines you can adjust. See [`docs/research.md`](docs/research.md).

---

## 8. AI Memory (RAG / self-learning)

Go to **Memory** and search something like `dental leads`. You'll see the most similar past posts with a similarity score and their recorded engagement. This is the same memory the Content Agent reads from before writing — proof that the system **learns from what performed well**.

---

## 9. Mock mode vs Live mode

By default everything runs in **mock mode** — no API keys, fully offline, nothing is posted to real networks. To go live, copy `.env.example` to `.env` and fill in what you need:

| To enable… | Set in `.env` |
|---|---|
| Real AI copy | `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (or `openai` + `OPENAI_API_KEY`) |
| Real image generation | `IMAGE_PROVIDER=openai`/`stability` + key |
| Real publishing | the platform access tokens (also set the token when connecting the account) |
| A real database | `DB_PROVIDER=postgres` + `DATABASE_URL` (schema in `db/schema.sql`) |
| Real vector memory | `VECTOR_PROVIDER=chroma` |

Restart the app after editing `.env`.

---

## 10. Troubleshooting

- **`npm error ... package.json not found`** → you're in the wrong folder. `cd` into the project directory first (step 1).
- **Dashboard shows "couldn't reach the API"** → the backend isn't running. Start it with `npm run dev` (or `npm run dev:backend`).
- **Port already in use** → another instance is running. Close the other terminal, or change `PORT` in `.env`.
- **Want a clean slate** → stop the app and delete `data/accounts.json`, `data/media.json` and the `data/uploads/` folder.
