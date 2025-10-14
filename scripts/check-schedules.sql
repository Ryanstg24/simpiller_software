-- Check if medication_schedules table has data
SELECT COUNT(*) as schedule_count FROM medication_schedules;

-- Check if there are active medications without schedules
SELECT 
  m.id,
  m.name,
  m.time_of_day,
  p.first_name,
  p.last_name,
  (SELECT COUNT(*) FROM medication_schedules ms WHERE ms.medication_id = m.id) as schedule_count
FROM medications m
JOIN patients p ON m.patient_id = p.id
WHERE m.status = 'active'
LIMIT 10;
