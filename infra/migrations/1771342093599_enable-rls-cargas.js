exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql("ALTER TABLE cargas ENABLE ROW LEVEL SECURITY;");
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cargas' AND policyname = 'allow_app_access'
      ) THEN
        CREATE POLICY allow_app_access ON cargas TO CURRENT_USER USING (true) WITH CHECK (true);
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql("DROP POLICY IF EXISTS allow_app_access ON cargas;");
  pgm.sql("ALTER TABLE cargas DISABLE ROW LEVEL SECURITY;");
};
