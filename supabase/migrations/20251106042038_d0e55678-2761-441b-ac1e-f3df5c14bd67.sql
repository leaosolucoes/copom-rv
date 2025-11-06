-- Adicionar configurações para sistema de alertas de tempo de atendimento
INSERT INTO system_settings (key, value, description) VALUES
('attendance_time_limit_minutes', '60', 'Tempo limite de atendimento em minutos'),
('attendance_time_alert_enabled', 'true', 'Alertas de tempo limite ativos'),
('attendance_time_alert_sound_enabled', 'true', 'Som dos alertas ativos'),
('attendance_time_check_interval_seconds', '30', 'Intervalo de verificação em segundos')
ON CONFLICT (key) DO NOTHING;