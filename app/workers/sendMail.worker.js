import { runSendMail } from "../services/mail/send.js";
import { renderTemplate } from "../services/mail/template.js";
import { delay } from "../utils/helpers.js";
import { supabase } from "../services/db/supabase.js";
import { env } from "../config/env.js";
import { log } from "../utils/logger.js";
import { validateRecipientDeliverability } from "../utils/validator.js";

export async function sendMailWorker() {
  const { data : check, error: checkError } = await supabase.rpc("rpc_check_campaign_to_run_v2", {
    p_user_id: env.USER_ID
  });

  if (checkError) {
    log(["check_campaigns_to_run failed", checkError.message]);
    return;
  }

  const compaignCheck = check?.[0];

  if (!check?.shouldRun) {
    log(["sendMailWorker skipped", "No campaigns scheduled to run at this time"]);
    return;
  }

  const compaignId = compaignCheck.campaign_id;
  const user_id = env.USER_ID;

  if (!user_id) {
    log(["sendMailWorker missing USER_ID"]);
    return;
  }

  /*
    rpc_get_campaign_leads_to_send_v2 returns {
      campaign_lead_id,
      sender_account_id,
      campaign_id,
      lead_id,
      template_id,

      name,
      email,
      company,
      role,

      current_step,
      sequence_id,

      subject,
      body_html,
      attachment_name,
      attachment_path,
      attachment_size,
      attachment_mime_type,

      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user_email,
      encrypted_smtp_password,
      smtp_live
    }  
  */

  const { data: leads = [], error: leadsError } = await supabase.rpc("rpc_get_campaign_leads_to_send_v2", {
    p_user_id: user_id,
    p_campaign_id: compaignId,
    p_limit: 1
  });
  
  if (leadsError) {
    log(["rpc_get_leads_to_send failed", leadsError.message]);
    return;
  }
  
  if (!leads.length) {
    log(["sendMailWorker no-op", "No eligible leads for this tick"]);
    return;
  }

  console.log("[sendMailWorker] Mail sent to :", leads);

  // console.log(lead.template_subject);
  // console.log(lead.template_body);


  for(const lead of leads) {
    const template = await renderTemplate(
      lead.template_subject,
      lead.template_body,
      {
        name: lead.lead_name,
        company: lead.lead_company,
        role: lead.lead_role,
      },
      lead.attachment ? {
        name: lead.attachment_name,
        path: lead.attachment_path,
        size: lead.attachment_size,
        mime_type: lead.attachment_mime_type
      } : undefined
    );

    // console.log("Rendered template:", template);

    const messageId = await runSendMail(
      lead.lead_email,
      template.subject,
      template.body,
      {
        host: lead.smtp_host,
        port: lead.smtp_port,
        secure: lead.smtp_secure,
        user_email: lead.smtp_user_email,
        pass: lead.encrypted_smtp_password,
        live: lead.smtp_live
      },
      {
        attachments: template.attachments
      }
    );

    await supabase.rpc("rpc_mark_mail_sent_v2", {
      p_campaign_lead_id: lead.campaign_lead_id,
      p_sender_account_id: lead.sender_account_id,
      p_subject: template.subject,
      p_message_id: messageId
    });

    // const hasMore = i < leads.length - 1;
    // if (hasMore && env.SEND_DELAY_MS > 0) {
    //   await delay(env.SEND_DELAY_MS);
    // }
  }
}

