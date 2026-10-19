-- ============================================================
-- Phone Link Hub — Commercial License Management Admin RPCs
-- ============================================================

-- 1. Helper table for Admin Master PIN (Default PIN: 9211)
CREATE TABLE IF NOT EXISTS public.license_admin_config (
    id INT PRIMARY KEY DEFAULT 1,
    admin_pin TEXT NOT NULL DEFAULT '9211',
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.license_admin_config (id, admin_pin)
VALUES (1, '9211')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.license_admin_config ENABLE ROW LEVEL SECURITY;

-- 2. RPC: Admin Verify & Fetch All Licenses
CREATE OR REPLACE FUNCTION public.admin_get_licenses(p_admin_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
    v_licenses JSONB;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'license_key', license_key,
            'customer_name', customer_name,
            'customer_phone', customer_phone,
            'plan_type', plan_type,
            'max_devices', max_devices,
            'hardware_protection', hardware_protection,
            'status', status,
            'valid_until', valid_until,
            'registered_devices', registered_devices,
            'created_at', created_at,
            'last_heartbeat', last_heartbeat
        ) ORDER BY created_at DESC
    ), '[]'::jsonb) INTO v_licenses FROM public.licenses;

    RETURN jsonb_build_object('success', true, 'licenses', v_licenses);
END;
$$;

-- 3. RPC: Admin Create New License Key
CREATE OR REPLACE FUNCTION public.admin_create_license(
    p_admin_pin TEXT,
    p_license_key TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_plan_type TEXT,
    p_max_devices INT,
    p_days_valid INT,
    p_hardware_protection BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
    v_valid_until TIMESTAMPTZ;
    v_new_key TEXT;
    v_rec RECORD;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    v_new_key := UPPER(TRIM(p_license_key));
    IF v_new_key = '' THEN
        -- Auto-generate key: PLH-XXXX-XXXX-XXXX
        v_new_key := 'PLH-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
                               UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 5 FOR 4)) || '-' ||
                               UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 9 FOR 4));
    END IF;

    IF p_days_valid >= 9999 OR p_days_valid <= 0 THEN
        v_valid_until := now() + interval '100 years'; -- Lifetime
    ELSE
        v_valid_until := now() + (p_days_valid || ' days')::interval;
    END IF;

    INSERT INTO public.licenses (
        license_key,
        customer_name,
        customer_phone,
        plan_type,
        max_devices,
        hardware_protection,
        status,
        valid_until,
        registered_devices
    ) VALUES (
        v_new_key,
        COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Valued Customer'),
        COALESCE(TRIM(p_customer_phone), ''),
        COALESCE(NULLIF(TRIM(p_plan_type), ''), 'Single_1PC'),
        GREATEST(1, p_max_devices),
        p_hardware_protection,
        'ACTIVE',
        v_valid_until,
        '[]'::jsonb
    ) RETURNING * INTO v_rec;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'License created successfully!',
        'license', jsonb_build_object(
            'license_key', v_rec.license_key,
            'customer_name', v_rec.customer_name,
            'customer_phone', v_rec.customer_phone,
            'plan_type', v_rec.plan_type,
            'max_devices', v_rec.max_devices,
            'valid_until', v_rec.valid_until,
            'hardware_protection', v_rec.hardware_protection
        )
    );
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'This license key already exists! Choose another key.');
END;
$$;

-- 4. RPC: Admin Toggle / Update License Status (ACTIVE / REVOKED)
CREATE OR REPLACE FUNCTION public.admin_update_license_status(
    p_admin_pin TEXT,
    p_license_key TEXT,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    UPDATE public.licenses 
    SET status = TRIM(p_new_status) 
    WHERE license_key = TRIM(p_license_key);

    RETURN jsonb_build_object('success', true, 'message', 'License status updated to ' || p_new_status);
END;
$$;

-- 5. RPC: Admin Reset Connected Devices (Self-Service Reset for stuck customers)
CREATE OR REPLACE FUNCTION public.admin_reset_devices(
    p_admin_pin TEXT,
    p_license_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    UPDATE public.licenses 
    SET registered_devices = '[]'::jsonb 
    WHERE license_key = TRIM(p_license_key);

    RETURN jsonb_build_object('success', true, 'message', 'All connected devices removed. Slots are now free!');
END;
$$;

-- 6. RPC: Admin Delete License Key
CREATE OR REPLACE FUNCTION public.admin_delete_license(
    p_admin_pin TEXT,
    p_license_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    DELETE FROM public.licenses WHERE license_key = TRIM(p_license_key);

    RETURN jsonb_build_object('success', true, 'message', 'License deleted permanently.');
END;
$$;

-- Grant execution to anon/authenticated
GRANT EXECUTE ON FUNCTION public.admin_get_licenses TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_license TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_license_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_devices TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_license TO anon, authenticated;
