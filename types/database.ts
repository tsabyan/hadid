/**
 * PLACEHOLDER — replaced by generated types in Phase 2.
 *
 * There are no tables yet, so this declares an empty `hadid` schema in the
 * exact shape supabase-js expects. Queries typecheck as `never` until the
 * migrations are applied and real types are generated.
 *
 * To regenerate after running the SQL, either:
 *   - Supabase Dashboard → API Docs → "Generate types" → paste over this file, or
 *   - npx supabase gen types typescript \
 *       --project-id <ref> --schema hadid > types/database.ts
 *
 * The `--schema hadid` flag is required. Without it the generator emits the
 * `public` schema, which this app does not use.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  hadid: {
    Tables: { [_ in never]: never }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
