# ⚡ Power Grid Monitor

**Sistema de apoio à decisão para análise de ocorrências e recomposição de redes de distribuição de energia elétrica.**

O Power Grid Monitor é um projeto desenvolvido com React e Vite para visualizar a rede elétrica de distribuição, consultar equipamentos e conexões da rede e apoiar a análise de alternativas de recomposição após ocorrências.

O projeto utiliza dados geográficos da Base de Dados Geográfica da Distribuidora (BDGD), disponibilizada pela Agência Nacional de Energia Elétrica (ANEEL), para representar a topologia da rede e auxiliar na análise das condições de manobra.

> **Status:** Em desenvolvimento — evolução das funcionalidades, validação topológica e preparação da publicação web.

---

## 🎯 Objetivo do projeto

Centralizar informações relevantes da rede elétrica em uma interface visual, facilitando a identificação de equipamentos, a compreensão das conexões entre trechos e a avaliação de alternativas para restabelecimento do fornecimento de energia.

O sistema busca tornar a análise operacional mais visual, organizada e rastreável, considerando a estrutura física da rede e as restrições técnicas disponíveis.

## 🗺️ Funcionalidades

### Visualização geográfica da rede

- Exibição da rede de média tensão em mapa interativo.
- Visualização de subestações, trechos, pontos e equipamentos.
- Seleção e filtragem dos alimentadores.
- Consulta das informações associadas aos elementos da rede.
- Destaque de conexões e caminhos elétricos para apoiar a análise topológica.

### Integração com a BDGD

O projeto utiliza dados geográficos para construir uma representação da rede elétrica e consultar suas conexões.

A implementação contempla:

- Pontos de conexão e trechos da rede.
- Identificação e classificação de equipamentos.
- Relações de conectividade entre elementos.
- Navegação a montante e a jusante.
- Análise de caminhos elétricos e conexões entre alimentadores.

### Análise de Manobra Inteligente

O módulo de análise tem como objetivo apoiar a avaliação de alternativas de recomposição, considerando as informações disponíveis sobre a ocorrência e a topologia da rede.

Entre os critérios trabalhados estão:

- Identificação do equipamento associado ao desarme.
- Delimitação da área potencialmente afetada.
- Busca de equipamentos candidatos à recomposição.
- Validação topológica das alternativas encontradas.
- Avaliação da conectividade entre a área afetada e a rede receptora.
- Consideração das correntes informadas e da capacidade dos trechos, incluindo informações de condutores e bitolas quando disponíveis.

A ausência de informação não deve ser interpretada automaticamente como corrente nula ou como confirmação do estado de um equipamento. Os critérios de validação devem utilizar dados disponíveis e evidências verificáveis da rede.

## 🏗️ Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| React | Construção da interface |
| Vite | Desenvolvimento e compilação |
| JavaScript | Lógica da aplicação |
| Leaflet | Mapa geográfico interativo |
| React-Leaflet | Integração do mapa com React |
| GeoJSON | Representação e carregamento de dados geográficos |
| BDGD / ANEEL | Fonte de dados geográficos da rede |

## ⚡ Rede de referência

O desenvolvimento utiliza como referência a Subestação CMG, em Camaragibe, Pernambuco.

A estrutura de referência contempla seis alimentadores:

- `CMG01C1` — circuito 151
- `CMG01C2` — circuito 152
- `CMG01C3` — circuito 153
- `CMG01C4` — circuito 154
- `CMG01C5` — circuito 155
- `CMG01C6` — circuito 156

A disponibilidade e a integridade dos dados de cada alimentador dependem dos arquivos BDGD presentes no projeto e de sua correta interpretação pela aplicação.

## 🚀 Executar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) compatível com as dependências do projeto.
- npm, normalmente instalado com o Node.js.
- Git, para clonar o repositório.

### Instalação

Clone o repositório e entre na pasta do projeto:

```bash
git clone https://github.com/Joell2311/Power-Grid-Monitor.git
cd Power-Grid-Monitor
```

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O Vite exibirá no terminal o endereço local para abrir a aplicação no navegador.

### Compilar para produção

Para gerar a versão de produção:

```bash
npm run build
```

Para executar uma prévia local da versão compilada:

```bash
npm run preview
```

O resultado da compilação é gerado na pasta `dist`.

## 📂 Organização do projeto

A estrutura pode variar conforme a evolução do código. Os principais módulos incluem:

```text
Power-Grid-Monitor/
├── public/
│   └── data/
│       └── bdgd/
├── src/
│   ├── components/
│   ├── core/
│   │   └── modelo/
│   │       ├── modeloRede.js
│   │       ├── topologiaBDGD.js
│   │       └── navegadorRede.js
│   ├── repositories/
│   └── ...
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

**Observação:** a estrutura acima é ilustrativa. A organização efetiva deve ser conferida no repositório para refletir fielmente os arquivos existentes.

## 🗃️ Fonte dos dados

A referência geográfica utilizada no projeto é a Base de Dados Geográfica da Distribuidora (BDGD), disponibilizada publicamente pela ANEEL.

- [Portal de Dados Abertos da ANEEL](https://dadosabertos.aneel.gov.br/)
- [Base de Dados Geográfica da Distribuidora — BDGD](https://dadosabertos.aneel.gov.br/dataset/base-de-dados-geografica-da-distribuidora-bdgd)

A utilização e a redistribuição de bases derivadas devem respeitar os termos da licença aplicável, incluindo os requisitos de atribuição e compartilhamento.

## 🌐 Publicação web

O projeto está sendo preparado para publicação pelo **GitHub Pages**, com compilação automatizada por GitHub Actions.

A publicação depende da configuração do repositório, do caminho-base do Vite, do carregamento correto dos arquivos estáticos e da conclusão dos testes de compilação e funcionamento.

O endereço público deverá ser informado aqui após a publicação ser concluída e validada.

## ✅ Validação e confiabilidade

O desenvolvimento prioriza a consistência das informações utilizadas na análise da rede.

Princípios adotados:

- Não criar equipamentos ou interligações artificiais para completar a topologia.
- Preservar os identificadores dos equipamentos.
- Diferenciar ausência de informação de um valor igual a zero.
- Considerar o estado operacional explicitamente informado.
- Verificar a conectividade topológica das alternativas propostas.
- Considerar as limitações técnicas dos trechos conforme os dados disponíveis.
- Identificar situações em que a informação disponível não permite validar uma alternativa com segurança.

A confiabilidade dos resultados depende da qualidade dos dados, da implementação dos critérios técnicos e da validação dos cenários analisados.

## ⚠️ Limites de utilização

O Power Grid Monitor é uma ferramenta de apoio à análise e à tomada de decisão. Seus resultados não substituem os procedimentos operacionais oficiais, os sistemas de supervisão e controle, as instruções técnicas ou a avaliação dos profissionais autorizados.

Nenhuma manobra real deve ser executada exclusivamente com base em uma alternativa apresentada pelo sistema. A condição operacional, a capacidade dos equipamentos, os procedimentos de segurança e as autorizações aplicáveis precisam ser verificados pelos responsáveis.

## 🛠️ Próximas evoluções

As prioridades de desenvolvimento incluem:

- Consolidar o carregamento e a validação da topologia BDGD.
- Ampliar os testes de descoberta de candidatos à recomposição.
- Validar os critérios de capacidade dos condutores e dos trechos a montante.
- Melhorar a apresentação dos caminhos elétricos e das áreas afetadas.
- Automatizar a publicação pelo GitHub Actions.
- Validar o funcionamento completo da aplicação publicada.

---

**Power Grid Monitor**  
*Visualização da rede, análise topológica e apoio à decisão operacional.*
