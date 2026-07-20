warning: in the working copy of 'src/pages/controller/Currais.tsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/src/pages/controller/Currais.tsx b/src/pages/controller/Currais.tsx[m
[1mindex 20108fb..79a59d3 100644[m
[1m--- a/src/pages/controller/Currais.tsx[m
[1m+++ b/src/pages/controller/Currais.tsx[m
[36m@@ -5,12 +5,23 @@[m [mimport { supabase } from '../../services/supabaseClient'[m
 import { Button, Card, Input } from '../../components/ui'[m
 import { GroupedSelect } from '../../components/ui/GroupedSelect'[m
 [m
[32m+[m[32minterface LinhaConfinamento {[m
[32m+[m[32m  id: string[m
[32m+[m[32m  fazenda_id: string[m
[32m+[m[32m  nome: string[m
[32m+[m[32m  largura_m: number | null[m
[32m+[m[32m  comprimento_m: number | null[m
[32m+[m[32m  metros_cocho_m: number | null[m
[32m+[m[32m  ativo: boolean[m
[32m+[m[32m}[m
[32m+[m
 interface Curral {[m
   id: string[m
   fazenda_id: string[m
   nome: string[m
   lote_id: string | null[m
   formulacao_id: string | null[m
[32m+[m[32m  linha_id: string | null[m
   ativo: boolean[m
   lote_nome?: string[m
   formulacao_nome?: string[m
[36m@@ -19,6 +30,23 @@[m [minterface Curral {[m
 interface Lote {[m
   id: string[m
   nome: string[m
[32m+[m[32m  n_cabecas?: number | null[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32minterface CategoriaInfo {[m
[32m+[m[32m  categoria: string[m
[32m+[m[32m  quant_atual: number | null[m
[32m+[m[32m  peso_vivo_atual_kg_cab: number | null[m
[32m+[m[32m  gmd: string | null[m
[32m+[m[32m  estrategia_nutricional: string | null[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32minterface LoteInfo {[m
[32m+[m[32m  n_cabecas: number | null[m
[32m+[m[32m  peso_vivo_medio: number | null[m
[32m+[m[32m  gmd_medio: number | null[m
[32m+[m[32m  estrategias: string[][m
[32m+[m[32m  categorias: CategoriaInfo[][m
 }[m
 [m
 interface Formulacao {[m
[36m@@ -33,23 +61,50 @@[m [minterface FormulacaoOption {[m
   category: string[m
 }[m
 [m
[32m+[m[32mfunction formatCategoria(texto: string): string {[m
[32m+[m[32m  return texto[m
[32m+[m[32m    .split(' ')[m
[32m+[m[32m    .map((p) => (p.length ? p[0].toUpperCase() + p.slice(1).toLowerCase() : ''))[m
[32m+[m[32m    .join(' ')[m
[32m+[m[32m}[m
[32m+[m
 export function Currais() {[m
   const navigate = useNavigate()[m
   const { user } = useAuth()[m
[32m+[m[32m  const [linhas, setLinhas] = useState<LinhaConfinamento[]>([])[m
   const [currais, setCurrais] = useState<Curral[]>([])[m
   const [lotes, setLotes] = useState<Lote[]>([])[m
   const [formulacoes, setFormulacoes] = useState<Formulacao[]>([])[m
   const [loading, setLoading] = useState(true)[m
[31m-  const [showForm, setShowForm] = useState(false)[m
[31m-  const [editingCurral, setEditingCurral] = useState<Curral | null>(null)[m
   const [showInactive, setShowInactive] = useState(false)[m
[31m-  const [formData, setFormData] = useState({[m
[32m+[m
[32m+[m[32m  // Linha form[m
[32m+[m[32m  const [showLinhaForm, setShowLinhaForm] = useState(false)[m
[32m+[m[32m  const [editingLinha, setEditingLinha] = useState<LinhaConfinamento | null>(null)[m
[32m+[m[32m  const [linhaFormData, setLinhaFormData] = useState({[m
[32m+[m[32m    nome: '',[m
[32m+[m[32m    largura_m: '',[m
[32m+[m[32m    comprimento_m: '',[m
[32m+[m[32m    metros_cocho_m: '',[m
[32m+[m[32m  })[m
[32m+[m[32m  const [submittingLinha, setSubmittingLinha] = useState(false)[m
[32m+[m
[32m+[m[32m  // Curral form[m
[32m+[m[32m  const [showCurralForm, setShowCurralForm] = useState(false)[m
[32m+[m[32m  const [editingCurral, setEditingCurral] = useState<Curral | null>(null)[m
[32m+[m[32m  const [curralFormData, setCurralFormData] = useState({[m
     nome: '',[m
     lote_id: '',[m
     formulacao_id: '',[m
     formulacao_nome: '',[m
[32m+[m[32m    linha_id: '',[m
   })[m
[31m-  const [submitting, setSubmitting] = useState(false)[m
[32m+[m[32m  const [loteInfo, setLoteInfo] = useState<LoteInfo | null>(null)[m
[32m+[m[32m  const [fetchingLoteInfo, setFetchingLoteInfo] = useState(false)[m
[32m+[m[32m  const [submittingCurral, setSubmittingCurral] = useState(false)[m
[32m+[m
[32m+[m[32m  // Expanded linha accordion[m
[32m+[m[32m  const [expandedLinha, setExpandedLinha] = useState<string | null>(null)[m
 [m
   const formulacaoOptions: FormulacaoOption[] = useMemo([m
     () =>[m
[36m@@ -61,12 +116,27 @@[m [mexport function Currais() {[m
     [formulacoes][m
   )[m
 [m
[31m-  const curraisFiltrados = useMemo(() => {[m
[31m-    return currais.filter((curral) => {[m
[31m-      if (!showInactive && !curral.ativo) return false[m
[32m+[m[32m  const linhasFiltradas = useMemo(() => {[m
[32m+[m[32m    return linhas.filter((linha) => {[m
[32m+[m[32m      if (!showInactive && !linha.ativo) return false[m
       return true[m
     })[m
[31m-  }, [currais, showInactive])[m
[32m+[m[32m  }, [linhas, showInactive])[m
[32m+[m
[32m+[m[32m  const curraisPorLinha = useMemo(() => {[m
[32m+[m[32m    const map: Record<string, Curral[]> = {}[m
[32m+[m[32m    currais.forEach((c) => {[m
[32m+[m[32m      if (c.linha_id) {[m
[32m+[m[32m        if (!map[c.linha_id]) map[c.linha_id] = [][m
[32m+[m[32m        map[c.linha_id].push(c)[m
[32m+[m[32m      }[m
[32m+[m[32m    })[m
[32m+[m[32m    return map[m
[32m+[m[32m  }, [currais])[m
[32m+[m
[32m+[m[32m  const curraisSemLinha = useMemo(() => {[m
[32m+[m[32m    return currais.filter((c) => !c.linha_id)[m
[32m+[m[32m  }, [currais])[m
 [m
   const loadData = async () => {[m
     if (!user) return[m
[36m@@ -85,17 +155,29 @@[m [mexport function Currais() {[m
 [m
     const fazendaId = vinculos[0].fazenda_id[m
 [m
[31m-    const [curraisData, lotesData, formulacoesData] = await Promise.all([[m
[32m+[m[32m    const [linhasData, curraisData, lotesData, formulacoesData] = await Promise.all([[m
[32m+[m[32m      supabase[m
[32m+[m[32m        .from('linhas_confinamento')[m
[32m+[m[32m        .select('*')[m
[32m+[m[32m        .eq('fazenda_id', fazendaId)[m
[32m+[m[32m        .is('deleted_at', null)[m
[32m+[m[32m        .order('nome', { ascending: true }),[m
       supabase[m
         .from('currais')[m
         .select('*, lotes(nome), formulacoes(nome)')[m
         .eq('fazenda_id', fazendaId)[m
         .is('deleted_at', null)[m
[31m-        .order('created_at', { ascending: false }),[m
[31m-      supabase.from('lotes').select('id, nome').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),[m
[32m+[m[32m        .order('nome', { ascending: true }),[m
[32m+[m[32m      supabase.from('lotes').select('id, nome, n_cabecas').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),[m
       supabase.from('formulacoes').select('id, nome, tipo').eq('fazenda_id', fazendaId).eq('ativo', true).order('nome'),[m
     ])[m
 [m
[32m+[m[32m    if (linhasData.error) {[m
[32m+[m[32m      console.error('Erro ao buscar linhas:', linhasData.error)[m
[32m+[m[32m    } else {[m
[32m+[m[32m      setLinhas(linhasData.data || [])[m
[32m+[m[32m    }[m
[32m+[m
     if (curraisData.error) {[m
       console.error('Erro ao buscar currais:', curraisData.error)[m
     } else {[m
[36m@@ -127,12 +209,65 @@[m [mexport function Currais() {[m
     loadData()[m
   }, [user])[m
 [m
[31m-  const handleSubmit = async (e: React.FormEvent) => {[m
[32m+[m[32m  const fetchLoteInfo = async (loteId: string) => {[m
[32m+[m[32m    if (!loteId) {[m
[32m+[m[32m      setLoteInfo(null)[m
[32m+[m[32m      return[m
[32m+[m[32m    }[m
[32m+[m[32m    setFetchingLoteInfo(true)[m
[32m+[m[32m    try {[m
[32m+[m[32m      const [loteData, categoriasData] = await Promise.all([[m
[32m+[m[32m        supabase.from('lotes').select('n_cabecas').eq('id', loteId).single(),[m
[32m+[m[32m        supabase[m
[32m+[m[32m          .from('lote_categorias')[m
[32m+[m[32m          .sel