-- Migration: seed default access levels and menus
-- Generated: 2025-11-15

BEGIN;

-- Ensure Nivel_Acesso with id 1 and nome 'Não Autorizado' exists
INSERT INTO "Nivel_Acesso" ("idNivelAcesso", "nome")
SELECT 1, 'Não Autorizado'
WHERE NOT EXISTS (SELECT 1 FROM "Nivel_Acesso" WHERE "idNivelAcesso" = 1);

-- Try to advance sequence for idNivelAcesso if sequence exists
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = (pg_get_serial_sequence('"Nivel_Acesso"', 'idNivelAcesso')) ) THEN
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX("idNivelAcesso") FROM "Nivel_Acesso"), 1) + 1, false)', '"Nivel_Acesso"', 'idNivelAcesso');
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- ignore if pg_get_serial_sequence not available
  NULL;
END$$;

-- Seed Menu_Acesso entries if not exist (slug used to check uniqueness)
INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Dashboard Admin', 'dash-admin'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'dash-admin');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Dashboard Profissional', 'dash-professional'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'dash-professional');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Acessos / Permissões', 'acesso'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'acesso');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Ativação de Usuários', 'ativacao-usuarios'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'ativacao-usuarios');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Gerenciar Usuários', 'gerenciar-usuarios'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'gerenciar-usuarios');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Formulários', 'formulario'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'formulario');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Respostas de Formulários', 'respostas'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'respostas');

INSERT INTO "Menu_Acesso" ("nome", "slug")
SELECT 'Atribuição de Usuários', 'atribuir-usuarios'
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'atribuir-usuarios');

COMMIT;
