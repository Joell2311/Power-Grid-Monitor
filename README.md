⚡ Power Grid Monitor

Power Grid Monitor é uma aplicação web desenvolvida para visualização, monitoramento e análise operacional de redes elétricas de distribuição, utilizando informações geográficas e elétricas provenientes da BDGD — Base de Dados Geográfica da Distribuidora.

O sistema foi concebido para transformar os dados da rede elétrica em uma representação geográfica, topológica e operacional, permitindo ao usuário visualizar a rede, localizar equipamentos, analisar caminhos elétricos, identificar trechos e avaliar possibilidades de manobra e transferência de carga.

---

🎯 Objetivo

O objetivo do Power Grid Monitor é fornecer uma ferramenta que auxilie na compreensão e análise da rede de distribuição de energia elétrica, reunindo em uma única interface informações que normalmente estão distribuídas entre diferentes fontes e sistemas.

A aplicação busca facilitar atividades como:

- Visualização da rede elétrica em mapa;
- Localização de equipamentos;
- Identificação de trechos da rede;
- Análise da conectividade elétrica;
- Percurso da rede a partir de um determinado ponto;
- Análise de rede montante e jusante;
- Identificação de equipamentos à frente de determinado ponto;
- Avaliação de interligações;
- Identificação de trechos com menor capacidade;
- Análise de possibilidades de transferência de carga;
- Apoio à análise de ocorrências e desarmes;
- Apoio à tomada de decisão operacional.

---

🗺️ Visão geral do sistema

O Power Grid Monitor utiliza um mapa interativo como principal interface para representação da rede elétrica.

A partir dele, o usuário pode visualizar diferentes elementos da infraestrutura e realizar análises sobre a rede.

Elementos representados

- Subestações;
- Alimentadores;
- Circuitos;
- Trechos de média tensão;
- Equipamentos;
- Religadores;
- Chaves;
- Reguladores de tensão;
- Bancos de capacitores;
- Pontos da rede;
- Terminais;
- Derivações;
- Interligações.

A interface permite ativar e desativar diferentes camadas para facilitar a análise da rede.

---

⚡ Rede elétrica

A aplicação trabalha com a representação da rede de média tensão e seus elementos de infraestrutura.

Cada trecho da rede pode ser relacionado aos pontos e equipamentos correspondentes, permitindo construir uma representação lógica da conectividade elétrica.

Essa estrutura possibilita que o sistema deixe de ser apenas um mapa e passe a trabalhar também com a topologia da rede.

---

🔌 Equipamentos

O Power Grid Monitor permite representar e localizar equipamentos presentes na rede elétrica.

Entre os equipamentos considerados estão:

- ⚡ Religadores;
- 🔀 Chaves;
- 📈 Reguladores de tensão;
- 🔋 Bancos de capacitores.

A identificação dos equipamentos utiliza as informações disponíveis na BDGD, evitando a necessidade de reconstruir manualmente a infraestrutura da rede.

---

🏷️ Identificação operacional

Um dos objetivos do sistema é aproximar a representação geográfica da realidade operacional da rede.

A aplicação trabalha com informações que podem auxiliar na identificação de equipamentos e pontos específicos da rede, incluindo:

- Plaqueta operacional;
- Identificação do equipamento;
- Patrimônio / PT;
- Ponto de conexão;
- Trecho associado;
- Alimentador;
- Circuito.

Isso permite utilizar uma identificação operacional conhecida para localizar o equipamento correspondente no mapa.

---

🧭 Análise topológica

Uma das principais características do Power Grid Monitor é a construção da topologia da rede elétrica a partir dos dados provenientes da BDGD.

O sistema utiliza os elementos da infraestrutura para estabelecer relações entre pontos, trechos e equipamentos.

Exemplo simplificado:

SUBESTAÇÃO
    │
    ▼
  Ponto A
    │
    ├──────── Trecho 01 ──────── Ponto B
    │                              │
    │                              ▼
    │                           Trecho 02
    │                              │
    │                              ▼
    │                           Ponto C
    │                              │
    │                           Equipamento
    │
    └──────── Interligação ───────► Alimentador B

A partir dessa estrutura, o sistema pode percorrer a rede e identificar relações entre seus elementos.

---

🔎 Análises da rede

O sistema possui uma estrutura destinada à realização de diferentes análises topológicas e operacionais.

Rede montante

Permite analisar a rede existente no sentido da origem do circuito, identificando os elementos conectados antes de determinado ponto.

Rede jusante

Permite analisar os elementos localizados após determinado ponto da rede.

Essa análise pode ser utilizada, por exemplo, para identificar quais trechos e equipamentos estão à frente de um determinado equipamento ou ponto de desarme.

Caminho elétrico

Permite percorrer o caminho existente entre elementos da rede e identificar a sequência de trechos e pontos envolvidos.

Rede conectada

Permite identificar os elementos pertencentes à mesma estrutura de conectividade da rede.

---

🚨 Apoio à análise de ocorrências

O Power Grid Monitor também possui como objetivo apoiar a análise de ocorrências na rede elétrica.

A partir da identificação de um equipamento, ponto ou ocorrência, a estrutura topológica pode ser utilizada para auxiliar na avaliação da rede afetada.

Entre as análises possíveis estão:

- Localização do ponto associado ao equipamento;
- Identificação do alimentador;
- Identificação do circuito;
- Percurso elétrico;
- Análise montante;
- Análise jusante;
- Identificação de equipamentos à frente;
- Identificação dos trechos envolvidos;
- Avaliação das possíveis áreas afetadas.

A proposta é reduzir o tempo necessário para compreender a configuração da rede durante uma ocorrência.

---

🔄 Interligações e possibilidades de transferência

As interligações entre circuitos são elementos importantes para a operação da rede.

O Power Grid Monitor considera essas estruturas na análise da topologia, permitindo identificar pontos onde existe possibilidade de conexão entre diferentes partes da rede.

A partir dessas informações, o sistema poderá auxiliar na avaliação de:

- Interligações existentes;
- Pontos de transferência;
- Trechos envolvidos;
- Rede que pode ser transferida;
- Restrições relacionadas à capacidade dos trechos;
- Possíveis oportunidades de transferência de carga.

---

⚙️ Capacidade dos trechos

A capacidade dos condutores é considerada nas análises da rede.

O sistema pode relacionar o trecho ao tipo/seção do cabo e à capacidade correspondente, permitindo identificar situações em que determinados caminhos apresentam menor capacidade.

Exemplo de referência utilizada no modelo:

Seção do condutor| Capacidade
240 mm²| 500 A
150 mm²| 300 A
95 mm²| 220 A
70 mm²| 150 A
35 mm²| 90 A

Essas informações servem como base para futuras análises de transferência e carregamento da rede.

---

🔗 Pontos, terminais e derivações

A representação da topologia depende da correta identificação das conexões existentes na infraestrutura.

Por isso, o projeto considera diferentes elementos da BDGD, incluindo:

- Pontos da rede;
- Terminais;
- Derivações;
- Pontos de conexão;
- Trechos;
- Equipamentos.

Esses elementos são utilizados para estabelecer as relações necessárias para o percurso da rede.

---

🗃️ BDGD como fonte de dados

A BDGD — Base de Dados Geográfica da Distribuidora é utilizada como fonte principal das informações de infraestrutura da rede.

O objetivo é trabalhar com os dados existentes na própria base, evitando a necessidade de cadastrar manualmente a infraestrutura elétrica.

O fluxo de processamento é baseado em dados geográficos e informações de relacionamento existentes na BDGD.

---

🏗️ Fluxo de dados

O processamento pode ser representado de forma simplificada:

                BDGD
                 │
                 ▼
       File Geodatabase (GDB)
                 │
                 ▼
             GDAL / OGR
                 │
        ┌────────┴────────┐
        ▼                 ▼
     ogrinfo           ogr2ogr
        │                 │
        └────────┬────────┘
                 ▼
        Dados processados
                 │
                 ▼
              GeoJSON
                 │
                 ▼
        React + Leaflet
                 │
                 ▼
       Power Grid Monitor
                 │
                 ▼
       Modelo da rede elétrica
                 │
                 ▼
           Topologia
                 │
                 ▼
       Análises operacionais

---

🧩 Processamento geográfico

O projeto utiliza ferramentas do GDAL/OGR para trabalhar com a File Geodatabase.

Entre as operações utilizadas estão:

- Consulta de camadas;
- Identificação de atributos;
- Filtragem de registros;
- Extração de dados;
- Conversão de camadas;
- Geração de GeoJSON;
- Preparação dos dados para utilização no mapa.

Exemplo:

ogrinfo "arquivo.gdb" SSDMT

Conversão para GeoJSON:

ogr2ogr -f GeoJSON saida.geojson "arquivo.gdb" SSDMT

---

🧠 Modelo e topologia da rede

A aplicação possui uma camada específica para modelagem da rede elétrica.

A estrutura de topologia utiliza as informações dos trechos e pontos para estabelecer as conexões entre os elementos.

De forma simplificada:

BDGD
 │
 ├── Trechos
 │
 ├── Pontos
 │
 ├── Equipamentos
 │
 └── Interligações
       │
       ▼
   Modelo da rede
       │
       ▼
     Topologia
       │
       ├── Montante
       ├── Jusante
       ├── Caminho elétrico
       ├── Rede conectada
       └── Interligações

Essa arquitetura permite que novas análises sejam adicionadas sem que seja necessário reconstruir toda a lógica do sistema.

---

🖥️ Interface

A interface foi desenvolvida para concentrar as informações operacionais em um ambiente visual único.

Entre os recursos da interface estão:

- Mapa interativo;
- Controle de camadas;
- Visualização de equipamentos;
- Identificação de trechos;
- Informações da subestação;
- Informações do alimentador;
- Informações do circuito;
- Indicadores da quantidade de elementos;
- Ferramentas de análise da rede;
- Visualização das estruturas topológicas.

---

🛠️ Tecnologias utilizadas

Front-end

- React
- Vite
- JavaScript
- Leaflet
- React Leaflet

Dados geográficos

- GeoJSON
- File Geodatabase (GDB)

Processamento geográfico

- GDAL
- OGR
- ogrinfo
- ogr2ogr

Desenvolvimento

- Node.js
- npm

Controle de versão

- Git
- GitHub

---

📂 Estrutura do projeto

Estrutura simplificada:

src/
│
├── components/
│   └── mapa/
│       └── CamadaBDGD.jsx
│
├── core/
│   │
│   ├── database/
│   │
│   ├── modelo/
│   │   ├── modeloRede.js
│   │   └── topologiaBDGD.js
│   │
│   └── repositories/
│       └── trechosRepository.js
│
├── ...
│
└── main.jsx

A organização separa responsabilidades entre:

- Interface;
- Mapa;
- Banco de dados;
- Modelo da rede;
- Topologia;
- Repositórios;
- Processamento dos dados.

---

💻 Instalação

Pré-requisitos

Antes de executar o projeto, é necessário possuir:

- Node.js;
- npm;
- Git.

Para trabalhar com a preparação dos dados BDGD, também são utilizadas as ferramentas GDAL/OGR.

---

1. Clonar o repositório

git clone URL_DO_REPOSITORIO

2. Acessar a pasta

cd power-grid-monitor

3. Instalar as dependências

npm install

4. Executar o projeto

npm run dev

Depois da inicialização, o Vite disponibilizará o endereço local da aplicação.

---

📊 Informações apresentadas

O sistema foi estruturado para trabalhar com informações como:

Categoria| Informações
Subestação| Identificação da subestação
Alimentador| Alimentador analisado
Circuito| Circuito associado
Rede| Trechos e conexões
Equipamentos| Religadores, chaves, reguladores e capacitores
Pontos| Pontos de conexão da rede
Topologia| Relação entre os elementos
Interligações| Conexões entre circuitos
Capacidade| Capacidade dos trechos
Análises| Montante, jusante, caminho e conectividade

---

📈 Status do projeto

🟡 Em desenvolvimento

O Power Grid Monitor está sendo desenvolvido de forma incremental.

Estruturas já desenvolvidas

- [x] Aplicação web em React;
- [x] Ambiente Vite;
- [x] Mapa interativo;
- [x] Integração com Leaflet;
- [x] Estrutura de camadas geográficas;
- [x] Integração com dados BDGD;
- [x] Processamento de dados através de GDAL/OGR;
- [x] Conversão e utilização de GeoJSON;
- [x] Visualização da rede de média tensão;
- [x] Visualização de equipamentos;
- [x] Estrutura de modelo da rede;
- [x] Estrutura inicial de topologia;
- [x] Análises de conectividade;
- [x] Análise de rede montante;
- [x] Análise de rede jusante;
- [x] Caminho elétrico;
- [x] Estrutura para análise de interligações;
- [x] Identificação de trechos e equipamentos.

Em evolução

- [ ] Aperfeiçoamento da topologia;
- [ ] Aprimoramento da identificação operacional;
- [ ] Análise de ocorrências;
- [ ] Análise de áreas afetadas;
- [ ] Apoio à recomposição da rede;
- [ ] Avaliação de possibilidades de transferência;
- [ ] Análise de capacidade dos trechos;
- [ ] Melhorias de desempenho;
- [ ] Novas ferramentas operacionais.

---

🚀 Roadmap

O desenvolvimento do Power Grid Monitor está direcionado para a evolução de um sistema cada vez mais completo de apoio à análise operacional da rede.

Próximas etapas

BDGD
 │
 ▼
Modelo da rede
 │
 ▼
Topologia
 │
 ▼
Análises elétricas
 │
 ▼
Ocorrências
 │
 ▼
Rede afetada
 │
 ▼
Possibilidades de manobra
 │
 ▼
Transferência / recomposição
 │
 ▼
Apoio à decisão operacional

Entre os próximos objetivos estão:

- Aprimorar a construção automática da topologia;
- Melhorar a identificação dos equipamentos;
- Desenvolver análises mais completas de ocorrências;
- Identificar automaticamente redes afetadas;
- Avaliar caminhos alternativos;
- Considerar capacidade dos trechos durante análises;
- Identificar oportunidades de transferência;
- Desenvolver ferramentas de apoio à recomposição;
- Melhorar desempenho com grandes volumes de dados;
- Evoluir os recursos de visualização e análise.

---

🔐 Dados

O projeto utiliza dados geográficos e operacionais de redes elétricas.

Arquivos de dados proprietários, informações sensíveis ou bases completas da distribuidora não fazem parte deste repositório, quando aplicável.

O código e a estrutura disponibilizados neste projeto têm finalidade de desenvolvimento, estudo e demonstração.

---

⚠️ Observação

O Power Grid Monitor encontra-se em desenvolvimento. A arquitetura, os modelos de dados e algumas funcionalidades podem sofrer alterações durante a evolução do projeto.

As análises apresentadas pelo sistema devem ser consideradas como ferramentas de apoio, devendo as decisões operacionais seguir os procedimentos, sistemas e critérios oficiais aplicáveis à operação da rede elétrica.

---

👨‍💻 Autor

Joel Bernardes

Desenvolvimento de uma solução voltada à visualização, modelagem, análise topológica e apoio à operação de redes elétricas de distribuição.

---

⚡ Power Grid Monitor

«Do dado geográfico à análise da rede elétrica.»