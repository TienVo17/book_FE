# Deployment Guide

**Version**: 1.0  
**Last Updated**: 2026-07-08  
**Target Platforms**: Docker, nginx, Kubernetes (future)

## Quick Start

### Local Development

```bash
npm install
npm start
```

Runs on http://localhost:3000 with hot-reload.

### Production Build

```bash
npm run build
```

Generates optimized static files in `build/` folder.

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (for orchestration with backend)

### Single Container (Frontend Only)

**Build**:
```bash
docker build -t book-fe:latest .
```

**Run** (standalone, for testing):
```bash
docker run -p 3000:3000 \
  -e REACT_APP_API_BASE_URL=http://localhost:8080 \
  book-fe:latest
```

Access on http://localhost:3000.

**Or with environment file**:
```bash
docker run -p 3000:3000 \
  --env-file .env.production \
  book-fe:latest
```

### Docker Compose (Full Stack)

For the complete "Web Bán Sách" stack (frontend + backend + database), see the backend repository's `docker-compose.yml`.

**Example docker-compose.yml** (in backend repo):

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: bookstore_db
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./book_BE
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/bookstore_db
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
    depends_on:
      - mysql

  frontend:
    build:
      context: ./book_FE
      args:
        REACT_APP_API_BASE_URL: http://backend:8080
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

**Start stack**:
```bash
docker-compose up -d
```

**View logs**:
```bash
docker-compose logs -f frontend
docker-compose logs -f backend
```

**Stop stack**:
```bash
docker-compose down
```

## Build Arguments & Environment Variables

### Build-Time Variables (Docker ARG)

Set during `docker build`:

```dockerfile
ARG REACT_APP_API_BASE_URL=http://localhost:8080
ARG REACT_APP_ENV=development
```

**Usage in Dockerfile**:
```bash
docker build \
  --build-arg REACT_APP_API_BASE_URL=https://api.example.com \
  --build-arg REACT_APP_ENV=production \
  -t book-fe:latest .
```

### Runtime Variables (.env files)

Create environment files in project root:

**.env.development** (for local dev):
```
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
```

**.env.production** (for production):
```
REACT_APP_API_BASE_URL=https://api.bookstore.com
REACT_APP_ENV=production
REACT_APP_LOG_LEVEL=error
```

**.env.example** (commit to repo):
```
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
```

**Never commit .env files** — add to .gitignore (already present).

### Using Environment Variables in Code

```typescript
// src/api/SachApi.ts
const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

export async function listBooks(): Promise<SachModel[]> {
  return my_request(`${BASE}/sach/list`);
}
```

### Build-Time Variable Substitution

```bash
# Development
REACT_APP_API_BASE_URL=http://localhost:8080 npm run build

# Production
REACT_APP_API_BASE_URL=https://api.bookstore.com npm run build
```

The Create React App build process automatically embeds `process.env.REACT_APP_*` variables at compile time.

## Dockerfile Explanation

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

**Stages**:

1. **Build Stage**: 
   - Uses `node:18-alpine` (lightweight Node.js image)
   - Installs dependencies
   - Runs `npm run build` to produce optimized bundle
   - Creates `build/` folder with static files

2. **Serve Stage**:
   - Uses `nginx:alpine` (lightweight nginx)
   - Copies static files from build stage to nginx root
   - Copies nginx config
   - Exposes port 3000
   - Starts nginx in foreground mode

**Benefits**:
- Multi-stage build reduces final image size (~150MB → ~20MB)
- Only nginx binary in final image (secure, no build tools)
- Fast startup and deployment

## nginx Configuration

Located in `nginx.conf`:

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    # Proxy API calls to backend
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # React Router support (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Key Directives**:

| Directive | Purpose |
|-----------|---------|
| `listen 3000` | Listen on port 3000 (matches npm start default) |
| `root /usr/share/nginx/html` | Serve static files from this directory |
| `location /api/` | Proxy `/api/*` requests to backend service |
| `proxy_pass http://backend:8080` | Backend service name (Docker Compose service discovery) |
| `try_files $uri $uri/ /index.html` | SPA fallback: route unmatched paths to index.html for client-side routing |

**Customization**:

For non-`/api/` backend paths, update nginx to proxy them:

```nginx
# Option 1: Proxy all non-static requests
location / {
    if (!-f $request_filename) {
        proxy_pass http://backend:8080;
    }
    try_files $uri $uri/ /index.html;
}

# Option 2: Explicit path prefixes
location /sach/ {
    proxy_pass http://backend:8080;
}
location /tai-khoan/ {
    proxy_pass http://backend:8080;
}
location /api/ {
    proxy_pass http://backend:8080;
}
location / {
    try_files $uri $uri/ /index.html;
}
```

## Deployment Scenarios

### Scenario 1: Local Development

**Setup**:
```bash
npm install
npm start
```

**Access**: http://localhost:3000

**Backend**: Must run separately at http://localhost:8080

### Scenario 2: Docker Development

**Build**:
```bash
docker build -t book-fe:dev .
```

**Run with local backend**:
```bash
docker run -p 3000:3000 \
  -e REACT_APP_API_BASE_URL=http://host.docker.internal:8080 \
  book-fe:dev
```

Note: Use `host.docker.internal` to access host machine services from inside container.

### Scenario 3: Docker Compose (Local Integration)

**Start full stack**:
```bash
docker-compose up -d
```

**Access**:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080 (may be internal-only depending on docker-compose.yml)

**View logs**:
```bash
docker-compose logs -f frontend
```

### Scenario 4: Kubernetes Deployment

**Create ConfigMap for environment**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: book-fe-config
data:
  REACT_APP_API_BASE_URL: "https://api.bookstore.com"
  REACT_APP_ENV: "production"
```

**Deployment manifest**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: book-fe
spec:
  replicas: 3
  selector:
    matchLabels:
      app: book-fe
  template:
    metadata:
      labels:
        app: book-fe
    spec:
      containers:
      - name: frontend
        image: book-fe:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: book-fe-config
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Service manifest**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: book-fe-service
spec:
  selector:
    app: book-fe
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

## Deployment Steps

### Step 1: Prepare Code

```bash
# Clone/pull latest
git pull origin main

# Install dependencies
npm install

# Run tests (if implemented)
npm test -- --coverage

# Build locally to verify
npm run build
```

### Step 2: Build Docker Image

```bash
# Production build
REACT_APP_API_BASE_URL=https://api.bookstore.com \
docker build -t book-fe:v1.0.0 .

# Or with build args
docker build \
  --build-arg REACT_APP_API_BASE_URL=https://api.bookstore.com \
  -t book-fe:v1.0.0 .
```

### Step 3: Test Image Locally

```bash
docker run -p 3000:3000 book-fe:v1.0.0
# Verify at http://localhost:3000
```

### Step 4: Push to Registry (if using container registry)

```bash
docker tag book-fe:v1.0.0 registry.example.com/book-fe:v1.0.0
docker push registry.example.com/book-fe:v1.0.0
```

### Step 5: Deploy

**Option A: Docker (standalone)**
```bash
docker run -d -p 3000:3000 \
  --name book-fe \
  --restart unless-stopped \
  book-fe:v1.0.0
```

**Option B: Docker Compose**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Option C: Kubernetes**
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl rollout status deployment/book-fe
```

### Step 6: Verify Deployment

```bash
# Check if frontend is running
curl http://localhost:3000

# Check health (should return HTML)
curl -I http://localhost:3000

# Check API connectivity (should reach backend)
curl -I http://localhost:3000/api/sach/list
```

## Monitoring & Logs

### Docker Logs

```bash
# View live logs
docker logs -f book-fe

# View last 100 lines
docker logs --tail 100 book-fe

# View with timestamps
docker logs -t book-fe
```

### Docker Compose Logs

```bash
# All services
docker-compose logs -f

# Frontend only
docker-compose logs -f frontend

# Follow & last 50 lines
docker-compose logs -f --tail 50
```

### Kubernetes Logs

```bash
# Pod logs
kubectl logs -f deployment/book-fe

# Tail specific pod
kubectl logs -f pod/book-fe-abc123

# View events
kubectl describe deployment book-fe
```

## Troubleshooting

### Frontend can't reach backend

**Symptoms**: CORS errors, network requests failing, "http://localhost:8080 refused".

**Causes**:
1. Backend not running or on different port
2. REACT_APP_API_BASE_URL not set correctly
3. Docker container can't reach backend (networking issue)

**Solutions**:
```bash
# Check backend is running
curl http://localhost:8080/sach/list

# Verify REACT_APP_API_BASE_URL in built app
docker exec book-fe sh -c 'grep REACT_APP_API_BASE_URL /usr/share/nginx/html/*.js | head -1'

# In Docker Compose, ensure backend service name is correct
# Use http://backend:8080 not http://localhost:8080
```

### Port already in use

**Symptoms**: "Address already in use", "EADDRINUSE".

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port in Docker
docker run -p 3001:3000 book-fe:latest
```

### Build fails with "npm install" errors

**Symptoms**: "Cannot find module", "peer dependency missing".

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### nginx: "connection refused" to backend

**Symptoms**: nginx 502 Bad Gateway errors.

**Causes**:
1. Backend service not running
2. Service name wrong in nginx.conf
3. Backend listening on wrong port

**Solution**:
```bash
# Verify nginx config
docker exec book-fe nginx -t

# Check if backend is reachable from container
docker exec book-fe curl http://backend:8080/

# Verify docker-compose service name
docker-compose ps
```

## Performance Tuning

### nginx Caching

Add to nginx.conf to cache static assets:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* ^(?!.*\.(?:js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$).*$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### Compression

Add gzip compression in nginx.conf:

```nginx
gzip on;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
gzip_min_length 1024;
gzip_vary on;
```

### Rate Limiting

Protect against abuse:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend:8080;
}
```

## Scaling Considerations

### Horizontal Scaling

Frontend is stateless → easily scalable.

**Option 1: Multiple Docker containers**
```bash
docker run -p 3001:3000 book-fe:latest &
docker run -p 3002:3000 book-fe:latest &
docker run -p 3003:3000 book-fe:latest &
# Use load balancer to distribute traffic
```

**Option 2: Kubernetes replicas**
```yaml
spec:
  replicas: 5  # Increase from 3
```

### Content Delivery Network (CDN)

For global distribution:
- CloudFront (AWS)
- Cloudflare (simple, auto-caching)
- Akamai (enterprise)

Point CDN to frontend domain; static assets cached globally.

## Rollback Procedure

### Docker

```bash
# Keep previous version
docker tag book-fe:v1.0.0 book-fe:v1.0.0-backup

# Roll back to previous version
docker stop book-fe
docker rm book-fe
docker run -d -p 3000:3000 book-fe:v0.9.0
```

### Docker Compose

```bash
# Revert in docker-compose.yml to previous image tag
# Then:
docker-compose up -d

# Or explicit rollback
docker-compose rollback  # Not a real command; manual via git revert
```

### Kubernetes

```bash
# View rollout history
kubectl rollout history deployment/book-fe

# Rollback to previous version
kubectl rollout undo deployment/book-fe

# Rollback to specific revision
kubectl rollout undo deployment/book-fe --to-revision=5
```

## CI/CD Pipeline (GitHub Actions Example)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: REACT_APP_API_BASE_URL=${{ secrets.PROD_API_URL }} npm run build
      
      - name: Build Docker image
        run: docker build -t book-fe:latest .
      
      - name: Push to registry
        run: |
          docker tag book-fe:latest ${{ secrets.REGISTRY }}/book-fe:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/book-fe:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/book-fe book-fe=${{ secrets.REGISTRY }}/book-fe:${{ github.sha }}
          kubectl rollout status deployment/book-fe
```

## Security Checklist

- [ ] HTTPS enabled in production (nginx redirect http → https)
- [ ] Content Security Policy (CSP) headers set in nginx.conf
- [ ] CORS properly configured on backend
- [ ] Secrets (API keys) not in Dockerfile or .env committed files
- [ ] Docker image scanned for vulnerabilities (Trivy, Snyk)
- [ ] No debug/development code in production build
- [ ] JWT tokens set to HttpOnly if using cookies (not implemented; currently localStorage)

## Related Documentation

- [Codebase Summary](./codebase-summary.md) — Source files
- [System Architecture](./system-architecture.md) — Design & data flow
- [Code Standards](./code-standards.md) — Development conventions
