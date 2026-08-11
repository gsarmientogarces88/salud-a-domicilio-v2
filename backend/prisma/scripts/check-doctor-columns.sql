SELECT column_name
FROM information_schema.columns
WHERE table_name = 'doctor_profiles'
  AND column_name IN ('baseAddress', 'bankName', 'verificationStatus')
ORDER BY column_name;
