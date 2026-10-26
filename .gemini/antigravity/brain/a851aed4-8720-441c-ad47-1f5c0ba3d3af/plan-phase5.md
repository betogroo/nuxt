# Phase 5: Demands Module (Complex Modals)

## Overview

The Demands module (`app/pages/demands/*`) is the heart of the system and contains the most complex modals. We need to migrate the entire module to `Zod` and `@vee-validate/zod`.

## Targeted Files

1. `app/schemas/forms/demand.ts` (NEW)
2. `app/schemas/forms/demand-item.ts` (NEW)
3. `app/schemas/forms/demand-bid.ts` (NEW)
4. `app/pages/demands/index.vue`
5. `app/pages/demands/[id]/index.vue`
6. `app/pages/demands/[id]/items/[itemId].vue`

## Step-by-Step Execution Plan

### Step 1: Create Schemas

Create robust Zod schemas:

- `demandFormSchema`: `name`, `type` (enum), `process_number`, `id_pca`, `contract_number`.
- `demandResponsibleSchema`: `user_id`.
- `demandRevertSchema`: `status`, `observation`.
- `demandItemFormSchema`: `productId`, `quantity` (>0), `reference_price`, `unit_id`.
- `demandBidFormSchema`: `amount`, logic for `isNewSupplier` requiring CNPJ, Name, Email, OR `supplierId`.

### Step 2: Refactor `app/pages/demands/index.vue`

- Swap `modal.payload` for `useZodForm(demandFormSchema, ...)`
- Map fields via `defineField`
- Add `:error-messages`
- Update `saveDemand` function to use `handleSubmit`
- Ensure modal open logic uses `resetForm({ values })`

### Step 3: Refactor `app/pages/demands/[id]/index.vue`

This page has multiple modals:

- **Edit Planning Modal**: Use `demandFormSchema`
- **Add Responsible Modal**: Use `demandResponsibleSchema`
- **Revert Modal**: Use `demandRevertSchema`
- **Add Item Modal**: Use `demandItemFormSchema`

### Step 4: Refactor `app/pages/demands/[id]/items/[itemId].vue`

- **Edit Item Modal**: Reuse `demandItemFormSchema`
- **Add Bid Modal**: Use `demandBidFormSchema`

### Step 5: Test and Lint

Run tests (`npm run test`) and linter (`npx eslint .`) to ensure no broken UI transitions or references.
