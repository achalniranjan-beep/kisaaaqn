"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function createDiagnosis(data: {
  image_url: string
  disease_name?: string
  confidence?: number
  symptoms?: string
  treatment_recommendation?: string
  severity?: "low" | "medium" | "high" | "critical"
  crop_type?: string
}) {
  if (!isSupabaseConfigured()) {
    console.warn("[v0] Supabase not configured - skipping createDiagnosis")
    return { data: { id: "temp-" + Date.now(), ...data }, error: null }
  }
  const supabase = createAdminClient()

  const { data: diagnosis, error } = await supabase
    .from("plant_diagnoses")
    .insert({
      user_id: MOCK_USER_ID,
      ...data,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Create diagnosis error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/camera")
  return { data: diagnosis }
}

export async function getDiagnoses(userId: string, limit = 10) {
  // Check if Supabase is properly configured with valid-looking keys
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseKey.length < 20 || !supabaseKey.startsWith('eyJ')) {
    console.warn("[v0] Supabase not configured properly - returning empty diagnoses")
    return { data: [], error: null }
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("plant_diagnoses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Get diagnoses error:", error.message)
      // Return empty data instead of crashing the page
      return { data: [], error: null }
    }

    return { data: data || [] }
  } catch (err) {
    console.error("[v0] Supabase connection error:", err)
    return { data: [], error: null }
  }
}

export async function getDiagnosisById(id: string) {
  if (!isSupabaseConfigured()) {
    console.warn("[v0] Supabase not configured - returning null diagnosis")
    return { data: null, error: null }
  }
  const supabase = createAdminClient()

  const { data, error } = await supabase.from("plant_diagnoses").select("*").eq("id", id).maybeSingle()

  if (error) {
    console.error("[v0] Get diagnosis error:", error.message)
    return { error: error.message }
  }

  return { data }
}
