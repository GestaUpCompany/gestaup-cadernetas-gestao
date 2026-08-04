import jsPDF from 'jspdf'
import Chart from 'chart.js/auto'

export interface DadoRelatorioConsumo {
  data: string
  data_label: string
  kg_cocho: number
  consumo_percent_pv: number
  leitura_cocho: number | null
  custo_reais_cab_dia: number | null
}

export interface InfoLote {
  lote_id: string
  lote_nome: string
  fazenda_id: string
  fazenda_nome?: string
  fazenda_logo_url?: string | null
  peso_entrada_kg: number | null
  peso_atual_kg: number | null
  dias: number | null
  data_prevista_final: string | null
  n_cabecas_atual: number | null
  raca: string | null
  categoria: string | null
  dieta: string | null
  data_inicio_plano: string | null
}

export interface ParametrosRelatorioConsumo {
  dataInicio: string
  dataFim: string
  info: InfoLote
  dados: DadoRelatorioConsumo[]
}

function formatarDataNumerica(dataStr: string | null | undefined): string {
  if (!dataStr) return '—'
  const d = new Date(dataStr)
  if (isNaN(d.getTime())) return '—'
  const dia = d.getUTCDate().toString().padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const ano = d.getUTCFullYear()
  return `${dia}/${mes}/${ano}`
}

function formatarNumero(
  valor: number | null | undefined,
  casas = 2,
  padrao = '—'
): string {
  if (valor === null || valor === undefined || isNaN(valor)) return padrao
  return valor.toFixed(casas).replace('.', ',')
}

function formatarInteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) return '—'
  return Math.round(valor).toString()
}

async function carregarLogoComoBase64(path: string): Promise<string> {
  const response = await fetch(path)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return [r, g, b]
}

function setFillColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setFillColor(r, g, b)
}

function setTextColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setTextColor(r, g, b)
}

async function renderizarGraficoConsumo(dados: DadoRelatorioConsumo[], width: number, height: number): Promise<string | null> {
  const canvas = document.createElement('canvas')
  const pxPerMm = 5
  canvas.width = Math.round(width * pxPerMm)
  canvas.height = Math.round(height * pxPerMm)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível criar contexto 2D')

  ctx.fillStyle = '#F9FAFB'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const blueBar = '#1E3A5F'
  const greenLine = '#10B981'
  const white = '#FFFFFF'
  const leituraColor = '#6B7280'
  const darkText = '#1F2937'
  const mediumText = '#6B7280'

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dados.map((d) => d.data_label),
      datasets: [
        {
          type: 'line' as any,
          label: 'Consumo %PV',
          data: dados.map((d) => d.consumo_percent_pv),
          borderColor: greenLine,
          backgroundColor: greenLine,
          borderWidth: 3,
          pointRadius: 6,
          pointBackgroundColor: greenLine,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          yAxisID: 'y1',
          order: 0,
          tension: 0.3,
          datalabels: {
            align: 'top',
            anchor: 'end',
          } as any,
        },
        {
          label: 'Trato (kg)',
          data: dados.map((d) => d.kg_cocho),
          backgroundColor: blueBar,
          borderRadius: 4,
          borderSkipped: false,
          yAxisID: 'y',
          order: 1,
          barPercentage: 0.55,
          categoryPercentage: 0.8,
        },
        {
          type: 'line' as any,
          label: 'Leitura de Cocho',
          data: dados.map((d) => (d.leitura_cocho != null ? Number(d.leitura_cocho) : NaN)),
          borderColor: leituraColor,
          backgroundColor: leituraColor,
          borderWidth: 0,
          showLine: false,
          pointRadius: 4,
          pointBackgroundColor: leituraColor,
          pointBorderColor: white,
          pointBorderWidth: 1.5,
          yAxisID: 'y2',
          order: 2,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: { top: 45, right: 40, bottom: 42, left: 45 },
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            color: darkText,
            font: { size: 12, weight: 'bold' },
          },
        },
        title: {
          display: true,
          text: 'Consumo Médio %PV',
          align: 'center',
          color: darkText,
          font: { size: 28, weight: 'bold' },
          padding: { bottom: 20 },
        },
        tooltip: { enabled: false },
        datalabels: { display: false } as any,
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: mediumText,
            font: { size: 12 },
          },
          title: {
            display: true,
            text: 'Dias',
            color: mediumText,
            font: { size: 20, weight: 'bold' },
            padding: { top: 15 },
          },
        },
        y: {
          position: 'left',
          title: {
            display: true,
            text: 'Trato (kg)',
            color: darkText,
            font: { size: 20, weight: 'bold' },
          },
          ticks: {
            color: mediumText,
            font: { size: 12 },
          },
          grid: {
            color: '#E5E7EB',
            drawBorder: false,
          },
          beginAtZero: true,
          suggestedMax: Math.max(...dados.map((d) => d.kg_cocho)) * 1.15,
        },
        y1: {
          position: 'right',
          title: {
            display: true,
            text: '% PV',
            color: greenLine,
            font: { size: 20, weight: 'bold' },
          },
          ticks: {
            color: greenLine,
            font: { size: 12 },
            callback: (val: number | string) => `${Number(val).toFixed(1)}%`,
          },
          grid: { display: false },
          beginAtZero: true,
          suggestedMax: Math.max(...dados.map((d) => d.consumo_percent_pv)) * 1.25,
        },
        y2: {
          display: false,
          min: -1,
          max: 25,
        },
      },
    },
    plugins: [{
      id: 'customLabels',
      afterDatasetsDraw(chart: Chart) {
        const { ctx } = chart
        ctx.save()
        ctx.textAlign = 'center'

        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i)
          if (dataset.label === 'Trato (kg)') {
            ctx.font = 'bold 16px Inter, sans-serif'
            ctx.fillStyle = darkText
            meta.data.forEach((bar: any, j: number) => {
              const value = Number(dataset.data[j]).toFixed(0)
              ctx.fillText(value, bar.x, bar.y - 14)
            })
          } else if (dataset.label === 'Consumo %PV') {
            ctx.font = 'bold 16px Inter, sans-serif'
            ctx.fillStyle = greenLine
            meta.data.forEach((pt: any, j: number) => {
              const value = `${Number(dataset.data[j]).toFixed(2)}%`
              ctx.fillText(value, pt.x, pt.y - 14)
            })
          } else if (dataset.label === 'Leitura de Cocho') {
            const valid = meta.data.filter((pt: any) => !pt.skip)

            if (valid.length > 1) {
              ctx.beginPath()
              ctx.strokeStyle = leituraColor
              ctx.lineWidth = 2.5
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              ctx.moveTo(valid[0].x, valid[0].y)
              for (let k = 1; k < valid.length; k++) {
                ctx.lineTo(valid[k].x, valid[k].y)
              }
              ctx.stroke()
            }

            valid.forEach((pt: any) => {
              ctx.beginPath()
              ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI)
              ctx.fillStyle = leituraColor
              ctx.fill()
              ctx.lineWidth = 1.5
              ctx.strokeStyle = white
              ctx.stroke()
            })

            ctx.font = 'bold 11px Inter, sans-serif'
            meta.data.forEach((pt: any, j: number) => {
              if (pt.skip) return
              const value = dataset.data[j]?.toString() ?? ''
              ctx.lineWidth = 2
              ctx.strokeStyle = darkText
              ctx.strokeText(value, pt.x, pt.y - 10)
              ctx.fillStyle = white
              ctx.fillText(value, pt.x, pt.y - 10)
            })
          }
        })

        ctx.restore()
      },
    } as any],
  })

  const image = chart.toBase64Image()
  chart.destroy()
  return image
}

export async function gerarRelatorioConsumoPDF(params: ParametrosRelatorioConsumo): Promise<Blob> {
  const { dataInicio, dataFim, info, dados } = params

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = 297
  const pageH = 210

  const greenDark = '#0F6437'
  const greenCard = '#0F6437'
  const white = '#FFFFFF'
  const darkText = '#1F2937'
  const mediumText = '#6B7280'
  const lightBg = '#F5F5F5'
  const cardBg = '#FFFFFF'
  const shadowColor = '#00000012'

  let logoGestaoBase64 = ''
  try {
    logoGestaoBase64 = await carregarLogoComoBase64('/images/manejus360.png')
  } catch {
    // Silenciosamente continua sem logo
  }

  let logoFazendaBase64 = ''
  if (info.fazenda_logo_url) {
    try {
      logoFazendaBase64 = await carregarLogoComoBase64(info.fazenda_logo_url)
    } catch {
      // Silenciosamente continua sem logo
    }
  }

  // Fundo cinza claro
  setFillColor(doc, lightBg)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Header verde
  setFillColor(doc, greenDark)
  doc.rect(0, 0, pageW, 28, 'F')

  // Logo GestaUp (proporção 1:1, cantos arredondados)
  const logoGestaoSize = 16
  const logoGestaoX = 10
  const logoGestaoY = 6
  const logoMargin = 0.6
  
  if (logoGestaoBase64) {
    const formato = logoGestaoBase64.toLowerCase().includes('data:image/png') ? 'PNG' : 'JPEG'
    setFillColor(doc, cardBg)
    doc.roundedRect(logoGestaoX, logoGestaoY, logoGestaoSize, logoGestaoSize, 2, 2, 'F')
    doc.addImage(logoGestaoBase64, formato, logoGestaoX + logoMargin, logoGestaoY + logoMargin, logoGestaoSize - logoMargin * 2, logoGestaoSize - logoMargin * 2)
  }

  // Logo da fazenda ao lado (mantendo proporção)
  if (logoFazendaBase64) {
    const logoFazendaX = logoGestaoX + logoGestaoSize + 6
    const formato = logoFazendaBase64.toLowerCase().includes('data:image/png') ? 'PNG' : 'JPEG'
    const logoProps = doc.getImageProperties(logoFazendaBase64)
    const maxFazendaH = 16
    const maxFazendaW = 40
    const logoFazendaH = Math.min(maxFazendaH, (maxFazendaW * logoProps.height) / logoProps.width)
    const logoFazendaW = (logoFazendaH * logoProps.width) / logoProps.height
    const logoFazendaY = logoGestaoY + (logoGestaoSize - logoFazendaH) / 2
    const radius = Math.min(2, Math.min(logoFazendaW, logoFazendaH) / 4)
    
    setFillColor(doc, cardBg)
    doc.roundedRect(logoFazendaX, logoFazendaY, logoFazendaW, logoFazendaH, radius, radius, 'F')
    doc.addImage(logoFazendaBase64, formato, logoFazendaX + logoMargin, logoFazendaY + logoMargin, logoFazendaW - logoMargin * 2, logoFazendaH - logoMargin * 2)
  }

  // Card branco do título (com sombra, reduzido)
  const titleCardX = pageW / 2 - 55
  const titleCardY = 7
  const titleCardW = 110
  const titleCardH = 14
  setFillColor(doc, shadowColor)
  doc.roundedRect(titleCardX + 0.5, titleCardY + 0.5, titleCardW, titleCardH, 7, 7, 'F')
  setFillColor(doc, cardBg)
  doc.roundedRect(titleCardX, titleCardY, titleCardW, titleCardH, 7, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setTextColor(doc, greenDark)
  doc.text('Análise de Consumo', pageW / 2, titleCardY + 9.5, { align: 'center' })

  // Lote pill (com sombra, reduzido)
  const lotePillX = pageW - 60
  const lotePillY = 7
  const lotePillW = 50
  const lotePillH = 14
  setFillColor(doc, shadowColor)
  doc.roundedRect(lotePillX + 0.5, lotePillY + 0.5, lotePillW, lotePillH, 7, 7, 'F')
  setFillColor(doc, cardBg)
  doc.roundedRect(lotePillX, lotePillY, lotePillW, lotePillH, 7, 7, 'F')
  doc.setFontSize(8)
  setTextColor(doc, mediumText)
  doc.setFont('helvetica', 'normal')
  doc.text('Lote', lotePillX + lotePillW / 2, lotePillY + 5, { align: 'center' })
  doc.setFontSize(10)
  setTextColor(doc, darkText)
  doc.setFont('helvetica', 'bold')
  doc.text(info.lote_nome, lotePillX + lotePillW / 2, lotePillY + 11, { align: 'center' })

  // Período (card branco com "a" entre as datas)
  const dataInicioFormatada = formatarDataNumerica(dataInicio)
  const dataFimFormatada = formatarDataNumerica(dataFim)
  const periodoText = `${dataInicioFormatada}  a  ${dataFimFormatada}`
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const periodoW = doc.getTextWidth(periodoText) + 12
  const periodoX = 8
  const periodoY = 32
  setFillColor(doc, shadowColor)
  doc.roundedRect(periodoX + 0.5, periodoY + 0.5, periodoW, 10, 5, 5, 'F')
  setFillColor(doc, cardBg)
  doc.roundedRect(periodoX, periodoY, periodoW, 10, 5, 5, 'F')
  setTextColor(doc, darkText)
  doc.text(periodoText, periodoX + periodoW / 2, periodoY + 6.5, { align: 'center' })

  // KPIs laterais (coluna esquerda)
  const kpiX = 6
  const kpiW = 36
  const kpiH = 17
  const kpiGap = 3.5
  let kpiY = 48

  const consumoMedio = dados.length
    ? dados.reduce((s, d) => s + d.consumo_percent_pv, 0) / dados.length
    : null

  const custoMedio =
    dados.length && dados.some((d) => d.custo_reais_cab_dia != null)
      ? dados.reduce((s, d) => s + (d.custo_reais_cab_dia || 0), 0) /
        dados.filter((d) => d.custo_reais_cab_dia != null).length
      : null

  const kpiCards = [
    { label: 'Peso Entrada (kg)', value: formatarInteiro(info.peso_entrada_kg) },
    { label: 'Consumo %PV', value: `${formatarNumero(consumoMedio, 2)}%` },
    { label: 'R$/cab/dia', value: `R$ ${formatarNumero(custoMedio, 2)}` },
    { label: 'Peso Atual (kg)', value: formatarNumero(info.peso_atual_kg, 2) },
    { label: 'Período (dias)', value: formatarInteiro(info.dias) },
    { label: 'Data Prevista Final', value: formatarDataNumerica(info.data_prevista_final) },
  ]

  kpiCards.forEach((k) => {
    setFillColor(doc, shadowColor)
    doc.roundedRect(kpiX + 0.5, kpiY + 0.5, kpiW, kpiH, 4, 4, 'F')
    setFillColor(doc, greenCard)
    doc.roundedRect(kpiX, kpiY, kpiW, kpiH, 4, 4, 'F')
    doc.setFontSize(11)
    setTextColor(doc, white)
    doc.setFont('helvetica', 'bold')
    doc.text(k.value, kpiX + kpiW / 2, kpiY + 7, { align: 'center' })
    doc.setFontSize(9)
    setTextColor(doc, white)
    doc.setFont('helvetica', 'normal')
    doc.text(k.label, kpiX + kpiW / 2, kpiY + 13, { align: 'center' })
    kpiY += kpiH + kpiGap
  })

  // Pills superiores
  const pillY = 48
  const pillX = kpiX + kpiW + 10
  const pillH = 17
  const pillGap = 7
  const pills = [
    { label: 'Nº Cab. Atual', value: formatarInteiro(info.n_cabecas_atual) },
    { label: 'Raça', value: info.raca || '—' },
    { label: 'Categoria', value: (info.categoria ? info.categoria.charAt(0).toUpperCase() + info.categoria.slice(1) : '—') },
    { label: 'Dieta', value: info.dieta || '—' },
  ]

  const pillWidth = Math.max(
    40,
    ...pills.map((p) => Math.max(doc.getTextWidth(p.value), doc.getTextWidth(p.label)) + 16)
  )
  
  // Área do gráfico (calculada antes para centralizar pills)
  const chartX = pillX
  const chartW = pageW - chartX - 8
  
  // Centralizar pills em relação ao gráfico
  const totalPillsWidth = pillWidth * pills.length + pillGap * (pills.length - 1)
  let pillXAtual = chartX + (chartW - totalPillsWidth) / 2
  
  pills.forEach((p) => {
    setFillColor(doc, shadowColor)
    doc.roundedRect(pillXAtual + 0.5, pillY + 0.5, pillWidth, pillH, 4, 4, 'F')
    setFillColor(doc, greenCard)
    doc.roundedRect(pillXAtual, pillY, pillWidth, pillH, 4, 4, 'F')
    doc.setFontSize(11)
    setTextColor(doc, white)
    doc.setFont('helvetica', 'bold')
    doc.text(p.value, pillXAtual + pillWidth / 2, pillY + 7, { align: 'center' })
    doc.setFontSize(9)
    setTextColor(doc, white)
    doc.setFont('helvetica', 'normal')
    doc.text(p.label, pillXAtual + pillWidth / 2, pillY + 13, { align: 'center' })
    pillXAtual += pillWidth + pillGap
  })

  // Área do gráfico (sem título externo, título está dentro do gráfico)
  const chartY = pillY + 20
  const chartH = pageH - chartY - 4

  if (dados.length === 0) {
    doc.setFontSize(14)
    setTextColor(doc, mediumText)
    doc.text('Nenhum dado de suplementação encontrado no período.', pageW / 2, pageH / 2, { align: 'center' })
    return doc.output('blob')
  }

  // Card branco do gráfico (com sombra)
  setFillColor(doc, shadowColor)
  doc.roundedRect(chartX + 0.5, chartY + 0.5, chartW, chartH, 4, 4, 'F')
  setFillColor(doc, cardBg)
  doc.roundedRect(chartX, chartY, chartW, chartH, 4, 4, 'F')

  // Renderiza gráfico com Chart.js
  try {
    const graficoBase64 = await renderizarGraficoConsumo(dados, chartW, chartH)
    if (graficoBase64) {
      doc.addImage(graficoBase64, 'PNG', chartX, chartY, chartW, chartH)
    } else {
      doc.setFontSize(12)
      setTextColor(doc, mediumText)
      doc.text('Erro ao renderizar gráfico.', chartX + chartW / 2, chartY + chartH / 2, { align: 'center' })
    }
  } catch (err) {
    console.error('Erro ao renderizar gráfico:', err)
    doc.setFontSize(12)
    setTextColor(doc, mediumText)
    doc.text('Erro ao renderizar gráfico.', chartX + chartW / 2, chartY + chartH / 2, { align: 'center' })
  }



  return doc.output('blob')
}
