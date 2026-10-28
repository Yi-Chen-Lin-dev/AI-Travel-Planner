-- 在 Windows 的 ai_travel_planner，以 postgres 執行一次。適用既有地區／日期版。
-- 可重跑，不清空任何地區或景點。請先備份正式資料庫。
BEGIN;
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
GRANT CONNECT ON DATABASE ai_travel_planner TO travel_writer;
GRANT USAGE ON SCHEMA public TO travel_writer;
GRANT SELECT ON public.regions,public.region_countries,public.pois TO travel_writer;
GRANT INSERT,UPDATE ON public.pois TO travel_writer;
GRANT UPDATE(last_updated_on) ON public.regions TO travel_writer;
GRANT SELECT,INSERT ON public.poi_crawl_batches TO travel_writer;
COMMIT;
