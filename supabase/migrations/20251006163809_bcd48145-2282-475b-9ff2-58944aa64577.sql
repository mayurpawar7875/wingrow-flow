-- Force-set admin password using bcrypt
UPDATE auth.users
SET encrypted_password = crypt('Wingrow@1234', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'wingrowagritech@wingrow.internal';
