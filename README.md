# Photobase

A full photographer portfolio website that works on GitHub Pages — with an admin panel to manage photos.

**Portfolio sections:** Hero • Gallery • Services • Testimonials • About • Contact • Instagram

---

## Quick Start

1. **Fork** this repo or push it to your GitHub account
2. Go to **Settings > Pages** and enable GitHub Pages from the `main` branch root
3. Your site is live at `https://your-username.github.io/photobase/`
4. Open `https://your-username.github.io/photobase/manage/` to start adding photos

---

## Setup: Generate a GitHub Token

1. Go to **GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name like `Photobase`
4. Under **Expiration**, choose **No expiration**
5. Under **Scopes**, check **`repo`** (full control of private repositories)
6. Click **Generate token**
7. **Copy the token** — it starts with `github_pat_...` or `ghp_...`

## Connect the Admin

Open `https://your-username.github.io/photobase/manage/` and enter:

| Field | Value |
|---|---|
| Repository Owner | your GitHub username |
| Repository Name | `photobase` |
| Branch | `main` |
| Personal Access Token | the token you generated |

Click **Connect**.

## Admin Features

- **Add photos** — drag-and-drop or click to select an image, fill in title/category
- **Reorder** — drag cards by the handle (⠿) to rearrange order
- **Edit** — click Edit on any card to change title, category, or description
- **Delete** — click Delete to remove a photo
- **Save** — click **Save Changes** to commit everything to your repo

---

## Customizing Your Portfolio

Edit **`settings.json`** to personalize your site:

| Field | What it controls |
|---|---|
| `site.title` | Browser tab title |
| `photographer.name` | Displayed in hero, nav, and footer |
| `photographer.tagline` | Subtitle under your name in the hero |
| `photographer.bio` | About section text |
| `hero.background` | Hero background image URL |
| `social.*` | Social media profile links |
| `contact.email` | Contact email address |
| `services` | List of services/cards |
| `testimonials` | Client testimonials with name, text, avatar |
| `instagram.username` | Instagram handle (links to your profile) |

Placeholder image paths (like `assets/images/hero.jpg`, `assets/images/urban-pulse.jpg`) are used in settings.json and gallery.json. Replace them with your own images by placing files in `assets/images/`.

## File Structure

```
photobase/
├── index.html        Portfolio page (all sections, Alpine.js)
├── style.css         Global styles
├── settings.json     Customizable portfolio content
├── gallery.json      Photo data (edit via /manage/)
├── manage/
│   ├── index.html    Admin page
│   └── app.js        Admin logic (GitHub API)
└── assets/
    └── images/       Uploaded photos
```

## Customization

- **Colors:** Edit CSS variables in `style.css` (`--text`, `--bg`, `--border`, `--header-height`)
- **Masonry columns:** Adjust `columns: 3` in `.photo-grid` (also has responsive breakpoints)
- **Section order:** Rearrange `<section>` blocks in `index.html`
- **Hero photo:** Set `hero.background` in `settings.json`

## License

MIT
