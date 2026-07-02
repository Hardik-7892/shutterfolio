# Photobase

A full photographer portfolio website with an admin panel to manage photos from any device.

**Portfolio sections:** Hero &bull; Gallery &bull; Services &bull; Testimonials &bull; About &bull; Contact &bull; Instagram

---

## Quick Start (1-Click Deploy)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHardik-7892%2Fphotobase&env=GITHUB_OWNER,GITHUB_REPO,GITHUB_BRANCH,GITHUB_PAT&project-name=photobase&repository-name=photobase)

Click the button above to:

1. **Fork** this repo to your GitHub account
2. **Deploy** to Vercel (free)
3. **Set** environment variables when prompted

After deployment, your site is live at `https://photobase-xxx.vercel.app` and the admin panel is at `https://photobase-xxx.vercel.app/manage/`.

---

## Setup: Generate a Fine-Grained GitHub Token

The token is stored securely in Vercel environment variables &mdash; it **never touches your browser**.

1. Go to **GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens**
2. Click **Generate new token**
3. Set **Repository access** &rarr; **Only select repositories** &rarr; choose your photobase repo
4. Under **Permissions &rarr; Contents** &rarr; set **Access: Read and write**
5. Click **Generate token**
6. **Copy the token** &mdash; it starts with `github_pat_...`

> Or use a classic token with `repo` scope if you prefer, but fine-grained is recommended for security.

## Environment Variables

When Vercel prompts you, set these:

| Variable | Value |
|---|---|
| `GITHUB_OWNER` | your GitHub username |
| `GITHUB_REPO` | `photobase` (or your repo name) |
| `GITHUB_BRANCH` | `main` (or your branch name) |
| `GITHUB_PAT` | the fine-grained token |

You can also change them later in **Vercel Dashboard &rarr; Project &rarr; Settings &rarr; Environment Variables**.

## Admin Features

- **Add photos** &mdash; drag-and-drop or click to select an image, fill in title/category
- **Reorder** &mdash; drag cards by the handle to rearrange order
- **Edit** &mdash; click Edit on any card to change title, category, or description
- **Delete** &mdash; click Delete to remove a photo
- **Save** &mdash; click **Save Changes** to commit everything to your GitHub repo

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

> **Sample images** are provided in `assets/images/samples/` and referenced in `settings.json`, `gallery.json`, and `index.html`. These are placeholders &mdash; replace them with your own photos.

**To add your own images:**
1. Place your image files directly in `assets/images/` (for example, `assets/images/hero.jpg`)
2. Update the path in `settings.json`, `gallery.json`, or `index.html` to point to your file
3. The admin panel will also upload new photos to `assets/images/` automatically

## File Structure

```
photobase/
|-- index.html        Portfolio page (all sections, Alpine.js)
|-- style.css         Global styles
|-- settings.json     Customizable portfolio content
|-- gallery.json      Photo data (edit via /manage/)
|-- manage/
|   |-- index.html    Admin page
|   |-- app.js        Admin logic
|-- api/
|   |-- gallery.js    API route: load/save gallery.json
|   |-- upload.js     API route: upload images
|   |-- settings.js   API route: load settings.json
|-- lib/
|   |-- github.js     Shared GitHub API client
|   |-- validation.js Server-side file validation
|-- assets/
    |-- images/
        |-- samples/  Sample/demo images (replace with yours)
        |-- ...
```

## Customization

- **Colors:** Edit CSS variables in `style.css` (`--text`, `--bg`, `--border`, `--header-height`)
- **Masonry columns:** Adjust `columns: 3` in `.photo-grid` (also has responsive breakpoints)
- **Section order:** Rearrange `<section>` blocks in `index.html`
- **Hero photo:** Set `hero.background` in `settings.json`

## License

MIT
