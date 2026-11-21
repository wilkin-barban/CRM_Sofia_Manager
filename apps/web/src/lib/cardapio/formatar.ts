export interface ProdutoCardapio {
  id: string
  nome: string
  descricao?: string | null
  preco_centavos: number
  quantidade_estoque?: number | null
  url_imagem?: string | null
  categoria?: string | null
}

export interface RecomendacaoCardapioInput {
  pessoas: number
  orcamentoMaximoCentavos?: number
  produtos: ProdutoCardapio[]
}

export interface ItemRecomendado {
  produto: ProdutoCardapio
  quantidade: number
  subtotalCentavos: number
}

export interface RecomendacaoCardapioOutput {
  itens: ItemRecomendado[]
  totalCentavos: number
  totalFormatado: string
  textoExplicativo: string
}

export function formatarPrecoBrl(precoCentavos: number): string {
  return `R$ ${(precoCentavos / 100).toFixed(2).replace('.', ',')}`
}

export function formatarCardapioResumido(produtos: ProdutoCardapio[], baseUrl = 'https://crmsofiamanager.duckdns.org'): string {
  if (!produtos || produtos.length === 0) {
    return 'No momento nosso cardápio está sendo atualizado. Por favor, pergunte a um atendente!'
  }

  const cleanBaseUrl = (baseUrl || 'https://crmsofiamanager.duckdns.org').replace(/\/$/, '')
  const linhas = [
    '📦 *CRM SOFIA MANAGER — O que vai querer hoje?*',
    '_Confira nossos produtos disponíveis para pedido:_',
    '',
  ]

  for (const item of produtos) {
    const estoqueInfo = item.quantidade_estoque != null && item.quantidade_estoque <= 10
      ? ` _(Restam ${item.quantidade_estoque} un)_`
      : ''
    linhas.push(`📦 *${item.nome}*`)
    linhas.push(`🔖 product:${item.id}`)
    if (item.url_imagem) {
      const imagem = /^https?:\/\//i.test(item.url_imagem)
        ? item.url_imagem
        : `${cleanBaseUrl}/${item.url_imagem.replace(/^\//, '')}`
      linhas.push(`📷 ${imagem}`)
    }
    if (item.descricao) linhas.push(item.descricao)
    linhas.push(`💰 *${formatarPrecoBrl(item.preco_centavos)}*${estoqueInfo}`)
    linhas.push('🛒 _[Adicionar ao pedido]_ • 👀 _[Ver detalhes]_')
    linhas.push('')
  }

  linhas.push('💬 *Qual produto você gostaria de pedir?* 😊')
  return linhas.join('\n')
}

export function calcularRecomendacaoCardapio(input: RecomendacaoCardapioInput): RecomendacaoCardapioOutput {
  const { pessoas, orcamentoMaximoCentavos, produtos } = input
  const kitFamilia = produtos.find((p) => p.nome.toLowerCase().includes('kit') || p.nome.toLowerCase().includes('família'))
  const costela = produtos.find((p) => p.nome.toLowerCase().includes('costela'))
  const picanha = produtos.find((p) => p.nome.toLowerCase().includes('picanha'))

  // Preserve a seleção histórica para catálogos que já usavam essas opções.
  if (kitFamilia || costela || picanha) {
    const cabeNoOrcamento = (p: ProdutoCardapio) => !orcamentoMaximoCentavos || p.preco_centavos <= orcamentoMaximoCentavos
    const produto = (pessoas >= 4 && kitFamilia && cabeNoOrcamento(kitFamilia) && kitFamilia)
      || (costela && cabeNoOrcamento(costela) && costela)
      || (picanha && cabeNoOrcamento(picanha) && picanha)
      || [...produtos].sort((a, b) => a.preco_centavos - b.preco_centavos)[0]
    const totalCentavos = produto.preco_centavos
    const totalFormatado = formatarPrecoBrl(totalCentavos)
    return {
      itens: [{ produto, quantidade: 1, subtotalCentavos: totalCentavos }],
      totalCentavos,
      totalFormatado,
      textoExplicativo: `Para ${pessoas} pessoas, a melhor opção recomendada é 1x ${produto.nome}, ficando em ${totalFormatado}.`,
    }
  }

  const disponiveis = produtos.filter((p) =>
    (p.quantidade_estoque == null || p.quantidade_estoque > 0) &&
    (orcamentoMaximoCentavos == null || p.preco_centavos <= orcamentoMaximoCentavos)
  )
  const produto = [...disponiveis].sort((a, b) => a.preco_centavos - b.preco_centavos)[0]
  const itens: ItemRecomendado[] = produto
    ? [{ produto, quantidade: 1, subtotalCentavos: produto.preco_centavos }]
    : []
  const totalCentavos = produto?.preco_centavos ?? 0
  const totalFormatado = formatarPrecoBrl(totalCentavos)
  const textoExplicativo = produto
    ? `Uma opção disponível é 1x ${produto.nome}, por ${totalFormatado}. Consulte o atendente sobre a quantidade necessária.`
    : 'Não há produtos disponíveis dentro do orçamento informado. Consulte um atendente.'

  return { itens, totalCentavos, totalFormatado, textoExplicativo }
}
