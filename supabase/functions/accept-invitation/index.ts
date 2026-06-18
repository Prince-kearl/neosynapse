import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, professionType, specialty, licenseNumber } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing invitation token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Please sign in with the invited account before accepting this invitation" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await supabaseUser.auth.getUser(jwt);
    const signedInUser = authData?.user;

    if (authErr || !signedInUser?.id || !signedInUser.email) {
      return new Response(JSON.stringify({ error: "Your session could not be verified. Please sign in again." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Validate invitation token
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("token", token)
      .in("status", ["pending", "sent"])
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

    const invitedEmail = String(invitation.email || "").trim().toLowerCase();
    const signedInEmail = signedInUser.email.trim().toLowerCase();

    if (signedInEmail !== invitedEmail) {
      return new Response(JSON.stringify({
        error: `This invitation is for ${invitation.email}. Please sign in with that account to accept it.`,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = signedInUser.id;

    // 2. Ensure profile exists with correct role.
    await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        role: invitation.role,
      }, { onConflict: "user_id" });

    await supabaseAdmin
      .from("profiles")
      .update({ role: invitation.role })
      .eq("user_id", userId);

    // 3. Create professional_profile if role is professional.
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

    // 4. Insert role into user_roles table.
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: invitation.role }, { onConflict: "user_id,role" });

    if (invitation.role === "admin") {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .in("role", ["patient", "professional"]);
    } else if (invitation.role === "professional") {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "patient");
    }

    // 5. Mark invitation as accepted.
    await supabaseAdmin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    // 6. Log audit event.
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
