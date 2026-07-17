BEGIN;

-- Novo menu para as ações administrativas da Escala de Plantão (criar/editar/excluir).
INSERT INTO "Menu_Acesso" ("nome", "slug", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT 'Escala de Plantão Admin', 'escala-admin', TRUE, TRUE, TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Menu_Acesso" WHERE "slug" = 'escala-admin');

-- Concede o menu escala-admin aos níveis administrativos (2 = Admin, 3 = Admin Prefeitura).
INSERT INTO "Nivel_Menu_Permissao" ("nivelAcessoId", "menuAcessoId", "visualizar", "criar", "editar", "excluir", "relatorio")
SELECT n."idNivelAcesso", m."idMenuAcesso", TRUE, TRUE, TRUE, TRUE, TRUE
FROM "Nivel_Acesso" n
CROSS JOIN "Menu_Acesso" m
WHERE m."slug" = 'escala-admin'
  AND n."idNivelAcesso" IN (2, 3)
  AND NOT EXISTS (
    SELECT 1 FROM "Nivel_Menu_Permissao" p
    WHERE p."nivelAcessoId" = n."idNivelAcesso" AND p."menuAcessoId" = m."idMenuAcesso"
  );

COMMIT;
