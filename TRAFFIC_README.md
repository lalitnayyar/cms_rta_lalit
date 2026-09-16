Files added to help expose crta.srv1750386.hstgr.cloud via Traefik

1) docker-compose.crta.yml
- Example docker-compose service for the crta site using nginx:alpine.
- Shares external Docker network "traefik-kpux" (must exist and be the same network Traefik uses).
- Uses Traefik labels to route Host(`crta.srv1750386.hstgr.cloud`) with TLS via the "letsencrypt" certresolver.

2) traefik-static-example.yml
- Example Traefik static config showing entryPoints and an ACME (HTTP-01) resolver named "letsencrypt".
- Update email and ensure Traefik mounts /acme.json (persist and chmod 600).
- Port 80 must be reachable publicly for HTTP-01 to work.

DNS
- Create an A record: crta.srv1750386.hstgr.cloud -> your server's public IP
  (or a CNAME to srv1750386.hstgr.cloud if your DNS provider allows and that resolves).

Deploy
- Ensure Traefik is running with the static config and the docker provider enabled.
- docker compose -f docker-compose.crta.yml up -d
- Check Traefik logs for ACME success and then visit: https://crta.srv1750386.hstgr.cloud

If you'd like, push these changes to a new branch and open a PR; say "create PR" and provide a branch name.

Note about manage.sh improvements
- manage.sh now includes a 'deploy-crta' helper and safer deploy flows that:
  - Detect and optionally remove project-prefixed orphan containers before running docker compose up.
  - Offer to prune dangling images interactively before deploy/redeploy to avoid image-not-found errors.
- Use ./manage.sh deploy-crta to bring up docker-compose.crta.yml (the script ensures the Traefik network exists).
