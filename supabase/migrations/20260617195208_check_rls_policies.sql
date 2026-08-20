SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('pastos', 'lotes', 'modulos_pastos')
ORDER BY tablename, policyname;;
