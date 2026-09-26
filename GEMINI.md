# Git Commits

Always write git commit messages in English. Use the conventional commits format (e.g., `feat:`, `fix:`, `chore:`).

# Logging

Whenever a new feature is implemented, use the `logAction` function to record the event if it makes sense to store logs for it. This includes CRUD operations (Create, Read, Update, Delete) and any other significant actions performed by users.

# Database Naming

All database table names, column names, functions, triggers, and any other database artifacts MUST be written in English. Use English for enum types and values as well (e.g., use 'consumption' instead of 'consumo').

# Planning (CRITICAL / MANDATORY)

**STOP AND READ THIS**: YOU MUST ALWAYS show what will be done before applying changes. CREATE an implementation plan and WAIT FOR THE USER'S APPROVAL BEFORE executing modifications, creating new features, or writing code. Skipping this step is strictly forbidden.

# TypeScript Types

Always strictly type your variables and functions. Do NOT use the `any` type under any circumstances. If the exact type is complex or unknown, use `unknown` or define a precise interface/type.

# Pending Items Feature

When working on modals or pages where users can select Product Categories or Measurement Units (e.g. Demands or Products), ALWAYS preserve and implement the feature that allows users to type in a NEW category or unit that doesn't exist yet. The new item must be inserted into the database with `is_pending = true` and `is_active = false`, so that administrators can review them later. Do NOT force users to select only existing items via strict dropdowns.

# File Encoding

Always use and enforce UTF-8 encoding when creating or modifying files. This is particularly critical in Windows environments where tools like PowerShell might default to Windows-1252, ANSI, or UTF-16, leading to broken accents and special characters (mojibake like `ÃƒÂ£` instead of `Ã£`). When using terminal commands to pipe or write output to files (e.g., `Out-File`, `>`), ALWAYS explicitly specify `-Encoding utf8`.

# Tests (CRITICAL / MANDATORY)

**STOP AND READ THIS**: For every feature created, altered, or deleted, the corresponding unit and/or integration tests MUST be updated or created to reflect the changes. Code modifications are NOT considered complete until tests are written and passing. You MUST execute the tests and prove they pass before finalizing your turn. Skipping this step is strictly forbidden.
