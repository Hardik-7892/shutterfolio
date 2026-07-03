# Shutterfolio

A full photographer portfolio website with an admin panel to manage photos from any device.

**Portfolio sections:** Hero &bull; Gallery &bull; Services &bull; Testimonials &bull; About &bull; Contact &bull; Instagram

---

## Quick Start (1-Click Deploy)

⭐ If you find this project useful, please consider starring it!

### Step 1: Fork this repository (recommended)

Forking lets you:

- Keep your own copy of the project
- Receive future updates more easily
- Customize it without affecting the original

### Step 2: Create a Vercel account

If you don't already have one, create a Vercel account and connect it to your GitHub account.

### Step 3: Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHardik-7892%2Fshutterfolio&env=GITHUB_PAT,ADMIN_USERNAME,ADMIN_PASSWORD&project-name=shutterfolio&repository-name=shutterfolio)

Click the button above to:

1. **Create your own copy** of this repo to your GitHub account
2. **Deploy** it to Vercel (free)
3. **Set** environment variables when prompted

After deployment, your application will be available at your own Vercel URL, for example: `https://shutterfolio.vercel.app` and the admin panel is at `https://shutterfolio.vercel.app/manage/`.

> **Note:** Your deployment URL will be different from the example above unless you configure a custom domain.

---

## Setup: Generate a GitHub Token

The token is stored securely in Vercel environment variables &mdash; it **never touches your browser**.

### Option A: Fine-grained token (recommended)

1. Go to **GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens**
2. Click **Generate new token**
3. Set **Repository access** &rarr; **Only select repositories** &rarr; choose your repo
4. Under **Permissions &rarr; Contents** &rarr; set **Access: Read and write**
5. Click **Generate token** and copy it (starts with `github_pat_...`)

> If you rename your repo later, update the token's repository access or use a classic token instead.

### Option B: Classic token

1. Go to **GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Click **Generate new token (classic)**, check the **`repo`** scope
3. Click **Generate token** and copy it

## Environment Variables

When Vercel prompts you, set these:

| Variable | Value |
| --- | --- |
| `GITHUB_PAT` | your GitHub token from above |
| `ADMIN_USERNAME` | username for the admin panel |
| `ADMIN_PASSWORD` | password for the admin panel |
| `SESSION_SECRET` | long random string (OPTIONAL, default is your password) |

> **Repo info is auto-detected.** Vercel injects `VERCEL_GIT_REPO_OWNER`, `VERCEL_GIT_REPO_SLUG`, and `VERCEL_GIT_COMMIT_REF` automatically from your Git connection. You only need to set `GITHUB_PAT` and your admin credentials.

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
| --- | --- |
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

```bash
shutterfolio/
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

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
