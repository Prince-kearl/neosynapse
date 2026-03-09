import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, fullName, password, professionType, specialty, licenseNumber } = await req.json();

    if (!token || !fullName || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Validate invitation token
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation not found or already used" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This invitation has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create auth user with auto-confirm (invited users are pre-verified)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm since they were invited
      user_metadata: {
        full_name: fullName,
        display_name: fullName,
        role: invitation.role,
      },
    });

    if (authErr) {
      // Handle "already registered" case
      if (authErr.message?.includes("already been registered") || authErr.message?.includes("already exists")) {
        return new Response(JSON.stringify({ error: "An account with this email already exists. Please sign in instead." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Auth creation error:", authErr);
      return new Response(JSON.stringify({ error: "Failed to create account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // 3. Ensure profile exists with correct role (trigger should handle this, but update to be sure)
    await supabaseAdmin
      .from("profiles")
      .update({ role: invitation.role, full_name: fullName, display_name: fullName })
      .eq("user_id", userId);

    // 4. Create professional_profile if role is professional
    if (invitation.role === "professional") {
      await supabaseAdmin
        .from("professional_profiles")
        .upsert({
          user_id: userId,
          profession_type: professionType || null,
          specialty: specialty || null,
          license_number: licenseNumber || null,
          facility_id: invitation.facility_id || null,
          verification_status: "verified", // Invited professionals are pre-verified
        }, { onConflict: "user_id" });
    }

    // 5. Mark invitation as accepted
    await supabaseAdmin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    // 6. Log audit event
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userId,
      action: "invitation_accepted",
      entity_type: "invitation",
      entity_id: invitation.id,
      metadata: { role: invitation.role, email: invitation.email },
    });

    return new Response(JSON.stringify({
      success: true,
      email: invitation.email,
      role: invitation.role,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Invite accept error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
