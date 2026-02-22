# Enterprise Architecture: Next.js 16 on Google Cloud Run

Technical deep-dive into the CI/CD pipeline, deployment strategy, and cloud infrastructure architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Docker Image Strategy](#docker-image-strategy)
4. [Cloud Run Deployment](#cloud-run-deployment)
5. [Traffic Management & Rollback](#traffic-management--rollback)
6. [Security Architecture](#security-architecture)
7. [Performance Optimization](#performance-optimization)
8. [Disaster Recovery](#disaster-recovery)
9. [Cost Analysis](#cost-analysis)
10. [Scaling Considerations](#scaling-considerations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Development Workflow                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Developer (main branch)                                            │
│         ↓                                                            │
│  GitHub Repository (webhook enabled)                               │
│         ↓                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Google Cloud Build Pipeline                   │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  Step 1: Docker Build                                       │   │
│  │  ├─ Stage 1 (builder): Compile TypeScript + Next.js build   │   │
│  │  ├─ Stage 2 (dependencies): Extract production node_modules │   │
│  │  ├─ Stage 3 (runner): Minimal runtime image                 │   │
│  │  └─ Output: Optimized ~200MB image (alpine-based)           │   │
│  │                                                               │   │
│  │  Step 2: Push to Artifact Registry                          │   │
│  │  ├─ Image tag: us-docker.pkg.dev/PROJECT/node-apps/w3:SHA  │   │
│  │  ├─ Automatic image versioning                              │   │
│  │  └─ Accessible only to authorized service accounts          │   │
│  │                                                               │   │
│  │  Step 3: Deploy to Cloud Run (Canary)                       │   │
│  │  ├─ New revision created                                    │   │
│  │  ├─ 10% traffic routed to new revision                      │   │
│  │  ├─ 90% traffic stays on previous revision                  │   │
│  │  ├─ Health checks enabled                                   │   │
│  │  └─ Auto-scaling: 0-100 instances                           │   │
│  │                                                               │   │
│  │  Step 4: Monitor & Rollback                                 │   │
│  │  ├─ Manual observation (2-5 minutes)                        │   │
│  │  ├─ Auto-rollback on health check failure                   │   │
│  │  └─ Manual rollback available                               │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         ↓                                                            │
│  Production Cloud Run Service                                       │
│  ├─ Region: us-central1 (or other)                                 │
│  ├─ Protocol: HTTPS (automatic, managed by Google)                │
│  ├─ Load balancing: Automatic (Cloud Load Balancing)              │
│  ├─ Auto-scaling: 0-100 instances based on traffic               │
│  ├─ Memory: 512Mi per instance (configurable)                     │
│  ├─ Timeout: 60s per request (configurable)                       │
│  └─ Monitoring: Cloud Logging + Cloud Monitoring                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Architecture

### Trigger & Build Strategy

**GitHub Integration:**
- Webhook automatically created by Cloud Build
- Triggered on push to `main` branch
- Build configuration source: `cloudbuild.yaml` (repo-based)
- Build runs in isolated Cloud Build environment

**Build Execution:**
```
1. Cloud Build reads cloudbuild.yaml
2. Substitutions resolved (PROJECT_ID, REGION, etc.)
3. Each step executes in sequence (can be parallelized with `waitFor`)
4. Build artifacts stored in Artifact Registry
5. Deployment to Cloud Run with traffic split
6. Monitoring phase (manual verification)
7. Automatic rollback if health check fails
```

### Multi-Stage Docker Build Strategy

**Why Multi-Stage?**
- Reduces final image size by 70-80%
- Eliminates dev dependencies (npm, TypeScript compiler, etc.)
- Faster deployments (smaller pull size)
- Better security (no unnecessary tools in production)
- Faster cold starts (Cloud Run starts faster with smaller image)

**Stage 1: Builder**
```dockerfile
FROM node:22.11-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                           # Clean install (production + dev deps)
COPY . .
RUN npm run build                    # Compile TypeScript, build Next.js
```

What happens:
- All build dependencies installed
- TypeScript compiled to JavaScript
- Next.js build optimization (minification, tree-shaking)
- `.next/standalone` output created (self-contained runtime)
- `.next/static` assets bundled
- Size: ~1.2GB (large, but temporary)

**Stage 2: Dependencies**
```dockerfile
FROM node:22.11-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
```

What happens:
- Only production dependencies installed
- Development dependencies excluded
- npm cache cleared (saves space)
- Size: ~100-200MB

**Stage 3: Runner**
```dockerfile
FROM node:22.11-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3005
CMD ["node", "server.js"]
```

What happens:
- Final image created from Stage 3
- Only runtime artifacts included (no source code, no build tools)
- Non-root user execution (security)
- Final size: ~250-350MB (alpine base + runtime deps)

### Deployment Artifact Flow

```
source code (.ts, .tsx, .css)
        ↓
    npm run build
        ↓
.next/ directory
├── .next/standalone/
│   ├── node_modules/ (built-in)
│   ├── package.json
│   └── server.js (compiled Next.js server)
├── .next/static/
│   ├── [build-id]/
│   ├── chunks/
│   └── media/
└── public/
    └── static assets
```

---

## Cloud Run Deployment

### Deployment Configuration

**Compute Resources:**
```yaml
memory: 512Mi        # RAM per instance
cpu: 1               # vCPU per instance
max-instances: 100   # Hard limit on concurrent instances
concurrency: 80      # Requests per instance before scaling
timeout: 60s         # Maximum request duration
```

**Why these values?**
- 512Mi memory: Sufficient for Node.js + Next.js runtime
- 1 CPU: Full vCPU allocated, no shared tenancy
- 100 max-instances: Prevents runaway scaling costs
- 80 concurrency: ~5 requests per second per instance
- 60s timeout: Reasonable for typical web requests

**Scaling Behavior:**
```
Request rate: 10 req/sec
Concurrency per instance: 80
Instances needed: 10 req/sec ÷ 80 conc = 0.125 → 1 instance (minimum 1)

Request rate: 500 req/sec
Instances needed: 500 ÷ 80 = 6.25 → 7 instances

Request rate: 8000 req/sec
Instances needed: 8000 ÷ 80 = 100 instances (max reached)
```

### Health Check Strategy

**Cloud Run Health Checks:**
- Protocol: HTTP/HTTPS
- Path: `/api/health` (custom endpoint)
- Frequency: Every 5 seconds
- Timeout: 3 seconds
- Failure threshold: 3 consecutive failures → instance recycled

**Health Endpoint Implementation:**
```typescript
export default function handler(req, res) {
  // Quick validation
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  };

  res.status(200).json(health);
}
```

Why this matters:
- Prevents requests being sent to restarting instances
- Enables container recycling without downtime
- Validates service readiness before routing traffic
- Required for smooth deployments

### Environment Variable Injection

**Immutable at Build Time:**
```yaml
--set-env-vars=NODE_ENV=production,NEXT_ENVIRONMENT=production
```

**Secrets at Runtime:**
```yaml
--set-secrets=DATABASE_URL=db-url:latest,API_KEY=api-key:latest
```

**Secret Manager Flow:**
1. Secret stored in Secret Manager (encrypted at rest)
2. Cloud Run service account grants access
3. At runtime, Cloud Run injects as environment variable
4. Application reads via `process.env.DATABASE_URL`
5. Secret never appears in logs or image

---

## Traffic Management & Rollback

### Canary Deployment Pattern

**Why Canary?**
- Detect issues early with 10% of traffic
- Minimize blast radius if something breaks
- Allows manual verification before full rollout
- Zero-downtime deployments

**Canary Flow:**

**Phase 1: Deployment (new revision created)**
```bash
gcloud run deploy w3 \
  --image=us-docker.pkg.dev/PROJECT/node-apps/w3:sha123
```
- New Cloud Run revision created (`w3-sha123`)
- Receives NO traffic initially
- Health checks validate readiness

**Phase 2: Canary Split (10% traffic)**
```bash
gcloud run services update-traffic w3 \
  --to-revisions=LATEST=10,PREVIOUS=90
```
- 10% of new requests → new revision
- 90% of requests → previous revision
- Manual observation window (2-5 minutes)

**Phase 3a: Promote (if stable)**
```bash
gcloud run services update-traffic w3 \
  --to-revisions=LATEST=100
```
- 100% traffic → new revision
- Previous revision still exists (available for quick rollback)

**Phase 3b: Rollback (if issues detected)**
```bash
gcloud run services update-traffic w3 \
  --to-revisions=PREVIOUS=100
```
- Immediately routes 100% traffic back to previous version
- Takes ~1 second to propagate globally
- Zero downtime during rollback

### Automatic Rollback

Cloud Build pipeline includes automatic rollback:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'apply-canary-split'
    args: [...]
    onFailure:
      - 'gcloud'
      - 'run'
      - 'services'
      - 'update-traffic'
      - '${SERVICE_NAME}'
      - '--to-revisions=PREVIOUS=100'
```

**When Does Automatic Rollback Trigger?**
1. Traffic split command fails
2. Health check fails
3. Deployment step fails

### Manual Observation Checklist

During 2-5 minute canary window, check:

1. **Error Rate:**
   ```bash
   gcloud logging read \
     'resource.type=cloud_run_revision AND severity=ERROR' \
     --limit=10
   ```

2. **Request Latency:**
   ```bash
   # Cloud Console → Cloud Run → Metrics
   # Check p50, p95, p99 latencies
   ```

3. **Memory Usage:**
   ```bash
   # Should stabilize within 1-2 minutes
   # No continuous growth (memory leak indicator)
   ```

4. **Application Logs:**
   ```bash
   gcloud logging read \
     'resource.type=cloud_run_revision AND resource.labels.service_name=w3' \
     --format=json --limit=50
   ```

---

## Security Architecture

### Network Security

**Default Configuration:**
- Cloud Run runs behind Google-managed load balancer
- Automatic DDoS protection (L3/L4)
- TLS 1.2+ enforced
- SSL certificates automatically renewed
- No direct internet access to containers

**Optional Enhancements:**
- Cloud Armor (WAF rules, rate limiting)
- VPC Service Controls (data exfiltration prevention)
- Private Cloud Run (only accessible via VPC)

### Identity & Access Control (IAM)

**Service Account: `cloud-build-deployer`**
```
Email: cloud-build-deployer@PROJECT_ID.iam.gserviceaccount.com
Roles:
├─ roles/artifactregistry.writer     (push Docker images)
├─ roles/run.admin                   (deploy to Cloud Run)
├─ roles/run.developer               (manage Cloud Run services)
├─ roles/iam.serviceAccountUser      (impersonate SA)
└─ roles/secretmanager.secretAccessor (read secrets)
```

**Cloud Build Service Account:**
```
Email: PROJECT_NUMBER@cloudbuild.gserviceaccount.com
Can impersonate: cloud-build-deployer@PROJECT_ID.iam.gserviceaccount.com
```

**Principle of Least Privilege:**
- Only roles needed for specific task granted
- No project-wide admin roles
- Service account scoped to specific resources
- Regular audit of permissions recommended

### Docker Image Security

**Non-Root Execution:**
```dockerfile
RUN addgroup -g 1000 nextjs && \
    adduser -D -u 1000 -G nextjs nextjs
USER nextjs
```

Why:
- Prevents privilege escalation attacks
- Limits damage if container compromise occurs
- Required for container orchestration best practices

**Minimal Base Image:**
```dockerfile
FROM node:22.11-alpine
```

Benefits:
- Alpine Linux: ~40MB base (vs ~150MB for Debian)
- Fewer packages = smaller attack surface
- Regularly updated by Docker official
- CVSS vulnerability tracking

**No Development Dependencies:**
```dockerfile
RUN npm ci --only=production
```

Why:
- No test frameworks (no crypto libraries unnecessary for tests)
- No build tools (TypeScript compiler, Webpack, etc.)
- No dev utilities (debug libraries, linters)
- Smaller attack surface

**Secrets Never in Image:**
```dockerfile
# ✗ BAD - secrets baked into image
ARG API_KEY=secret123
RUN echo $API_KEY > .env

# ✓ GOOD - secrets injected at runtime
# Use --set-secrets in Cloud Run deployment
```

### Secret Management

**Secret Storage Hierarchy:**

```
Public (source control):
  └─ NEXT_PUBLIC_API_URL (available in browser)

Private Build-time (Cloud Build substitutions):
  └─ Not stored, passed at build time

Private Runtime (Secret Manager):
  └─ DATABASE_URL
  └─ API_KEY
  └─ OAUTH_SECRET
  └─ Encrypted at rest in Secret Manager
  └─ Decrypted only for authorized service accounts
  └─ Never appears in logs
```

**Secret Rotation:**

```bash
# Update secret with new value
echo "new-value" | gcloud secrets versions add api-key --data-file=-

# Deployment automatically uses :latest version
# Old versions available for rollback if needed
```

---

## Performance Optimization

### Image Size Optimization

**Comparison:**

```
Node.js 22 Standard Alpine:
├─ Base image: 42MB
├─ node_modules (production): 80-150MB
├─ .next/standalone: 40-80MB
└─ Total: 200-270MB

vs. Node.js 22 Debian (non-optimized):
├─ Base image: 150MB
├─ node_modules: 100-180MB
├─ .next/standalone: 50-100MB
└─ Total: 400-600MB

Savings: 50% smaller = faster pull, faster cold start
```

### Build Time Optimization

**Current Strategy:**
```dockerfile
# Layer caching strategy:
# 1. Copy package.json first (cached unless dependencies change)
COPY package*.json ./
RUN npm ci

# 2. Copy source code (invalidates cache on code changes)
COPY . .

# 3. Build (runs only if source or dependencies changed)
RUN npm run build
```

**Impact:**
- Dependency layer cached across builds
- Rebuilds only on code or dependency changes
- Typical build: 60-120 seconds
- Cached builds: 20-40 seconds

### Cold Start Performance

**Cloud Run Cold Start Timeline:**

```
0ms    | Request arrives
       | ↓
100ms  | Container image pulled (if not cached)
       | Next.js runtime starts (server.js)
       | ↓
300ms  | Application ready for requests
       | Health check passes
       | ↓
500ms+ | Application serves requests

Total cold start: 300-500ms (alpine optimized)
Without optimization: 1-2 seconds
```

**Factors Affecting Cold Start:**
- Image size (200MB vs 500MB = 100ms difference)
- Memory allocation (512Mi vs 256Mi = faster startup)
- Initialization code in pages/api/_app.ts
- Database connection pool setup

### Next.js Specific Optimizations

**In `next.config.js`:**

```javascript
module.exports = {
  // Enable compression
  compress: true,

  // Precompile pages for faster TTFB
  experimental: {
    optimizePackageImports: ['@mui/material'],
  },

  // Static optimization
  staticPageGenerationTimeout: 60,

  // Output format (required for Cloud Run)
  output: 'standalone',
};
```

**Database Connection Pooling:**
```typescript
// Use connection pool, not direct connections
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Connection pool size
});
```

---

## Disaster Recovery

### RTO & RPO Goals

- **RTO (Recovery Time Objective):** < 1 minute
- **RPO (Recovery Point Objective):** < 1 minute

### Backup Strategy

**Application Code:**
```
Managed by: GitHub (primary source of truth)
Backup: GitHub keeps all history
Recovery: Roll back to previous commit, redeploy
```

**Deployment Configuration:**
```
Managed by: cloudbuild.yaml (in repo)
Backup: Git version control
Recovery: Restore from Git, rerun Cloud Build
```

**Database:**
```
Managed by: Cloud SQL automated backups (if using)
Retention: 7 days default
Recovery: Point-in-time restore available
```

### Failure Scenarios & Recovery

**Scenario 1: Bad Deployment (Code Defect)**
```
Detection: Error rate spike in canary phase (10% traffic)
Recovery: Automatic rollback to PREVIOUS=100
RTO: < 30 seconds
```

**Scenario 2: Cloud Run Service Down**
```
Detection: Health check failures
Recovery: Instance recycled automatically, new instance started
RTO: < 2 minutes
```

**Scenario 3: Database Connection Failure**
```
Detection: Application error logs
Recovery: Manual intervention required
Mitigation: Retry logic, connection pooling
```

**Scenario 4: Artifact Registry Corruption**
```
Detection: Image pull fails
Recovery: Rollback to working image (if previous available)
RTO: < 1 minute
Prevention: Multiple image versions retained
```

### Monitoring & Alerts

**Critical Metrics:**

```
1. Error Rate > 1%
   ├─ Action: Page on-call engineer
   ├─ Investigation: Check logs for error patterns
   └─ Recovery: Rollback if related to recent deployment

2. P99 Latency > 5 seconds
   ├─ Action: Check database performance
   ├─ Investigation: Identify slow queries
   └─ Recovery: Scale up instances, optimize query

3. Memory Usage > 80%
   ├─ Action: Monitor for OOM conditions
   ├─ Investigation: Check for memory leaks
   └─ Recovery: Increase instance memory, fix code

4. Health Check Failures
   ├─ Action: Automatic instance recycling
   ├─ Investigation: Check application logs
   └─ Recovery: Rollback if due to code change
```

---

## Cost Analysis

### Cost Breakdown (Monthly)

**Assumptions:**
- 100K requests/day = 3M requests/month
- Average response time: 200ms
- Average memory: 400Mi (512Mi allocated, ~80% utilization)
- Peak concurrency: 30 instances

**Cloud Run Costs:**

```
CPU:
├─ vCPU-seconds: 3M requests × 0.2s = 600K vCPU-seconds
├─ Allocated: 1 vCPU × 600K = 600K vCPU-seconds
├─ Cost: 600K × $0.00002400 = $14.40

Memory:
├─ GB-seconds: 600K seconds × (512/1024 GB) = 300K GB-seconds
├─ Cost: 300K × $0.00000250 = $0.75

Requests:
├─ First 2M/month free, next 1M = 1M billable
├─ Cost: 1M × $0.40 per 1M = $0.40

Total Cloud Run: $15.55/month
```

**Artifact Registry Costs:**

```
Storage:
├─ ~250MB per image × 5 latest versions = 1.25GB
├─ Cost: 1.25GB × $0.40/GB-month = $0.50

Transfer:
├─ Negligible (outbound to Cloud Run not charged)
├─ Cost: ~$0.00

Total Artifact Registry: $0.50/month
```

**Cloud Build Costs:**

```
Build Time:
├─ ~90 seconds per build (including Docker steps)
├─ ~20 builds/month = 1800 build-minutes
├─ Free tier: 120 minutes/day = 3600 minutes/month
├─ Cost: $0.00 (within free tier)

Total Cloud Build: $0.00/month
```

**Total Monthly Cost: ~$16.05** (very low for production app!)

### Cost Optimization Strategies

1. **Use Cloud Run's free tier:**
   - 2M free requests/month
   - 360K free vCPU-seconds/month
   - 180K free GB-seconds/month

2. **Shared CPU allocation:**
   - Reduce from 1 full vCPU to 0.5 vCPU
   - Savings: ~50% CPU cost
   - Trade-off: Slower request handling

3. **Image retention cleanup:**
   ```bash
   gcloud artifacts repositories update node-apps \
     --cleanup-policy=DELETE_UNREACHABLE
   ```

4. **Reserved capacity (if high volume):**
   - Minimum 100 instances = better hourly rate
   - Useful for >10M requests/month

---

## Scaling Considerations

### Horizontal Scaling (Auto-Scaling)

**How Cloud Run Scales:**

```
Request arrives
  ↓
Load Balancer routes to instance with lowest requests
  ↓
Instance concurrency reaches 80
  ↓
New instance provisioned (takes 30-60 seconds)
  ↓
Traffic distributed across instances
  ↓
No request rate limiting (automatic)
  ↓
Max 100 instances (configurable)
```

**Traffic Patterns & Scaling:**

```
Constant traffic (10 req/sec):
├─ Instances needed: 1 (80 concurrency per instance)
├─ Startup instances: 0
├─ Cost: minimal

Bursty traffic (10 → 1000 req/sec):
├─ Instances needed: 13 instances
├─ Startup delay: 30-60 seconds per new instance
├─ Cost: proportional to burst duration

Sustained high traffic (500+ req/sec):
├─ Instances needed: 7-10 instances
├─ Warm start: instances remain hot, reuse efficient
├─ Cost: high but predictable
```

### Performance Under Load

**Single Instance Limits:**

```
CPU:    1 vCPU (not shared with other workloads)
Memory: 512Mi
Max Req: 80 concurrent requests
Throughput: ~100-500 requests/second (depending on app)
P99 Latency: <2 seconds (typical)
```

**Multi-Instance (Scaled to 10 instances):**

```
CPU:    10 vCPUs total (1 each)
Memory: 5.12Gi total
Max Req: 800 concurrent requests
Throughput: ~1000-5000 requests/second
P99 Latency: <1 second (with load balancing)
```

### Scaling Configuration

**Current Settings in `cloudbuild.yaml`:**

```yaml
--max-instances=100
--concurrency=80
--timeout=60s
```

**Adjust Based on Load:**

```bash
# For low-traffic app
gcloud run deploy w3 \
  --max-instances=10 \
  --concurrency=50

# For high-traffic app
gcloud run deploy w3 \
  --max-instances=500 \
  --concurrency=80

# For latency-sensitive app
gcloud run deploy w3 \
  --max-instances=100 \
  --concurrency=20  # More instances, fewer requests each
```

### Database Scaling

**With Cloud SQL:**
```sql
-- Monitor connections
SELECT count(*) FROM pg_stat_activity;

-- Connection pool sizing
max_connections = number_of_instances × connection_pool_size
-- Example: 100 instances × 20 = 2000 max connections
```

**With Firestore:**
```
Automatic scaling (no configuration)
Read/write operations charged per request
Good for variable traffic patterns
```

---

## Conclusion

This enterprise architecture provides:
- ✅ Automated CI/CD with GitHub integration
- ✅ Safe deployments with canary traffic splits
- ✅ Automatic rollback on failures
- ✅ Security: non-root containers, Secret Manager, least privilege IAM
- ✅ Performance: optimized image, fast cold starts, auto-scaling
- ✅ Observability: Cloud Logging, Cloud Monitoring, health checks
- ✅ Cost efficiency: free tier usage, pay-per-use pricing
- ✅ Disaster recovery: sub-minute RTO/RPO

For further customization or enterprise features, consult the [DEPLOYMENT.md](./DEPLOYMENT.md) guide or GCP documentation.
