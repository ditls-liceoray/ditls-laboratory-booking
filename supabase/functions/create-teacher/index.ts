import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { username, password, first_name, middle_name, last_name, email, contact_number, department, position, status, profile_picture } = await req.json();

    if (!username || !password || !first_name || !last_name || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authEmail = `${username.trim().toLowerCase()}@clbs.local`;

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = authData.user.id;

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: uid,
      username: username.trim().toLowerCase(),
      role: "teacher",
    });

    if (profileError) {
      // Cleanup: delete the auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(uid);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create teacher record
    const { data: teacherData, error: teacherError } = await adminClient
      .from("teachers")
      .insert({
        profile_id: uid,
        first_name,
        middle_name: middle_name || null,
        last_name,
        email,
        contact_number: contact_number || null,
        department,
        position,
        status: status || "active",
        profile_picture: profile_picture || null,
      })
      .select()
      .single();

    if (teacherError) {
      // Cleanup
      await adminClient.from("profiles").delete().eq("id", uid);
      await adminClient.auth.admin.deleteUser(uid);
      return new Response(JSON.stringify({ error: teacherError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, teacher: teacherData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
