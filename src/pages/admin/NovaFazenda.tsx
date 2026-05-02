import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createFazenda } from '../../services/fazendasService'
import { uploadLogo } from '../../services/storageService'
import { Button, Input, Card } from '../../components/ui'

export function NovaFazenda() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')

  const [formData, setFormData] = useState({
    acesso_id: '',
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    planilha_id: '',
    ativo: true,
  })

  const [errors, setErrors] = useState({
    acesso_id: '',
    nome: '',
  })

  const validateForm = () => {
    const newErrors = {
      acesso_id: '',
      nome: '',
    }

    if (!formData.acesso_id.trim()) {
      newErrors.acesso_id = 'ID de acesso é obrigatório'
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório'
    }

    setErrors(newErrors)
    return !newErrors.acesso_id && !newErrors.nome
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    // Fazer upload do logo se houver
    let logoUrl = ''
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile) || ''
      if (!logoUrl) {
        setError('Erro ao fazer upload do logo')
        setLoading(false)
        return
      }
    }

    const result = await createFazenda({
      acesso_id: formData.acesso_id,
      nome: formData.nome,
      cnpj: formData.cnpj || undefined,
      endereco: formData.endereco || undefined,
      telefone: formData.telefone || undefined,
      email: formData.email || undefined,
      planilha_id: formData.planilha_id || undefined,
      logo_url: logoUrl || undefined,
      ativo: formData.ativo,
    })

    setLoading(false)

    if (result) {
      navigate('/admin/fazendas')
    } else {
      setError('Erro ao criar fazenda. Tente novamente.')
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Criar preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate('/admin/fazendas')}>
          Voltar
        </Button>
      </div>

      <Card className="bg-white p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Nova Fazenda</h2>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload de Logo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Sem logo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
              />
            </div>
          </div>

          <Input
            label="ID de Acesso *"
            name="acesso_id"
            value={formData.acesso_id}
            onChange={handleChange}
            placeholder="Ex: FAZ001"
            error={errors.acesso_id}
            required
          />

          <Input
            label="Nome da Fazenda *"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Ex: Fazenda Santa Maria"
            error={errors.nome}
            required
          />

          <Input
            label="CNPJ"
            name="cnpj"
            value={formData.cnpj}
            onChange={handleChange}
            placeholder="00.000.000/0000-00"
          />

          <Input
            label="Endereço"
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            placeholder="Rua, número, cidade, estado"
          />

          <Input
            label="Telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@exemplo.com"
          />

          <Input
            label="ID da Planilha (Google Sheets)"
            name="planilha_id"
            value={formData.planilha_id}
            onChange={handleChange}
            placeholder="ID da planilha para integração"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700">
              Fazenda ativa
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : 'Criar Fazenda'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/fazendas')}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
