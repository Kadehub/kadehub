# Prompt: KadeHub Content Creator & Marketing Playbook (PDF)

Copy everything below the line into Claude Code (from the repo root) to regenerate the PDF.

---

You are a senior B2B SaaS growth marketer, short-form video strategist, and copywriter. Your job is to produce a **print-ready PDF playbook** that lets a video editor or content creator who has never seen KadeHub understand it completely and start producing marketing content the same day.

## Step 1 — Learn the product from the code (do not guess)

Read this repository before writing anything:

- `README.md`, `docs/PLATFORM.md`, `docs/DOCUMENTATION.md`, `docs/kadehub-product-brochure.html`, `docs/client-presentation.html`
- Frontend routes in `frontend/src/app/` — hub (`hub/`), POS (`(dashboard)/`, `landing/`), COD (`cod/`), Tasks (`tasks/`), `account/`, `apps/`, `subscribe/`
- Backend modules in `backend/src/modules/` and the package/pricing seed data and migrations
- Translation files (English, Sinhala, Tamil) for real UI wording
- Brand colours in `frontend/tailwind.config.js` / `globals.css`

Only describe features that exist in the code. Mark anything "coming soon" if the code says so. Use real prices and trial lengths from the code.

## Step 2 — Rules

- **Never name a country** ("Sri Lanka", "Sri Lankan") anywhere in the PDF. Say "local shops", "growing businesses", "your town". Currency (LKR) and language names (Sinhala, Tamil, English) are fine.
- Write for creators: plain words, short sentences, no developer jargon (no "NestJS", "JWT", "multi-tenant" — say "each shop's data is kept separate").
- Every hook must be speakable in under 3 seconds.
- Every script must say exactly what to show on screen, shot by shot.
- No fake testimonials, fake numbers or invented stats. Where proof is needed, give a placeholder like `[real customer name]` and tell the creator to collect it.

## Step 3 — PDF contents (in this order)

1. **Cover** — KadeHub, "Content Creator & Marketing Playbook", date.
2. **How to use this playbook** — 1 page, for a creator in a hurry.
3. **KadeHub in 60 seconds** — what it is, the one-line pitch, the hub + products model (POS, COD, Tasks), one account for everything.
4. **The problem we solve** — the daily pain of shop owners and online sellers, in their words.
5. **Product deep dives** — for each product: who it's for, top features as *feature → benefit → "show this on screen"*, pricing, trial.
6. **The "money" features to market first** — ranked, with why each one sells.
7. **Niches & target audiences** — each niche with: who they are, pain points, the KadeHub feature that fixes it, best platform, the hook angle, objections and answers.
8. **Customer personas** — 4–5 named personas with day-in-the-life.
9. **Messaging framework** — positioning statement, taglines, value props, words to use / avoid, tone of voice.
10. **Hook library** — 60+ hooks grouped by type (pain, curiosity, money, comparison, POV, challenge, myth-bust, local language).
11. **Ready-to-shoot video scripts** — at least 12 scripts (15–60 s Reels/TikTok/Shorts) plus 2 long-form YouTube outlines, each with hook, shot list, voice-over, on-screen text, CTA.
12. **Content pillars & 30-day content calendar** — table, day by day.
13. **Platform playbook** — TikTok, Instagram Reels, Facebook (pages + groups), YouTube, WhatsApp, LinkedIn: format, length, posting times, hashtags.
14. **Sales strategy** — funnel (awareness → trial → paid), offers, free trial push, door-to-door / shop demo script, WhatsApp follow-up scripts, referral/partner program idea, objection handling, pricing anchoring.
15. **Paid ads starter kit** — ad angles, primary text, headlines, audiences, budget split.
16. **Filming & editing guide** — screen-recording tips, demo flow, B-roll list, captions, thumbnails, music/pacing, brand colours and fonts.
17. **Do's and don'ts + brand rules** (including the no-country-name rule).
18. **KPIs to track** and a weekly review checklist.
19. **Appendix** — CTA bank, caption templates, hashtag sets, glossary, links (kadehub.com, pos./cod./tasks.kadehub.com).

## Step 4 — Build the PDF

- Generate with Python + ReportLab (Platypus), A4, using KadeHub brand colours, a clean modern font (Segoe UI on Windows), headers/footers with page numbers, a clickable table of contents, coloured callout boxes for hooks and scripts, and tables for calendars and niches.
- Save the generator script as `docs/marketing/build_playbook.py` and the output as `docs/marketing/KadeHub-Content-Creator-Playbook.pdf`.
- After building, render pages to PNG (PyMuPDF) and visually check for overflow, clipped tables, black boxes or broken glyphs. Fix and rebuild until clean.
- Finally, search the PDF text for "Sri Lanka" and confirm zero hits.
