-- Seed script SQL direct
-- 1. User (password: password123)
INSERT INTO "User" (id, email, "passwordHash", "createdAt")
VALUES ('seed-user-1', 'owner@example.com', '$2b$10$3rf.jZPMCXS0aX7zzDBBtOB5b3MzLe60MCkBQecztd9DcXx4rAeFm', NOW());

-- 2. Organization
INSERT INTO "Organization" (id, name, "createdAt")
VALUES ('seed-org-1', 'Acme Corp', NOW());

-- 3. Membership
INSERT INTO "Membership" (id, "userId", "orgId", role, "createdAt")
VALUES ('seed-membership-1', 'seed-user-1', 'seed-org-1', 'owner', NOW());

-- 4. 20 CostRecords répartis sur 30 jours
INSERT INTO "CostRecord" (id, "orgId", date, provider, service, "amountEUR", currency, "createdAt")
VALUES
  ('seed-cost-1', 'seed-org-1', NOW() - INTERVAL '1 day', 'AWS', 'EC2', 150.50, 'EUR', NOW()),
  ('seed-cost-2', 'seed-org-1', NOW() - INTERVAL '2 days', 'Azure', 'Storage', 75.25, 'EUR', NOW()),
  ('seed-cost-3', 'seed-org-1', NOW() - INTERVAL '3 days', 'GCP', 'Compute', 200.00, 'EUR', NOW()),
  ('seed-cost-4', 'seed-org-1', NOW() - INTERVAL '5 days', 'AWS', 'S3', 45.75, 'EUR', NOW()),
  ('seed-cost-5', 'seed-org-1', NOW() - INTERVAL '7 days', 'DigitalOcean', 'Droplets', 120.00, 'EUR', NOW()),
  ('seed-cost-6', 'seed-org-1', NOW() - INTERVAL '8 days', 'Vercel', 'Functions', 30.50, 'EUR', NOW()),
  ('seed-cost-7', 'seed-org-1', NOW() - INTERVAL '10 days', 'AWS', 'Lambda', 85.25, 'EUR', NOW()),
  ('seed-cost-8', 'seed-org-1', NOW() - INTERVAL '12 days', 'Azure', 'Database', 180.00, 'EUR', NOW()),
  ('seed-cost-9', 'seed-org-1', NOW() - INTERVAL '14 days', 'GCP', 'CDN', 55.50, 'EUR', NOW()),
  ('seed-cost-10', 'seed-org-1', NOW() - INTERVAL '15 days', 'AWS', 'EC2', 220.75, 'EUR', NOW()),
  ('seed-cost-11', 'seed-org-1', NOW() - INTERVAL '17 days', 'DigitalOcean', 'Storage', 95.00, 'EUR', NOW()),
  ('seed-cost-12', 'seed-org-1', NOW() - INTERVAL '18 days', 'Vercel', 'CDN', 40.25, 'EUR', NOW()),
  ('seed-cost-13', 'seed-org-1', NOW() - INTERVAL '20 days', 'AWS', 'S3', 110.50, 'EUR', NOW()),
  ('seed-cost-14', 'seed-org-1', NOW() - INTERVAL '22 days', 'Azure', 'Compute', 165.75, 'EUR', NOW()),
  ('seed-cost-15', 'seed-org-1', NOW() - INTERVAL '23 days', 'GCP', 'Database', 140.00, 'EUR', NOW()),
  ('seed-cost-16', 'seed-org-1', NOW() - INTERVAL '25 days', 'DigitalOcean', 'Functions', 70.50, 'EUR', NOW()),
  ('seed-cost-17', 'seed-org-1', NOW() - INTERVAL '26 days', 'AWS', 'Lambda', 195.25, 'EUR', NOW()),
  ('seed-cost-18', 'seed-org-1', NOW() - INTERVAL '28 days', 'Azure', 'Storage', 125.00, 'EUR', NOW()),
  ('seed-cost-19', 'seed-org-1', NOW() - INTERVAL '29 days', 'GCP', 'Compute', 175.50, 'EUR', NOW()),
  ('seed-cost-20', 'seed-org-1', NOW() - INTERVAL '30 days', 'Vercel', 'Functions', 50.75, 'EUR', NOW());

-- 5. AlertRule avec seuil bas
INSERT INTO "AlertRule" (id, "orgId", "thresholdEUR", "windowDays", triggered, "createdAt")
VALUES ('seed-alert-1', 'seed-org-1', 100.00, 7, false, NOW());

