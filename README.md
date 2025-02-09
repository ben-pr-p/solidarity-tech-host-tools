# Solidarity Tech Host Tools

This project implements "host magic links" on top of [solidarity.tech](https://solidarity.tech/).

## Required Environment Variables
The following environment variables are required for the application to function correctly:

- `SOLIDARITY_TECH_API_KEY`: API key for accessing Solidarity Tech services.
- `ROOT_REDIRECT_URL`: The root URL to redirect to if the root URL (nothing should be there) is visited.
- `SYMMETRIC_ENCRYPTION_KEY`: Key used for symmetric encryption - run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `APP_TITLE`: The title of the application.
- `BASE_URL`: The base URL where the application is hosted, used for constructing host links
- `ADMIN_PASSWORD`: Password for the admin URL /admin?pw={ADMIN_PASSWORD}

Styling options as env vars:
- `FAVICON_URL`: URL for the favicon of the application.
- `META_SHARE_IMAGE_URL`: URL for the meta share image.
- `META_DESCRIPTION`: Meta description for the application.
- `META_TITLE`: Meta title for the application.
- `META_TITLE_HOST_PREFIX`: Prefix for the meta title when hosting.
- `HEADER_BACKGROUND_COLOR`: Background color for the header.
- `HEADER_TEXT_COLOR`: Text color for the header.

## Deployment

There's a provided `wrangler.example.toml` file that can be used to deploy the application.

```bash
cp wrangler.example.toml wrangler.toml
```

...make your edits...

```bash
bun run build && bunx wrangler deploy
```

Builds + deploys are pretty fast - under a minute.




