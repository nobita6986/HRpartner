$adminUrl = "postgresql://neondb_owner:npg_E0eqUu7aHtpI@ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
$testUrl = "postgresql://app_user_writer:e92cfbe47e4ad7461c542774ac5120006b84bb95d2fa2d5f@ep-empty-forest-azlhfyo9.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
$env:DATABASE_URL = $adminUrl
$env:DATABASE_URL_ADMIN = $adminUrl
$env:DATABASE_URL_TEST = $testUrl
$env:DATABASE_URL_ADMIN_TEST = $adminUrl

npm run test:integration
