# 📣 Real Social Publishing

The app simulates publishing by default (so the whole pipeline is demoable with no setup). To publish **for real**, connect an account with a valid **access token** — the Publishing agent then calls the platform's API.

**Implemented live today: Facebook Pages.** Others (Instagram, LinkedIn, X) need their own OAuth apps and are documented at the bottom.

---

## Facebook Page — step by step

You'll get a **Page access token** and paste it into the app. Posting then hits the Graph API `POST /me/feed`.

### 1. Create a Meta app
1. Go to **https://developers.facebook.com/apps** → **Create app**.
2. Choose use case **"Other"** → type **"Business"** → name it (e.g. `ASMA`).

### 2. Have a Facebook Page
- You must be an **admin** of a Facebook **Page** (create one at facebook.com/pages/create if needed).

### 3. Get a Page access token
1. Open **Graph API Explorer**: https://developers.facebook.com/tools/explorer
2. Top-right: select your app under **Meta App**.
3. Click **Get token → Get Page Access Token**. Approve the popup and select your Page.
4. Add permissions: **`pages_manage_posts`** and **`pages_read_engagement`** (click "Add a permission").
5. In the **User or Page** dropdown, switch from *User token* to your **Page** — the token field now shows the **Page access token**. Copy it.

> Tip: that token is short-lived (~1 hour). For a longer one, exchange it for a long-lived token (see Meta's "long-lived tokens" docs) — but the short one is fine to demo immediately.

### 4. Connect it in the app
1. Live app → **Accounts** → connect a new account:
   - Platform: **Facebook**
   - Label: your page name, Handle: anything (e.g. `@mypage`)
   - **Access token:** paste the Page access token
2. Save.

### 5. Publish
- **Compose** → set **Target account** to your Facebook page → **Run Full Campaign**.
- The post is sent to your Page's feed. Check the **Posts** page — `published` means success; `failed` shows the Graph API error (you can **Retry**).

### Common errors
- *"(#200) requires pages_manage_posts"* → re-get the token with that permission (step 3.4).
- *"Error validating access token… expired"* → tokens expire; get a fresh one or a long-lived token.
- Posting works only for Pages you admin (and, in dev mode, while you're a tester/admin of the app).

---

## Other platforms (not yet wired — what they need)

Each requires you to register a developer app and obtain a token; then we add the publish call:

| Platform | What's required |
|---|---|
| **Instagram** | A **Business/Creator** IG account linked to a Facebook Page + Meta app; publishing uses a 2-step media-container flow and **requires an image URL**. |
| **LinkedIn** | A LinkedIn app with the **Community Management API** / "Share on LinkedIn" product — requires LinkedIn **review/approval**; posting uses the author's URN. |
| **X / Twitter** | A developer account; posting via API v2 (`POST /2/tweets`) needs OAuth 2.0 user-context tokens. Free tier allows limited writes. |

The publishing layer (`backend/src/services/social.ts`) is structured so each platform is a small function using the connected account's token — tell the maintainer which platform you've obtained a token for and it can be wired the same way as Facebook.
