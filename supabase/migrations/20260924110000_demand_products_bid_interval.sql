ALTER TABLE "public"."demand_products" 
ADD COLUMN "bid_interval" numeric DEFAULT 3,
ADD COLUMN "bid_interval_type" text DEFAULT 'percentage' CHECK ("bid_interval_type" IN ('percentage', 'monetary'));
