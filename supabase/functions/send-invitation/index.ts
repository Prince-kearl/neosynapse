import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * send-invitation edge function
 * 
 * Creates an invitation record and sends an email to the recipient
 * with a link to accept the invitation.
 *
 * TODO: Configure an email provider (Resend, SendGrid, etc.) for production use.
 *       Currently uses Resend — set the RESEND_API_KEY secret.
 *       Without a valid RESEND_API_KEY the invitation is still created in the DB
 *       but the email step will fail and the status will remain "pending" (not "sent").
 */

interface InvitationPayload {
  email: string;
  role: "professional" | "admin";
  invited_by: string;
  facility_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Check if caller is admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can send invitations" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, invited_by, facility_id }: InvitationPayload = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create the invitation record
    const { data: invitation, error: insertErr } = await supabaseAdmin
      .from("invitations")
      .insert({
        email,
        role,
        invited_by: invited_by || user.id,
        facility_id: facility_id || null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build the invite link
    // In production, replace with your actual app domain
    const appUrl = Deno.env.get("APP_URL") || Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://your-app.lovable.app";
    // Use the origin from the request referer/origin header as fallback
    const origin = req.headers.get("origin") || appUrl;
    const inviteLink = `${origin}/auth/invite-accept?token=${invitation.token}`;

    // 3. Send the email
    // TODO: Set RESEND_API_KEY secret for email delivery to work.
    //       Without it, invitations are created but emails are NOT sent.
    //       Get your API key from https://resend.com/api-keys
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    let emailError: string | null = null;

    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // TODO: Update 'from' to use your verified domain in Resend
            from: "MedConnect <noreply@resend.dev>",
            to: [email],
            subject: `You've been invited to join as a ${role}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1a1a2e; font-size: 24px;">You're Invited!</h1>
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  You've been invited to join MedConnect as a <strong>${role}</strong>.
                </p>
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Click the button below to create your account and get started:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteLink}" 
                     style="background-color: #1a1a2e; color: #ffffff; padding: 14px 32px; 
                            text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color: #999; font-size: 13px;">
                  This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.
                </p>
                <p style="color: #999; font-size: 13px;">
                  Or copy this link: <a href="${inviteLink}">${inviteLink}</a>
                </p>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          const errBody = await emailResponse.text();
          emailError = `Resend API error: ${emailResponse.status} - ${errBody}`;
          console.error("Email send failed:", emailError);
        }
      } catch (err) {
        emailError = `Email send exception: ${err.message}`;
        console.error(emailError);
      }
    } else {
      emailError = "RESEND_API_KEY not configured — email was not sent";
      console.warn(emailError);
    }

    // 4. Update invitation status based on email result
    if (emailSent) {
      await supabaseAdmin
        .from("invitations")
        .update({ status: "sent" })
        .eq("id", invitation.id);
    }
    // If email fails, status stays "pending" so admin can see it wasn't delivered

    // 5. Log audit event
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: user.id,
      action: emailSent ? "invitation_sent" : "invitation_created_no_email",
      entity_type: "invitation",
      entity_id: invitation.id,
      metadata: { email, role, email_sent: emailSent, email_error: emailError },
    });

    return new Response(JSON.stringify({
      success: true,
      invitation_id: invitation.id,
      email_sent: emailSent,
      email_error: emailError,
      invite_link: inviteLink,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-invitation error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
