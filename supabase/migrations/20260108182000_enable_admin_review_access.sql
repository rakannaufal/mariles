-- Give access to admins to view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Give access to admins to update reviews (for flagging)
CREATE POLICY "Admins can update reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
)
WITH CHECK (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);

-- Give access to admins to delete reviews
CREATE POLICY "Admins can delete reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (
  exists (
    select 1 from public.users
    where users.id = auth.uid() and users.role = 'admin'
  )
);
