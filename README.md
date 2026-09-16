# Drive CMS POC

Prova de conceito de um site Astro que converte tabelas de um Google Doc em blocks e gera HTML estático.

## Executar localmente

```bash
npm install
npm run sync:google
npm run dev
```

## Testar no GitHub Pages

O projeto está configurado para publicação como GitHub Pages em:

```text
https://gotomarcelo.github.io/site-santuario/
```

O workflow em `.github/workflows/deploy.yml` executa automaticamente quando houver push na branch `main`. Ele instala as dependências, sincroniza o Drive com a conta de serviço, executa o build e publica a pasta `dist`.

Secrets necessários em **Settings → Secrets and variables → Actions**:

| Secret | Conteúdo |
| ------ | -------- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo da chave da conta de serviço |
| `GOOGLE_DRIVE_FOLDER_ID` | ID da pasta raiz no Drive (site multipágina) |

Compartilhe a pasta no Drive com o e-mail da conta de serviço, com permissão de **Leitor**. Sem esse compartilhamento a API não vê os arquivos.

Para ativar a publicação no GitHub:

1. Faça push dos arquivos para o repositório `gotomarcelo/site-santuario`.
2. Abra **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. Acompanhe a execução em **Actions → Deploy Astro to GitHub Pages**.
5. Abra a URL exibida pelo workflow.

Para republicar sem push, use **Actions → Deploy Astro to GitHub Pages → Run workflow**.

Abra `http://localhost:4321`. O conteúdo é atualizado ao executar `npm run sync:google`. O build de produção é validado com:

```bash
npm run build
```

## Contrato editorial para o Google Docs

Cada tabela representa um block. A primeira linha contém apenas seu identificador; as demais linhas são os dados.

## Organização dos componentes

Cada componente Astro fica em uma pasta própria, com o markup e o estilo separados em Sass:

```text
src/components/blocks/
└── Header/
	├── Header.astro
	└── Header.scss
```

O arquivo `.astro` concentra props, HTML e comportamento do componente. O arquivo `.scss` concentra seus estilos e importa os tokens compartilhados:

```scss
@use "../../../styles/tokens" as *;
@use "../../../styles/mixins" as *;
```

Os tokens ficam em `src/styles/_tokens.scss` e incluem cores, tipografia, espaçamento, raios e breakpoints (`$breakpoint-mobile`, `$breakpoint-tablet` e `$breakpoint-header`). Os mixins compartilhados ficam em `src/styles/_mixins.scss`. Para criar um novo block, siga esse padrão e registre o componente em `BlockRenderer.astro` e `FragmentRenderer.astro`.

### Header

O header é um block que pode ser usado diretamente em uma página ou dentro de um fragmento `header`. A primeira linha de dados define o texto pequeno da marca, o nome da marca, o CTA e sua URL. As linhas seguintes definem os links do menu:

| header                |              |                         |            |         |
| --------------------- | ------------ | ----------------------- | ---------- | ------- |
| URL ou imagem do logo | Santuário    | Nossa Senhora de Nazaré | Contribuir | #dizimo |
| Início                | /            |
| A Paróquia            | /a-paroquia/ |
| Missas                | /missas/     |

Na primeira célula da primeira linha de dados, cole a imagem do logo diretamente no Google Docs ou informe uma URL pública da imagem. As células seguintes são o texto pequeno da marca, o nome da marca, o CTA e a URL do CTA. Quando uma imagem é colada, o sincronizador lê o `inlineObject` da Google Docs API e usa sua imagem no header. Se a primeira célula ficar vazia, o header usa a cruz de fallback.

Durante `npm run sync:google`, imagens remotas do header são baixadas, convertidas para WebP com qualidade 85 e salvas em `public/images/`. O JSON passa a apontar para a URL local `/images/...webp`, evitando a expiração das URLs temporárias fornecidas pelo Google Docs. URLs de imagens inseridas nos próximos componentes podem usar a mesma etapa de materialização em `scripts/image-assets.ts`.

Os arquivos recebem um nome calculado a partir do conteúdo da imagem, não da URL temporária do Google. Assim, a mesma imagem usada em mais de um local gera apenas um WebP e uma sincronização sem mudanças mantém as mesmas URLs. Ao fim da sincronização, WebPs gerados que não são mais referenciados são removidos; imagens com nomes próprios em `public/images/` são preservadas.

O menu desktop aparece em telas largas e o menu mobile é aberto pelo botão no canto direito. Os links e o CTA são definidos no Google Docs; o comportamento responsivo pertence ao componente Astro.

#### Dropdown no menu

As linhas antigas com duas colunas (`rótulo | URL`) continuam criando links simples. Para um dropdown, use quatro colunas e informe o tipo na primeira: `link`, `dropdown` ou `submenu`. Cada `submenu` precisa vir depois do seu `dropdown` pai.

| header |  |  |  |  |
| ------ | - | - | - | - |
| logo | Santuário | Nossa Senhora de Nazaré | Contribuir | #dizimo |
| link | Início | / |
| dropdown | A Paróquia | /a-paroquia/ |
| submenu | A Paróquia | História | /a-paroquia/historia/ |
| submenu | A Paróquia | Equipe | /a-paroquia/equipe/ |
| link | Notícias | /noticias/ |

No desktop, o texto **A Paróquia** continua sendo um link e a seta ao lado abre o submenu. No mobile, o grupo é expansível e inclui o link principal e seus itens.

### Hero

O Hero usa uma tabela com uma linha de configuração. A imagem pode ser uma URL pública ou uma imagem colada na célula correspondente:

| hero    |                |          |                       |           |        |                   |         |
| ------- | -------------- | -------- | --------------------- | --------- | ------ | ----------------- | ------- |
| eyebrow | título inicial | destaque | continuação do título | descrição | imagem | texto alternativo | legenda |

Exemplo:

| hero                   |             |     |                  |                                                                                  |                  |                                              |                                              |
| ---------------------- | ----------- | --- | ---------------- | -------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------- |
| Bem-vindo ao Santuário | Um lugar de | Fé  | Esperança e Amor | O Santuário Nossa Senhora de Nazaré é um espaço sagrado de fé e espiritualidade. | imagem da igreja | Fachada do Santuário Nossa Senhora de Nazaré | Santuário Nossa Senhora de Nazaré — Cohatrac |

O campo `destaque` aparece em dourado e itálico. A imagem pode ser colada diretamente no Google Docs; durante `npm run sync:google`, ela é baixada, convertida para WebP e salva localmente em `public/images/`.

### Carrossel de banners

Use `banner-carousel` (ou `carousel`) para criar uma faixa de destaques com uma linha por slide. A categoria é opcional: deixe a terceira célula vazia quando não quiser exibi-la. O carrossel avança automaticamente a cada cinco segundos, pausa ao passar o mouse ou navegar pelo teclado e também oferece setas e indicadores.

| banner-carousel |                  |           |        |     |
| --------------- | ---------------- | --------- | ------ | --- |
| imagem          | texto alternativo | categoria | título | link |

Exemplo:

| banner-carousel |                              |           |                                               |             |
| --------------- | ---------------------------- | --------- | --------------------------------------------- | ----------- |
| imagem do evento | Pessoas em uma celebração | Festividade | Festa de Nossa Senhora de Nazaré | /eventos/ |
| imagem da igreja | Fachada do Santuário | | Conheça os horários das missas | /missas/ |

Cada slide precisa de imagem e título. A imagem pode ser colada na primeira célula ou informada como URL e é materializada em WebP durante a sincronização.

### Doações e Pix

Use uma tabela `donation` (também são aceitos `doacao` e `doação`). A primeira linha de dados configura a seção; as linhas seguintes são os dados bancários. O QR Code deve ser **colado ou inserido como imagem na quinta célula** da primeira linha de dados, e não como texto ou link.

| donation |  |  |  |  |  |  |  |
| -------- | - | - | - | - | - | - | - |
| texto pequeno | título | citação | chave Pix | imagem do QR Code | texto alternativo | instrução do QR Code | observação presencial |
| Colabore | Dízimo e Contribuição | Deus ama quem dá com alegria. | 00.000.000/0001-00 | Cole o QR Code aqui | QR Code Pix do Santuário | Aponte a câmera para o QR Code acima. | Também aceitamos contribuições presencialmente na secretaria. |
| Banco | Banco do Brasil |
| Agência | 1234-5 |
| Conta Corrente | 00001-0 |
| Favorecido | Santuário Nossa Senhora de Nazaré |

Título, chave Pix e imagem do QR Code são obrigatórios. A chave Pix ganha um botão para cópia; os dados bancários e os textos complementares são opcionais. A imagem do QR Code é convertida para WebP e armazenada em `public/images/` durante `npm run sync:google`.

### Horários de missas

Use o identificador `mass-schedule` (ou `missas`) na primeira linha. A primeira linha de dados define título, descrição e observação. As linhas seguintes usam três colunas: grupo, dia e horário. O componente agrupa automaticamente as linhas com o mesmo grupo e não solicita local, pois todas as celebrações acontecem na mesma igreja.

| mass-schedule       |                                                |                                                               |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| Horários das Missas | Venha participar das celebrações eucarísticas. | Os horários podem sofrer alterações em celebrações especiais. |
| Presenciais         | Segunda a Sexta-feira                          | 6h30 e 18h                                                    |
| Presenciais         | Sábado                                         | 6h30 e 17h                                                    |
| Presenciais         | Domingo                                        | 6h30, 9h, 17h e 19h                                           |
| Transmitidas        | Segunda a Sexta-feira                          | 18h                                                           |
| Transmitidas        | Sábado                                         | 17h                                                           |
| Transmitidas        | Domingo                                        | 9h e 19h                                                      |

O resultado é uma seção com cartões por grupo, adaptada para telas menores. Não inclua uma coluna de local.

### Notícias

Crie uma pasta `noticias` dentro da pasta raiz do Drive e coloque um documento para cada notícia. O nome do documento vira o slug da notícia e o `createdTime` do Drive define a ordem, da mais nova para a mais antiga:

```text
noticias/
├── campanha-do-agasalho/
│   └── Campanha do Agasalho (Google Docs)
└── dia-do-padre/
	└── Dia do Padre (Google Docs)
```

Também é aceito colocar os documentos diretamente dentro de `noticias`:

```text
noticias/
├── Campanha do Agasalho (Google Docs)
└── Dia do Padre (Google Docs)
```

Cada documento de notícia deve conter estas tabelas:

```text
banner  -> imagem | texto alternativo | categoria
text    -> título | texto completo
image   -> imagem | título da imagem | texto alternativo
```

No block `text`, o título e o texto são opcionais separadamente: preenchendo apenas o título, somente o título aparece; preenchendo apenas o texto, somente o texto aparece; deixando ambos vazios, a tabela é ignorada. Quebras de linha, negrito e itálico aplicados no Google Docs são preservados na página da notícia. Para aplicar formatação, selecione o trecho na célula e use os controles normais do Google Docs.

No block `text`, título e texto são opcionais individualmente. Se somente um for preenchido, somente ele é renderizado; se os dois estiverem vazios, o block é ignorado. Quebras de linha, `negrito` e `itálico` aplicados no Google Docs são preservados na página. O resumo dos cards remove a formatação e mantém apenas o texto.

A imagem do `banner` é usada nos cards de `News` e `AllNews`. O título e o texto do block `text` também aparecem no card, com o texto sendo usado como resumo. Os blocks `image` aparecem somente na página individual. Imagens coladas ou URLs são convertidas para WebP durante `npm run sync:google`.

Para inserir o preview de três notícias em qualquer página, use uma tabela:

| news        |                  |                                       |           |            |
| ----------- | ---------------- | ------------------------------------- | --------- | ---------- |
| Comunicados | Últimas Notícias | Acompanhe as novidades da comunidade. | Ver todas | /noticias/ |

O componente `AllNews` mostra nove notícias por página e cria URLs como `/noticias/`, `/noticias/pagina/2/` e assim por diante. Cada notícia gera uma página individual em `/noticias/nome-do-documento/`.

### Fragmentos reutilizáveis

Crie uma pasta `fragmentos` dentro da pasta raiz do Drive. Dentro dela, crie uma pasta para cada fragmento, como `header` e `footer`, e coloque o documento correspondente dentro da pasta. Por exemplo:

```text
fragmentos/
└── header/
	└── header (Google Docs)
```

Essa estrutura gera `src/content/fragments/header/index.json`. O documento usa o mesmo contrato de blocks das páginas. O sincronizador também aceita documentos diretamente dentro de `fragmentos`, usando o nome do documento como nome do fragmento.

Na página que deve usar um fragmento, adicione uma tabela cuja primeira linha seja `fragment` e cuja primeira célula da segunda linha contenha o nome do fragmento:

| fragment |     |
| -------- | --- |
| header   |     |

A referência usa o caminho do documento dentro de `fragmentos`, sem a extensão do arquivo. Para documentos diretamente dentro da pasta, use apenas o nome, como `header`. A referência pode aparecer em qualquer posição e o mesmo fragmento pode ser usado em várias páginas.

Para o footer, crie o documento `footer` em `fragmentos/footer/` e use uma tabela com esta estrutura:

| footer          |             |                                                   |                         |                                                 |                          |
| --------------- | ----------- | ------------------------------------------------- | ----------------------- | ----------------------------------------------- | ------------------------ |
| Logo (opcional) | Santuário   | Nossa Senhora de Nazaré                           | Descrição da comunidade | © 2025 Santuário. Todos os direitos reservados. | Diocese de Belém do Pará |
| quick           | Início      | /                                                 |
| quick           | Notícias    | /noticias/                                        |
| service         | Círio de Nazaré | /cirio/                                      |
| service         | Círio Ecológico | /cirio/cirio-ecologico/                     |
| contact         | Tel         | (91) 3234-5678                                    |
| contact         | E-mail      | secretaria@santuarionazare.org.br                 |
| office          | Atendimento | Seg - Sex: 08h00 às 18h00; Sábado: 08h00 às 12h00 |

A primeira linha de dados contém, nesta ordem: logo opcional, texto pequeno da marca, nome da marca, descrição, copyright e diocese. Cole a imagem diretamente na primeira célula ou informe uma URL pública. Se a primeira célula ficar vazia, use a tabela antiga sem a coluna de logo e o footer exibirá a cruz dourada. Nas linhas seguintes, `quick` cria links rápidos, `service` cria links da seção **Círios**, `contact` cria informações de contato e `office` define o atendimento. Para redes sociais, use `contact` com o primeiro valor começando por `@`, por exemplo `@Instagram`, e a URL no terceiro campo; Instagram, YouTube, Facebook e WhatsApp aparecem com seus respectivos ícones. Em `contact` e `office`, use quebras de linha ou uma lista com marcadores no Google Docs para exibir cada informação em sua própria linha. A imagem será convertida para WebP durante `npm run sync:google`.

Em cada página, referencie o fragmento com:

| fragment |     |
| -------- | --- |
| footer   |     |

## Conectar a um Google Doc real

### Conta de serviço (GitHub Actions e sync sem navegador)

1. No Google Cloud Console, habilite **Google Docs API** e **Google Drive API**.
2. Crie uma conta de serviço (por exemplo `drive-santuario-github@poc-drive-505413.iam.gserviceaccount.com`).
3. Gere uma chave JSON e **não** commite o arquivo.
4. No Drive, compartilhe a pasta raiz (ou o documento) com o e-mail da conta de serviço, como **Leitor**.
5. No `.env`, defina `GOOGLE_SERVICE_ACCOUNT_JSON` com o conteúdo completo da chave. Cole o JSON em uma única linha e envolva-o em aspas simples; o modelo está no `.env.example`.
6. No GitHub, grave os secrets descritos na seção de GitHub Pages.

O sincronizador usa exclusivamente a conta de serviço informada por `GOOGLE_SERVICE_ACCOUNT_JSON`; não abre o navegador e não procura arquivos de credenciais locais.

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (ele não vai para o Git). Para um site de uma página, use:

```env
GOOGLE_DOCUMENT_ID="id-do-documento"
```

Para um site multipágina, crie uma pasta raiz no Google Drive. O documento diretamente dentro dela representa `/`; cada subpasta representa um segmento da URL e deve conter seu próprio documento:

```env
GOOGLE_DRIVE_FOLDER_ID="id-da-pasta-raiz"
```

Por exemplo, uma pasta `site` com um documento e as subpastas `quem-somos`, `noticias` e `agenda` gera `/`, `/quem-somos/`, `/noticias/` e `/agenda/`. Subpastas podem ser aninhadas. Os nomes são convertidos para slug e duas pastas irmãs não podem gerar o mesmo slug.

No terminal, execute:

```bash
npm run sync:google
```

O comando converte cada documento em JSON dentro de `src/content/pages/` e, em seguida, `npm run dev` ou `npm run build` gera uma rota estática para cada página.

> Nunca exponha a chave da conta de serviço no Git nem no navegador.

## Próximas evoluções

- Adicionar metadata, imagens do Drive e páginas de post.
- Criar preview e publicação via Cloudflare Pages.
