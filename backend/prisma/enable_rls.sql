-- =========================================================================
-- FleetCMD: Script Activare Row-Level Security (RLS) pentru Supabase
-- =========================================================================
-- Acest script securizează baza de date împotriva avertismentului critic Supabase
-- ("Table publicly accessible / rls_disabled_in_public").
--
-- Blochează accesul public anonim prin API-ul REST Supabase (PostgREST),
-- în timp ce backend-ul NestJS (care se conectează direct prin Prisma cu rolul
-- postgres / service role) păstrează accesul complet, neîngrădit.
-- =========================================================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        EXECUTE 'ALTER TABLE public."' || r.tablename || '" ENABLE ROW LEVEL SECURITY;';
    END LOOP; 
END $$;
