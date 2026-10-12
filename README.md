# QueueCart - Distributed E-Commerce Platform

A full-stack e-commerce application demonstrating core distributed systems patterns: **asynchronous background jobs**, **retry queues & Dead-Letter Queues (DLQ)**, **distributed inventory locks**, and **multi-layer caching**.

---

## Tech Stack

* **Frontend:** React (Vite), TypeScript, TanStack Query, Zustand, Tailwind CSS
* **Backend:** Node.js, Express, TypeScript, Prisma ORM
* **Databases & Cache:** PostgreSQL 16, Redis 7 (`ioredis`, `Redlock`)
* **Message Broker:** RabbitMQ 3.13 (with Management UI)
* **File Storage:** AWS S3 / LocalStack (presigned URLs)
* **Infra:** Docker Compose

---

## System Architecture

```
React (Vite) ──> Express API Gateway ──> PostgreSQL (Prisma)
                      │
                      ├──> Redis (Catalog cache & Redlock distributed locks)
                      │
                      └──> RabbitMQ (Order events) ──> Background Consumer Worker
                                │
                                └──> Retry Queue (TTL) ──> Dead-Letter Queue (DLQ)

```

---

## Key Highlights

1. **Anti-Overselling Guard (`Redlock`):** Uses distributed Redis locks during checkout to prevent race conditions when multiple users buy the last item at the same time.
2. **Decoupled Order Processing (RabbitMQ):** Checkouts return `201 Created` immediately. Fulfillment runs in the background.
3. **Dead-Letter Queue (DLQ):** Failed messages retry up to 3 times before being isolated in `order.dlq` for debugging.
4. **Fast Catalog Reads:** Product listings are cached in Redis and auto-cleared when inventory changes.
5. **Secure Authentication:** Short-lived JWTs (15 min) in memory + rotating refresh tokens (7 days) in HTTP-only cookies, with Google OAuth support.

---

## Quick Start

### 1. Start Infrastructure (Docker)

```bash
docker compose up -d

```

| Service | Port | Default Credentials / URL |
| --- | --- | --- |
| **PostgreSQL** | `5432` | user: `app_user`, pass: `app_secure_password`, db: `ecommerce_db` |
| **Redis** | `6379` | pass: `redis_secure_password` |
| **RabbitMQ UI** | `15672` | `http://localhost:15672` (`rabbit_user` / `rabbit_secure_password`) |
| **LocalStack (S3)** | `4566` | `http://localhost:4566` |

*(Optional)* Create the local S3 bucket:

```bash
docker exec -it ecommerce_localstack awslocal s3 mb s3://ecommerce-media-bucket

```

---

### 2. Set Up the Backend

```bash
cd backend
npm install

# Run database migrations & seed demo products
npx prisma migrate dev --name init
npm run db:seed

# Start the dev server & RabbitMQ worker
npm run dev

```

The backend runs on **`http://localhost:5000`**.

**Pre-seeded Test Accounts:**

* **Admin:** `admin@ecommerce.local` / `SecurePass123`
* **Customer:** `customer@ecommerce.local` / `SecurePass123`

---

### 3. Set Up the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev

```

Open **`http://localhost:5173`** in your browser.

---

## Main API Endpoints

| Method | Endpoint | Description | Auth Required? |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Register customer | No |
| `POST` | `/api/v1/auth/login` | Sign in & set refresh cookie | No |
| `POST` | `/api/v1/auth/google` | Sign in with Google token | No |
| `POST` | `/api/v1/auth/refresh` | Rotate access token | Cookie |
| `GET` | `/api/v1/products` | Get products (cached in Redis) | No |
| `POST` | `/api/v1/products` | Add new product | Admin |
| `POST` | `/api/v1/orders/checkout` | Atomically lock stock & place order | Yes |
| `POST` | `/api/v1/storage/upload-url` | Generate S3 presigned upload URL | Admin |

---

## Testing Key Features

* **Test Anti-Overselling:** Add 9 items to your cart when stock is 8. The checkout fails immediately with `400 Bad Request` without corrupting inventory.
* **Test Asynchronous Queue:** Place an order and watch the backend logs. The API responds instantly, followed by `Worker processing order fulfillment...` running in the background.
* **Test Dead-Letter Queue (DLQ):** Place an order with `quantity: 99`. The worker simulates a gateway failure, retries 3 times through `order.retry.queue`, and then dumps the message into `order.dlq` (visible at `http://localhost:15672`).
