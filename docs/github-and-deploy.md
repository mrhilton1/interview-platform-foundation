# GitHub And Deploy Notes

## GitHub

The GitHub connector can read and write files in existing repositories, but in this session it did not expose a create-repository action.

To publish this foundation:

1. Create an empty GitHub repo, for example `mrhilton1/interview-platform-foundation`.
2. Tell Codex the repo URL.
3. Codex can then push/populate the repository using connector-backed file writes or local git if authentication is restored.

Local `gh` currently has invalid stored tokens in this environment, so connector-backed publishing is the safer path.

## Cloudflare Pages

Recommended order:

1. Publish the GitHub repo.
2. Connect the repo to Cloudflare Pages.
3. Use:

```text
Build command: npm run build
Output directory: dist
```

4. Add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_DEFAULT_EDITION_KEY
```

Cloudflare does not need to exist before the foundation repo. It becomes useful as soon as the app can build and has Supabase configuration.
