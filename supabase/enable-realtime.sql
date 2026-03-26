-- Enable Realtime for inventory_submissions table
-- Run this in your Supabase SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE inventory_submissions;
