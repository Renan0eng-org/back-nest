BEGIN;

-- ID do Formulário Principal (F_DOR)
-- UUID Literal utilizado: '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a'

--- ## 1. CRIAÇÃO DO FORMULÁRIO PRINCIPAL

INSERT INTO "Form" (
    "idForm", "title", "description", "active", "isScreening", "createdAt", "updatedAt"
) VALUES (
    '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a',
    'Triagem Detalhada de Dor Crônica (Escala de Risco)',
    'Avaliação completa do histórico, tratamento e impacto funcional da dor crônica do paciente, com pontuação para estratificação de risco.',
    TRUE,
    TRUE,
    '2025-12-08 03:00:00.000',
    '2025-12-08 03:00:00.000'
);

--- ## 2. CRIAÇÃO DAS PERGUNTAS E OPÇÕES

-- Q1. Tempo de dor (BLOCO 1)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q1_tempo_dor', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '1. Tempo de dor', 'MULTIPLE_CHOICE', TRUE, 10);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o1_lt3m', 'q1_tempo_dor', 'Menos de 3 meses', 0, 0),
('o1_3_6m', 'q1_tempo_dor', '3 a 6 meses', 1, 1),
('o1_6m_1y', 'q1_tempo_dor', '6 meses a 1 ano', 2, 2),
('o1_1_2y', 'q1_tempo_dor', '1 a 2 anos', 3, 3),
('o1_gt2y', 'q1_tempo_dor', 'Mais de 2 anos', 4, 4);

-- Q2. Intensidade atual da dor (EVA 0–10) (BLOCO 1)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q2_eva_dor', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '2. Intensidade atual da dor (EVA 0–10)', 'MULTIPLE_CHOICE', TRUE, 20);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o2_0_3', 'q2_eva_dor', '0–3 (dor leve)', 0, 0),
('o2_4_6', 'q2_eva_dor', '4–6 (dor moderada)', 1, 1),
('o2_7_10', 'q2_eva_dor', '7–10 (dor intensa)', 2, 2);

-- Q3. Quantas consultas já realizou (UBS ou clínico) (BLOCO 1)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q3_num_consultas', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '3. Quantas consultas você já realizou (UBS ou clínico) devido sua dor crônica?', 'MULTIPLE_CHOICE', TRUE, 30);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o3_1_2c', 'q3_num_consultas', '1–2 consultas', 0, 0),
('o3_3_4c', 'q3_num_consultas', '3–4 consultas', 1, 1),
('o3_gt5c', 'q3_num_consultas', '5 ou mais', 2, 2);

-- Q4. Consultou especialista (reumatologista ou ortopedista) (BLOCO 1)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q4_consultou_esp', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '4. Você já consultou algum especialista(reumatologista ou ortopedista)?', 'MULTIPLE_CHOICE', TRUE, 40);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o4_nunca', 'q4_consultou_esp', 'Nunca consultou', 0, 0),
('o4_1esp_1v', 'q4_consultou_esp', '1 especialista (1 vez)', 1, 1),
('o4_1esp_gt2v', 'q4_consultou_esp', '1 especialista (≥2 vezes)', 2, 2),
('o4_gt2esp', 'q4_consultou_esp', '≥2 tipos de especialistas', 3, 3);


-- BLOCO 3 — TRATAMENTO E MEDICAÇÕES
-- Q5. Já realizou algum tratamento específico? (CHECKBOXES - Pontuação máxima de 2)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q5_tratamento_esp', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '5. Já realizou algum tratamento específico? (Marcar todos que se aplicam – máximo 2 pontos)', 'CHECKBOXES', TRUE, 50);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o5_fisioterapia', 'q5_tratamento_esp', 'Fisioterapia', 0, 1),
('o5_psicologico', 'q5_tratamento_esp', 'Acompanhamento psicológico', 1, 1),
('o5_infiltracoes', 'q5_tratamento_esp', 'Infiltrações locais', 2, 1),
('o5_alternativas', 'q5_tratamento_esp', 'Terapias alternativas', 3, 1),
('o5_nenhum', 'q5_tratamento_esp', 'Nenhum', 4, 0);

-- Q6. Obteve melhora significativa (>50%) com esses tratamentos?
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q6_melhora_trat', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '6. Obteve melhora significativa (>50%) com esses tratamentos?', 'MULTIPLE_CHOICE', TRUE, 60);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o6_sim', 'q6_melhora_trat', 'Sim', 0, 0),
('o6_leve', 'q6_melhora_trat', 'Melhora leve', 1, 1),
('o6_nenhuma', 'q6_melhora_trat', 'Nenhuma melhora', 2, 2);

-- Q7. Uso contínuo de medicamentos (>3 meses)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q7_uso_med', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '7. Uso contínuo de medicamentos (>3 meses)', 'MULTIPLE_CHOICE', TRUE, 70);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o7_analgesicos', 'q7_uso_med', 'Analgésicos simples', 0, 1),
('o7_antiinflam', 'q7_uso_med', 'Anti-inflamatórios', 1, 1),
('o7_opioides', 'q7_uso_med', 'Opioides / Neuropáticos / Antidepressivos', 2, 2),
('o7_corti_relax', 'q7_uso_med', 'Corticoides ou relaxantes musculares', 3, 1),
('o7_nenhum', 'q7_uso_med', 'Nenhum uso prolongado', 4, 0);


-- BLOCO 4 — IMPACTO FUNCIONAL E PSICOSSOCIAL
-- Q8. A dor interfere nas suas atividades diárias?
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q8_interf_diaria', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '8. A dor interfere nas suas atividades diárias?', 'MULTIPLE_CHOICE', TRUE, 80);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o8_nenhum', 'q8_interf_diaria', 'Nenhum', 0, 0),
('o8_leve', 'q8_interf_diaria', 'Leve (reduz ritmo)', 1, 1),
('o8_moderado', 'q8_interf_diaria', 'Moderado (dificulta tarefas)', 2, 2),
('o8_grave', 'q8_interf_diaria', 'Grave (impede várias atividades)', 3, 3);

-- Q9. Fatores psicossociais associados à dor (CHECKBOXES - Pontuação máxima de 2)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q9_psicossociais', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '9. Fatores psicossociais associados à dor (Marque os que se aplicam, Máximo: 2 pontos)', 'CHECKBOXES', TRUE, 90);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o9_sono', 'q9_psicossociais', 'Dificuldade para dormir', 0, 1),
('o9_ansiedade', 'q9_psicossociais', 'Ansiedade, tristeza ou irritabilidade', 1, 1),
('o9_isolamento', 'q9_psicossociais', 'Isolamento ou redução do convívio social', 2, 1);


-- BLOCO 5 — CONDIÇÕES CLÍNICAS E LOCALIZAÇÃO
-- Q10. Comorbidades associadas (diagnóstico médico prévio)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q10_comorb', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '10. Comorbidades associadas (diagnóstico médico prévio)', 'MULTIPLE_CHOICE', TRUE, 100);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o10_nenhuma', 'q10_comorb', 'Nenhuma', 0, 0),
('o10_uma', 'q10_comorb', 'Uma (ex: hipertensão, artrose, diabetes)', 1, 1),
('o10_duas', 'q10_comorb', 'Duas ou mais (ex: fibromialgia + artrite)', 2, 2);

-- Q11. Localização da dor (Questionário Nórdico Simplificado) (CHECKBOXES - Máximo: 3 pontos)
INSERT INTO "Question" ("idQuestion", "formId", "text", "type", "required", "order") VALUES
('q11_localizacao', '7f9e8d4a-c1b2-4a3f-9e8c-5b2d1f0e9c8a', '11. Localização da dor (Para cada região com dor nos últimos 12 meses → 1 ponto, Máximo: 3 pontos)', 'CHECKBOXES', TRUE, 110);
INSERT INTO "Option" ("idOption", "questionId", "text", "order", "value") VALUES
('o11_pescoco', 'q11_localizacao', 'Pescoço', 0, 1),
('o11_ombros', 'q11_localizacao', 'Ombros', 1, 1),
('o11_costas_sup', 'q11_localizacao', 'Parte superior das costas', 2, 1),
('o11_cotovelos', 'q11_localizacao', 'Cotovelos', 3, 1),
('o11_punhos', 'q11_localizacao', 'Punhos/mãos', 4, 1),
('o11_costas_inf', 'q11_localizacao', 'Parte inferior das costas', 5, 1),
('o11_quadril', 'q11_localizacao', 'Quadril/coxas', 6, 1),
('o11_joelhos', 'q11_localizacao', 'Joelhos', 7, 1),
('o11_tornozelos', 'q11_localizacao', 'Tornozelos/pés', 8, 1);

COMMIT;