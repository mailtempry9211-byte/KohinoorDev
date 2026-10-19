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
DROP FUNCTION IF EXISTS public.admin_create_license(TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_create_license(TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION public.admin_create_license(
    p_admin_pin TEXT,
    p_license_key TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_plan_type TEXT,
    p_max_devices INT,
    p_days_valid INT,
    p_hardware_protection BOOLEAN DEFAULT false,
    p_hwid TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
    v_valid_until TIMESTAMPTZ;
    v_new_key TEXT;
    v_devices JSONB := '[]'::jsonb;
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

    -- If admin pasted an HWID during creation, pre-bind it immediately
    IF TRIM(COALESCE(p_hwid, '')) <> '' THEN
        v_devices := jsonb_build_array(
            jsonb_build_object(
                'hwid', UPPER(TRIM(p_hwid)),
                'device_name', COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Customer PC') || ' (Pre-bound)',
                'activated_at', now()
            )
        );
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
        v_devices
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
            'hardware_protection', v_rec.hardware_protection,
            'registered_devices', v_rec.registered_devices
        )
    );
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'This license key already exists! Choose another key.');
END;
$$;

-- 3B. RPC: Admin Bind HWID to an existing License Key
CREATE OR REPLACE FUNCTION public.admin_bind_hwid(
    p_admin_pin TEXT,
    p_license_key TEXT,
    p_hwid TEXT,
    p_device_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
    v_lic RECORD;
    v_devices JSONB;
    v_max_devices INT;
    v_clean_hwid TEXT;
    v_dev_name TEXT;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    v_clean_hwid := UPPER(TRIM(COALESCE(p_hwid, '')));
    IF v_clean_hwid = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hardware ID cannot be empty!');
    END IF;

    SELECT * INTO v_lic FROM public.licenses WHERE license_key = TRIM(p_license_key);
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'License not found!');
    END IF;

    v_devices := COALESCE(v_lic.registered_devices, '[]'::jsonb);
    v_max_devices := COALESCE(v_lic.max_devices, 1);

    -- Check if HWID already registered
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_devices) AS elem 
        WHERE UPPER(elem->>'hwid') = v_clean_hwid
    ) THEN
        RETURN jsonb_build_object('success', true, 'message', 'This HWID is already registered on this license.');
    END IF;

    -- Check device slots limit
    IF jsonb_array_length(v_devices) >= v_max_devices THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Slot limit reached (' || jsonb_array_length(v_devices) || '/' || v_max_devices || '). Reset devices or upgrade max devices first.'
        );
    END IF;

    v_dev_name := COALESCE(NULLIF(TRIM(p_device_name), ''), 'Device ' || (jsonb_array_length(v_devices) + 1));

    v_devices := v_devices || jsonb_build_array(
        jsonb_build_object(
            'hwid', v_clean_hwid,
            'device_name', v_dev_name,
            'activated_at', now()
        )
    );

    UPDATE public.licenses 
    SET registered_devices = v_devices, last_heartbeat = now()
    WHERE license_key = TRIM(p_license_key);

    RETURN jsonb_build_object('success', true, 'message', 'Hardware ID bound successfully!');
END;
$$;

-- 3C. RPC: Admin Remove Single Device HWID
CREATE OR REPLACE FUNCTION public.admin_remove_device(
    p_admin_pin TEXT,
    p_license_key TEXT,
    p_hwid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_correct_pin TEXT;
    v_clean_hwid TEXT;
BEGIN
    SELECT admin_pin INTO v_correct_pin FROM public.license_admin_config WHERE id = 1;
    IF v_correct_pin IS NULL OR TRIM(p_admin_pin) <> v_correct_pin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid Admin PIN!');
    END IF;

    v_clean_hwid := UPPER(TRIM(COALESCE(p_hwid, '')));

    UPDATE public.licenses
    SET registered_devices = (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(registered_devices) AS elem
        WHERE UPPER(elem->>'hwid') <> v_clean_hwid
    )
    WHERE license_key = TRIM(p_license_key);

    RETURN jsonb_build_object('success', true, 'message', 'Device removed successfully.');
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
GRANT EXECUTE ON FUNCTION public.admin_bind_hwid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_device TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_license_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_devices TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_license TO anon, authenticated;

