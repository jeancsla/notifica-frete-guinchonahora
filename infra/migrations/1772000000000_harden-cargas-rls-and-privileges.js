exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql("ALTER TABLE notifica_frete_cargas ENABLE ROW LEVEL SECURITY;");
  pgm.sql("ALTER TABLE notifica_frete_cargas FORCE ROW LEVEL SECURITY;");
  pgm.sql("DROP POLICY IF EXISTS allow_app_access ON notifica_frete_cargas;");
  pgm.sql(`
    CREATE POLICY allow_api_role_access
    ON notifica_frete_cargas
    TO PUBLIC
    USING (current_setting('app.current_role', true) = 'api')
    WITH CHECK (current_setting('app.current_role', true) = 'api');
  `);
  pgm.sql("REVOKE ALL ON TABLE notifica_frete_cargas FROM PUBLIC;");
};

exports.down = (pgm) => {
  pgm.sql("DROP POLICY IF EXISTS allow_api_role_access ON notifica_frete_cargas;");
  pgm.sql(`
    CREATE POLICY allow_app_access
    ON notifica_frete_cargas
    TO CURRENT_USER
    USING (true)
    WITH CHECK (true);
  `);
  pgm.sql("ALTER TABLE notifica_frete_cargas NO FORCE ROW LEVEL SECURITY;");
  pgm.sql("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notifica_frete_cargas TO PUBLIC;");
};
