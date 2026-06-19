# EasyBlue Logistics — Supabase Database Setup Instructions

To set up your Supabase database correctly, you must run the SQL scripts in the following order. This ensures all dependencies (enums, tables, columns, and functions) are created before they are referenced by other scripts.

---

## 1. SQL Execution Order (First to Last)

| Order | Script Name             | Description                                                                                      |
| :---- | :---------------------- | :----------------------------------------------------------------------------------------------- |
| **1** | `db/schema.sql`         | **Base Schema**: Creates all core enums and tables (`users`, `orders`, `vendors`, etc.).         |
| **2** | `db/security.sql`       | **Security & Triggers**: Sets up the `handle_new_user_registration` trigger for auth syncing.    |
| **3** | `db/schema-updated.sql` | **Patch 001**: Adds `profiles` view, `deployment_status`, and compatibility columns to `orders`. |
| **4** | `db/orders-booking.sql` | **Patch 002**: Adds the `create_db_order` RPC function for standard bookings.                    |
| **5** | `db/order-status.sql`   | **Patch 003**: Adds the `enforce_order_state_transitions` trigger for status management.         |
| **6** | `db/stocks.sql`         | **Patch 004**: Adds the `create_marketplace_order` RPC function for vendor stock orders.         |
| **7** | `db/realtime.sql`       | **Realtime Setup**: Configures tables for Supabase Realtime tracking.                            |

---

## 2. Post-Setup: Admin Promotion

After you have signed up your first user through the application, you can promote them to an Admin role using the following script:

- **Option A (Manual)**: Run `db/promote.sql` after replacing the placeholder UUIDs with your actual user IDs from the Supabase `auth.users` table.
- **Option B (Separate Scripts)**: Use `db/admin.sql` for Super Admin or `db/logistics-admin.sql` for Logistics Admin.

---

## 3. Supabase Dashboard Configuration

### 3.1 Authentication

- **Email Confirmation**: Enable this in **Authentication > Settings**.
- **Redirect URL**: Set the "Site URL" to your deployed URL and add `[YOUR_URL]/auth/callback` to the "Redirect URLs" list.

### 3.2 Storage Buckets

Create the following buckets and set them to **Public** or configure RLS policies as described in the `ERROR_ANALYSIS_AND_FIXES.md`:

- `avatars` (Profile photos)
- `nin-photos` (Rider ID proof)
- `payment-proofs` (Bank transfer screenshots)
- `receipts` (Delivery receipts)

### 3.3 Realtime

In the Supabase Dashboard, go to **Database > Replication** and enable the `supabase_realtime` publication for the following tables:

- `orders`
- `riders`
- `vendors`
- `vendor_stocks`
- `telemetry_events`

---

## 4. Troubleshooting

- **Duplicate Object Errors**: The scripts use `IF NOT EXISTS` and `EXCEPTION` blocks, so they are safe to run multiple times.
- **Missing Columns**: If you see errors about missing columns like `recipient_name`, ensure you have run `db/schema-updated.sql`.
- **Trigger Failures**: Ensure `db/security.sql` is run before you attempt to sign up any users.
