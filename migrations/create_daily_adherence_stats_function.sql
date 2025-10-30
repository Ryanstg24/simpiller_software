-- Function to get daily adherence statistics with role-based filtering
-- This aggregates medication logs by date to avoid fetching thousands of rows
-- Returns: date, total_logs, successful_logs for each day in the date range

CREATE OR REPLACE FUNCTION get_daily_adherence_stats(
  start_date DATE,
  end_date DATE,
  org_id UUID DEFAULT NULL,
  provider_id UUID DEFAULT NULL
)
RETURNS TABLE (
  log_date DATE,
  total_logs BIGINT,
  successful_logs BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If organization ID is provided, filter by organization
  IF org_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      DATE(ml.event_date) AS log_date,
      COUNT(*) AS total_logs,
      COUNT(*) FILTER (WHERE ml.status = 'taken') AS successful_logs
    FROM medication_logs ml
    INNER JOIN patients p ON ml.patient_id = p.id
    WHERE 
      DATE(ml.event_date) >= start_date
      AND DATE(ml.event_date) <= end_date
      AND p.organization_id = org_id
    GROUP BY DATE(ml.event_date)
    ORDER BY log_date ASC;
    
  -- If provider ID is provided, filter by assigned patients
  ELSIF provider_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      DATE(ml.event_date) AS log_date,
      COUNT(*) AS total_logs,
      COUNT(*) FILTER (WHERE ml.status = 'taken') AS successful_logs
    FROM medication_logs ml
    INNER JOIN patients p ON ml.patient_id = p.id
    WHERE 
      DATE(ml.event_date) >= start_date
      AND DATE(ml.event_date) <= end_date
      AND p.assigned_provider_id = provider_id
    GROUP BY DATE(ml.event_date)
    ORDER BY log_date ASC;
    
  -- No filter - return all logs (for Simpiller Admin viewing all data)
  ELSE
    RETURN QUERY
    SELECT 
      DATE(ml.event_date) AS log_date,
      COUNT(*) AS total_logs,
      COUNT(*) FILTER (WHERE ml.status = 'taken') AS successful_logs
    FROM medication_logs ml
    WHERE 
      DATE(ml.event_date) >= start_date
      AND DATE(ml.event_date) <= end_date
    GROUP BY DATE(ml.event_date)
    ORDER BY log_date ASC;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_adherence_stats(DATE, DATE, UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_daily_adherence_stats IS 'Aggregates medication logs by date for adherence trend charts. Supports role-based filtering by organization or provider.';

