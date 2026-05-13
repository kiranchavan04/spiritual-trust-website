# अवधूत चिंतन देवस्थान ट्रस्ट (Avadhut Chintan Devstan Trust)

A full-stack spiritual trust website in Marathi with product shop, events, reviews, Razorpay payments, and order management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trust-website run dev` — run the frontend (port 24682)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Payments: Razorpay
- Email: Nodemailer
- Theme: Saffron/gold + Noto Sans Devanagari

## Where things live

- DB schema: `lib/db/src/schema/` (products, events, reviews, orders)
- API contract: `lib/api-spec/openapi.yaml`
- Backend routes: `artifacts/api-server/src/routes/` (products, events, reviews, orders, payment)
- Frontend pages: `artifacts/trust-website/src/pages/`
- Cart context: `artifacts/trust-website/src/components/cart-context.tsx`
- Email sender: `artifacts/api-server/src/lib/mailer.ts`
- WhatsApp notifier: `artifacts/api-server/src/lib/whatsapp.ts`

## Environment Variables Required

Set these in Secrets:
- `DATABASE_URL` — Auto-provisioned by Replit
- `RAZORPAY_KEY_ID` — Razorpay dashboard → API Keys
- `RAZORPAY_KEY_SECRET` — Razorpay dashboard → API Keys
- `VITE_RAZORPAY_KEY_ID` — Same as RAZORPAY_KEY_ID (for frontend)
- `ADMIN_WHATSAPP_NUMBER` — Trust's WhatsApp number (e.g. 919876543210)
- `SMTP_HOST` — Email SMTP server (e.g. smtp.gmail.com)
- `SMTP_USER` — Email username
- `SMTP_PASS` — Email password/app password
- `SMTP_PORT` — SMTP port (587 or 465)
- `FROM_EMAIL` — Sender email address

## Pages

- `/` — Home page
- `/events` — Events / कार्यक्रम
- `/products` — Products / उत्पादने
- `/checkout` — Checkout with Razorpay / COD
- `/reviews` — Reviews / अभिप्राय
- `/order/:id` — Order tracking
- `/admin` — Admin panel (no auth)

## Architecture decisions

- All text labels in Marathi; admin page uses English for clarity
- Orders are saved to PostgreSQL; WhatsApp notification sent via API or link fallback
- Razorpay integration: frontend creates order → verifies payment → saves order
- Cart is managed as React state (no DB needed)
- WhatsApp without official API: uses wa.me link as fallback; configure WHATSAPP_API_KEY+WHATSAPP_API_URL for automated sends

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after every OpenAPI spec change
- `VITE_RAZORPAY_KEY_ID` must be set for Razorpay to work on the frontend
- Without Razorpay keys, a mock order ID is returned (good for testing COD flow)
- Without SMTP config, order emails are skipped silently

## User preferences

- Marathi language throughout the UI
- Saffron/gold spiritual color theme
- No emojis in the UI

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
