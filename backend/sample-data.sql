-- Sample Data for ConstruPRO Dashboard (1 empresa de teste)
-- Run: wrangler d1 execute construPRO-db --file=backend/sample-data.sql

-- Empresa Alfa LTDA
INSERT OR IGNORE INTO companies (id, razao_social, cnpj, ie, telefone, setor, porte, endereco, slug, plano, status) VALUES
('demo-alfa', 'Construtora Alfa LTDA', '12345678000199', '1234567890', '(11) 99999-9999', 'residencial', 'epp', 'Rua das Construtoras, 123 - SP', 'alfa', 'pro', 'active');

-- Admin demo
INSERT OR IGNORE INTO users (id, company_id, nome, cargo, email, password_hash, role, status, email_verified_at) VALUES
('demo-admin', 'demo-alfa', 'Admin Demo', 'Administrador', 'admin@alfa.construpro', '$pbkdf2$310000$demo-salt-here$demo-hash-here', 'admin', 'active', CURRENT_TIMESTAMP);

-- 3 Obras (matching frontend APP.obras)
INSERT OR IGNORE INTO obras (id, company_id, nome, cliente, contrato, valor, inicio, prev_fim, status, avanco, faturado, despesas, responsavel) VALUES
('obra1', 'demo-alfa', 'Residencial Vista Verde', 'João Matos SA', 'R$ 2.800.000', 2800000, '2024-03-01', '2025-02-28', 'Em andamento', 62, 1540000, 890000, 'Eng. Carlos Lima'),
('obra2', 'demo-alfa', 'Galpão Industrial Norte', 'LogTech LTDA', 'R$ 980.000', 980000, '2024-06-10', '2024-12-30', 'Concluída', 100, 980000, 560000, 'Eng. Carlos Lima'),
('obra3', 'demo-alfa', 'Condomínio Parque Sul', 'Inv. Parque Sul', 'R$ 5.200.000', 5200000, '2024-09-01', '2026-08-31', 'Em andamento', 18, 936000, 480000, 'Eng. João Ferreira');

-- Medições (matching APP.medicoes)
INSERT OR IGNORE INTO medicoes (id, company_id, obra_id, numero, data, valor, status, responsavel) VALUES
('med1', 'demo-alfa', 'obra1', 'MED-001', '2024-03-31', 320000, 'Aprovada', 'Eng. Carlos Lima'),
('med2', 'demo-alfa', 'obra1', 'MED-002', '2024-04-30', 310000, 'Aprovada', 'Eng. Carlos Lima'),
('med3', 'demo-alfa', 'obra1', 'MED-003', '2024-05-31', 280000, 'Aprovada', 'Eng. Carlos Lima'),
('med4', 'demo-alfa', 'obra1', 'MED-004', '2024-06-30', 210000, 'Faturada', 'Eng. Ana Paula'),
('med5', 'demo-alfa', 'obra2', 'MED-001', '2024-06-30', 196000, 'Aprovada', 'Eng. Carlos Lima'),
('med6', 'demo-alfa', 'obra3', 'MED-001', '2024-09-30', 312000, 'Faturada', 'Eng. João Ferreira');

-- Faturamentos (matching APP.faturamentos)
INSERT OR IGNORE INTO faturamentos (id, company_id, obra_id, numero, data, vencimento, valor, forma_pgto, status) VALUES
('nf1', 'demo-alfa', 'obra1', 'NF-0142', '2024-04-05', '2024-05-05', 320000, 'TED', 'Recebida'),
('nf2', 'demo-alfa', 'obra1', 'NF-0155', '2024-05-07', '2024-06-07', 310000, 'TED', 'Recebida'),
('nf3', 'demo-alfa', 'obra1', 'NF-0168', '2024-06-06', '2024-07-06', 280000, 'TED', 'Vencida'),
('nf4', 'demo-alfa', 'obra2', 'NF-0173', '2024-07-10', '2024-08-10', 196000, 'Boleto', 'Recebida'),
('nf5', 'demo-alfa', 'obra3', 'NF-0190', '2024-10-05', '2024-11-05', 312000, 'TED', 'Pendente');

-- Colaboradores (matching APP.colaboradores)
INSERT OR IGNORE INTO colaboradores (id, company_id, obra_id, nome, cpf, cargo, tipo, salario, admissao, status) VALUES
('col1', 'demo-alfa', 'obra1', 'Carlos Eduardo Lima', '123.456.789-00', 'Engenheiro Civil', 'CLT', 8500, '2022-05-10', 'Ativo'),
('col2', 'demo-alfa', 'obra1', 'Marcos Antonio Silva', '234.567.890-11', 'Mestre de Obras', 'CLT', 4800, '2021-03-15', 'Ativo'),
('col3', 'demo-alfa', 'obra1', 'João Pedro Costa', '345.678.901-22', 'Pedreiro Oficial', 'CLT', 2800, '2023-01-20', 'Ativo'),
('col4', 'demo-alfa', 'obra3', 'Ana Paula Ferreira', '456.789.012-33', 'Engenheira Civil', 'CLT', 7200, '2023-07-01', 'Ativo'),
('col5', 'demo-alfa', 'obra1', 'Pedro Henrique Nunes', '567.890.123-44', 'Ajudante Geral', 'Diarista', 220, '2024-03-01', 'Ativo');

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
('fin1', 'demo-alfa', 'obra1', 'Receita', 'NF-0142 – Vista Verde', 'Faturamento', 320000, '2024-04-05'),
('fin2', 'demo-alfa', 'obra1', 'Receita', 'NF-0155 – Vista Verde', 'Faturamento', 310000, '2024-05-07'),
('fin3', 'demo-alfa', 'obra1', 'Despesa', 'Folha CLT – Abril', 'Pessoal', 38200, '2024-04-30'),
('fin4', 'demo-alfa', 'obra1', 'Despesa', 'Material – Vista Verde', 'Materiais', 145000, '2024-04-15'),
('fin5', 'demo-alfa', 'obra1', 'Despesa', 'Subempreiteiro elétrica', 'Serviços', 42000, '2024-04-22');
