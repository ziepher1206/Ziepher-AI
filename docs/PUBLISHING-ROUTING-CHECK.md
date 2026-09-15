# Production publishing target

- Canonical GitHub repository: `ziepher1206/Ziepher-AI`
- Production branch: `main`
- Vercel project: `ziepher-ai`
- Vercel project ID: `prj_N9b1dF6SMRec4CpwFG79rLtE2tQV`
- The public domain must point to this Vercel project before launch.
- Production deploys must be green before the domain is treated as current.

This check exists because the builder-first launch changes were merged correctly to GitHub but the first production Vercel build failed type checking, leaving the public domain on an older deployment.
