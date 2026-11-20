SET client_encoding = 'UTF8';
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL search_path = public, pg_catalog;

CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_status_check
        CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE public.user_auth_providers (
    auth_provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id),
    provider VARCHAR(30) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_auth_providers_identity_unique
        UNIQUE (provider, provider_user_id)
);

CREATE TABLE public.trips (
    trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id),
    title VARCHAR(150) NOT NULL,
    destination VARCHAR(200),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT trips_status_check
        CHECK (status IN ('draft', 'planned')),

    CONSTRAINT trips_dates_check
        CHECK (
            start_date IS NULL
            OR end_date IS NULL
            OR end_date >= start_date
        )
);

CREATE TABLE public.trip_preferences (
    trip_id UUID PRIMARY KEY REFERENCES public.trips(trip_id),
    budget_level VARCHAR(20),
    interests TEXT[],
    transport_mode VARCHAR(30),
    pace VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.pois (
    poi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    category VARCHAR(50),
    tags TEXT[],
    estimated_visit_minutes INTEGER,
    estimated_cost DECIMAL(10,2),
    opening_hours JSONB,
    rating DECIMAL(2,1),
    review_count INTEGER,
    source VARCHAR(50) NOT NULL,
    source_url TEXT,
    external_place_id VARCHAR(255),
    created_by_user_id UUID REFERENCES public.users(user_id),
    visibility VARCHAR(20) NOT NULL DEFAULT 'public',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pois_latitude_check
        CHECK (latitude BETWEEN -90 AND 90),

    CONSTRAINT pois_longitude_check
        CHECK (longitude BETWEEN -180 AND 180),

    CONSTRAINT pois_visit_minutes_check
        CHECK (
            estimated_visit_minutes IS NULL
            OR estimated_visit_minutes > 0
        ),

    CONSTRAINT pois_cost_check
        CHECK (
            estimated_cost IS NULL
            OR estimated_cost >= 0
        ),

    CONSTRAINT pois_rating_check
        CHECK (
            rating IS NULL
            OR rating BETWEEN 0 AND 5
        ),

    CONSTRAINT pois_review_count_check
        CHECK (
            review_count IS NULL
            OR review_count >= 0
        ),

    CONSTRAINT pois_visibility_check
        CHECK (visibility IN ('public', 'private')),

    CONSTRAINT pois_source_external_place_unique
        UNIQUE (source, external_place_id)
);

CREATE TABLE public.trip_pois (
    trip_poi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(trip_id),
    poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT trip_pois_trip_poi_unique
        UNIQUE (trip_id, poi_id)
);

CREATE TABLE public.trip_recommendations (
    trip_recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(trip_id),
    poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
    score DECIMAL(5,2),
    reason TEXT,
    rank INTEGER NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT trip_recommendations_trip_poi_unique
        UNIQUE (trip_id, poi_id),

    CONSTRAINT trip_recommendations_rank_check
        CHECK (rank > 0)
);

CREATE TABLE public.itineraries (
    itinerary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(trip_id),
    version_number INTEGER NOT NULL,
    version_status VARCHAR(20) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT itineraries_trip_version_unique
        UNIQUE (trip_id, version_number),

    CONSTRAINT itineraries_version_number_check
        CHECK (version_number > 0),

    CONSTRAINT itineraries_status_check
        CHECK (version_status IN ('current', 'previous'))
);

CREATE UNIQUE INDEX itineraries_one_current_per_trip
    ON public.itineraries(trip_id)
    WHERE version_status = 'current';


CREATE UNIQUE INDEX itineraries_one_previous_per_trip
    ON public.itineraries(trip_id)
    WHERE version_status = 'previous';

CREATE TABLE public.itinerary_items (
    itinerary_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES public.itineraries(itinerary_id),
    poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
    day_number INTEGER NOT NULL,
    visit_order INTEGER NOT NULL,
    arrival_time TIMESTAMPTZ,
    departure_time TIMESTAMPTZ,
    travel_minutes_from_previous INTEGER,
    travel_mode_from_previous VARCHAR(30),
    travel_distance_meters_from_previous INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT itinerary_items_day_order_unique
        UNIQUE (itinerary_id, day_number, visit_order),

    CONSTRAINT itinerary_items_day_check
        CHECK (day_number > 0),

    CONSTRAINT itinerary_items_order_check
        CHECK (visit_order > 0),

    CONSTRAINT itinerary_items_times_check
        CHECK (
            arrival_time IS NULL
            OR departure_time IS NULL
            OR departure_time >= arrival_time
        ),

    CONSTRAINT itinerary_items_travel_minutes_check
        CHECK (
            travel_minutes_from_previous IS NULL
            OR travel_minutes_from_previous >= 0
        ),

    CONSTRAINT itinerary_items_travel_distance_check
        CHECK (
            travel_distance_meters_from_previous IS NULL
            OR travel_distance_meters_from_previous >= 0
        )
);

CREATE TABLE public.itinerary_unscheduled_pois (
    unscheduled_poi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES public.itineraries(itinerary_id),
    poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
    reason_code VARCHAR(50) NOT NULL,
    reason_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT itinerary_unscheduled_pois_itinerary_poi_unique
        UNIQUE (itinerary_id, poi_id)
);

CREATE TABLE public.itinerary_detour_recommendations (
    detour_recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES public.itineraries(itinerary_id),
    poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
    after_item_id UUID REFERENCES public.itinerary_items(itinerary_item_id),
    before_item_id UUID REFERENCES public.itinerary_items(itinerary_item_id),
    additional_travel_minutes INTEGER,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'valid',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,

    CONSTRAINT detour_additional_minutes_check
        CHECK (
            additional_travel_minutes IS NULL
            OR additional_travel_minutes >= 0
        ),

    CONSTRAINT detour_different_items_check
        CHECK (
            after_item_id IS NULL
            OR before_item_id IS NULL
            OR after_item_id <> before_item_id
        )
);

CREATE TABLE public.poi_content_versions (
 version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 version_number BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
 poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
 language_code TEXT NOT NULL DEFAULT 'zh-TW' CHECK (length(language_code) BETWEEN 2 AND 35),
 introduction TEXT NOT NULL CHECK (btrim(introduction) <> ''),
 features TEXT[] NOT NULL DEFAULT '{}',
 tags TEXT[] NOT NULL DEFAULT '{}',
 generation_method TEXT NOT NULL DEFAULT 'ai' CHECK (generation_method IN ('ai','human','import')),
 model_provider TEXT,
 model_name TEXT,
 model_version TEXT,
 prompt_version TEXT,
 generation_metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(generation_metadata)='object'),
 confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE (poi_id, language_code, version_id),
 UNIQUE (poi_id, version_id),
 CHECK (generation_method <> 'ai' OR (model_provider IS NOT NULL AND model_name IS NOT NULL AND prompt_version IS NOT NULL))
);
CREATE TABLE public.poi_source_evidence (
 evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
 source_url TEXT NOT NULL CHECK (source_url ~ '^https?://[^[:space:]]+$'),
 source_title TEXT,
 publisher TEXT,
 source_type TEXT NOT NULL DEFAULT 'web' CHECK (source_type IN ('official','web','api','manual')),
 search_query TEXT,
 retrieved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 source_updated_at TIMESTAMPTZ,
 excerpt TEXT NOT NULL CHECK (btrim(excerpt) <> ''),
 content_sha256 TEXT CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
 metadata JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata)='object'),
 UNIQUE (poi_id, evidence_id)
);
CREATE TABLE public.poi_version_evidence (
 poi_id UUID NOT NULL,
 version_id UUID NOT NULL,
 evidence_id UUID NOT NULL,
 claim_key TEXT NOT NULL DEFAULT 'introduction',
 supported_claim TEXT NOT NULL CHECK (btrim(supported_claim) <> ''),
 PRIMARY KEY (version_id,evidence_id,claim_key),
 FOREIGN KEY (poi_id,version_id) REFERENCES public.poi_content_versions(poi_id,version_id),
 FOREIGN KEY (poi_id,evidence_id) REFERENCES public.poi_source_evidence(poi_id,evidence_id)
);
CREATE TABLE public.poi_content_reviews (
 review_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 version_id UUID NOT NULL REFERENCES public.poi_content_versions(version_id),
 status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
 reviewer_user_id UUID REFERENCES public.users(user_id),
 notes TEXT,
 reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK (status='pending' OR reviewer_user_id IS NOT NULL)
);
CREATE INDEX poi_reviews_latest_idx ON public.poi_content_reviews(version_id,review_id DESC);
CREATE TABLE public.poi_published_content (
 poi_id UUID NOT NULL,
 language_code TEXT NOT NULL,
 version_id UUID NOT NULL,
 published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (poi_id,language_code),
 FOREIGN KEY (poi_id,language_code,version_id)
  REFERENCES public.poi_content_versions(poi_id,language_code,version_id)
);
CREATE FUNCTION public.reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'History is append-only; insert a new version or review'; END $$;
CREATE TRIGGER immutable_versions BEFORE UPDATE OR DELETE ON public.poi_content_versions FOR EACH ROW EXECUTE FUNCTION public.reject_history_mutation();
CREATE TRIGGER immutable_evidence BEFORE UPDATE OR DELETE ON public.poi_source_evidence FOR EACH ROW EXECUTE FUNCTION public.reject_history_mutation();
CREATE TRIGGER immutable_links BEFORE UPDATE OR DELETE ON public.poi_version_evidence FOR EACH ROW EXECUTE FUNCTION public.reject_history_mutation();
CREATE TRIGGER immutable_reviews BEFORE UPDATE OR DELETE ON public.poi_content_reviews FOR EACH ROW EXECUTE FUNCTION public.reject_history_mutation();
CREATE FUNCTION public.guard_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM public.poi_content_versions WHERE version_id=NEW.version_id FOR UPDATE;
 NEW.review_id := nextval(pg_get_serial_sequence('public.poi_content_reviews','review_id'));
 NEW.reviewed_at := clock_timestamp();
 IF NEW.status='approved' AND NOT EXISTS (SELECT 1 FROM public.poi_version_evidence WHERE version_id=NEW.version_id) THEN
  RAISE EXCEPTION 'Approval requires linked source evidence';
 END IF;
 IF NEW.status <> 'approved' THEN DELETE FROM public.poi_published_content WHERE version_id=NEW.version_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_guard BEFORE INSERT ON public.poi_content_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_review();
CREATE FUNCTION public.guard_publication() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE decision TEXT;
BEGIN
 PERFORM 1 FROM public.poi_content_versions WHERE version_id=NEW.version_id FOR UPDATE;
 SELECT status INTO decision FROM public.poi_content_reviews WHERE version_id=NEW.version_id ORDER BY review_id DESC LIMIT 1;
 IF decision IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'Only approved versions can be published'; END IF;
 NEW.published_at := clock_timestamp();
 RETURN NEW;
END $$;
CREATE TRIGGER publication_guard BEFORE INSERT OR UPDATE ON public.poi_published_content FOR EACH ROW EXECUTE FUNCTION public.guard_publication();
CREATE VIEW public.poi_current_content AS
 SELECT p.poi_id,p.language_code,v.version_id,v.version_number,v.introduction,v.features,v.tags,p.published_at
 FROM public.poi_published_content p JOIN public.poi_content_versions v ON v.version_id=p.version_id;
CREATE VIEW public.poi_version_review_status AS
 SELECT v.version_id,v.poi_id,v.language_code,COALESCE(r.status,'pending') AS review_status,r.reviewer_user_id,r.reviewed_at
 FROM public.poi_content_versions v LEFT JOIN LATERAL
 (SELECT status,reviewer_user_id,reviewed_at FROM public.poi_content_reviews WHERE version_id=v.version_id ORDER BY review_id DESC LIMIT 1) r ON true;

CREATE TABLE public.poi_enrichment_jobs (
 job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
 language_code TEXT NOT NULL DEFAULT 'zh-TW' CHECK (length(language_code) BETWEEN 2 AND 35),
 status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','dead','cancelled')),
 priority INTEGER NOT NULL DEFAULT 0,
 payload JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(payload)='object'),
 attempts INTEGER NOT NULL DEFAULT 0,
 max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
 available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 lease_token UUID,
 lease_expires_at TIMESTAMPTZ,
 worker_id TEXT,
 last_error TEXT,
 result_version_id UUID,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TIMESTAMPTZ,
 CHECK (attempts BETWEEN 0 AND max_attempts),
 CHECK ((status='running' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL AND worker_id IS NOT NULL)
 OR (status<>'running' AND lease_token IS NULL AND lease_expires_at IS NULL AND worker_id IS NULL)),
 CHECK ((status IN ('succeeded','dead','cancelled')) = (finished_at IS NOT NULL)),
 CHECK (status<>'succeeded' OR result_version_id IS NOT NULL),
 FOREIGN KEY (poi_id,language_code,result_version_id) REFERENCES public.poi_content_versions(poi_id,language_code,version_id)
);
CREATE UNIQUE INDEX poi_jobs_one_active_idx ON public.poi_enrichment_jobs(poi_id,language_code) WHERE status IN ('queued','running');
CREATE INDEX poi_jobs_ready_idx ON public.poi_enrichment_jobs(priority DESC,available_at,created_at) WHERE status='queued';
CREATE INDEX poi_jobs_expired_idx ON public.poi_enrichment_jobs(lease_expires_at) WHERE status='running';
CREATE TABLE public.poi_job_attempts (
 job_id UUID NOT NULL REFERENCES public.poi_enrichment_jobs(job_id),
 attempt_number INTEGER NOT NULL CHECK (attempt_number>0),
 lease_token UUID NOT NULL UNIQUE,
 worker_id TEXT NOT NULL,
 started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finished_at TIMESTAMPTZ,
 outcome TEXT CHECK (outcome IN ('succeeded','failed','expired')),
 error_detail TEXT,
 PRIMARY KEY(job_id,attempt_number),
 CHECK ((outcome IS NULL)=(finished_at IS NULL))
);
CREATE TABLE public.poi_refresh_schedules (
 poi_id UUID NOT NULL REFERENCES public.pois(poi_id),
 language_code TEXT NOT NULL DEFAULT 'zh-TW' CHECK (length(language_code) BETWEEN 2 AND 35),
 enabled BOOLEAN NOT NULL DEFAULT true,
 refresh_interval INTERVAL NOT NULL DEFAULT INTERVAL '30 days' CHECK (refresh_interval>=INTERVAL '1 hour'),
 next_run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_enqueued_at TIMESTAMPTZ,
 PRIMARY KEY(poi_id,language_code)
);
CREATE INDEX poi_refresh_due_idx ON public.poi_refresh_schedules(next_run_at) WHERE enabled;
CREATE FUNCTION public.enqueue_due_poi_jobs(batch_size INTEGER DEFAULT 100) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE s RECORD; n INTEGER:=0; inserted INTEGER;
BEGIN
 IF batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
 FOR s IN SELECT * FROM public.poi_refresh_schedules WHERE enabled AND next_run_at<=clock_timestamp()
  ORDER BY next_run_at LIMIT batch_size FOR UPDATE SKIP LOCKED LOOP
  INSERT INTO public.poi_enrichment_jobs(poi_id,language_code) VALUES(s.poi_id,s.language_code) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted=ROW_COUNT;
  IF inserted=1 THEN
   UPDATE public.poi_refresh_schedules SET last_enqueued_at=clock_timestamp(),next_run_at=clock_timestamp()+refresh_interval WHERE poi_id=s.poi_id AND language_code=s.language_code;
   n:=n+1;
  END IF;
 END LOOP;
 RETURN n;
END $$;
CREATE FUNCTION public.claim_poi_job(worker TEXT,lease_seconds INTEGER DEFAULT 300) RETURNS SETOF public.poi_enrichment_jobs LANGUAGE plpgsql AS $$
DECLARE j public.poi_enrichment_jobs;
BEGIN
 IF worker IS NULL OR btrim(worker)='' OR lease_seconds IS NULL OR lease_seconds NOT BETWEEN 30 AND 3600 THEN RAISE EXCEPTION 'Invalid worker/lease'; END IF;
 SELECT * INTO j FROM public.poi_enrichment_jobs WHERE status='queued' AND available_at<=clock_timestamp() AND attempts<max_attempts
 ORDER BY priority DESC,available_at,created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN; END IF;
 UPDATE public.poi_enrichment_jobs SET status='running',attempts=attempts+1,worker_id=worker,lease_token=gen_random_uuid(),lease_expires_at=clock_timestamp()+make_interval(secs=>lease_seconds),updated_at=clock_timestamp()
 WHERE job_id=j.job_id RETURNING * INTO j;
 INSERT INTO public.poi_job_attempts(job_id,attempt_number,lease_token,worker_id) VALUES(j.job_id,j.attempts,j.lease_token,worker);
 RETURN NEXT j;
END $$;
CREATE FUNCTION public.finish_poi_job(job UUID,token UUID,result_version UUID DEFAULT NULL,error_message TEXT DEFAULT NULL) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE j public.poi_enrichment_jobs; ok BOOLEAN;
BEGIN
 SELECT * INTO j FROM public.poi_enrichment_jobs WHERE job_id=job FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown job'; END IF;
 IF j.status<>'running' OR token IS DISTINCT FROM j.lease_token OR j.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Invalid or expired lease'; END IF;
 ok:=result_version IS NOT NULL AND error_message IS NULL;
 IF NOT ok AND (result_version IS NOT NULL OR error_message IS NULL) THEN RAISE EXCEPTION 'Supply a result OR an error'; END IF;
 UPDATE public.poi_job_attempts SET finished_at=clock_timestamp(),outcome=CASE WHEN ok THEN 'succeeded' ELSE 'failed' END,error_detail=error_message WHERE job_id=job AND attempt_number=j.attempts;
 UPDATE public.poi_enrichment_jobs SET status=CASE WHEN ok THEN 'succeeded' WHEN attempts>=max_attempts THEN 'dead' ELSE 'queued' END,
 result_version_id=result_version,last_error=error_message,lease_token=NULL,lease_expires_at=NULL,worker_id=NULL,
 finished_at=CASE WHEN ok OR attempts>=max_attempts THEN clock_timestamp() ELSE NULL END,
 available_at=clock_timestamp()+make_interval(secs=>LEAST(3600,30*power(2,j.attempts-1))::INTEGER),updated_at=clock_timestamp()
 WHERE job_id=job;
END $$;
CREATE FUNCTION public.reap_expired_poi_jobs(batch_size INTEGER DEFAULT 100) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE j RECORD; n INTEGER:=0;
BEGIN
 IF batch_size IS NULL OR batch_size NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
 FOR j IN SELECT * FROM public.poi_enrichment_jobs WHERE status='running' AND lease_expires_at<=clock_timestamp()
 ORDER BY lease_expires_at LIMIT batch_size FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.poi_job_attempts SET finished_at=clock_timestamp(),outcome='expired',error_detail='Lease expired' WHERE job_id=j.job_id AND attempt_number=j.attempts;
  UPDATE public.poi_enrichment_jobs SET status=CASE WHEN attempts>=max_attempts THEN 'dead' ELSE 'queued' END,
   lease_token=NULL,lease_expires_at=NULL,worker_id=NULL,last_error='Lease expired',updated_at=clock_timestamp(),
   finished_at=CASE WHEN attempts>=max_attempts THEN clock_timestamp() ELSE NULL END,
   available_at=clock_timestamp()+make_interval(secs=>LEAST(3600,30*power(2,j.attempts-1))::INTEGER)
  WHERE job_id=j.job_id;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;
CREATE FUNCTION public.heartbeat_poi_job(job UUID,token UUID,lease_seconds INTEGER DEFAULT 300) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
 IF lease_seconds IS NULL OR lease_seconds NOT BETWEEN 30 AND 3600 THEN RAISE EXCEPTION 'Invalid lease'; END IF;
 UPDATE public.poi_enrichment_jobs SET lease_expires_at=clock_timestamp()+make_interval(secs=>lease_seconds),updated_at=clock_timestamp()
 WHERE job_id=job AND status='running' AND lease_token=token AND lease_expires_at>clock_timestamp();
 RETURN FOUND;
END $$;
CREATE INDEX user_auth_user_idx ON public.user_auth_providers(user_id);
CREATE INDEX trips_user_idx ON public.trips(user_id);
CREATE INDEX pois_creator_idx ON public.pois(created_by_user_id);
CREATE INDEX pois_category_idx ON public.pois(category);
CREATE INDEX pois_tags_idx ON public.pois USING GIN(tags);
CREATE INDEX trip_pois_poi_idx ON public.trip_pois(poi_id);
CREATE INDEX trip_recommendations_poi_idx ON public.trip_recommendations(poi_id);
CREATE INDEX itinerary_items_poi_idx ON public.itinerary_items(poi_id);
CREATE INDEX unscheduled_poi_idx ON public.itinerary_unscheduled_pois(poi_id);
CREATE INDEX detour_itinerary_idx ON public.itinerary_detour_recommendations(itinerary_id);
CREATE INDEX detour_poi_idx ON public.itinerary_detour_recommendations(poi_id);
CREATE INDEX detour_after_idx ON public.itinerary_detour_recommendations(after_item_id);
CREATE INDEX detour_before_idx ON public.itinerary_detour_recommendations(before_item_id);
CREATE INDEX content_poi_language_idx ON public.poi_content_versions(poi_id,language_code,version_number DESC);
CREATE INDEX content_tags_idx ON public.poi_content_versions USING GIN(tags);
CREATE INDEX version_evidence_source_idx ON public.poi_version_evidence(poi_id,evidence_id);
CREATE INDEX review_user_idx ON public.poi_content_reviews(reviewer_user_id);
CREATE INDEX published_version_idx ON public.poi_published_content(version_id);
CREATE INDEX jobs_poi_idx ON public.poi_enrichment_jobs(poi_id,created_at DESC);
CREATE INDEX jobs_result_idx ON public.poi_enrichment_jobs(result_version_id);
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at:=clock_timestamp(); RETURN NEW; END $$;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['users','user_auth_providers','trips','trip_preferences','pois','trip_pois','itineraries','poi_enrichment_jobs'] LOOP
 EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',t);
 END LOOP;
END $$;


SET LOCAL standard_conforming_strings = on;
CREATE TABLE public.region_countries (
 country_id TEXT PRIMARY KEY,
 iso2 TEXT NOT NULL UNIQUE CHECK(length(iso2)=2),
 iso3 TEXT,
 name TEXT NOT NULL,
 name_zh_hant TEXT
);
CREATE TABLE public.regions (
 region_id TEXT PRIMARY KEY,
 country_id TEXT NOT NULL REFERENCES public.region_countries(country_id),
 parent_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('country','administrative_area','populated_place')),
 source_level INTEGER,
 name TEXT NOT NULL CHECK(btrim(name)<>''),
 name_zh_hant TEXT,
 name_en TEXT,
 enabled BOOLEAN NOT NULL,
 search_stop BOOLEAN NOT NULL DEFAULT false,
 source_parent_id TEXT,
 parent_status TEXT,
 source_url TEXT,
 search_policy TEXT,
 UNIQUE(country_id,region_id),
 CHECK(parent_id IS DISTINCT FROM region_id),
 CHECK((kind='administrative_area' AND source_level BETWEEN 1 AND 5 AND source_level IS NOT NULL)
    OR (kind<>'administrative_area' AND source_level IS NULL)),
 CHECK(kind<>'country' OR (region_id=country_id AND parent_id IS NULL))
);
CREATE TABLE public.region_dataset_metadata (
 dataset_key TEXT PRIMARY KEY,
 metadata JSONB NOT NULL CHECK(jsonb_typeof(metadata)='object'),
 imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.regions ADD CONSTRAINT regions_parent_fk
 FOREIGN KEY(country_id,parent_id) REFERENCES public.regions(country_id,region_id);
CREATE INDEX regions_parent_idx ON public.regions(parent_id);
CREATE INDEX regions_country_enabled_idx ON public.regions(country_id,enabled);
CREATE INDEX regions_name_idx ON public.regions(name);
CREATE INDEX regions_zh_name_idx ON public.regions(name_zh_hant);
ALTER TABLE public.pois ADD COLUMN region_id TEXT NOT NULL REFERENCES public.regions(region_id);
CREATE INDEX pois_region_idx ON public.pois(region_id);
CREATE FUNCTION public.validate_poi_region() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM public.regions WHERE region_id=NEW.region_id AND enabled FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'POI region is missing or disabled: %',NEW.region_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER poi_region_guard BEFORE INSERT OR UPDATE OF region_id ON public.pois
 FOR EACH ROW EXECUTE FUNCTION public.validate_poi_region();
CREATE FUNCTION public.guard_region_structure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.region_id IS DISTINCT FROM OLD.region_id OR NEW.country_id IS DISTINCT FROM OLD.country_id
 OR NEW.parent_id IS DISTINCT FROM OLD.parent_id OR NEW.kind IS DISTINCT FROM OLD.kind THEN
 RAISE EXCEPTION 'Region identity/hierarchy changes require a reviewed dataset migration';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER region_structure_guard BEFORE UPDATE ON public.regions
 FOR EACH ROW EXECUTE FUNCTION public.guard_region_structure();
CREATE FUNCTION public.reject_region_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (
  WITH RECURSIVE ancestors AS (
   SELECT region_id,parent_id FROM public.regions WHERE region_id=NEW.parent_id
   UNION
   SELECT r.region_id,r.parent_id FROM public.regions r JOIN ancestors a ON r.region_id=a.parent_id
  ) SELECT 1 FROM ancestors WHERE region_id=NEW.region_id
 ) THEN RAISE EXCEPTION 'Region parent relationship would create a cycle'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER region_cycle_guard AFTER INSERT ON public.regions
 DEFERRABLE INITIALLY IMMEDIATE FOR EACH ROW EXECUTE FUNCTION public.reject_region_cycle();
CREATE FUNCTION public.normalize_region_name(value TEXT) RETURNS TEXT
 LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$ SELECT lower(translate(btrim(value),'臺','台')) $$;
CREATE FUNCTION public.resolve_poi_region(country_iso2 TEXT,region_path TEXT[]) RETURNS TEXT
 LANGUAGE plpgsql STABLE AS $$
DECLARE ids TEXT[]; part TEXT; result TEXT;
BEGIN
 IF country_iso2 IS NULL OR region_path IS NULL OR cardinality(region_path)=0 OR array_ndims(region_path)<>1 THEN
 RAISE EXCEPTION 'Country and nonempty region path required'; END IF;
 SELECT ARRAY[r.region_id] INTO ids FROM public.regions r JOIN public.region_countries c ON c.country_id=r.country_id
 WHERE c.iso2=upper(btrim(country_iso2)) AND r.kind='country' AND r.enabled;
 IF ids IS NULL THEN RAISE EXCEPTION 'Unknown or disabled country: %',country_iso2; END IF;
 FOREACH part IN ARRAY region_path LOOP
  IF part IS NULL OR btrim(part)='' THEN RAISE EXCEPTION 'Empty region path component'; END IF;
  SELECT array_agg(r.region_id) INTO ids FROM public.regions r WHERE r.parent_id=ANY(ids) AND r.enabled
   AND (public.normalize_region_name(r.name)=public.normalize_region_name(part)
    OR public.normalize_region_name(r.name_zh_hant)=public.normalize_region_name(part)
    OR public.normalize_region_name(r.name_en)=public.normalize_region_name(part));
  IF ids IS NULL THEN RAISE EXCEPTION 'No region match at path component: %',part; END IF;
 END LOOP;
 IF cardinality(ids)<>1 THEN RAISE EXCEPTION 'Ambiguous region path; provide a verified region ID'; END IF;
 result:=ids[1]; RETURN result;
END $$;
CREATE FUNCTION public.region_children(parent_region_id TEXT) RETURNS TABLE (
 region_id TEXT,display_name TEXT,kind TEXT,search_stop BOOLEAN,poi_count BIGINT
) LANGUAGE sql STABLE AS $$
 SELECT r.region_id,COALESCE(r.name_zh_hant,r.name_en,r.name),r.kind,r.search_stop,
 (SELECT count(*) FROM public.pois p WHERE p.region_id=r.region_id AND p.visibility='public')
 FROM public.regions r WHERE r.enabled AND r.parent_id IS NOT DISTINCT FROM parent_region_id
 ORDER BY COALESCE(r.name_zh_hant,r.name_en,r.name),r.region_id
$$;
CREATE VIEW public.poi_region_directory AS
 SELECT p.poi_id,p.name AS poi_name,p.region_id,r.parent_id,r.country_id,
 COALESCE(r.name_zh_hant,r.name_en,r.name) AS region_name
 FROM public.pois p JOIN public.regions r ON r.region_id=p.region_id;
ANALYZE public.regions;
ANALYZE public.region_countries;

ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS last_updated_on DATE;
ALTER TABLE public.pois ADD COLUMN IF NOT EXISTS last_updated_on DATE;
COMMENT ON COLUMN public.regions.last_updated_on IS
 '地區內容上次更新日期（可手動填寫）；NULL=未知或尚未更新。景點變更不會自動修改本欄位。';
COMMENT ON COLUMN public.pois.last_updated_on IS
 '景點內容上次更新日期（可手動填寫）；NULL=未知或尚未更新。與自動記錄資料列修改時間的 updated_at 不同。';
CREATE OR REPLACE FUNCTION public.region_children_with_updates(parent_region_id TEXT)
RETURNS TABLE (
 region_id TEXT,display_name TEXT,kind TEXT,search_stop BOOLEAN,
 poi_count BIGINT,last_updated_on DATE
) LANGUAGE sql STABLE AS $$
 SELECT c.region_id,c.display_name,c.kind,c.search_stop,c.poi_count,r.last_updated_on
 FROM public.region_children(parent_region_id) c
 JOIN public.regions r ON r.region_id=c.region_id
 ORDER BY c.display_name,c.region_id
$$;
CREATE OR REPLACE VIEW public.poi_region_directory AS
 SELECT p.poi_id,p.name AS poi_name,p.region_id,r.parent_id,r.country_id,
 COALESCE(r.name_zh_hant,r.name_en,r.name) AS region_name,
 p.last_updated_on AS poi_last_updated_on,
 r.last_updated_on AS region_last_updated_on
 FROM public.pois p JOIN public.regions r ON r.region_id=p.region_id;


ALTER TABLE public.pois ADD COLUMN IF NOT EXISTS crawl_observed_at TIMESTAMPTZ;
ALTER TABLE public.pois ADD COLUMN IF NOT EXISTS crawl_metadata JSONB NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS public.poi_crawl_batches (
 batch_id UUID PRIMARY KEY,
 search_region_id TEXT NOT NULL REFERENCES public.regions(region_id),
 observed_at TIMESTAMPTZ NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
 raw_payload JSONB NOT NULL,
 report JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS poi_crawl_batches_region_idx
 ON public.poi_crawl_batches(search_region_id,observed_at DESC);
COMMENT ON TABLE public.poi_crawl_batches IS
 '每區成功完成爬取的原始快照及匯入報告；含待確認資料，整區交易提交。重送使用同一 batch_id。';
COMMENT ON COLUMN public.pois.crawl_observed_at IS
 '爬蟲取得本筆資料的時間；防止斷線補傳的舊快照覆蓋較新內容。';
COMMENT ON COLUMN public.pois.crawl_metadata IS
 '來源原始欄位、搜尋地區與地址比對依據；地址文字比對並非行政邊界驗證。';

COMMIT;
