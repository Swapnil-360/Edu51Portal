-- Drop the NOT NULL constraint on team_id to allow alumni resources (files not associated with any team)
ALTER TABLE public.team_files ALTER COLUMN team_id DROP NOT NULL;

-- RLS policies for alumni-shared files in team_files (where team_id is null)

-- SELECT: Allow visibility of public resources OR private resources shared by connected mentors
DROP POLICY IF EXISTS team_files_alumni_select ON public.team_files;
CREATE POLICY team_files_alumni_select ON public.team_files
  FOR SELECT
  USING (
    team_id IS NULL 
    AND (
      uploader_id = auth.uid() 
      OR visibility = 'public'
      OR (
        visibility = 'private' 
        AND EXISTS (
          SELECT 1 FROM public.mentor_connections 
          WHERE student_id = auth.uid() AND alumni_id = team_files.uploader_id
        )
      )
    )
  );

-- INSERT: Allow alumni to insert their own files when team_id is null
DROP POLICY IF EXISTS team_files_alumni_insert ON public.team_files;
CREATE POLICY team_files_alumni_insert ON public.team_files
  FOR INSERT
  WITH CHECK (
    team_id IS NULL 
    AND uploader_id = auth.uid()
  );

-- UPDATE: Allow uploader to update their own files when team_id is null
DROP POLICY IF EXISTS team_files_alumni_update ON public.team_files;
CREATE POLICY team_files_alumni_update ON public.team_files
  FOR UPDATE
  USING (
    team_id IS NULL 
    AND uploader_id = auth.uid()
  )
  WITH CHECK (
    team_id IS NULL 
    AND uploader_id = auth.uid()
  );

-- DELETE: Allow uploader to delete their own files when team_id is null
DROP POLICY IF EXISTS team_files_alumni_delete ON public.team_files;
CREATE POLICY team_files_alumni_delete ON public.team_files
  FOR DELETE
  USING (
    team_id IS NULL 
    AND uploader_id = auth.uid()
  );

-- BACK-SYNC: Copy all existing public resources from alumni_resources to team_files with correct file sizes
INSERT INTO public.team_files (id, uploader_id, name, file_path, file_url, file_type, file_size, visibility, created_at)
SELECT 
  r.id, 
  r.alumni_id, 
  r.file_name, 
  substring(r.file_url from '/alumni-resources/(.*)$') as fpath, 
  r.file_url, 
  case 
    when r.file_name like '%.pdf' then 'application/pdf'
    when r.file_name like '%.docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    when r.file_name like '%.xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    else 'application/octet-stream'
  end,
  coalesce((o.metadata->>'size')::bigint, 0), 
  r.visibility,
  r.created_at
FROM public.alumni_resources r
LEFT JOIN storage.objects o 
  ON o.bucket_id = 'alumni-resources' 
  AND o.name = substring(r.file_url from '/alumni-resources/(.*)$')
WHERE r.visibility = 'public'
ON CONFLICT (id) DO UPDATE 
SET file_size = EXCLUDED.file_size;
