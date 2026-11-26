-- ============================================================================
-- Migration: Comprehensive RLS & Security Hardening
-- Addresses responsible disclosure findings across all exposed public tables:
--   A. Sensitive tables: active_users, profiles, alumni_invitations,
--      push_subscriptions, alumni_profiles, educations, experiences
--   B. Reference & operational tables: courses, study_department_config,
--      notification_logs, materials, notices, team_files (+ alumni_resources, users)
-- ============================================================================

-- ── 0. Helper: Drop all existing policies on a table safely ─────────────────
-- Used only where leftover permissive policies (e.g. USING (true) on PUBLIC)
-- would otherwise override restrictive policies via Postgres OR semantics.

-- ── 1. active_users ─────────────────────────────────────────────────────────
-- Previously readable/writable by anon (exposed 100+ session/user-agent rows).
-- Lock table directly to admins; client presence heartbeats go through RPCs.
ALTER TABLE public.active_users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'active_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.active_users', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can manage active_users"
  ON public.active_users
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE OR REPLACE FUNCTION public.track_active_user(
  p_session_id text,
  p_page_name text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR char_length(trim(p_session_id)) < 8 THEN
    RETURN;
  END IF;

  IF p_page_name NOT IN ('student', 'admin') THEN
    RAISE EXCEPTION 'Invalid page_name';
  END IF;

  IF p_page_name = 'admin' AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Not authorized for admin presence';
  END IF;

  INSERT INTO public.active_users (session_id, page_name, last_seen, updated_at, user_agent)
  VALUES (
    left(trim(p_session_id), 128),
    p_page_name,
    now(),
    now(),
    left(coalesce(p_user_agent, ''), 512)
  )
  ON CONFLICT (session_id) DO UPDATE
  SET page_name = EXCLUDED.page_name,
      last_seen = now(),
      updated_at = now(),
      user_agent = EXCLUDED.user_agent;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_active_user(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR char_length(trim(p_session_id)) < 8 THEN
    RETURN;
  END IF;

  DELETE FROM public.active_users
  WHERE session_id = left(trim(p_session_id), 128);
END;
$$;

-- ── 2. profiles & profile_visible() ─────────────────────────────────────────
-- Previously 20260725000000 created "Alumni can view student profiles" with
-- USING (true) on PUBLIC, exposing all emails, phones, and admin flags to anon.
-- Also profile_visible() previously returned true for anon when visibility = 'public'.

CREATE OR REPLACE FUNCTION public.profile_visible(owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    owner = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = owner
        AND (
          p.visibility = 'public'
          OR p.visibility = 'users'
          OR (p.visibility = 'connected' AND public.are_connected(owner, auth.uid()))
        )
    )
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_app_admin());

CREATE POLICY "Authenticated users can view visible profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.profile_visible(id));

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND coalesce(is_admin, false) = false
    AND coalesce(is_owner, false) = false
    AND coalesce(is_banned, false) = false
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
    AND is_owner IS NOT DISTINCT FROM (SELECT p.is_owner FROM public.profiles p WHERE p.id = auth.uid())
    AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
    AND is_verified IS NOT DISTINCT FROM (SELECT p.is_verified FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- ── 3. educations & experiences ─────────────────────────────────────────────
-- Restrict explicitly to authenticated users (profile_visible now also checks auth.uid()).
ALTER TABLE public.educations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS educations_select ON public.educations;
DROP POLICY IF EXISTS educations_insert ON public.educations;
DROP POLICY IF EXISTS educations_update ON public.educations;
DROP POLICY IF EXISTS educations_delete ON public.educations;

CREATE POLICY educations_select ON public.educations
  FOR SELECT TO authenticated
  USING (public.profile_visible(user_id) OR public.is_app_admin());

CREATE POLICY educations_insert ON public.educations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY educations_update ON public.educations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY educations_delete ON public.educations
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_app_admin());

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS experiences_select ON public.experiences;
DROP POLICY IF EXISTS experiences_insert ON public.experiences;
DROP POLICY IF EXISTS experiences_update ON public.experiences;
DROP POLICY IF EXISTS experiences_delete ON public.experiences;

CREATE POLICY experiences_select ON public.experiences
  FOR SELECT TO authenticated
  USING (public.profile_visible(user_id) OR public.is_app_admin());

CREATE POLICY experiences_insert ON public.experiences
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY experiences_update ON public.experiences
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY experiences_delete ON public.experiences
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_app_admin());

-- ── 4. alumni_invitations ───────────────────────────────────────────────────
-- Previously "Public token verification" exposed all unclaimed invite_tokens,
-- emails, phones, and notes to anon. Token verification is already handled via
-- the get_alumni_invite_details(p_token) RPC, so direct table access is admin-only.
ALTER TABLE public.alumni_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public token verification" ON public.alumni_invitations;
DROP POLICY IF EXISTS "Admins have full access to alumni_invitations" ON public.alumni_invitations;

CREATE POLICY "Admins have full access to alumni_invitations"
  ON public.alumni_invitations
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- Harden claim_alumni_invite so callers can only claim for their own auth.uid()
CREATE OR REPLACE FUNCTION public.claim_alumni_invite(
  p_token text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invite record;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to claim invitation for another user';
  END IF;

  SELECT * INTO v_invite
  FROM public.alumni_invitations
  WHERE invite_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation token';
  END IF;

  IF v_invite.status = 'joined' THEN
    RAISE EXCEPTION 'Invitation already claimed';
  END IF;

  UPDATE public.alumni_invitations
  SET status = 'joined',
      joined_at = now(),
      claimed_user_id = p_user_id,
      updated_at = now()
  WHERE id = v_invite.id;

  UPDATE public.profiles
  SET is_alumni = true,
      is_verified = true,
      department = coalesce(department, v_invite.department)
  WHERE id = p_user_id;

  INSERT INTO public.alumni_profiles (
    id,
    full_name,
    email,
    dept,
    graduation_year,
    job_title,
    phone,
    is_verified,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_invite.full_name,
    v_invite.email,
    v_invite.department,
    v_invite.passing_year,
    coalesce(v_invite.designation, '') || CASE WHEN v_invite.company IS NOT NULL AND v_invite.company != '' THEN ' at ' || v_invite.company ELSE '' END,
    v_invite.phone,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET is_verified = true,
      dept = coalesce(public.alumni_profiles.dept, excluded.dept),
      graduation_year = coalesce(public.alumni_profiles.graduation_year, excluded.graduation_year),
      job_title = CASE WHEN public.alumni_profiles.job_title IS NULL OR public.alumni_profiles.job_title = '' THEN excluded.job_title ELSE public.alumni_profiles.job_title END,
      phone = coalesce(public.alumni_profiles.phone, excluded.phone),
      updated_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_alumni_invite(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_alumni_invite(text, uuid) TO authenticated;

-- ── 5. push_subscriptions ───────────────────────────────────────────────────
-- Previously RLS was explicitly disabled (20251207_push_subscriptions.sql),
-- exposing WebPush endpoints and p256dh/auth encryption keys to anon.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'push_subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.push_subscriptions', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view own push_subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_app_admin());

CREATE POLICY "Users can insert own push_subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own push_subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own push_subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_app_admin());

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_session_id text,
  p_subscription jsonb,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR char_length(trim(p_session_id)) < 8 THEN
    RAISE EXCEPTION 'Invalid session_id';
  END IF;

  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' THEN
    RAISE EXCEPTION 'Invalid push endpoint';
  END IF;

  INSERT INTO public.push_subscriptions (session_id, subscription, endpoint, user_id, updated_at)
  VALUES (
    left(trim(p_session_id), 128),
    p_subscription,
    p_endpoint,
    auth.uid(),
    now()
  )
  ON CONFLICT (session_id) DO UPDATE
  SET subscription = EXCLUDED.subscription,
      endpoint = EXCLUDED.endpoint,
      user_id = coalesce(EXCLUDED.user_id, public.push_subscriptions.user_id),
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR char_length(trim(p_session_id)) < 8 THEN
    RETURN;
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE session_id = left(trim(p_session_id), 128)
    AND (user_id IS NULL OR user_id = auth.uid() OR public.is_app_admin());
END;
$$;

-- ── 6. alumni_profiles ──────────────────────────────────────────────────────
-- Previously readable by anon (exposing email, phone, address, id_card_url,
-- marital_status, student_id). Restrict all reads/writes to authenticated users.
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'alumni_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.alumni_profiles', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can read verified alumni"
  ON public.alumni_profiles
  FOR SELECT
  TO authenticated
  USING (is_verified = true OR (SELECT auth.uid()) = id OR public.is_app_admin());

CREATE POLICY "Users can insert own alumni profile"
  ON public.alumni_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id AND coalesce(is_verified, false) = false);

CREATE POLICY "Users can update own alumni profile"
  ON public.alumni_profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND is_verified IS NOT DISTINCT FROM (SELECT ap.is_verified FROM public.alumni_profiles ap WHERE ap.id = auth.uid())
  );

CREATE POLICY "Admins can manage alumni_profiles"
  ON public.alumni_profiles
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- ── 7. notification_logs ────────────────────────────────────────────────────
-- Operational table used only by Edge Functions via service_role.
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_logs', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can read notification_logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (public.is_app_admin());

-- ── 8. courses ──────────────────────────────────────────────────────────────
-- Public read-only catalog; writes strictly limited to admins.
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'courses'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow public read-only courses"
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin());

CREATE POLICY "Admins can update courses"
  ON public.courses
  FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY "Admins can delete courses"
  ON public.courses
  FOR DELETE
  TO authenticated
  USING (public.is_app_admin());

-- ── 9. study_department_config ──────────────────────────────────────────────
-- Public read-only config; writes strictly limited to admins.
ALTER TABLE public.study_department_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdc2_select ON public.study_department_config;
DROP POLICY IF EXISTS sdc2_upsert ON public.study_department_config;
DROP POLICY IF EXISTS sdc2_update ON public.study_department_config;
DROP POLICY IF EXISTS sdc2_delete ON public.study_department_config;

CREATE POLICY sdc2_select ON public.study_department_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY sdc2_upsert ON public.study_department_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin());

CREATE POLICY sdc2_update ON public.study_department_config
  FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY sdc2_delete ON public.study_department_config
  FOR DELETE
  TO authenticated
  USING (public.is_app_admin());

-- ── 10. materials ───────────────────────────────────────────────────────────
-- Public read-only study materials; writes strictly limited to admins.
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'materials'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.materials', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow public read-only materials"
  ON public.materials
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert materials"
  ON public.materials
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin());

CREATE POLICY "Admins can update materials"
  ON public.materials
  FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY "Admins can delete materials"
  ON public.materials
  FOR DELETE
  TO authenticated
  USING (public.is_app_admin());

-- ── 11. notices ─────────────────────────────────────────────────────────────
-- Public read-only for active notices; writes strictly limited to admins.
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notices'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notices', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow public read-only active notices"
  ON public.notices
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_app_admin());

CREATE POLICY "Admins can insert notices"
  ON public.notices
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_app_admin());

CREATE POLICY "Admins can update notices"
  ON public.notices
  FOR UPDATE
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE POLICY "Admins can delete notices"
  ON public.notices
  FOR DELETE
  TO authenticated
  USING (public.is_app_admin());

-- ── 12. team_files & alumni_resources ───────────────────────────────────────
-- Both live inside authenticated-only views (Shared Resources, Teams, Alumni Hub).
-- Previously team_files_alumni_select had no TO authenticated, exposing files to anon.
ALTER TABLE public.team_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_files_alumni_select ON public.team_files;
CREATE POLICY team_files_alumni_select ON public.team_files
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NULL
    AND (
      uploader_id = (SELECT auth.uid())
      OR visibility = 'public'
      OR (
        visibility = 'private'
        AND EXISTS (
          SELECT 1 FROM public.mentor_connections
          WHERE student_id = (SELECT auth.uid()) AND alumni_id = team_files.uploader_id
        )
      )
    )
  );

DROP POLICY IF EXISTS team_files_alumni_insert ON public.team_files;
CREATE POLICY team_files_alumni_insert ON public.team_files
  FOR INSERT
  TO authenticated
  WITH CHECK (team_id IS NULL AND uploader_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS team_files_alumni_update ON public.team_files;
CREATE POLICY team_files_alumni_update ON public.team_files
  FOR UPDATE
  TO authenticated
  USING (team_id IS NULL AND uploader_id = (SELECT auth.uid()))
  WITH CHECK (team_id IS NULL AND uploader_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS team_files_alumni_delete ON public.team_files;
CREATE POLICY team_files_alumni_delete ON public.team_files
  FOR DELETE
  TO authenticated
  USING (team_id IS NULL AND uploader_id = (SELECT auth.uid()));

-- Ensure any team-scoped policies on team_files do not grant anon access
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_files'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.team_files TO authenticated', r.policyname);
  END LOOP;
END $$;

-- Lock alumni_resources to authenticated users as well
ALTER TABLE public.alumni_resources ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alumni_resources'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.alumni_resources TO authenticated', r.policyname);
  END LOOP;
END $$;

-- ── 13. users (legacy table) ────────────────────────────────────────────────
-- Ensure RLS is explicitly enabled alongside admin-only policies from 20260630.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
