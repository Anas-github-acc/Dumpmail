import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY
);

describe('Campaign Mail Automation RPC Integration', () => {
  let userId;
  let senderAccountId;
  let leadId;
  let template1Id;
  let template2Id;
  let campaignId;
  let campaignLeadId;
  let sequence1Id;
  let sequence2Id;
  let sentMessageId;

  const unique = Date.now();

  async function cleanup() {
    if (campaignId) {
      await supabase.from('campaigns').delete().eq('id', campaignId);
    }

    if (leadId) {
      await supabase.from('leads').delete().eq('id', leadId);
    }

    if (template1Id) {
      await supabase.from('email_templates').delete().eq('id', template1Id);
    }

    if (template2Id) {
      await supabase.from('email_templates').delete().eq('id', template2Id);
    }

    if (senderAccountId) {
      await supabase.from('sender_accounts').delete().eq('id', senderAccountId);
    }

    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
    }
  }

  beforeAll(async () => {
    await cleanup();

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name: 'Vitest User',
        email: `user_${unique}@example.com`
      })
      .select()
      .single();

    expect(userError).toBeNull();
    userId = user.id;

    const { data: sender, error: senderError } = await supabase
      .from('sender_accounts')
      .insert({
        user_id: userId,
        email: `sender_${unique}@example.com`,
        display_name: 'Test Sender',
        provider: 'smtp',
        status: 'active'
      })
      .select()
      .single();

    expect(senderError).toBeNull();
    senderAccountId = sender.id;

    const { error: warmupError } = await supabase
      .from('sender_warmup_state')
      .insert({
        sender_account_id: senderAccountId,
        warmup_start_date: new Date().toISOString().slice(0, 10),
        current_mode: 'warmup_1'
      });

    expect(warmupError).toBeNull();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: 'Test Lead',
        email: `lead_${unique}@example.com`,
        company: 'Test Corp',
        role: 'Developer',
        source: 'vitest',
        status: 'new'
      })
      .select()
      .single();

    expect(leadError).toBeNull();
    leadId = lead.id;

    const { data: template1, error: template1Error } = await supabase
      .from('email_templates')
      .insert({
        user_id: userId,
        name: 'Intro Template',
        subject: 'Intro Subject',
        body_html: '<p>Hello {{name}}</p>',
        body_text: 'Hello {{name}}',
        variables: ['name']
      })
      .select()
      .single();

    expect(template1Error).toBeNull();
    template1Id = template1.id;

    const { data: template2, error: template2Error } = await supabase
      .from('email_templates')
      .insert({
        user_id: userId,
        name: 'Followup Template',
        subject: 'Followup Subject',
        body_html: '<p>Following up {{name}}</p>',
        body_text: 'Following up {{name}}',
        variables: ['name']
      })
      .select()
      .single();

    expect(template2Error).toBeNull();
    template2Id = template2.id;

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        user_id: userId,
        sender_account_id: senderAccountId,
        name: 'Vitest Campaign',
        status: 'active'
      })
      .select()
      .single();

    expect(campaignError).toBeNull();
    campaignId = campaign.id;

    const { error: runtimeError } = await supabase
      .from('campaign_runtime_config')
      .insert({
        campaign_id: campaignId,
        timezone: 'Asia/Kolkata',
        start_hour: 0,
        end_hour: 23,
        active_days: [1, 2, 3, 4, 5, 6, 7],
        is_paused: false
      });

    expect(runtimeError).toBeNull();

    const { data: seq1, error: seq1Error } = await supabase
      .from('campaign_sequences')
      .insert({
        campaign_id: campaignId,
        step_number: 1,
        template_id: template1Id,
        delay_days: 0
      })
      .select()
      .single();

    expect(seq1Error).toBeNull();
    sequence1Id = seq1.id;

    const { data: seq2, error: seq2Error } = await supabase
      .from('campaign_sequences')
      .insert({
        campaign_id: campaignId,
        step_number: 2,
        template_id: template2Id,
        delay_days: 3
      })
      .select()
      .single();

    expect(seq2Error).toBeNull();
    sequence2Id = seq2.id;

    const { data: campaignLead, error: campaignLeadError } = await supabase
      .from('campaign_leads')
      .insert({
        campaign_id: campaignId,
        lead_id: leadId,
        current_step: 0,
        next_send_at: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    expect(campaignLeadError).toBeNull();
    campaignLeadId = campaignLead.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  it('1. rpc_get_sender_state_v2 should return sender daily quota state', async () => {
    const { data, error } = await supabase.rpc('rpc_get_sender_state_v2', {
      p_sender_account_id: senderAccountId
    });

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);

    expect(data[0].sender_account_id).toBe(senderAccountId);
    // expect(data[0]).toHaveProperty('mode');
    expect(data[0]).toHaveProperty('daily_cap');
    expect(data[0]).toHaveProperty('sent_today');
    expect(data[0]).toHaveProperty('remaining_today');
  });

  it('2. rpc_get_campaign_leads_to_send_v2 should select campaign, lead, sequence and template', async () => {
    const { data, error } = await supabase.rpc(
      'rpc_get_campaign_leads_to_send_v2',
      {
        p_sender_account_id: senderAccountId,
        p_limit: 1
      }
    );

    expect(error).toBeNull();
    expect(data.length).toBe(1);

    const row = data[0];

    expect(row.campaign_lead_id).toBe(campaignLeadId);
    expect(row.campaign_id).toBe(campaignId);
    expect(row.lead_id).toBe(leadId);
    expect(row.lead_name).toBe('Test Lead');
    expect(row.lead_email).toContain(`lead_${unique}`);
    expect(row.current_step).toBe(0);
    expect(row.sequence_id).toBe(sequence1Id);
    expect(row.template_subject).toBe('Intro Subject');
    expect(row.template_body).toContain('Hello');

    const { data: reserved, error: reservedError } = await supabase
      .from('campaign_leads')
      .select('status, reserved_at')
      .eq('id', campaignLeadId)
      .single();

    expect(reservedError).toBeNull();
    expect(reserved.status).toBe('reserved');
    expect(reserved.reserved_at).not.toBeNull();
  });

  it('3. rpc_mark_mail_sent_v2 should mark sent, log event, and move lead to next step', async () => {
    sentMessageId = `msg_${Date.now()}`;

    const { error } = await supabase.rpc('rpc_mark_mail_sent_v2', {
      p_campaign_lead_id: campaignLeadId,
      p_sender_account_id: senderAccountId,
      p_subject: 'Intro Subject',
      p_message_id: sentMessageId
    });

    expect(error).toBeNull();

    const { data: leadState, error: leadStateError } = await supabase
      .from('campaign_leads')
      .select('current_step, status, reserved_at, last_sent_at, next_send_at, completed_at')
      .eq('id', campaignLeadId)
      .single();

    expect(leadStateError).toBeNull();
    expect(leadState.current_step).toBe(1);
    expect(leadState.status).toBe('active');
    expect(leadState.reserved_at).toBeNull();
    expect(leadState.last_sent_at).not.toBeNull();
    expect(leadState.next_send_at).not.toBeNull();
    expect(leadState.completed_at).toBeNull();

    const { data: events, error: eventsError } = await supabase
      .from('email_events')
      .select('*')
      .eq('message_id', sentMessageId);

    expect(eventsError).toBeNull();
    expect(events.length).toBe(1);
    expect(events[0].campaign_lead_id).toBe(campaignLeadId);
    expect(events[0].sender_account_id).toBe(senderAccountId);
    expect(events[0].sequence_id).toBe(sequence1Id);
    expect(events[0].event_type).toBe('sent');
  });

  it('4. rpc_get_campaign_leads_to_send_v2 should not return same lead before follow-up date', async () => {
    const { data, error } = await supabase.rpc(
      'rpc_get_campaign_leads_to_send_v2',
      {
        p_sender_account_id: senderAccountId,
        p_limit: 1
      }
    );

    expect(error).toBeNull();
    expect(data.find(row => row.campaign_lead_id === campaignLeadId)).toBeUndefined();
  });

  it('5. should manually make follow-up eligible and return step 2 template', async () => {
    const { error: updateError } = await supabase
      .from('campaign_leads')
      .update({
        next_send_at: new Date(Date.now() - 60 * 1000).toISOString(),
        status: 'active'
      })
      .eq('id', campaignLeadId);

    expect(updateError).toBeNull();

    const { data, error } = await supabase.rpc(
      'rpc_get_campaign_leads_to_send_v2',
      {
        p_sender_account_id: senderAccountId,
        p_limit: 1
      }
    );

    expect(error).toBeNull();
    expect(data.length).toBe(1);

    expect(data[0].campaign_lead_id).toBe(campaignLeadId);
    expect(data[0].current_step).toBe(1);
    expect(data[0].sequence_id).toBe(sequence2Id);
    expect(data[0].template_subject).toBe('Followup Subject');
  });

  it('6. rpc_mark_reply_detected_v2 should stop the campaign lead', async () => {
    const { error } = await supabase.rpc('rpc_mark_reply_detected_v2', {
      p_campaign_lead_id: campaignLeadId
    });

    expect(error).toBeNull();

    const { data, error: stateError } = await supabase
      .from('campaign_leads')
      .select('status, reserved_at, completed_at')
      .eq('id', campaignLeadId)
      .single();

    expect(stateError).toBeNull();
    expect(data.status).toBe('replied');
    expect(data.reserved_at).toBeNull();
    expect(data.completed_at).not.toBeNull();
  });

  it('7. rpc_mark_mail_failed_v2 should mark failed lead and log failure event', async () => {
    const { data: failedLead, error: failedLeadError } = await supabase
      .from('leads')
      .insert({
        name: 'Failed Lead',
        email: `failed_${unique}@example.com`,
        company: 'Fail Corp',
        role: 'Tester',
        source: 'vitest',
        status: 'new'
      })
      .select()
      .single();

    expect(failedLeadError).toBeNull();

    const { data: failedCampaignLead, error: failedCampaignLeadError } =
      await supabase
        .from('campaign_leads')
        .insert({
          campaign_id: campaignId,
          lead_id: failedLead.id,
          current_step: 0,
          next_send_at: new Date().toISOString(),
          status: 'reserved',
          reserved_at: new Date().toISOString()
        })
        .select()
        .single();

    expect(failedCampaignLeadError).toBeNull();

    const { error } = await supabase.rpc('rpc_mark_mail_failed_v2', {
      p_campaign_lead_id: failedCampaignLead.id,
      p_reason: 'SMTP test failure'
    });

    expect(error).toBeNull();

    const { data: failedState, error: failedStateError } = await supabase
      .from('campaign_leads')
      .select('status, reserved_at')
      .eq('id', failedCampaignLead.id)
      .single();

    expect(failedStateError).toBeNull();
    expect(failedState.status).toBe('failed');
    expect(failedState.reserved_at).toBeNull();

    const { data: failedEvents, error: failedEventsError } = await supabase
      .from('email_events')
      .select('*')
      .eq('campaign_lead_id', failedCampaignLead.id)
      .eq('event_type', 'failed');

    expect(failedEventsError).toBeNull();
    expect(failedEvents.length).toBeGreaterThan(0);

    await supabase.from('leads').delete().eq('id', failedLead.id);
  });
});