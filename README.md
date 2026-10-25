# FLAME University — Digital Sports Equipment Room

Official digital sports equipment checkout and inventory management platform for the Department of Sports, FLAME University, Pune, India.

---

## 1. Non-Technical Quick Start (For Easy Testing)

If you are not a developer, you only need to run one simple command in your terminal to see and use the entire application:

```bash
npm run dev
```

Then open your web browser to: **[http://localhost:3000](http://localhost:3000)**

### Pre-loaded University Accounts Ready for Demo:
- **Sports Administrator**: `asmi.malushte@flame.edu.in` (Asmi Malushte) — Has access to the complete Admin Dashboard, real-time KPI metrics, verification controls, and inventory management.
- **Student with Active Item**: `rohan.sharma@flame.edu.in` (Rohan Sharma) — Has Badminton Racket #3 checked out. Shows the return workflow.
- **Student with Return Pending**: `ananya.verma@flame.edu.in` (Ananya Verma) — Has submitted a return with photo proof. Demonstrates the pending verification status.
- **Student Overdue**: `kabir.patel@flame.edu.in` (Kabir Patel) — Has missed the 11:00 PM IST deadline. Demonstrates overdue tracking.

You can switch between any of these accounts in 1 click using the top-right profile menu!

---

## 2. Core Functional Principles

1. **One Item Rule**: A student is strictly permitted to have **no more than one active sports equipment issue at any time**. The database prevents duplicate checkouts even across multiple tabs or simultaneous requests.
2. **Asia/Kolkata (IST) Standard**: All daily deadlines are fixed at **11:00 PM IST** on the issue date.
3. **Student Submission vs Physical Receipt**: The student submits their return online with live camera photo evidence; the sports room handler physically inspects the counter and confirms receipt.
4. **The Three Mandatory Administrator Actions**:
   - **Confirm Return**: Verifies physical receipt, releases the student's active issue, and makes the item available again.
   - **Not Returned**: Flags a missing item, logs a discrepancy warning if the student submitted online, and keeps the issue active.
   - **Report Damage**: Logs damage details, flags the item for inspection, and automatically dispatches a notification email to the last recorded student borrower.

---

## 3. Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript)
- **Styling**: Tailwind CSS tailored to official FLAME University colors:
  - **Flame Red**: Institutional Crimson (`#C8102E`, `#991B1B`)
  - **Deep Navy Blue**: Deep Academic Navy (`#0B2545`, `#1E3A8A`)
  - **Crisp White & Slate**: Clean contrast surfaces (`#FFFFFF`, `#F8FAFC`)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) policies and partial unique indexes.
- **Camera Evidence**: Direct device camera capture using HTML5 `navigator.mediaDevices.getUserMedia` with fallback upload.
- **Emails**: Resend API integration with built-in durable notification tracking outbox.
- **Scheduled Jobs**: Vercel Cron at 16:30 UTC (10:00 PM IST) and 17:30 UTC (11:00 PM IST).

---

## 4. How to Print the Equipment Room QR Code

1. In the application header, click the **"Room QR"** button.
2. A printable counter sign will appear with the high-resolution QR code pointing to the university application.
3. Click **"Print Sign for Counter"** to print it on A4 paper and place it at the equipment room checkout desk or entrance door.
4. Students simply point their phone camera at the QR code to open the website without installing any app.

---

## 5. Automated Acceptance Tests

To verify that all university business rules, domain checks, one-issue enforcement, and administrative actions operate correctly, run:

```bash
npm test
```

Expected output:
```text
==================================================================
FLAME University Digital Sports Equipment Room — Acceptance Tests
==================================================================

✓ PASS: Verified @flame.edu.in user is accepted with 'student' role
✓ PASS: Configured administrator asmi.malushte@flame.edu.in receives 'admin' role
✓ PASS: External non-@flame.edu.in account is strictly rejected
✓ PASS: Available badminton rackets found in inventory
✓ PASS: Student Priya Nair successfully issued Badminton Racket #1
✓ PASS: One-active-issue rule strictly enforced: Second issue blocked
✓ PASS: Disclaimer dynamically includes 11:00 PM IST and FLAME Sports text
✓ PASS: Active issue found for Priya Nair
✓ PASS: Return submission requires mandatory condition acknowledgement
✓ PASS: Return submitted successfully with photo; status changed to 'return_submitted'
✓ PASS: Student blocked from issuing new equipment while physical verification is pending
✓ PASS: Admin confirms physical return; issue marked 'returned'
✓ PASS: Student's active issue cleared; able to issue new equipment after admin confirmation
✓ PASS: Action 2 Not Returned records discrepancy, preserves issue as active/unreturned
✓ PASS: Action 3 Report Damage created linked report and updated item status to damaged
✓ PASS: 10 PM IST daily return reminder executed idempotently
✓ PASS: 11 PM IST overdue job executed idempotently

Results: 17 PASSED, 0 FAILED
```

---

## 6. How to Deploy to Vercel

1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), select **Import Project** and choose this repository.
3. Add the following environment variables (from `.env.example`):
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production domain (e.g. `https://flame-sports.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Public Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (kept secret)
   - `RESEND_API_KEY`: Your Resend API key for automated emails
   - `CRON_SECRET`: A secure random password for scheduled cron job authorization
4. Click **Deploy**. Vercel will build the Next.js app and automatically register the 10:00 PM and 11:00 PM IST Cron Jobs defined in `vercel.json`.

---

## 7. PostgreSQL Database Migrations (Supabase)

To apply the database schema on Supabase:
1. Open your Supabase project SQL Editor.
2. Open the file `supabase/migrations/20261025000000_flame_sports_schema.sql`.
3. Paste and run the SQL script. It creates:
   - All entity tables (`users`, `sports`, `equipment_types`, `inventory_items`, `equipment_issues`, `return_verification_events`, `damage_reports`, `notification_logs`, `audit_logs`).
   - Partial unique indexes enforcing the one-active-issue rule on both student and equipment item.
   - Row Level Security (RLS) restricting admin controls to `asmi.malushte@flame.edu.in`.

---

## 8. Instructions for Department of Sports Staff

### Adding New Sports or Equipment
In the Admin Dashboard under **"Inventory Management"**, click **"Add Equipment"**:
- Select the Sport (e.g., Badminton, Cricket, Football).
- Specify the equipment type and number (e.g., `#13`).
- The item is immediately tracked in the inventory catalog.

### Securely Changing the Primary Administrator Account
The initial administrator is hardcoded to `asmi.malushte@flame.edu.in` as requested in the specification.
To transfer administrator privileges to another staff member:
1. In `src/lib/db/store.ts`, update `ADMIN_EMAIL`.
2. In `supabase/migrations/20261025000000_flame_sports_schema.sql`, update the email in the RLS policies.
3. In your Vercel Project Settings, set `ADMIN_EMAIL` to the new email address.

---

## 9. Production Security Checklist

- [x] `@flame.edu.in` domain restriction enforced case-insensitively on the server.
- [x] External non-university accounts (e.g., `@gmail.com`) strictly rejected.
- [x] One active issue limit enforced at the database level.
- [x] Three mandatory admin actions protected by server-side role validation.
- [x] Tamper-evident audit trail tracking all checkout, check-in, and damage events.
- [x] Cron endpoints secured with bearer token authorization (`CRON_SECRET`).
- [x] All deadlines and disclaimers bound to Asia/Kolkata (IST) timezone.
