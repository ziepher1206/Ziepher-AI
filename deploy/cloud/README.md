# Ziepher AI cloud runtime

End users install only Ziepher AI or open its HTTPS site. They never run these
containers and never install Node.js, Docker, Git, Supabase CLI, model SDKs, or
deployment tools.

Operators run three cloud services:

1. the public web control plane;
2. a private build worker on an isolated host;
3. a private deployment worker.

The build worker is the only service with Docker access. Do not colocate it with
the public web service in production. `compose.yml` is for staging and controlled
single-host deployments; production should place the worker on a separate
network and host.

```bash
cp .env.cloud.example .env.cloud
docker compose -f compose.yml up -d --build
```

Use HTTPS at the load balancer and set `NEXT_PUBLIC_APP_URL` to the final origin.
The PWA install prompt requires HTTPS outside localhost.
