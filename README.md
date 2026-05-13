# Minima

**The invisible mechanics of Machine Learning, made visible.**

Minima is an open-source, interactive curriculum for machine learning. Each lesson pairs readable **MDX** with **client-side sandboxes** so readers can manipulate data, hyperparameters, and geometry directly in the browser—without opaque black boxes.

The project is intentionally **minimal**: typography-first dark UI, **SVG-first** visualizations, and TypeScript strictness so contributors can extend lessons with confidence.

---

## Table of contents

- [Why Minima](#why-minima)
- [What exists today](#what-exists-today)
- [Roadmap & what is next](#roadmap--what-is-next)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Adding a new lesson](#adding-a-new-lesson)
- [Authoring & visualization guidelines](#authoring--visualization-guidelines)
- [Deployment (Vercel)](#deployment-vercel)
- [Contributing](#contributing)
- [License](#license)

---

## Why Minima

- **Geometry over jargon:** Distance, clustering, and voting are shown as motion and color, not only equations.
- **Static where possible:** Lesson routes are generated from files on disk; interactive pieces are small **React client islands** inside MDX.
- **Teachable codebase:** New modules should be self-contained—one MDX file, one (optional) visualizer component, one route slug.

---

## What exists today

| Era | Status | Lessons |
| --- | --- | --- |
| **Classical** | Active | [K-Means clustering](https://github.com/hasibullah1811/minima/blob/main/content/classical/k-means.mdx) · [K-Nearest Neighbors](https://github.com/hasibullah1811/minima/blob/main/content/classical/knn.mdx) |
| **Tree** | Planned | — |
| **Neural** | Planned | — |
| **Modern** | Planned | — |

**Highlights**

- **K-Means sandbox:** Adjustable *k*, dataset shapes (random, two moons, concentric rings), manual centroid “god mode,” Voronoi boundaries (`d3-delaunay` for path math only), inertia, trails, and more.
- **KNN sandbox:** Draggable query point, *k* slider, Euclidean / Manhattan distance, optional weighted voting, low-resolution decision heatmap, and a live vote scoreboard.

---

## Roadmap & what is next

Short-term goals (good first issues):

1. **Classical era depth:** Linear regression, naive Bayes, or PCA—each with a tiny SVG or canvas-free interactive.
2. **Tree era scaffold:** First lesson (e.g. decision stump or random forest intuition) + landing card unlock.
3. **Accessibility:** Keyboard paths for sandboxes, reduced-motion preferences, and ARIA labels on SVG controls.
4. **Math in MDX (optional):** KaTeX or similar for inline equations where italics are not enough.
5. **LICENSE file:** Add an explicit `LICENSE` (MIT or Apache-2.0) at the repo root if you want standard OSS expectations mirrored in GitHub’s UI.

Longer-term:

- **Neural / Modern eras:** MLP or attention toy; generative / latent-space explainer with the same “no black box” philosophy.
- **Search & index:** Tag-based lesson list or full-text search over `content/`.
- **Internationalization:** MDX locale folders or a content schema that supports translations.

If you want to pick something up, open an issue describing the lesson idea or link a draft PR—maintainers will help align it with the patterns below.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + `@tailwindcss/typography` |
| Content | [MDX](https://mdxjs.com/) via [`next-mdx-remote`](https://github.com/hashicorp/next-mdx-remote) (RSC) |
| Frontmatter | [`gray-matter`](https://github.com/jonschlinkert/gray-matter) + validated types in `lib/types.ts` |
| Icons | [`lucide-react`](https://lucide.dev/) |
| Delaunay / Voronoi | [`d3-delaunay`](https://github.com/d3/d3-delaunay) — **path generation only**; React renders SVG; no D3 DOM usage |

---

## Repository layout

```text
app/                    # App Router pages & global styles
  era/[eraId]/[topic]/  # Dynamic lesson route (SSG from /content)
  layout.tsx            # Root layout + Metadata (SEO, OG, Twitter)
  page.tsx              # Marketing home (client preloader + era grid)
components/
  visualizations/       # Interactive lesson sandboxes (client components)
content/
  classical/            # MDX lessons (filename = URL topic slug)
lib/
  mdx.ts                # Load & validate lessons from disk
  types.ts              # Shared frontmatter TypeScript types
```

---

## Getting started

**Prerequisites**

- [Node.js](https://nodejs.org/) 20+ (LTS recommended; Next.js 15 aligns with current Node support)

**Install and run**

```bash
git clone https://github.com/hasibullah1811/minima.git
cd minima
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The classical lessons live at:

- [http://localhost:3000/era/classical/k-means](http://localhost:3000/era/classical/k-means)
- [http://localhost:3000/era/classical/knn](http://localhost:3000/era/classical/knn)

**Production build**

```bash
npm run build
npm start
```

---

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (e.g. `https://your-domain.vercel.app`). Used as `metadataBase` in `app/layout.tsx` for Open Graph and Twitter card URLs. Set this on Vercel for correct social previews. |

Create `.env.local` locally if you need a non-localhost base:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build + type check |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js config) |

---

## Adding a new lesson

1. **Create MDX** at `content/<era>/<topic>.mdx` where `<era>` is one of `classical` \| `tree` \| `neural` \| `modern` (must match `Era` in `lib/types.ts`).

2. **Frontmatter** must satisfy `MdxFrontmatter`:

   - `title`, `description`, `era`, `difficulty`, `tags[]`, `publishedAt`, `author`, `hasVisualizer`

3. **Optional visualizer:** Add `components/visualizations/YourCanvas.tsx` with `'use client'` at the top if it uses state or browser APIs.

4. **Register MDX components** in `app/era/[eraId]/[topic]/page.tsx`:

   ```ts
   import YourCanvas from "@/components/visualizations/YourCanvas";

   const mdxComponents = {
     KMeansCanvas,
     KNNCanvas,
     YourCanvas,
   };
   ```

5. **Use it in MDX:** `<YourCanvas />` where you want the sandbox to appear.

6. **Link from the UI:** Update `app/page.tsx` (or a future index page) so visitors can discover the new slug under `/era/<era>/<topic>`.

`generateStaticParams` in the era page walks `content/` automatically—no manual route list.

---

## Authoring & visualization guidelines

- **Prefer SVG + React state** for lesson graphics. Avoid pulling in chart frameworks unless there is a strong reason.
- **Client boundaries:** Keep `lucide-react` and heavy interactivity inside client components. Server components can import client components as children; avoid importing `lucide-react` from server-only modules if you hit bundling edge cases.
- **Performance:** Memoize expensive derived data (e.g. heatmaps, large loops) so pointer-driven state does not thrash the main thread.
- **Tone:** Short paragraphs, plain English, and progressive disclosure—readers may be seeing the idea for the first time.

---

## Deployment (Vercel)

1. Import the GitHub repository into [Vercel](https://vercel.com/).
2. Framework preset: **Next.js** (default).
3. Set **`NEXT_PUBLIC_SITE_URL`** to your production URL (including `https://`).
4. Deploy. `npm run build` is the install command’s natural pair; Vercel runs it automatically.

If you see warnings about multiple lockfiles in a monorepo parent folder, set `outputFileTracingRoot` in `next.config.ts` to this repository root or remove stray `package-lock.json` files outside the project.

---

## Contributing

Contributions are welcome—issues, docs fixes, and new lessons all count.

1. **Fork** the repository and create a branch from `main`.
2. **Make focused changes** (one lesson or one feature per PR when possible).
3. **Run** `npm run build` (and `npm run lint` if you touch linted files) before opening a PR.
4. **Describe** what changed and why in the PR body so reviewers can load the right lesson URL quickly.

Please keep diffs readable: match existing formatting, naming, and Tailwind patterns.

---

## License

This README previously referenced an MIT `LICENSE` file. **If no `LICENSE` file is present in the repository yet, add one** (for example MIT) and update this section to match. Until then, all rights are reserved by default—clarifying the license helps downstream users and packagers.

---

## Links

- **Repository:** [github.com/hasibullah1811/minima](https://github.com/hasibullah1811/minima)
- **Author:** [github.com/hasibullah1811](https://github.com/hasibullah1811)

If Minima helps your teaching or self-study, a star on GitHub helps others discover it.
