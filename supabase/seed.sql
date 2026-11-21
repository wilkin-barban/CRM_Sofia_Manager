-- Local demo authentication only. Existing users and profiles are never changed.
-- The auth trigger creates profiles; only profiles of newly inserted users get a role.
DO $$
DECLARE
    demo record;
    inserted_id uuid;
BEGIN
    FOR demo IN
        SELECT * FROM (VALUES
            ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'::uuid, 'admin@crmsofiamanager.com.br', NULL, 'SenhaAdmin123', 'Carlos Admin', 'admin'),
            ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2'::uuid, 'vendedor@crmsofiamanager.com.br', NULL, 'SenhaVendedor123', 'Ana Vendedora', 'vendedor'),
            ('7c7c7c7c-7c7c-7c7c-7c7c-7c7c7c7c7c7c'::uuid, 'supervisor@crmsofiamanager.com.br', NULL, 'SenhaSupervisor123', 'Julia Supervisor', 'supervisor'),
            ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'::uuid, NULL, '5541988888888', 'SenhaCliente123', 'João Web', 'cliente'),
            ('d5d5d5d5-d5d5-d5d5-d5d5-d5d5d5d5d5d5'::uuid, NULL, '5541999998888', 'SenhaCliente123', 'Carlos Phone', 'cliente')
        ) AS users(id, email, phone, password, nome, funcao)
    LOOP
        inserted_id := NULL;
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, phone, encrypted_password,
            email_confirmed_at, phone_confirmed_at, recovery_sent_at, last_sign_in_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', demo.id, 'authenticated', 'authenticated',
            demo.email, demo.phone, extensions.crypt(demo.password, extensions.gen_salt('bf')),
            CASE WHEN demo.email IS NOT NULL THEN now() END,
            CASE WHEN demo.phone IS NOT NULL THEN now() END, NULL, NULL,
            jsonb_build_object('provider', CASE WHEN demo.email IS NOT NULL THEN 'email' ELSE 'phone' END,
                'providers', jsonb_build_array(CASE WHEN demo.email IS NOT NULL THEN 'email' ELSE 'phone' END)),
            jsonb_build_object('nome', demo.nome), now(), now(), '', '', '', ''
        ) ON CONFLICT DO NOTHING RETURNING id INTO inserted_id;

        IF inserted_id IS NOT NULL THEN
            UPDATE public.perfis SET funcao = demo.funcao::public.tipo_funcao WHERE id = inserted_id;
        END IF;
    END LOOP;
END $$;
