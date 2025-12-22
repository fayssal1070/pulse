-- Mettre à jour le password hash avec un vrai hash bcrypt pour 'password123'
UPDATE "User" 
SET "passwordHash" = '$2b$10$MxfX1ym5LUXTDl7kXSYKMO8wB4aKm03lPr6GAa07ewodghOUT9IGi'
WHERE email = 'owner@example.com';
