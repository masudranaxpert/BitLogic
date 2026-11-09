# ADR-008: In-Memory Zero-Dependency Architecture vs Redis, and Tag Caching

## Status

Accepted

## Context

BitLogic handles high-traffic digital subscription browsing, instant checkout, payment verification, and automated reseller supplier API dispatch. In modern e-commerce systems, distributed cache tiers like Redis, KeyDB, or Memcached are frequently introduced for rate limiting, concurrency locks, session storage, and catalog caching.

However, introducing an external caching service creates significant operational burdens:
1. **Infrastructure Complexity & Cost**: Requires provisioning, securing, and maintaining external server instances or paying for managed services.
2. **Network Latency & Failure Modes**: External cache round-trips add latency and introduce failure modes (network partitions, connection timeouts, cache eviction edge cases).
3. **Engineering Philosophy Violation**: BitLogic adheres to the "Ponytail" principle — choose the simplest solution that works reliably; prioritize runtime standard libraries and native platform capabilities before introducing external dependencies.

## Decision

1. **In-Memory Zero-Dependency Primitives**:
   - **Rate Limiting** ([`lib/auth/rate-limit.ts`](../../lib/auth/rate-limit.ts)): Implemented as an in-memory sliding window using a native JavaScript `Map` with automatic periodic stale-record cleanup. Enforces strict IP and credential rate limits with zero network hops.
   - **Single-Flight Concurrency Control** (`singleFlight` in [`lib/suppliers/core.ts`](../../lib/suppliers/core.ts)): Uses in-process `Promise` deduplication to ensure identical concurrent dispatch requests (e.g. rapid admin clicks or simultaneous webhooks) collapse into a single execution, preventing duplicate supplier purchases.
   - **Large-Scale Data Lookups**: The 100k+ disposable email domain blocklist (`lib/email/disposable-domains.json`) is parsed once at module load into a native `Set<string>`, enabling $O(1)$ exact and subdomain checks with minimal memory consumption (~3–4 MB).

2. **Next.js Server Caching & Request Memoization**:
   - Catalog queries in [`lib/catalog/queries.ts`](../../lib/catalog/queries.ts) use React's built-in `cache()` function to memoize database reads during server component rendering, ensuring metadata generation and page body queries share the same execution.
   - Bulk stock aggregation (`planSupplyMap`) executes in a single pass across all product plans to avoid N+1 database queries.

3. **Direct Database Transactions for Write Paths**:
   - Checkout, renewals, payments, and credential allocations completely bypass any caching layer and execute directly against the primary database inside `db.$transaction` ([`lib/orders/create-order.ts`](../../lib/orders/create-order.ts)).
   - Enforces ACID isolation for TrxID anti-replay validation, coupon quota decrementing, and inventory locking.

## Consequences

### Positive
- **Operational Simplicity**: The entire application runs as a self-contained Node.js process without any sidecar services or cache brokers.
- **Maximum Reliability**: Eliminates an entire class of distributed system failure states (Redis connection errors, cache invalidation race conditions).
- **Sub-Millisecond Execution**: Memory lookups and locks happen in nanoseconds without network overhead.

### Trade-offs & Upgrade Path
- In-memory state (rate limiting buckets and in-flight dispatch locks) is local to the Node.js process. When BitLogic is horizontally scaled across multiple stateless instances behind a load balancer:
  1. Rate limiting can be switched to a Redis-backed or database-backed adapter.
  2. Single-flight dispatching can transition to database row locks (`SELECT ... FOR UPDATE` on PostgreSQL).
  3. The current codebase cleanly abstracts these interfaces, making the upgrade path trivial without rewriting business logic.
