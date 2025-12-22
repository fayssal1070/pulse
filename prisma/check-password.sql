SELECT email, LEFT("passwordHash", 20) as hash_preview FROM "User" WHERE email = 'owner@example.com';

