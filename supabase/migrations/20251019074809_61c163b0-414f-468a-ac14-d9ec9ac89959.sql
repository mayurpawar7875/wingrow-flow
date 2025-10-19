-- Make the inspection-selfies bucket public so getPublicUrl() works correctly
UPDATE storage.buckets 
SET public = true 
WHERE id = 'inspection-selfies';