# TODO - Standard booking sender/receiver/payment fields

- [x] Step 1: Update `src/routes/standard-booking.tsx` UI inputs and `ordersStore.create()` mapping.
- [x] Step 2: Update `src/lib/orders-store.ts` `OrderRecord` type and ensure create/state transitions include new fields.
- [x] Step 3: Update `db/schema.sql` `orders` table to include sender/receiver phone/name/location + payment_mode.

- [ ] Step 4: Update `src/routes/admin.tsx` order cards/table rows to display new sender/receiver/payment info.
- [ ] Step 5: Update `src/routes/rider-dashboard.tsx` assignment/history rows to display new receiver info + payment_mode if applicable.
- [ ] Step 6: Update `src/routes/history.tsx` TxRow/ReceiptModal usage to display/print new fields.
- [ ] Step 7: Update `src/components/ReceiptModal.tsx` receipt lines to include sender/receiver names/locations/phones and payment_mode.
- [ ] Step 8: Run typecheck/build to confirm compilation.
