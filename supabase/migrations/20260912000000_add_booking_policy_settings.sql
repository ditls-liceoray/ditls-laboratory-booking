-- =========================================================
-- Add booking policy settings
-- =========================================================
-- Defaults:
-- Minimum booking duration: 30 minutes
-- Maximum booking duration: 4 hours
-- Booking start hour: 07:00
-- Booking end hour: 22:00
-- Time slot interval: 30 minutes
-- =========================================================

INSERT INTO public.settings (key, value)
SELECT v.key, v.value
FROM (
    VALUES
        ('min_booking_duration_minutes', '30'),
        ('max_booking_duration_hours', '4'),
        ('booking_start_hour', '07:00'),
        ('booking_end_hour', '22:00'),
        ('time_slot_interval_minutes', '30')
) AS v(key, value)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.settings s
    WHERE s.key = v.key
);