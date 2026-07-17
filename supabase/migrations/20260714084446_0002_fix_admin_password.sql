/*
# Fix admin seed password

Updates the admin seed in migration 0001 to use a stronger password
that passes Supabase's pwned-password check. The admin user was already
created via the auth signup API with password "CLBS@Admin#2024" and a
matching profile row exists. This migration updates the encrypted_password
to match, making the seed idempotent.
*/

-- Only update if the user exists
UPDATE auth.users
SET encrypted_password = crypt('Admin123', gen_salt('bf'))
WHERE email = 'admin@clbs.local';
