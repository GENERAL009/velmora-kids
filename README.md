# Velmora Kids

Premium Kids E-commerce + Warehouse + CRM Platform

A full-stack e-commerce platform for a premium children's fashion brand, with integrated warehouse management and CRM system.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend   │────▶│  PostgreSQL  │
│  (Next.js)   │     │  (FastAPI)  │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │    Redis    │
                    │ + Celery    │
                    └─────────────┘
```

### Tech Stack

**Backend:**
- FastAPI (Python 3.12+)
- PostgreSQL 16
- SQLAlchemy 2.0 (async)
- Alembic (migrations)
- Redis + Celery (background tasks)
- JWT authentication with RBAC

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query (data fetching)
- Zustand (state management)
- Framer Motion (animations)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- MinIO (S3-compatible object storage)

## Modules

### 1. E-Commerce (Public Website)
- Premium product catalog with filters and search
- Product detail pages with image gallery
- Shopping cart and checkout
- Customer accounts, favorites, and order history
- Payment integration (Payme, Click, Cash)
- Responsive design (mobile-first)
- SEO-optimized with OpenGraph metadata

### 2. Warehouse / Inventory
- Stock management with reservation logic
- Goods receiving from suppliers
- Inventory movements tracking (incoming, sale, return, adjustment, etc.)
- Low stock and out-of-stock alerts
- Transactional stock updates (SELECT FOR UPDATE)
- Never allows negative stock

### 3. CRM / Call Center
- Customer profiles with unified timeline
- Lead management with priorities
- Product question/answer system
- Customer communication tracking
- Call center dashboard

## User Roles (RBAC)

| Role | Access |
|------|--------|
| **Super Admin** | Full system access |
| **Director** | Full business operations |
| **Seller** | Sales, orders, limited inventory |
| **Call Center** | Customers, CRM, questions |
| **Customer** | Public website, own orders |

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Quick Start (Docker)

```bash
# Clone and configure
cp .env.example .env

# Start all services
docker-compose up -d

# The following will be available:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - MinIO Console: http://localhost:9001
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Set up database (ensure PostgreSQL is running)
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed development data
python -m seed

# Start server
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Async PostgreSQL URL | `postgresql+asyncpg://...` |
| `DATABASE_URL_SYNC` | Sync PostgreSQL URL | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing key | (change in production) |
| `PAYME_MERCHANT_ID` | Payme merchant ID | |
| `PAYME_SECRET_KEY` | Payme secret key | |
| `CLICK_MERCHANT_ID` | Click merchant ID | |
| `CLICK_SECRET_KEY` | Click secret key | |
| `S3_ENDPOINT` | S3/MinIO endpoint | |
| `S3_ACCESS_KEY` | S3 access key | |
| `S3_SECRET_KEY` | S3 secret key | |
| `S3_BUCKET` | S3 bucket name | `velmora-kids` |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:3000"]` |

### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api/v1` |

## API Documentation

FastAPI auto-generates OpenAPI documentation:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | Register customer |
| `POST /api/v1/auth/login` | Login |
| `GET /api/v1/products` | Product catalog |
| `GET /api/v1/products/{slug}` | Product detail |
| `GET /api/v1/categories` | Category tree |
| `POST /api/v1/orders` | Create order |
| `GET /api/v1/inventory` | Inventory list |
| `POST /api/v1/inventory/receive` | Receive goods |
| `GET /api/v1/crm/leads` | CRM leads |
| `GET /api/v1/reports/dashboard` | Dashboard KPIs |

## Database

The database uses a normalized PostgreSQL schema with 30+ tables including:
- Users, Roles, Permissions
- Products, Variants, Categories, Brands, Collections
- Inventory, Movements, Warehouses
- Orders, Payments
- CRM Leads, Activities
- Reviews, Questions
- Promotions, Banners
- Notifications, Audit Logs

All stock operations use database-level constraints and `SELECT FOR UPDATE` to prevent race conditions and negative inventory.

## Payment Integration

The system supports three payment providers:
- **Payme** - Uzbekistan's leading payment system
- **Click** - Uzbekistan's mobile payment system
- **Cash** - Cash on delivery

Payment callbacks are verified server-side. The architecture is ready for production integration when API credentials are configured.

## Seed Data

Run `python -m seed` to populate the database with:
- 4 roles + 11 users (admin, director, sellers, call center, customers)
- 5 root categories + 12 subcategories
- 5 brands
- 3 collections
- 20 products with variants (sizes/colors)
- Inventory records for all variants
- Sample orders, payments
- CRM leads and activities
- Reviews, questions
- Promotions and banners

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | Next.js application |
| `backend` | 8000 | FastAPI application |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache/broker |
| `minio` | 9000/9001 | Object storage |
| `worker` | - | Celery worker |
| `nginx` | 80 | Reverse proxy |

## Project Structure

```
velmora-kids/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # REST API endpoints
│   │   ├── core/                # Config, DB, security
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   ├── utils/               # Utilities
│   │   ├── tasks/               # Celery tasks
│   │   └── main.py              # FastAPI app
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Backend tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed.py                  # Development seed data
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages (App Router)
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # API client, utilities
│   │   ├── providers/           # Context providers
│   │   ├── store/               # Zustand stores
│   │   └── types/               # TypeScript types
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## Languages

The platform supports three languages:
- Russian (default)
- Uzbek
- English

All database models include multilingual fields (name_uz, name_ru, name_en).
