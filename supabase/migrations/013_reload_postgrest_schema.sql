-- The staging PostgREST schema cache must see columns introduced by prior
-- catalog-routing migrations before the intake API can write them.
notify pgrst, 'reload schema';
