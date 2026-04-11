

-- Empresa DEMO (COMPLETELY FAKE DATA)
INSERT OR IGNORE INTO companies (id, razao_social, cnpj, ie, telefone, setor, porte, endereco, slug, plano, status) VALUES
('demo-alfa', 'CONSTRUTORA DEMO LTDA', '00.000.000/0001-00', '00000000-0', '(11) 00000-0000', 'residencial', 'epp', 'Rua Exemplo, 123 - Cidade-SP', 'demo-alfa', 'pro', 'active');

-- Admin demo
INSERT OR IGNORE INTO users (id, company_id, nome, cargo, email, password_hash, role, status, email_verified_at) VALUES
('demo-admin', 'demo-alfa', 'ADMIN DEMO', 'Administrador', 'admin@demo.construpro', '$pbkdf2$310000$demo-salt-here$demo-hash-here', 'admin', 'active', CURRENT_TIMESTAMP);

-- 3 Obras (matching frontend APP.obras)
INSERT OR IGNORE INTO obras (id, company_id, nome, cliente, contrato, valor, inicio, prev_fim, status, avanco, faturado, despesas, responsavel) VALUES
('obra1', 'demo-alfa', 'OBRA RESIDENCIAL DEMO 1', 'CLIENTE DEMO LTDA', 'R$ 2.800.000', 2800000, '2024-03-01', '2025-02-28', 'Em andamento', 62, 1540000, 890000, 'ENGENHEIRO DEMO'),
('obra2', 'demo-alfa', 'OBRA INDUSTRIAL DEMO 2', 'CLIENTE DEMO LOG LTDA', 'R$ 980.000', 980000, '2024-06-10', '2024-12-30', 'Concluída', 100, 980000, 560000, 'ENGENHEIRO DEMO'),
('obra3', 'demo-alfa', 'OBRA CONDOMINIAL DEMO 3', 'INVESTIDOR DEMO LTDA', 'R$ 5.200.000', 5200000, '2024-09-01', '2026-08-31', 'Em andamento', 18, 936000, 480000, 'ENGENHEIRO DEMO');

-- Medições (matching APP.medicoes)
INSERT OR IGNORE INTO medicoes (id, company_id, obra_id, numero, data, valor, status, responsavel) VALUES
('med1', 'demo-alfa', 'obra1', 'MED-001', '2024-03-31', 320000, 'Aprovada', 'ENGENHEIRO DEMO'),
('med2', 'demo-alfa', 'obra1', 'MED-002', '2024-04-30', 310000, 'Aprovada', 'ENGENHEIRO DEMO'),
('med3', 'demo-alfa', 'obra1', 'MED-003', '2024-05-31', 280000, 'Aprovada', 'ENGENHEIRO DEMO'),
('med4', 'demo-alfa', 'obra1', 'MED-004', '2024-06-30', 210000, 'Faturada', 'ENGENHEIRO DEMO'),
('med5', 'demo-alfa', 'obra2', 'MED-001', '2024-06-30', 196000, 'Aprovada', 'ENGENHEIRO DEMO'),
('med6', 'demo-alfa', 'obra3', 'MED-001', '2024-09-30', 312000, 'Faturada', 'ENGENHEIRO DEMO');

-- Faturamentos (matching APP.faturamentos)
INSERT OR IGNORE INTO faturamentos (id, company_id, obra_id, numero, data, vencimento, valor, forma_pgto, status) VALUES
('nf1', 'demo-alfa', 'obra1', 'NF-0001', '2024-04-05', '2024-05-05', 320000, 'TED', 'Recebida'),
('nf2', 'demo-alfa', 'obra1', 'NF-0002', '2024-05-07', '2024-06-07', 310000, 'TED', 'Recebida'),
('nf3', 'demo-alfa', 'obra1', 'NF-0003', '2024-06-06', '2024-07-06', 280000, 'TED', 'Vencida'),
('nf4', 'demo-alfa', 'obra2', 'NF-0004', '2024-07-10', '2024-08-10', 196000, 'Boleto', 'Recebida'),
('nf5', 'demo-alfa', 'obra3', 'NF-0005', '2024-10-05', '2024-11-05', 312000, 'TED', 'Pendente');

-- Colaboradores (matching APP.colaboradores)
INSERT OR IGNORE INTO colaboradores (id, company_id, obra_id, nome, cpf, cargo, tipo, salario, admissao, status) VALUES
('col1', 'demo-alfa', 'obra1', 'COLABORADOR DEMO 1', '000.000.000-00', 'Engenheiro Civil', 'CLT', 8500, '2022-05-10', 'Ativo'),
('col2', 'demo-alfa', 'obra1', 'COLABORADOR DEMO 2', '000.000.000-01', 'Mestre de Obras', 'CLT', 4800, '2021-03-15', 'Ativo'),
('col3', 'demo-alfa', 'obra1', 'COLABORADOR DEMO 3', '000.000.000-02', 'Pedreiro Oficial', 'CLT', 2800, '2023-01-20', 'Ativo'),
('col4', 'demo-alfa', 'obra3', 'COLABORADOR DEMO 4', '000.000.000-03', 'Engenheira Civil', 'CLT', 7200, '2023-07-01', 'Ativo'),
('col5', 'demo-alfa', 'obra1', 'COLABORADOR DEMO 5', '000.000.000-04', 'Ajudante Geral', 'Diarista', 220, '2024-03-01', 'Ativo'),
('col6', 'demo-alfa', 'obra2', 'COLABORADOR DEMO 6', '000.000.000-05', 'Eletricista', 'Diarista', 280, '2024-06-10', 'Inativo', 22 ),
('col7', 'demo-alfa', 'obra3', 'COLABORADOR DEMO 7', '000.000.000-06', 'Armador', 'CLT', 3200, '2024-09-01', 'Ativo');

-- EPIs (matching APP.epis)
INSERT OR IGNORE INTO epis (id, company_id, nome, categoria, ca, estoque, minimo, validade) VALUES
('epi1', 'demo-alfa', 'Capacete de Segurança', 'Proteção Craniana', '12345', 48, 20, '2026-12-31'),
('epi2', 'demo-alfa', 'Botina de Segurança Bico Aço', 'Proteção dos Pés', '23456', 12, 15, '2027-06-30'),
('epi3', 'demo-alfa', 'Óculos de Proteção', 'Proteção Ocular', '34567', 35, 20, '2026-08-31'),
('epi4', 'demo-alfa', 'Luva de Raspa de Couro', 'Proteção das Mãos', '45678', 8, 25, '2026-03-31'),
('epi5', 'demo-alfa', 'Protetor Auricular', 'Proteção Auditiva', '56789', 60, 30, '2027-01-31');

-- Entregas EPI (matching APP.entregasEPI)
INSERT OR IGNORE INTO entregas_epi (id, company_id, epi_id, colaborador_id, data, quantidade) VALUES
('ent1', 'demo-alfa', 'epi1', 'col1', '2024-03-15', 1),
('ent2', 'demo-alfa', 'epi2', 'col1', '2024-03-15', 1),
('ent3', 'demo-alfa', 'epi1', 'col2', '2024-03-15', 1),
('ent4', 'demo-alfa', 'epi4', 'col3', '2024-03-20', 2),
('ent5', 'demo-alfa', 'epi1', 'col4', '2024-09-05', 1);

-- Financeiro (matching APP.financeiro)
INSERT OR IGNORE INTO financeiro (id, company_id, obra_id, tipo, descricao, categoria, valor, data) VALUES
('fin1', 'demo-alfa', 'obra1', 'Receita', 'NF-0001 – OBRA RESIDENCIAL DEMO 1', 'Faturamento', 320000, '2024-04-05'),
('fin2', 'demo-alfa', 'obra1', 'Receita', 'NF-0002 – OBRA RESIDENCIAL DEMO 1', 'Faturamento', 310000, '2024-05-07'),
('fin3', 'demo-alfa', 'obra1', 'Despesa', 'Folha CLT – Abril', 'Pessoal', 38200, '2024-04-30'),
('fin4', 'demo-alfa', 'obra1', 'Despesa', 'Material – OBRA RESIDENCIAL DEMO 1', 'Materiais', 145000, '2024-04-15'),
('fin5', 'demo-alfa', 'obra1', 'Despesa', 'Subempreiteiro elétrica', 'Serviços', 42000, '2024-04-22');

-- Sample data para pontos (5 colaboradores hoje)
INSERT OR IGNORE INTO pontos (id, company_id, colaborador_id, data, hora_entrada, hora_saida, status, obs) VALUES
('ponto1', 'demo-alfa', 'col1', DATE('now'), '08:15', '17:45', 'presente', 'Engenheiro principal'),
('ponto2', 'demo-alfa', 'col2', DATE('now'), '07:30', '18:00', 'presente', 'Mestre de obras'),
('ponto3', 'demo-alfa', 'col3', DATE('now'), '08:00', NULL, 'presente', 'Pedreiro - ainda na obra'),
('ponto4', 'demo-alfa', 'col4', DATE('now'), '09:20', '16:30', 'presente', 'Engenheira estrutural'),
('ponto5', 'demo-alfa', 'col5', DATE('now'), NULL, NULL, 'ausente', 'Ajudante aguardando chamado');

