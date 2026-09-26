-- 1. Create table
CREATE TABLE public.expense_natures (
    id VARCHAR(20) PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_pending BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.expense_natures
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- 3. RLS
ALTER TABLE public.expense_natures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read all expense natures"
    ON public.expense_natures FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated can suggest expense natures"
    ON public.expense_natures FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin() OR (is_pending = true AND is_active = false));

CREATE POLICY "Admin can full manage expense natures"
    ON public.expense_natures FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_natures TO authenticated;

-- 5. Seed
INSERT INTO public.expense_natures (id, name, is_active, is_pending) VALUES
('33903000', 'MATERIAL DE CONSUMO', true, false),
('33903010', 'GENEROS ALIMENTICIOS', true, false),
('33903011', 'GENEROS ALIMENTICIOS PPAIS - LEI ./', true, false),
('33903012', 'MATERIAL DE CAMA, MESA E BANHO', true, false),
('33903013', 'MATERIAL E UTENS.P/REFEITORIO,COPA E COZINHA', true, false),
('33903014', 'MATERIAL DE LIMPEZA', true, false),
('33903015', 'ARTIGOS DE HIGIENE PESSOAL', true, false),
('33903016', 'MATERIAL DE ACONDICIONAMENTO E EMBALAGEM', true, false),
('33903019', 'LUBRIFICANTE AUTOMOTIVO', true, false),
('33903020', 'GAS AUTOMOTIVO', true, false),
('33903021', 'GASOLINA AUTOMOTIVA', true, false),
('33903022', 'DIESEL AUTOMOTIVO', true, false),
('33903023', 'ETANOL AUTOMOTIVO', true, false),
('33903024', 'OUTROS COMBUSTIVEIS E LUBRIFICANTES', true, false),
('33903025', 'GASOLINA AUTOMOTIVA-REEMBOLSO', true, false),
('33903026', 'CESTAS BASICAS', true, false),
('33903027', 'ETANOL AUTOMOTIVO-REEMBOLSO', true, false),
('33903028', 'DIESEL AUTOMOTIVO-REEMBOLSO', true, false),
('33903029', 'OUTROS COMBUSTIVEIS E LUBRIFICANTES-REEMBOLSO', true, false),
('33903030', 'MEDICAMENTOS E INSUMOS FARMACEUTICOS', true, false),
('33903031', 'MATERIAL MEDICO,HOSPITALAR E ODONTOLOGICO', true, false),
('33903032', 'MATERIAL DE USO LABORATORIAL', true, false),
('33903034', 'MATERIAL DE USO VETERINARIO', true, false),
('33903035', 'MEDICAMENTOS FORNECIDOS POR DECIS„O JUDICIAL', true, false),
('33903036', 'OUT.MAT.CONS.DECORRENTE DE DECISAO JUDICIAL', true, false),
('33903039', 'MATERIAL ESPORTIVO E DE LAZER', true, false),
('33903040', 'MATERIAL EDUCATIVO E CULTURAL', true, false),
('33903041', 'MATERIAL DE ESCRITORIO PAPELARIA E IMPRESSOS', true, false),
('33903042', 'MATERIAL PARA FOTOGRAFIA E FILMAGEM', true, false),
('33903043', 'LIVROS P/BIBLIO.PUBLI,MAPAS,OUTRAS PUBLICACAO', true, false),
('33903044', 'BANDEIRAS, FLAMULAS, INSIGNIAS', true, false),
('33903050', 'PECAS DE REPOSICAO E ACESSORIOS', true, false),
('33903051', 'FERRAM.AVULSAS NAO ACION.P/FORCA MOTRIZ', true, false),
('33903052', 'MATERIAL P/ CONSERVACAO E MANUT. DE IMOVEIS', true, false),
('33903053', 'PECAS E ACESSORIOS PARA VIATURAS POLICIAIS', true, false),
('33903054', 'MATERIAL INSTALACAO ELETRICA E ELETRONICA', true, false),
('33903055', 'MATERIAL PARA TELECOMUNICACOES', true, false),
('33903056', 'SUPRIMENTO DE AVIACAO', true, false),
('33903060', 'MATERIAIS E SUPRIMENTOS DE INFORMATICA', true, false),
('33903061', 'PECAS E ACESSOR.E COMPONENTES DE INFORMATICA', true, false),
('33903062', 'MUNICOES E EXPLOSIVOS', true, false),
('33903063', 'FARDAMENTO,VESTUARIO,UNIFOR,TECIDO, AVIAMENTO', true, false),
('33903064', 'PECAS P/VIATURAS PELO REGIME DE ADIANTAMENTO', true, false),
('33903065', 'PECAS E ACESS.P/VIATURAS ESCOLTA/CUSTODEADOS', true, false),
('33903066', 'MATERIAL PROT.SEGUR.SOCORRO E SOBREVIVENCIA', true, false),
('33903080', 'ANIMAIS PARA ABATE,EXPERIMENTO E SEMEM', true, false),
('33903081', 'ALIMENTOS PARA ANIMAIS', true, false),
('33903082', 'SEMENTES E MUDAS DE PLANTAS', true, false),
('33903090', 'OUTROS MATERIAIS DE CONSUMO', true, false),
('44905220', 'INFORM¡TICA', true, false),
('44905232', 'MOBILI¡RIO GERAL', true, false),
('44905234', 'EQUIPAMENTOS', true, false);

-- 6. Add relation to products
ALTER TABLE public.products ADD COLUMN expense_nature_id VARCHAR(20) REFERENCES public.expense_natures(id);
