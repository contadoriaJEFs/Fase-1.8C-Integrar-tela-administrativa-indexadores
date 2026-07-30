## README.md – Sistema de Evolução de Benefício Previdenciário RGPS/INSS

**Versão:** 3.3 (Fase 1.7D2)  
**Status:** Estável – homologado funcionalmente e visualmente  
**Última atualização:** 28/07/2026

### Visão Geral

Sistema profissional para cálculo de evolução de benefícios previdenciários no âmbito do RGPS/INSS. Desenvolvido em HTML, CSS e JavaScript puro, com foco em usabilidade, rastreabilidade, auditoria e conformidade com cálculos judiciais e administrativos.

O sistema permite calcular a Renda Mensal Atualizada (RMA) de benefícios, comparar com valores efetivamente recebidos, apurar diferenças mensais e de abono anual, documentar alterações manuais, justificar competências modificadas e gerar relatórios internos e externos.

---

### Funcionalidades Principais

#### Guia 1 – Entradas

- Dados processuais: processo, autor, réu, CPF, vara, data do cálculo e observações.
- Tipo de ação: previdenciária, condenatória ou tributária.
- Datas processuais: ajuizamento, atualização e início dos juros.
- Parâmetros de prescrição: aplicação, prazo e termo inicial das diferenças.
- **Termo Inicial das Diferenças** em formato `MM/AAAA` ou `DD/MM/AAAA`, com cadeado para edição manual.
- Dados do benefício devido: NB, espécie, tipo, DIB, DIP, RMI, transformação, adicional, percentual de desdobramento/cota e Data Final de Evolução.
- **Benefício Baseado em Salário Mínimo**, com evolução atrelada ao salário mínimo vigente e RMI automática.
- **Possui Abono Anual (13º)** para o benefício devido.
- **Incluir 13º proporcional no ano final aberto**, opção desmarcada por padrão, utilizada para calcular o 13º proporcional até a Data Final quando o exercício civil ainda não está completo e não há DCB real.

#### Guia 2 – Evolução Devida

- Memória de cálculo do benefício devido.
- Índices aplicados: `PRO RATA`, `INTEGRAL` e `PRO RATA/FALLBACK`.
- Limites de teto e piso.
- Evolução por salário mínimo quando aplicável.
- Status: `NORMAL`, `PISO`, `TETO` e `SM`.
- RMA final, resumo executivo e impressão.
- A memória de evolução permanece focada na renda mensal, sem intercalar linhas de 13º.

#### Guia 3 – Benefícios Recebidos

- Cadastro de múltiplos benefícios recebidos, com NB, espécie, tipo, DIB, DIP, DCB, RMI, abono anual e evolução por salário mínimo individual.
- **Tratamento da DIP** em três modos:
  - iniciar compensação na DIP;
  - acumular atrasados na competência da DIP;
  - compensar desde a DIB.
- Evolução individual por benefício recebido.
- Botão **Calcular Todos** para processamento em lote.
- Memória visual re-renderizada após cada recálculo, evitando exibição de dados antigos.
- A memória da Guia 3 exibe somente a evolução mensal/reajustes do benefício recebido, sem linhas de 13º.

#### Guia 4 – Diferenças

- Grade contínua de competências mensais e competências de abono anual `13º/AAAA`.
- Colunas dinâmicas: Competência, Benefício Devido, Benefícios Recebidos, Total Recebido, Diferença Devida e Observações.
- **Modos de compensação**:
  - limitar ao valor devido;
  - permitir diferença negativa.
- **Cálculo do Abono Anual (13º)** integrado à grade de diferenças.
- O 13º é compensado em linha própria, sem misturar abono anual com mensalidades comuns.
- Cálculo de avos com regra dos 15 dias de vigência no mês.
- Base do 13º obtida pela mesma lógica da Guia 4, via `obterValorIntegral()`, garantindo consistência entre a competência exibida e a base do abono.
- Correção do primeiro 13º em benefícios previdenciários comuns cuja memória de evolução contém apenas marcos de reajuste.
- Regra do ano final aberto:
  - anos intermediários geram 13º normalmente;
  - ano final gera 13º se o mês final for dezembro;
  - ano final gera 13º se a opção **Incluir 13º proporcional no ano final aberto** estiver marcada;
  - ano final gera 13º se houver benefício recebido com `possuiAbono=true` e DCB real dentro do período apurado;
  - DIP do benefício devido não é tratada como DCB;
  - a linha `13º/AAAA` pode existir por causa de benefício recebido cessado, sem obrigar cálculo do 13º do benefício devido.
- Cálculo individual por coluna na linha de 13º.
- **Edição manual** do Benefício Devido e dos Benefícios Recebidos.
- **Central de Alterações Manuais**, com:
  - Editar;
  - Motivo;
  - Restaurar;
  - Restaurar Todas.
- Correção de colisão/recursão em função de relatórios que impedia a exibição da central de competências modificadas.
- Visual discreto para linhas de 13º: competência em azul/negrito, sem estrela, sem faixa azul forte e sem bordas chamativas.
- Sticky Header durante rolagem.
- Auditoria de alterações e lista de competências modificadas.

#### Guia 5 – Atualização (em construção)

- Correção monetária e juros serão implementados em fase futura.

#### Guia 6 – Acordo / Renúncia (em construção)

- Parâmetros para acordo, renúncia e limites serão implementados em fase futura.

#### Guia 7 – Relatórios

- **Relatório Interno**: exibe alterações com classificação interna/externa.
- **Relatório Externo**: exibe apenas justificativas autorizadas para relatório.
- Pré-visualização em HTML.
- Impressão via `window.print()` para geração de PDF nativo do navegador.
- Ajustada colisão de nome de função para evitar recursão infinita com a central de competências modificadas da Guia 4.

---

### Tecnologias Utilizadas

- **HTML5** + **Tailwind CSS** via CDN – interface responsiva.
- **CSS3** – estilos personalizados, sticky header, modais, impressão e marcações visuais.
- **JavaScript puro (ES6)** – lógica de negócio, motor de evolução, Guia 4, persistência JSON e relatórios.

---

### Estrutura de Arquivos

```text
/
├── index.html                   # Página principal, guias e modais
├── css/
│   └── styles.css               # Estilos globais e específicos
├── js/
│   ├── core.js                  # Funções auxiliares, máscaras, parse, formatação e 13º
│   ├── app.js                   # Navegação, eventos, sincronização e controle de SM
│   ├── motor-evolucao.js        # Motor de cálculo previdenciário, índices e SM
│   ├── beneficios-recebidos.js  # Gestão de benefícios recebidos e Guia 3
│   ├── diferencas.js            # Diferenças, 13º, edição, auditoria e Guia 4
│   ├── json.js                  # Exportação/importação JSON e compatibilidade
│   └── relatorios.js            # Relatórios internos e externos
├── data/
│   └── indices.js               # Base de índices e vigências
└── README.md                    # Documentação do projeto
```

---

### Como Utilizar

1. Abra o arquivo `index.html` em navegador moderno.
2. Preencha os dados na **Guia 1 – Entradas**.
3. Clique em **Calcular Evolução** para gerar a evolução do benefício devido.
4. Cadastre benefícios recebidos na **Guia 3**.
5. Calcule individualmente cada benefício recebido ou use **Calcular Todos**.
6. Acesse a **Guia 4 – Diferenças** para visualizar:
   - diferenças mensais;
   - 13º devido;
   - 13º recebido;
   - compensações;
   - edições manuais;
   - justificativas.
7. Use a **Guia 7 – Relatórios** para gerar relatório interno ou externo.
8. Exporte o caso em JSON para preservação e posterior importação.

---

### Regras de Negócio Implementadas

#### Proporcionalidade Mensal

- A Guia 4 utiliza mês comercial de 30 dias para cálculo proporcional das competências mensais.
- Dia 31 é tratado internamente como dia 30, preservando a exibição original.
- A DIP do benefício devido atua como marco financeiro final, encerrando as diferenças na competência anterior à implantação quando aplicável.
- A DIP do benefício devido não é DCB e não gera automaticamente 13º proporcional.

#### Evolução por Salário Mínimo

- Benefícios marcados como baseados em salário mínimo evoluem diretamente pela tabela de salários mínimos.
- A RMI é ajustada automaticamente ao salário mínimo da DIB quando aplicável.
- A Guia 4 utiliza os valores corretos de salário mínimo na apuração das diferenças.

#### Abono Anual (13º)

- O 13º é calculado como camada derivada, sem ser incorporado ao motor de evolução.
- A contagem de avos usa dias corridos reais do calendário.
- Um mês conta como avo se houver pelo menos 15 dias de vigência.
- Fevereiro respeita ano bissexto quando aplicável.
- DIB e DCB são consideradas para a contagem dos avos.
- DIP não interfere na contagem dos avos.
- A base do 13º corresponde à última competência ativa do exercício.
- Para memórias previdenciárias resumidas, a base é obtida por carry-over com `obterValorIntegral()`.
- O primeiro 13º de benefícios previdenciários comuns é calculado corretamente mesmo quando a memória de evolução começa apenas no primeiro reajuste.
- No ano final aberto, a geração e o cálculo do 13º obedecem às regras específicas da opção **Incluir 13º proporcional no ano final aberto** e das DCBs reais dos benefícios recebidos.

#### Edições Manuais e Auditoria

- Qualquer célula editada na Guia 4 é registrada em `dadosDiferencas.celulasEditadas`.
- A central de alterações lista as competências modificadas.
- É possível editar, justificar, restaurar individualmente ou restaurar todas as competências.
- Justificativas podem ser marcadas para inclusão no relatório externo.

#### Persistência JSON

- Exportação e importação completas do caso.
- Compatibilidade com versões `3.1`, `3.2` e `3.3`.
- Campo `incluir13FinalAberto` persistido dentro de `entradas.beneficioDevido`.
- Fallbacks aplicados para arquivos antigos.
- Conversão automática de justificativas antigas em string para objeto estruturado.

---

### Compatibilidade

- **Navegadores:** Chrome, Edge, Firefox e Safari em versões recentes.
- **JSON:** versões `3.1`, `3.2` e `3.3` suportadas.
- **Arquivos antigos:** compatibilidade retroativa com fallback para campos novos.
- **Renderização visual:** linhas de 13º ajustadas para aparência discreta e consistente entre Chrome e Edge.

---

### Histórico da Fase 1.7D2

A Fase 1.7D2 implementou e homologou funcionalmente o Abono Anual (13º), incluindo:

- criação de linhas `13º/AAAA` na Guia 4;
- cálculo de avos pela regra dos 15 dias;
- correção do primeiro 13º em benefícios previdenciários comuns;
- suporte a benefícios atrelados ao salário mínimo;
- remoção do 13º da memória da Guia 3;
- re-renderização da memória da Guia 3 após recálculo;
- regra de ano final aberto;
- opção `incluir13FinalAberto`;
- persistência da opção em JSON;
- tratamento de DCB de benefícios recebidos no ano final;
- prevenção de uso indevido da DIP do benefício devido como DCB;
- correção de recursão que causava `Maximum call stack size exceeded`;
- restauração da central de competências modificadas;
- ajuste visual discreto das linhas de 13º.

---

### Roadmap

| Fase | Descrição | Status |
|---|---|---|
| 1.7D2 | Abono Anual (13º), avos, Guia 4, ano final aberto e integração com diferenças | Concluída / homologada |
| 1.8 | Atualização monetária e juros – Guia 5 | Próxima fase |
| 1.9 | Acordo e Renúncia – Guia 6 | Planejada |
| 2.0 | Relatórios avançados, PDF, assinatura digital e exportações | Planejada |

---

### Manutenção e Extensibilidade

- O motor de evolução (`motor-evolucao.js`) permanece isolado e sem lógica de abono anual.
- O cálculo do 13º está concentrado em funções auxiliares e na Guia 4.
- A Guia 3 permanece dedicada à evolução dos benefícios recebidos.
- A Guia 4 concentra diferenças, compensações, 13º, edição manual e auditoria.
- A estrutura modular por arquivo facilita correções pontuais e futuras fases.

---

### Contribuição

Este é um sistema interno. Para sugestões, reporte de bugs ou solicitações de melhoria, entre em contato com a equipe de desenvolvimento.

---

### Licença

Uso exclusivo para fins profissionais no âmbito de cálculos judiciais e administrativos previdenciários. Proibida a redistribuição sem autorização.

**Desenvolvido por:** Equipe de Desenvolvimento – Cálculo Previdenciário
