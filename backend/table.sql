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

-- Each trip can have only one current version
CREATE UNIQUE INDEX itineraries_one_current_per_trip
    ON public.itineraries(trip_id)
    WHERE version_status = 'current';


-- Each trip can have only one previous version
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
