SELECT "orgId" FROM "Membership" m JOIN "User" u ON m."userId" = u.id WHERE u.email = 'owner@example.com' LIMIT 1;

