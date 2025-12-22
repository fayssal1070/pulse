Get-Content scripts/check-alerts.sql | docker compose exec -T postgres psql -U pulse -d pulse

