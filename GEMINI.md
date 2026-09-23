# Git Commits

Always write git commit messages in English. Use the conventional commits format (e.g., `feat:`, `fix:`, `chore:`).

# Logging

Whenever a new feature is implemented, use the `logAction` function to record the event if it makes sense to store logs for it. This includes CRUD operations (Create, Read, Update, Delete) and any other significant actions performed by users.

# Database Naming

All database table names, column names, functions, triggers, and any other database artifacts MUST be written in English. Use English for enum types and values as well (e.g., use 'consumption' instead of 'consumo').

# Planning

Always show what will be done before applying changes. Create an implementation plan and wait for the user's approval before executing modifications or creating new features.

# TypeScript Types

Always strictly type your variables and functions. Do NOT use the `any` type under any circumstances. If the exact type is complex or unknown, use `unknown` or define a precise interface/type.

# Pending Items Feature

When working on modals or pages where users can select Product Categories or Measurement Units (e.g. Demands or Products), ALWAYS preserve and implement the feature that allows users to type in a NEW category or unit that doesn't exist yet. The new item must be inserted into the database with `is_pending = true` and `is_active = false`, so that administrators can review them later. Do NOT force users to select only existing items via strict dropdowns.
