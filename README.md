# Liliw Market Connect — Vendor Mobile

Expo React Native app for **vendors only**, built against the existing Liliw Market Connect backend.

## Setup

```bash
npm install
npm start
```

## API URL

Edit `src/config/env.js`:

| Environment | `API_BASE_URL` |
|-------------|----------------|
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator | `http://localhost:5000/api` |
| Physical device | `http://<your-LAN-IP>:5000/api` |

Backend must be running (default port `5000`).

## Seed vendor (from backend)

- Email: `vendor@liliw.com`
- Password: `vendor123`

## Module status

1. **Authentication** — done (login, register, forgot/reset password, SecureStore JWT, vendor role gate)
2. **Navigation** — done (vendor bottom tabs + stacks)
3. **Dashboard** — done (`/vendors/me`, `/stall-rents/my`, `/violations/my`)
4. **Products** — done (list, search/filter, add/edit, hide/show, remove)
5. Vendors (application) — covered in Profile store tab
6. Orders
7. Notifications / Violations — violations list done
8. **Profile** — done (store / account / password + sign out)
9. **Stall Rent** — done (`/stall-rents/my`, summary + filters)
10. **Pricing Insights / Price Watch** — done (`/vendors/pricing-insights`)
11. **Store logo** — done (pick/upload + display on Profile & Dashboard)
12. **In-app + local alerts** — done (violations, overdue rent, low stock; bell + badges + notifications)
13. **Help Center / FAQs** — done (mirrors web `/vendor/help`)
