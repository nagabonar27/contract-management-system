-- Debug: Check what's actually in the vendor_step_dates table
SELECT 
    vsd.id,
    vsd.vendor_id,
    cv.vendor_name,
    vsd.agenda_step_id,
    cba.step_name,
    vsd.start_date,
    vsd.end_date,
    vsd.created_at,
    vsd.updated_at
FROM vendor_step_dates vsd
LEFT JOIN contract_vendors cv ON cv.id = vsd.vendor_id
LEFT JOIN contract_bid_agenda cba ON cba.id = vsd.agenda_step_id
ORDER BY vsd.created_at DESC
LIMIT 20;

-- Check if there are any records at all
SELECT COUNT(*) as total_records FROM vendor_step_dates;

-- Check the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_step_dates'
ORDER BY ordinal_position;
