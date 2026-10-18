-- Reference data: the plan ladder (spec §8.1, D4 defaults), the module catalogue (§2.1), plan contents,
-- platform switches (payments OFF during the beta) and the first feature flags.
-- Prices are in sen (RM 129.00 = 12900), SST excluded. Staff change them later in Console › Plans.

insert into public.plans (id, sort, price_monthly_sen, price_yearly_sen, seats_included, extra_seat_sen, ai_assists_month,
                          auto_mode, contacts_soft_cap, knowledge_docs, whatsapp_numbers, mailboxes, audit_retention_days,
                          is_custom, is_public)
values
  ('free',       10,     0,      0,  2, null,    50, false,   500,    0, 0,  0,   90, false, true),
  ('starter',    20, 12900, 129000,  3, 3900,   500, false,  2000,   10, 1,  0,   90, false, true),
  ('growth',     30, 34900, 349000,  6, 4900,  2000, true,  10000,  100, 2,  3,  365, false, true),
  ('business',   40, 79900, 799000, 12, 5900,  8000, true,  50000, 1000, 5, 10, 1095, false, true),
  ('enterprise', 50,     0,      0, 20, null,     0, true,   null, 1000, 5, 10, 1095, true,  true)
on conflict (id) do nothing;
--> statement-breakpoint

insert into public.modules (id, sort, addon_price_sen)
values
  ('home', 10, null),
  ('inbox', 20, null),
  ('channel.whatsapp', 21, 4900),
  ('channel.instagram', 22, null),
  ('channel.messenger', 23, null),
  ('channel.webchat', 24, null),
  ('channel.telegram', 25, null),
  ('channel.email', 26, 4900),
  ('channel.tiktok', 27, null),
  ('channel.marketplace', 28, null),
  ('broadcast', 29, null),
  ('automation', 30, null),
  ('assistant', 40, null),
  ('knowledge', 41, null),
  ('content', 50, 7900),
  ('email', 60, 4900),
  ('website', 61, 7900),
  ('company', 70, null),
  ('contacts', 71, null),
  ('deals', 72, 9900),
  ('invoicing', 73, 9900),
  ('reports', 74, null),
  ('team', 80, null),
  ('settings', 90, null),
  ('console', 100, null)
on conflict (id) do nothing;
--> statement-breakpoint

-- What each plan includes. Limits are read by the entitlement resolver (packages/db/src/entitlements.ts).
insert into public.plan_modules (plan_id, module_id, limits)
select p.plan_id, p.module_id, p.limits::jsonb
from (values
  -- Free: Inbox with website chat + Telegram, Contacts, Company, Team; 50 assists, Suggest only; basic automation.
  ('free', 'home', '{}'), ('free', 'inbox', '{}'), ('free', 'channel.webchat', '{}'), ('free', 'channel.telegram', '{}'),
  ('free', 'contacts', '{}'), ('free', 'company', '{}'), ('free', 'team', '{}'), ('free', 'settings', '{}'),
  ('free', 'assistant', '{"assists": 50, "auto": false}'), ('free', 'automation', '{"basic": true}'),
  -- Starter: + WhatsApp, Instagram, Messenger, Automation, Assistant 500, Knowledge 10, Reports basic.
  ('starter', 'home', '{}'), ('starter', 'inbox', '{}'), ('starter', 'channel.webchat', '{}'), ('starter', 'channel.telegram', '{}'),
  ('starter', 'channel.whatsapp', '{"numbers": 1}'), ('starter', 'channel.instagram', '{"accounts": 1}'),
  ('starter', 'channel.messenger', '{"pages": 1}'), ('starter', 'contacts', '{}'), ('starter', 'company', '{}'),
  ('starter', 'team', '{}'), ('starter', 'settings', '{}'), ('starter', 'automation', '{}'),
  ('starter', 'assistant', '{"assists": 500, "auto": false}'), ('starter', 'knowledge', '{"documents": 10}'),
  ('starter', 'reports', '{"level": "basic"}'),
  -- Growth: + Email (3 mailboxes), 2 WhatsApp numbers, TikTok publishing, Broadcasts, Content, Deals, Reports full, Auto mode.
  ('growth', 'home', '{}'), ('growth', 'inbox', '{}'), ('growth', 'channel.webchat', '{}'), ('growth', 'channel.telegram', '{}'),
  ('growth', 'channel.whatsapp', '{"numbers": 2}'), ('growth', 'channel.instagram', '{"accounts": 1}'),
  ('growth', 'channel.messenger', '{"pages": 1}'), ('growth', 'channel.email', '{"mailboxes": 3}'),
  ('growth', 'channel.tiktok', '{"publishing": true}'), ('growth', 'broadcast', '{}'), ('growth', 'contacts', '{}'),
  ('growth', 'company', '{}'), ('growth', 'team', '{}'), ('growth', 'settings', '{}'), ('growth', 'automation', '{}'),
  ('growth', 'assistant', '{"assists": 2000, "auto": true}'), ('growth', 'knowledge', '{"documents": 100}'),
  ('growth', 'content', '{}'), ('growth', 'email', '{}'), ('growth', 'deals', '{}'), ('growth', 'reports', '{"level": "full"}'),
  -- Business: + Invoicing, 5 numbers, 10 mailboxes, marketplace chat when available, Knowledge 1,000, BYOK.
  ('business', 'home', '{}'), ('business', 'inbox', '{}'), ('business', 'channel.webchat', '{}'), ('business', 'channel.telegram', '{}'),
  ('business', 'channel.whatsapp', '{"numbers": 5}'), ('business', 'channel.instagram', '{"accounts": 1}'),
  ('business', 'channel.messenger', '{"pages": 1}'), ('business', 'channel.email', '{"mailboxes": 10}'),
  ('business', 'channel.tiktok', '{"publishing": true}'), ('business', 'channel.marketplace', '{}'),
  ('business', 'broadcast', '{}'), ('business', 'contacts', '{}'), ('business', 'company', '{}'), ('business', 'team', '{}'),
  ('business', 'settings', '{}'), ('business', 'automation', '{}'),
  ('business', 'assistant', '{"assists": 8000, "auto": true, "byok": true}'), ('business', 'knowledge', '{"documents": 1000}'),
  ('business', 'content', '{}'), ('business', 'email', '{}'), ('business', 'deals', '{}'), ('business', 'invoicing', '{}'),
  ('business', 'reports', '{"level": "full"}'),
  -- Enterprise: everything that exists (custom limits are set per company in the Console).
  ('enterprise', 'home', '{}'), ('enterprise', 'inbox', '{}'), ('enterprise', 'channel.webchat', '{}'),
  ('enterprise', 'channel.telegram', '{}'), ('enterprise', 'channel.whatsapp', '{"numbers": 5}'),
  ('enterprise', 'channel.instagram', '{"accounts": 1}'), ('enterprise', 'channel.messenger', '{"pages": 1}'),
  ('enterprise', 'channel.email', '{"mailboxes": 10}'), ('enterprise', 'channel.tiktok', '{"publishing": true}'),
  ('enterprise', 'channel.marketplace', '{}'), ('enterprise', 'broadcast', '{}'), ('enterprise', 'contacts', '{}'),
  ('enterprise', 'company', '{}'), ('enterprise', 'team', '{}'), ('enterprise', 'settings', '{}'),
  ('enterprise', 'automation', '{}'), ('enterprise', 'assistant', '{"assists": 0, "auto": true, "byok": true}'),
  ('enterprise', 'knowledge', '{"documents": 1000}'), ('enterprise', 'content', '{}'), ('enterprise', 'email', '{}'),
  ('enterprise', 'deals', '{}'), ('enterprise', 'invoicing', '{}'), ('enterprise', 'reports', '{"level": "full"}')
) as p(plan_id, module_id, limits)
on conflict (plan_id, module_id) do nothing;
--> statement-breakpoint

insert into public.platform_settings (key, value)
values
  ('billing_enabled', 'false'),      -- Phase 4 switches payments on (Console)
  ('beta', 'true'),                  -- every module free during the beta (spec §11 Phase 0)
  ('signups_open', 'true'),
  ('founder_slots', '10')            -- D7: first 10 companies are Founding customers (ticked by staff)
on conflict (key) do nothing;
--> statement-breakpoint

insert into public.feature_flags (key, description, enabled, rollout_percent)
values
  ('google_sign_in', 'Show "Continue with Google" on the sign-in and sign-up pages', true, 100),
  ('magic_link', 'Allow sign-in by email link', true, 100),
  ('dark_mode', 'Dark theme switch (D17: later)', false, 0)
on conflict (key) do nothing;
