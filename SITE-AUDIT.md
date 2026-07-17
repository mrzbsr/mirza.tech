# mirza.tech website audit

Audit date: 17 July 2026

Scope: complete repository inventory, deployed site, redirects, DNS, rendered DOM, public GitHub configuration, search visibility, assets, scripts, privacy/legal pages, and email-related DNS.

No production files were changed as part of this audit. The site is functional and technically clean for a newly published static site, but several meaningful discoverability, privacy, performance, and operational gaps remain.

## Highest-priority findings

### 1. Add `robots.txt` and `sitemap.xml`

Both currently return `404`.

This does not prevent indexing, but it removes two of the clearest discovery and recrawl signals. It matters particularly because Google is still displaying cached content from the previous version of the site.

Recommended:

- Add a `robots.txt` that allows crawling and references the sitemap.
- Add a `sitemap.xml` containing every page intentionally made indexable.
- Submit the sitemap in Google Search Console.
- Request reindexing of the homepage after deploying the changes.

Google explicitly recommends sitemap submission to communicate updates: [Google's structured-data and sitemap guidance](https://developers.google.com/search/docs/appearance/structured-data/profile-page).

Confidence: verified fact.

### 2. Reconsider `noindex` on the speaker kit

`speaker-kit.html` contains valuable, unique, search-intent-aligned material—biographies, speaking topics, credentials, and a headshot—but explicitly tells search engines not to index it.

That prevents it from ranking for searches such as:

- “Mirza Beširović speaker”
- “AI product management speaker Berlin”
- “AI agents keynote speaker”
- “Mirza Besirovic bio/headshot”

Recommended: index this page, improve its title and description around speaker intent, and include it in the sitemap.

Keep `noindex` on `impressum.html` and `datenschutz.html`; those pages add little search value.

Confidence: strong recommendation; indexing the speaker kit is a business choice.

### 3. Add structured entity data

There is currently no JSON-LD structured data.

The homepage is a strong fit for a `ProfilePage` containing a `Person` entity with:

- Full name and ASCII alternate spelling
- Job title
- Description
- Image
- Location
- Employer
- Personal website
- `sameAs` links to LinkedIn, GitHub, newsletter, YouTube appearances, and other authoritative profiles
- `knowsAbout` topics such as AI agents, product strategy, product management, and M&A integration

Add a `WebSite` entity as well. The speaker page could carry `Person` and carefully constructed `VideoObject` data for embedded or linked recordings, provided every claim matches visible content.

This helps search engines and AI systems resolve “Mirza Beširović” as the same person across the site, LinkedIn, GitHub, Zendesk, YouTube, and the newsletter. It does not guarantee a rich result or ranking improvement. See [Google's ProfilePage documentation](https://developers.google.com/search/docs/appearance/structured-data/profile-page).

Confidence: documented mechanism; ranking impact is not guaranteed.

### 4. Correct the YouTube privacy description

The deployed homepage creates a `youtube-nocookie.com` iframe as the browser loads it, although it is marked `loading="lazy"`. A request to Google/YouTube may therefore happen before the visitor presses play, depending on viewport and browser behavior.

The privacy page currently says data is transferred only when the visitor plays the video. That is too categorical.

Options:

- Best privacy implementation: show a local thumbnail and load the iframe only after explicit consent or a click.
- Otherwise revise the notice to acknowledge that loading the embedded player can transfer technical request data before playback.

Because this is GDPR/legal territory, the final language and consent model should be checked by a qualified German privacy professional.

Confidence: technical finding is verified; legal requirements need professional advice.

## Security and infrastructure

### What is working

- `http://mirza.tech/` returns a permanent redirect to HTTPS.
- `https://www.mirza.tech/` redirects to the apex.
- `https://mrzbsr.github.io/mirza.tech/` redirects to the apex.
- The canonical homepage URL is correct.
- All four GitHub Pages IPv4 records are present.
- `www` correctly points to `mrzbsr.github.io`.
- Assets use HTTPS or same-origin paths; no mixed content was found.
- JavaScript, fonts, images, and the GLB model are self-hosted.
- External links opened in new tabs consistently use `rel="noopener"`.
- There are no forms, databases, authentication flows, analytics scripts, or user-controlled content, so the application-level attack surface is small.
- No obvious secret, API key, or credential appears in the current tracked files.
- GitHub documents HTTPS enforcement as the intended Pages configuration: [GitHub Pages HTTPS documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

### Gaps and limitations

- Normal pages do not emit CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`.
- GitHub Pages does not provide normal per-site control over arbitrary response headers. If strong custom headers are important, put Cloudflare or another configurable edge in front of Pages, or change hosting.
- A CSP would currently require work because the site uses inline scripts, an import map, WebGL assets, and a YouTube iframe.
- The public repository has Issues, Projects, and Wiki enabled even though they do not appear necessary for this website. Disable unused repository features to reduce moderation and configuration surface.
- The public API cannot confirm branch protection, repository rulesets, secret scanning settings, or account 2FA. Verify those in GitHub Settings.
- Vendored Three.js is revision 160 from 2023. GSAP and ScrollTrigger are 3.13.0. There is no package manifest or automated dependency/security update path. Record upstream sources and versions, then periodically review updates. Do not blindly replace Three.js because loader/model compatibility needs testing.
- The repository has no CI checks. A small workflow could test broken internal links, HTML validity, missing assets, sitemap consistency, and accidental secret commits.

Confidence: headers, versions, and public configuration are verified; private GitHub settings are unknown.

## Email-domain security

The domain has Google mail routing and an SPF record:

- SPF: `v=spf1 include:_spf.google.com ~all`
- Google MX records are present.
- A Google Search Console verification TXT record is present.
- No DMARC record was returned.
- No CAA record was returned.
- DKIM could not be verified without knowing the configured selector.

Missing DMARC is relevant because the site publicly advertises `mirza@mirza.tech`, making the domain a plausible impersonation target.

Recommended:

- Confirm DKIM is enabled in Google Workspace.
- Add DMARC initially in monitoring mode with an address you control for reports.
- Review reports before progressing toward quarantine or reject.
- Consider CAA as certificate-authority governance, although its absence is not itself a vulnerability.

Do not publish a DMARC record copied blindly: the reporting addresses, subdomain policy, alignment, and rollout should match every legitimate sender.

Confidence: DNS results are verified; DKIM status remains unknown.

## Performance

The main performance risk is the hero visual:

- `face-mesh.glb`: approximately 1.64 MB
- Three.js: approximately 1.2 MB
- Fallback hero image: approximately 724 KB
- GSAP and ScrollTrigger
- Multiple local font files
- YouTube embed, although lazy-loaded

The browser renders the site successfully, and the static text exists in the initial HTML. Nevertheless, the 3D hero can consume substantial bandwidth, parsing time, GPU time, and battery for something decorative.

Recommended:

- Compress or quantize the GLB using a tested glTF optimization pipeline.
- Compress and resize the fallback PNG; WebP or AVIF may be much smaller.
- Load Three.js/model work after critical content, during idle time, or only on capable desktop devices.
- Continue respecting reduced motion, as the CSS and JavaScript already largely do.
- Measure production Core Web Vitals on mobile before and after changes.
- Consider replacing the YouTube iframe with a click-to-load thumbnail, which improves both privacy and performance.
- Add long-lived fingerprinted caching only if an asset build step is introduced; GitHub currently serves ten-minute cache headers.

This audit did not produce a numerical Lighthouse score, so it does not claim a specific Core Web Vitals failure.

Confidence: asset costs and response headers are verified; user-level performance impact requires field or Lighthouse measurement.

## Accessibility and resilience

### Positive findings

- One clear H1 on each page.
- Generally sensible heading hierarchy.
- Images have alt text and explicit dimensions.
- The video iframe has a descriptive title.
- The menu buttons have labels and expanded state.
- Reduced-motion handling is present.
- The core content is server-delivered HTML rather than generated by JavaScript.
- The 3D visual is marked decorative.

### Improvements

- Add a “Skip to main content” link and a `<main>` landmark on the homepage.
- When the mobile menu opens, move focus into it, trap focus within it, make background content inert, and return focus to the opener on close.
- Confirm keyboard focus visibility and color contrast with automated and manual testing.
- The inline hash code passes `location.hash` directly to `querySelector`. A malformed hash can throw a JavaScript exception. Resolve anchors with `getElementById(decodeURIComponent(...))` or catch invalid selectors.
- The page changes the speaking section's DOM position with JavaScript. Put sections in their intended order directly in HTML to keep source order, rendered order, assistive-technology order, and no-JavaScript behavior consistent.

Confidence: code findings are verified; visual contrast was not numerically audited.

## Metadata and social sharing

### Already good

- Strong homepage title and description.
- Correct canonical.
- Open Graph title, description, URL, image, and image dimensions.
- Twitter large-card metadata.
- 1200×630 social image.
- Favicon and Apple touch icon.

### Worth adding

- `og:image:alt`
- `twitter:image:alt`
- `og:locale`
- Canonicals on the legal pages if they remain accessible
- A share image and social metadata for the speaker page if it becomes indexable
- An image sitemap only if image search becomes an important acquisition channel

The homepage copy already contains strong topical and entity language naturally. Repetitive keyword blocks are not recommended.

## AI discoverability

There is no special switch that guarantees inclusion in ChatGPT, Gemini, Perplexity, or AI Overviews.

The useful opportunities within the current site structure are:

- Clear `Person` structured data and consistent `sameAs` identities.
- Strong, substantive first-party copy containing original frameworks, evidence, dates, authorship, and citations.
- Transcripts or detailed summaries for talks and videos where they fit naturally into the existing site.
- Earned links and mentions from Zendesk, conference sites, podcast pages, YouTube descriptions, and professional publications.
- Consistent job title, biography, name spelling, and factual claims across the site, LinkedIn, newsletter, GitHub, event bios, and employer pages.
- Avoid unsupported superlatives in structured data.
- Optionally publish `llms.txt`, but treat it as experimental and low priority. It is not a substitute for normal crawlability, structured data, or authoritative content.

The current site is already strong as a polished personal landing page. Its AI discoverability will depend mainly on clear entity signals, original material, corroborating external sources, and reliable crawlability.

## Complete repository inventory

Every tracked item was accounted for:

- `CNAME`: correct custom domain.
- `index.html`: primary indexable page; metadata good; missing structured data; JavaScript section reorder and hash issue.
- `speaker-kit.html`: useful content currently suppressed with `noindex`.
- `impressum.html`: appropriate legal disclosure; intentionally non-indexed.
- `datenschutz.html`: complete basic structure, but YouTube timing claim needs correction and legal review.
- `assets/site.css`, `assets/tokens.css`: site styling, responsive behavior, fonts, and reduced-motion rules.
- `assets/main.js`, `assets/menu.js`, `assets/scene.js`: animation, navigation, and WebGL behavior.
- `assets/vendor/*`: Three.js r160, GSAP/ScrollTrigger 3.13.0, and matching Three loaders/utilities.
- `face-mesh.glb`: large hero model.
- `assets/hero-wireframe-fallback-user.png`: large fallback image.
- `assets/mirza-headshot.jpg`, `assets/og.png`, and icons: correctly referenced image assets.
- Five Instrument Sans files and one JetBrains Mono file: local font assets; WOFF duplicates mainly act as fallbacks.
- No sitemap, robots file, 404 page, manifest, service worker, CI workflow, dependency manifest, security policy, license, or README is present.

## Recommended order of work

1. Add the sitemap and robots file, then request a Search Console recrawl.
2. Decide whether to index and optimize the existing speaker-kit page.
3. Add structured entity data.
4. Make the YouTube embed privacy-safe and correct the privacy notice.
5. Verify DKIM and introduce DMARC carefully.
6. Optimize the 3D and fallback-image payloads.
7. Address the accessibility and JavaScript resilience items.
8. Strengthen consistent entity information and authoritative external links.
