# AGENTS.md

## Development Policy

This blog (Astro + Cloudflare Workers Static Assets) is a personal project still under development. There are no external users or dependents whose compatibility must be preserved.

- **Do not keep backward compatibility.** Remove fallbacks, aliases, compatibility layers, and deprecated code that exist only for old implementations, routes, or settings.
- **Do not migrate data.** When changing the frontmatter schema or the `posts/` directory structure, do not write migration scripts or logic that reads the old format. Rewrite the articles in `posts/` directly to the new format.
- **Always rewrite into the ideal form.** Prefer rewriting code into its simplest current form (KISS) over patching it to fit existing code. Delete files, dependencies, and settings that become unnecessary in the same change.
