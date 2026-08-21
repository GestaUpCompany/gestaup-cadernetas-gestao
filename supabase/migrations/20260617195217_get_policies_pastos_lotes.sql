SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('pastos', 'lotes')
ORDER BY tablename, cmd;;
