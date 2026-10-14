-- Remove dummy seed alumni profiles that were added for testing
DELETE FROM public.mentor_messages
WHERE alumni_id IN (
  SELECT id FROM public.alumni_profiles
  WHERE full_name IN ('Nusrat Jahan', 'Raisa Sultana', 'Rezaul Karim', 'Sabbir Hossain', 'Sadia Islam', 'Arif Hasan')
);

DELETE FROM public.mentor_connections
WHERE alumni_id IN (
  SELECT id FROM public.alumni_profiles
  WHERE full_name IN ('Nusrat Jahan', 'Raisa Sultana', 'Rezaul Karim', 'Sabbir Hossain', 'Sadia Islam', 'Arif Hasan')
);

DELETE FROM public.mentorship_requests
WHERE alumni_id IN (
  SELECT id FROM public.alumni_profiles
  WHERE full_name IN ('Nusrat Jahan', 'Raisa Sultana', 'Rezaul Karim', 'Sabbir Hossain', 'Sadia Islam', 'Arif Hasan')
);

DELETE FROM public.alumni_resources
WHERE alumni_id IN (
  SELECT id FROM public.alumni_profiles
  WHERE full_name IN ('Nusrat Jahan', 'Raisa Sultana', 'Rezaul Karim', 'Sabbir Hossain', 'Sadia Islam', 'Arif Hasan')
);

DELETE FROM public.alumni_profiles
WHERE full_name IN (
  'Nusrat Jahan',
  'Raisa Sultana',
  'Rezaul Karim',
  'Sabbir Hossain',
  'Sadia Islam',
  'Arif Hasan'
);
