import { createClient } from "@supabase/supabase-js";
import { encrypt } from "../../app/utils/crypto.js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY
);

const EMAIL_USER = process.env.EMAIL_USER || "anas.ahamad955@gmail.com";
const EMAIL_PASS = encrypt(process.env.EMAIL_PASS);

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

async function main() {
  if (!EMAIL_PASS) {
    throw new Error("EMAIL_PASS is missing in .env");
  }

  try {
    // 1. Create user
    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          email: EMAIL_USER,
          name: "Anas Ahamad"
        },
        { onConflict: "email" }
      )
      .select()
      .single();
  
    if (userError) throw userError;
  
    // 2. Create sender account
    const { data: sender, error: senderError } = await supabase
      .from("sender_accounts")
      .insert({
        user_id: user.id,
        email: EMAIL_USER,
        display_name: "Anas Ahamad",
        provider: "smtp",
        smtp_host: SMTP_HOST,
        smtp_port: SMTP_PORT,
        smtp_secure: false,
        smtp_user_email: EMAIL_USER,
        encrypted_smtp_password: EMAIL_PASS,
        status: "active"
      })
      .select()
      .single();
  
    if (senderError) throw senderError;
  
    // 3. Create warmup state
    const { error: warmupError } = await supabase
      .from("sender_warmup_state")
      .upsert({
        sender_account_id: sender.id,
        warmup_start_date: new Date().toISOString().slice(0, 10),
        current_mode: "warmup_1"
      });
  
    if (warmupError) throw warmupError;
  
    // 4. Create lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .upsert(
        [{
          email: "anasthenewyt@gmail.com",
          name: "Anas Test Lead",
          company: "Test Company",
          role: "Developer",
          source: "manual",
          status: "new"
        },
        {
          email: "nitinsanatabhai955@gmail.com",
          name: "Another Test Lead",
          company: "Sanata",
          role: "Designer",
          source: "manual",
          status: "new"
        }
        ],
        { onConflict: "email" }
      )
      .select()
  
    if (leadError) throw leadError;
  
    // 5. Create templates
    const { data: template1, error: template1Error } = await supabase
      .from("email_templates")
      .insert({
        user_id: user.id,
        name: "Intro Template",
        subject: "Quick hello from Anas",
        body_html: `
          <p>Hi {{name}},</p>
          <p>[[ 'This is a test email from my mail automation system.', 'This is a 2nd test email from my mail automation system.' ]]</p>
          <p>Regards,<br/>Anas</p>
        `,
        body_text: "Hi {{name}}, this is a test email from my mail automation system.",
        variables: ["name"]
      })
      .select()
      .single();
  
    if (template1Error) throw template1Error;
  
    const { data: template2, error: template2Error } = await supabase
      .from("email_templates")
      .insert({
        user_id: user.id,
        name: "Followup Template",
        subject: "Following up",
        body_html: `
          <p>Hi {{name}},</p>
          <p>Just following up on my previous email.</p>
          <p>Regards,<br/>Anas</p>
        `,
        body_text: "Hi {{name}}, just following up on my previous email.",
        variables: ["name"]
      })
      .select()
      .single();
  
    if (template2Error) throw template2Error;
  
    // 6. Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        sender_account_id: sender.id,
        name: "Test Campaign",
        status: "active"
      })
      .select()
      .single();
  
    if (campaignError) throw campaignError;
  
    // 7. Create campaign runtime config
    const { error: runtimeError } = await supabase
      .from("campaign_runtime_config")
      .insert({
        campaign_id: campaign.id,
        timezone: "Asia/Kolkata",
        start_hour: 0,
        end_hour: 23,
        active_days: [1, 2, 3, 4, 5, 6, 7],
        is_paused: false
      });
  
    if (runtimeError) throw runtimeError;
  
    // 8. Create sequence steps
    const { error: sequenceError } = await supabase
      .from("campaign_sequences")
      .insert([
        {
          campaign_id: campaign.id,
          step_number: 1,
          template_id: template1.id,
          delay_days: 0
        },
        {
          campaign_id: campaign.id,
          step_number: 2,
          template_id: template2.id,
          delay_days: 3
        }
      ]);
  
    if (sequenceError) throw sequenceError;
  
    // 9. Add lead to campaign
    const { data: campaignLead, error: campaignLeadError } = await supabase
      .from("campaign_leads")
      .upsert(
        [{
          campaign_id: campaign.id,
          lead_id: lead[0].id,
          current_step: 0,
          next_send_at: new Date().toISOString(),
          status: "pending"
        },
        {
          campaign_id: campaign.id,
          lead_id: lead[1].id,
          current_step: 0,
          next_send_at: new Date().toISOString(),
          status: "pending"
        }
        ],
        { onConflict: "campaign_id,lead_id" }
      )
      .select()
  
    if (campaignLeadError) throw campaignLeadError;

    console.log("Seed completed successfully");
    console.log({
      user_id: user.id,
      sender_account_id: sender.id,
      lead_id: lead.id,
      campaign_id: campaign.id,
      campaign_lead_id: campaignLead.id
    });


  } catch (err) {
    console.error("Error seeding data:", err);

    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});