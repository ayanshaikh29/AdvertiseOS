-- Seed: clearly labeled SAMPLE brand + org for demo. Apply after 0001_init.sql.
-- psql $DATABASE_URL -f supabase/seed.sql

insert into orgs (id, name) values ('00000000-0000-0000-0000-000000000001', 'Digital Advertise (Sample)')
on conflict (id) do nothing;

insert into brands (id, org_id, name, tone, languages, audience, products, usp, dos, donts, compliance_notes)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Sample Brand (Sample data)',
  'confident, helpful, premium',
  '{English,Hinglish}',
  'Small business owners in India looking for digital marketing help',
  '["SEO", "social media", "performance ads", "web development"]',
  'Senior team, transparent reporting',
  '{Use clear CTAs,Mention city/service explicitly}',
  '{No fake awards,No invented statistics,No guaranteed results}',
  'Never invent client names, awards, testimonials, or numbers.'
)
on conflict (id) do nothing;
