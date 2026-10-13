CREATE TABLE public.leagues (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.league_players (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE, name text NOT NULL, team int NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (league_id, team), UNIQUE (league_id, name));
CREATE TABLE public.league_results (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE, home_player uuid NOT NULL REFERENCES public.league_players(id) ON DELETE CASCADE, away_player uuid NOT NULL REFERENCES public.league_players(id) ON DELETE CASCADE, home_goals int NOT NULL DEFAULT 0, away_goals int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (league_id, home_player, away_player));
GRANT SELECT, INSERT ON public.leagues, public.league_players, public.league_results TO anon, authenticated;
GRANT ALL ON public.leagues, public.league_players, public.league_results TO service_role;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read leagues" ON public.leagues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "create leagues" ON public.leagues FOR INSERT TO anon, authenticated WITH CHECK (length(code) BETWEEN 4 AND 12 AND length(name) BETWEEN 1 AND 40);
CREATE POLICY "read players" ON public.league_players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "join league" ON public.league_players FOR INSERT TO anon, authenticated WITH CHECK (length(name) BETWEEN 1 AND 20 AND team >= 0 AND team < 100);
CREATE POLICY "read results" ON public.league_results FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "report result" ON public.league_results FOR INSERT TO anon, authenticated WITH CHECK (home_goals BETWEEN 0 AND 99 AND away_goals BETWEEN 0 AND 99 AND home_player <> away_player);
CREATE OR REPLACE FUNCTION public.validate_league_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_players' THEN
    IF (SELECT count(*) FROM public.league_players WHERE league_id = NEW.league_id) >= 10 THEN RAISE EXCEPTION 'League is full'; END IF;
    IF EXISTS (SELECT 1 FROM public.league_results WHERE league_id = NEW.league_id) THEN RAISE EXCEPTION 'League already started'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.league_players WHERE id = NEW.home_player AND league_id = NEW.league_id)
       OR NOT EXISTS (SELECT 1 FROM public.league_players WHERE id = NEW.away_player AND league_id = NEW.league_id) THEN RAISE EXCEPTION 'Players not in league'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER league_players_validate BEFORE INSERT ON public.league_players FOR EACH ROW EXECUTE FUNCTION public.validate_league_row();
CREATE TRIGGER league_results_validate BEFORE INSERT ON public.league_results FOR EACH ROW EXECUTE FUNCTION public.validate_league_row();