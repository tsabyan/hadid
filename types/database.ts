/**
 * Types for the `hadid` schema.
 *
 * Hand-written to match supabase/migrations/0001–0011 exactly, because this
 * project has no linked Supabase CLI. Regenerate from the dashboard after any
 * migration — API Docs → Generate types → TypeScript, scoped to `hadid`, not
 * `public` — and replace this file wholesale rather than patching it.
 *
 * Until then, treat a mismatch between this file and a migration as a bug in
 * this file: the database is the source of truth.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other'

export type ExerciseType = 'strength' | 'cardio' | 'mobility'
export type MuscleRole = 'primary' | 'secondary'
export type RecordType = 'max_weight' | 'max_reps' | 'max_volume' | 'est_1rm'
export type UnitSystem = 'metric' | 'imperial'
export type ThemePreference = 'system' | 'light' | 'dark'

export type Database = {
  hadid: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          unit_system: UnitSystem
          default_rest_seconds: number
          theme: ThemePreference
          week_starts_on: number
          timezone: string
          onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          unit_system?: UnitSystem
          default_rest_seconds?: number
          theme?: ThemePreference
          week_starts_on?: number
          timezone?: string
          onboarded?: boolean
        }
        Update: Partial<Database['hadid']['Tables']['profiles']['Insert']>
        Relationships: []
      }

      muscle_groups: {
        Row: {
          id: string
          name: string
          region: 'upper' | 'lower' | 'core'
          body_side: 'front' | 'back' | 'both'
          svg_group: string
          sort_order: number
        }
        Insert: Database['hadid']['Tables']['muscle_groups']['Row']
        Update: Partial<Database['hadid']['Tables']['muscle_groups']['Row']>
        Relationships: []
      }

      exercises: {
        Row: {
          id: string
          user_id: string | null
          slug: string | null
          name: string
          aliases: string[]
          equipment: Equipment
          type: ExerciseType
          is_unilateral: boolean
          default_rest_seconds: number | null
          instructions: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          slug?: string | null
          name: string
          aliases?: string[]
          equipment?: Equipment
          type?: ExerciseType
          is_unilateral?: boolean
          default_rest_seconds?: number | null
          instructions?: string | null
        }
        Update: Partial<Database['hadid']['Tables']['exercises']['Insert']>
        Relationships: []
      }

      exercise_muscles: {
        Row: {
          exercise_id: string
          muscle_group_id: string
          role: MuscleRole
          activation: number
        }
        Insert: Database['hadid']['Tables']['exercise_muscles']['Row']
        Update: Partial<Database['hadid']['Tables']['exercise_muscles']['Row']>
        Relationships: [
          { foreignKeyName: 'exercise_muscles_exercise_id_fkey'; columns: ['exercise_id']; isOneToOne: false; referencedRelation: 'exercises'; referencedColumns: ['id'] },
          { foreignKeyName: 'exercise_muscles_muscle_group_id_fkey'; columns: ['muscle_group_id']; isOneToOne: false; referencedRelation: 'muscle_groups'; referencedColumns: ['id'] },
        ]
      }

      routines: {
        Row: {
          id: string
          user_id: string
          name: string
          notes: string | null
          color: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          notes?: string | null
          color?: string | null
          archived_at?: string | null
        }
        Update: Partial<Database['hadid']['Tables']['routines']['Insert']>
        Relationships: []
      }

      routine_versions: {
        Row: {
          id: string
          routine_id: string
          version: number
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          routine_id: string
          version: number
          is_current?: boolean
        }
        Update: Partial<
          Database['hadid']['Tables']['routine_versions']['Insert']
        >
        Relationships: [
          { foreignKeyName: 'routine_versions_routine_id_fkey'; columns: ['routine_id']; isOneToOne: false; referencedRelation: 'routines'; referencedColumns: ['id'] },
        ]
      }

      routine_exercises: {
        Row: {
          id: string
          routine_version_id: string
          exercise_id: string
          position: number
          rest_seconds: number | null
          superset_with_next: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          routine_version_id: string
          exercise_id: string
          position: number
          rest_seconds?: number | null
          superset_with_next?: boolean
          notes?: string | null
        }
        Update: Partial<
          Database['hadid']['Tables']['routine_exercises']['Insert']
        >
        Relationships: [
          { foreignKeyName: 'routine_exercises_routine_version_id_fkey'; columns: ['routine_version_id']; isOneToOne: false; referencedRelation: 'routine_versions'; referencedColumns: ['id'] },
          { foreignKeyName: 'routine_exercises_exercise_id_fkey'; columns: ['exercise_id']; isOneToOne: false; referencedRelation: 'exercises'; referencedColumns: ['id'] },
        ]
      }

      routine_sets: {
        Row: {
          id: string
          routine_exercise_id: string
          set_number: number
          target_weight_kg: number | null
          target_reps: number | null
          is_warmup: boolean
        }
        Insert: {
          id?: string
          routine_exercise_id: string
          set_number: number
          target_weight_kg?: number | null
          target_reps?: number | null
          is_warmup?: boolean
        }
        Update: Partial<Database['hadid']['Tables']['routine_sets']['Insert']>
        Relationships: [
          { foreignKeyName: 'routine_sets_routine_exercise_id_fkey'; columns: ['routine_exercise_id']; isOneToOne: false; referencedRelation: 'routine_exercises'; referencedColumns: ['id'] },
        ]
      }

      workouts: {
        Row: {
          id: string
          user_id: string
          routine_version_id: string | null
          name: string
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          total_volume_kg: number
          total_sets: number
          notes: string | null
          created_at: string
        }
        Insert: {
          /** Client-generated. Offline sessions need identity before sync. */
          id: string
          user_id: string
          routine_version_id?: string | null
          name?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          notes?: string | null
        }
        Update: Partial<Database['hadid']['Tables']['workouts']['Insert']>
        Relationships: [
          { foreignKeyName: 'workouts_routine_version_id_fkey'; columns: ['routine_version_id']; isOneToOne: false; referencedRelation: 'routine_versions'; referencedColumns: ['id'] },
        ]
      }

      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          position: number
          rest_seconds: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          position: number
          rest_seconds?: number | null
          notes?: string | null
        }
        Update: Partial<
          Database['hadid']['Tables']['workout_exercises']['Insert']
        >
        Relationships: [
          { foreignKeyName: 'workout_exercises_workout_id_fkey'; columns: ['workout_id']; isOneToOne: false; referencedRelation: 'workouts'; referencedColumns: ['id'] },
          { foreignKeyName: 'workout_exercises_exercise_id_fkey'; columns: ['exercise_id']; isOneToOne: false; referencedRelation: 'exercises'; referencedColumns: ['id'] },
        ]
      }

      sets: {
        Row: {
          id: string
          workout_exercise_id: string
          set_number: number
          weight_kg: number
          reps: number
          is_warmup: boolean
          rpe: number | null
          /** Generated column: weight_kg * reps. Never write it. */
          volume_kg: number
          completed_at: string
        }
        Insert: {
          id: string
          workout_exercise_id: string
          set_number: number
          weight_kg?: number
          reps: number
          is_warmup?: boolean
          rpe?: number | null
          completed_at?: string
        }
        Update: Partial<Database['hadid']['Tables']['sets']['Insert']>
        Relationships: [
          { foreignKeyName: 'sets_workout_exercise_id_fkey'; columns: ['workout_exercise_id']; isOneToOne: false; referencedRelation: 'workout_exercises'; referencedColumns: ['id'] },
        ]
      }

      personal_records: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          record_type: RecordType
          value: number
          reps: number | null
          set_id: string | null
          achieved_at: string
          previous_value: number | null
        }
        /** No insert policy exists — written only by detect_prs(). */
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'personal_records_exercise_id_fkey'; columns: ['exercise_id']; isOneToOne: false; referencedRelation: 'exercises'; referencedColumns: ['id'] },
          { foreignKeyName: 'personal_records_set_id_fkey'; columns: ['set_id']; isOneToOne: false; referencedRelation: 'sets'; referencedColumns: ['id'] },
        ]
      }

      achievements: {
        Row: {
          id: string
          category: 'milestones' | 'volume' | 'strength'
          name: string
          description: string
          metric:
            | 'workouts_count'
            | 'total_volume_kg'
            | 'streak_days'
            | 'sets_count'
            | 'pr_count'
          threshold: number
          sort_order: number
        }
        Insert: never
        Update: never
        Relationships: []
      }

      user_achievements: {
        Row: {
          user_id: string
          achievement_id: string
          progress: number
          unlocked_at: string | null
        }
        /** No insert policy — written only by evaluate_achievements(). */
        Insert: never
        Update: never
        Relationships: [
          { foreignKeyName: 'user_achievements_achievement_id_fkey'; columns: ['achievement_id']; isOneToOne: false; referencedRelation: 'achievements'; referencedColumns: ['id'] },
        ]
      }
    }

    Views: {
      v_daily_volume: {
        Row: {
          user_id: string | null
          day: string | null
          workout_count: number | null
          volume_kg: number | null
          set_count: number | null
          duration_seconds: number | null
          rep_count: number | null
        }
        Relationships: []
      }
      v_muscle_load: {
        Row: {
          user_id: string | null
          day: string | null
          muscle_group_id: string | null
          load_kg: number | null
        }
        Relationships: []
      }
      v_workout_summary: {
        Row: {
          workout_id: string | null
          user_id: string | null
          name: string | null
          started_at: string | null
          ended_at: string | null
          duration_seconds: number | null
          total_volume_kg: number | null
          total_sets: number | null
          exercise_count: number | null
          exercise_names: string[] | null
        }
        Relationships: []
      }
    }

    Functions: {
      finish_workout: {
        Args: { p_workout_id: string }
        Returns: Json
      }
      evaluate_achievements: {
        Args: { p_user_id: string }
        Returns: {
          achievement_id: string
          name: string
          category: string
        }[]
      }
    }

    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

/** Shape returned by finish_workout(), parsed at the call site. */
export type FinishWorkoutResult = {
  summary: Database['hadid']['Views']['v_workout_summary']['Row']
  new_prs: {
    exercise_id: string
    record_type: RecordType
    value: number
    previous_value: number | null
    reps: number | null
  }[]
  new_badges: {
    achievement_id: string
    name: string
    category: string
  }[]
}

export type Tables<T extends keyof Database['hadid']['Tables']> =
  Database['hadid']['Tables'][T]['Row']
export type Views<T extends keyof Database['hadid']['Views']> =
  Database['hadid']['Views'][T]['Row']
