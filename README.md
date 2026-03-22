# AutoHire ATS v2.0 — Enterprise Applicant Tracking System

A production-ready ATS built with **Next.js 15**, **Prisma**, **PostgreSQL**, and **Tailwind CSS**.

---

## 📁 Full Project Structure

```
autohire/
├── prisma/
│   ├── schema.prisma          # Full DB schema (users, sessions, jobs, candidates, etc.)
│   └── seed.ts                # Sample data with real bcrypt passwords
├── public/uploads/            # Resume PDFs stored here (auto-created)
├── ecosystem.config.js        # PM2 config for VPS
├── src/
│   ├── middleware.ts           # JWT auth middleware — protects ALL routes
│   ├── app/
│   │   ├── page.tsx            # Root → redirects to /dashboard
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── login/
│   │   │   └── page.tsx        # Login page (public)
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Dashboard with charts
│   │   ├── candidates/
│   │   │   └── page.tsx        # Full candidate table
│   │   ├── jobs/
│   │   │   └── page.tsx        # Job postings management
│   │   ├── upload/
│   │   │   └── page.tsx        # Resume upload
│   │   ├── reports/
│   │   │   └── page.tsx        # Analytics & charts
│   │   ├── settings/
│   │   │   ├── page.tsx        # Account settings
│   │   │   └── users/
│   │   │       └── page.tsx    # User management (admin only)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── me/route.ts
│   │       ├── candidates/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── notes/route.ts
│   │       │       └── interviews/route.ts
│   │       ├── jobs/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── users/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── upload/route.ts
│   │       ├── dashboard/route.ts
│   │       └── export/route.ts
│   ├── components/
│   │   ├── AppShell.tsx        # Auth-aware layout wrapper
│   │   ├── Sidebar.tsx         # Nav with user info + logout
│   │   ├── CandidateModal.tsx  # Full detail drawer (5 tabs)
│   │   └── ScoreBadge.tsx      # Score display components
│   ├── hooks/
│   │   └── useAuth.ts          # Client-side session hook
│   ├── lib/
│   │   ├── auth.ts             # JWT + session logic
│   │   ├── prisma.ts           # Prisma singleton
│   │   ├── rateLimit.ts        # Request rate limiting
│   │   ├── audit.ts            # Audit log utility
│   │   ├── apiHelper.ts        # Standardized API responses
│   │   └── validations.ts      # Zod schemas
│   └── types/
│       └── index.ts            # TypeScript types + constants
```

---

## 🔐 Security Features

| Feature | Implementation |
|---|---|
| **Authentication** | JWT (HS256) via `jose` library |
| **Session Storage** | DB-persisted sessions — server-side logout works instantly |
| **Password Hashing** | bcrypt with cost factor 12 |
| **Cookie Security** | `httpOnly`, `secure` (prod), `sameSite: lax` |
| **Rate Limiting** | 5 login attempts/min per IP |
| **Role-Based Access** | 5 roles: SUPER_ADMIN, ADMIN, RECRUITER, INTERVIEWER, VIEWER |
| **Route Protection** | Next.js middleware validates JWT on every request |
| **Audit Logging** | All create/update/delete actions logged with user + IP |
| **Input Validation** | Zod schemas on all API routes |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, etc. |
| **Timing Attack Prevention** | Constant-time password comparison on login |

---

## 🚀 Local Setup (5 minutes)

### Prerequisites
- Node.js v20+
- PostgreSQL running locally

```bash
# 1. Unzip & enter directory
unzip autohire.zip && cd autohire

# 2. Install dependencies
npm install

# 3. Set environment
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/autohire"
JWT_SECRET="generate-with: openssl rand -hex 64"
```

```bash
# 4. Setup database
npx prisma db push          # create tables
npm run db:seed             # add sample data + users

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

**Login credentials (from seed):**
```
Super Admin   → admin@autohire.com         / Admin@1234
Recruiter     → recruiter@autohire.com     / Recruiter@1234
Interviewer   → interviewer@autohire.com   / Interviewer@1234
```

---

## 🌐 VPS Production Deployment

### 1. Server Setup (Ubuntu 22.04)

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
npm install -g pm2

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Create DB & user
sudo -u postgres psql <<EOF
CREATE USER autohire WITH PASSWORD 'strong_password_here';
CREATE DATABASE autohire OWNER autohire;
GRANT ALL PRIVILEGES ON DATABASE autohire TO autohire;
EOF

# Nginx
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Deploy Application

```bash
# Clone or upload your code
git clone https://github.com/yourorg/autohire /var/www/autohire
cd /var/www/autohire

# Install deps
npm install

# Configure environment
cp .env.example .env
nano .env
# Set DATABASE_URL and JWT_SECRET

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed (first time only)
npm run db:seed

# Build
npm run build

# Create log dir
sudo mkdir -p /var/log/autohire
sudo chown $USER:$USER /var/log/autohire

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # follow the printed command
```

### 3. Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/autohire
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Important: increase for PDF uploads
    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Serve uploaded resumes directly (faster than Node.js)
    location /uploads/ {
        alias /var/www/autohire/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/autohire /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL (free via Let's Encrypt)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 4. Auto-renewal & Monitoring

```bash
# SSL auto-renewal (certbot sets this up automatically)
# Check: sudo certbot renew --dry-run

# Monitor app
pm2 status
pm2 logs autohire
pm2 monit

# View audit logs in DB
psql -U autohire -d autohire -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;"
```

---

## 📡 API Reference

All API routes require authentication (JWT cookie) except `/api/auth/login`.

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | Login, sets cookie |
| POST | `/api/auth/logout` | — | Logout, destroys session |
| GET | `/api/auth/me` | — | Current user info |

### Candidates
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/candidates` | List (search, filter, sort, paginate) |
| POST | `/api/candidates` | Create manually |
| GET | `/api/candidates/:id` | Full detail with notes/interviews |
| PATCH | `/api/candidates/:id` | Update any fields |
| DELETE | `/api/candidates/:id` | Delete (admin only) |
| GET | `/api/candidates/:id/notes` | List notes |
| POST | `/api/candidates/:id/notes` | Add note |
| GET | `/api/candidates/:id/interviews` | List interviews |
| POST | `/api/candidates/:id/interviews` | Schedule interview |

### Query params for GET `/api/candidates`
```
?search=arjun           full-text search
&status=INTERVIEW       filter by status
&skills=react,python    skill match filter
&source=LINKEDIN        filter by source
&priority=HIGH          filter by priority
&sortBy=overallScore    sort field
&sortOrder=desc         asc|desc
&page=1                 pagination
&pageSize=50            results per page
```

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| PATCH | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |

### Other
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload` | Upload PDF resume |
| GET | `/api/dashboard` | Full stats & analytics |
| GET | `/api/export` | Download CSV of candidates |
| GET | `/api/users` | List users (admin) |
| POST | `/api/users` | Create user (admin) |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user (super admin) |

---

## 🎭 Role Permissions Matrix

| Action | SUPER_ADMIN | ADMIN | RECRUITER | INTERVIEWER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| View candidates | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit candidates | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete candidates | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload resumes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage jobs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add notes | ✅ | ✅ | ✅ | ✅ | ❌ |
| Schedule interviews | ✅ | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔧 Production Checklist

- [ ] Set strong `JWT_SECRET` (64 char random hex)
- [ ] Use strong PostgreSQL password
- [ ] Enable SSL via Certbot
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Change seed passwords after first login
- [ ] Set up daily DB backups: `pg_dump autohire > backup.sql`
- [ ] Configure firewall: `ufw allow 80,443/tcp && ufw enable`
- [ ] Monitor with PM2: `pm2 monit`
- [ ] For S3 uploads at scale: replace `public/uploads/` with AWS S3

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Node.js runtime) |
| Database | PostgreSQL + Prisma 5 ORM |
| Auth | JWT (jose) + bcryptjs + httpOnly cookies |
| Validation | Zod |
| Charts | Recharts |
| Styling | Tailwind CSS 3 + Inter font |
| Icons | Lucide React |
| PDF Parse | pdf-parse |
| Process Mgr | PM2 |
| Web Server | Nginx (reverse proxy + SSL) |
