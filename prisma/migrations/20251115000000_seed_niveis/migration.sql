BEGIN;

-- Ensure Nivel_Acesso with id 1 and nome 'Não Autorizado' exists
INSERT INTO "Nivel_Acesso" ("idNivelAcesso", "nome")
SELECT 1, 'Não Autorizado'
WHERE NOT EXISTS (SELECT 1 FROM "Nivel_Acesso" WHERE "idNivelAcesso" = 1);

-- Try to advance sequence for idNivelAcesso if sequence exists
DO $$
BEGIN
  BEGIN
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX("idNivelAcesso") FROM "Nivel_Acesso"), 1) + 1, false)', '"Nivel_Acesso"', 'idNivelAcesso');
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;
END$$;

-- Seed Menu_Acesso entries with all permissions = TRUE

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Dashboard Admin', 'dash-admin', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'dash-admin');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Dashboard Profissional', 'dash-professional', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'dash-professional');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Acessos / Permissões', 'acesso', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'acesso');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Ativação de Usuários', 'ativacao-usuarios', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'ativacao-usuarios');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Gerenciar Usuários', 'gerenciar-usuarios', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'gerenciar-usuarios');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Formulários', 'formulario', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'formulario');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Respostas de Formulários', 'respostas', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'respostas');

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Atribuição de Usuários', 'atribuir-usuarios', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'atribuir-usuarios');

-- paciente

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Pacientes', 'paciente', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'paciente');

-- agendamentos

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Agendamentos', 'agendamentos', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'agendamento');

-- encaminhamentos

INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Encaminhamentos', 'encaminhamentos', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'encaminhamento');

COMMIT;
