# Drive CMS POC

Prova de conceito de um site Astro que converte tabelas de um Google Doc em blocks e gera HTML estático.

## Executar localmente

```bash
npm install
npm run sync:google
npm run dev
```

Execute `npm test` para validar o parser e as regras da agenda.

## Testar no GitHub Pages

O projeto está configurado para publicação como GitHub Pages em:

```text
https://gotomarcelo.github.io/site-santuario/
```

O workflow em `.github/workflows/deploy.yml` executa automaticamente quando houver push na branch `main`. Ele instala as dependências, sincroniza o Drive com a conta de serviço, executa o build e publica a pasta `dist`.

Secrets necessários em **Settings → Secrets and variables → Actions**:

| Secret                        | Conteúdo                                     |
| ----------------------------- | -------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo da chave da conta de serviço   |
| `GOOGLE_DRIVE_FOLDER_ID`      | ID da pasta raiz no Drive (site multipágina) |

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

### Linhas de orientação nas tabelas

Para adicionar cabeçalhos de coluna, lembretes ou instruções sem que apareçam no site, faça a primeira célula da linha começar com `#`. Essas linhas são ignoradas pelo sincronizador em todos os blocks. As demais células podem descrever as colunas normalmente.

Por exemplo, em um `card-event`, use `# data inicial` na primeira célula da linha de cabeçalho. Um valor como `#teste` em outra coluna continua sendo lido normalmente, pois somente a primeira célula define se a linha é uma orientação.

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

### Cabeçalho de seção

Use `section-header` (ou `section-title`) antes de qualquer componente que precise de texto pequeno, título e descrição. Ele é opcional e pode ser usado com `events-list`, `donation`, `mass-schedule`, `upcoming-events`, `news` e `all-news` — ou com qualquer outro block que venha depois dele.

| section-header           |                  |                                                     |
| ------------------------ | ---------------- | --------------------------------------------------- |
| texto pequeno (opcional) | título           | descrição (opcional)                                |
| Agenda                   | Próximos Eventos | Confira os momentos de fé e encontro da comunidade. |

O título é obrigatório. Para não exibir cabeçalho em uma seção, basta não adicionar essa tabela ao documento.

### Header

O header global é carregado automaticamente em todas as páginas a partir do fragmento `header`; não adicione uma tabela `fragment` para ele em cada documento. A primeira linha de dados configura a marca e o CTA; as linhas seguintes criam os links, dropdowns e submenus do menu:

| header            |               |                          |                       |            |
| ----------------- | ------------- | ------------------------ | --------------------- | ---------- |
| # logo (opcional) | texto pequeno | nome da marca            | texto do CTA          | URL do CTA |
| Cole o logo aqui  | Santuário     | Nossa Senhora de Nazaré  | Contribuir            | #dizimo    |
| # tipo            | rótulo/pai    | URL ou rótulo do submenu | URL do submenu        |            |
| link              | Início        | /                        |                       |            |
| dropdown          | A Paróquia    | /a-paroquia/             |                       |            |
| submenu           | A Paróquia    | História                 | /a-paroquia/historia/ |            |
| submenu           | A Paróquia    | Equipe                   | /a-paroquia/equipe/   |            |
| link              | Notícias      | /noticias/               |                       |            |

Na primeira célula da configuração, cole a imagem do logo diretamente no Google Docs ou informe uma URL pública. As células seguintes são o texto pequeno da marca, o nome da marca, o CTA e a URL do CTA. Quando uma imagem é colada, o sincronizador lê o `inlineObject` da Google Docs API e usa sua imagem no header. Se a primeira célula ficar vazia, o header usa a cruz de fallback. As linhas que começam com `#` são apenas cabeçalhos de orientação e não aparecem no site.

Durante `npm run sync:google`, imagens remotas do header são baixadas, convertidas para WebP com qualidade 85 e salvas em `public/images/`. O JSON passa a apontar para a URL local `/images/...webp`, evitando a expiração das URLs temporárias fornecidas pelo Google Docs. URLs de imagens inseridas nos próximos componentes podem usar a mesma etapa de materialização em `scripts/image-assets.ts`.

Os arquivos recebem um nome calculado a partir do conteúdo da imagem, não da URL temporária do Google. Assim, a mesma imagem usada em mais de um local gera apenas um WebP e uma sincronização sem mudanças mantém as mesmas URLs. Ao fim da sincronização, WebPs gerados que não são mais referenciados são removidos; imagens com nomes próprios em `public/images/` são preservadas.

O menu desktop aparece em telas largas e o menu mobile é aberto pelo botão no canto direito. Os links e o CTA são definidos no Google Docs; o comportamento responsivo pertence ao componente Astro.

#### Tipos de item do menu

- `link`: cria um link simples; informe `rótulo` e `URL` nas três primeiras colunas.
- `dropdown`: cria o item pai; informe o `rótulo` e sua `URL` nas três primeiras colunas.
- `submenu`: adiciona um item ao dropdown; informe o rótulo do dropdown pai na segunda coluna, o texto do submenu na terceira e sua URL na quarta.

Cada `submenu` precisa vir depois do respectivo `dropdown`. No desktop, o texto do dropdown continua sendo um link e a seta ao lado abre os subitens. No mobile, o grupo é expansível e inclui tanto o link principal como seus subitens.

As tabelas antigas com duas colunas (`rótulo | URL`) continuam criando links simples para manter compatibilidade com conteúdos já existentes.

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

### Banner de texto

O block `banner-text` cria uma abertura decorativa para páginas especiais, como o Círio. Sua tabela usa uma linha de dados sem imagem:

| banner-text       |                 |          |                  |                           |                            |
| ----------------- | --------------- | -------- | ---------------- | ------------------------- | -------------------------- |
| texto pequeno     | título          | destaque | subtítulo        | período                   | imagem de fundo (opcional) |
| Programação Geral | Círio de Nazaré | 2026     | Santuário de Luz | 2 a 18 de Outubro de 2026 | Cole a imagem aqui         |

O título é obrigatório; os demais campos são opcionais. Quando houver imagem na última célula, ela se torna o fundo do banner com overlay escuro de 70% e os arcos decorativos não são exibidos. Sem imagem, o visual atual é mantido. O block `banner` continua exclusivo para a imagem de capa dos documentos de notícias (`imagem | texto alternativo | categoria`).

### Card de evento

`card-event` (também aceita `event-card`) não cadastra eventos. Ele seleciona eventos já cadastrados nos `events-list` pelas categorias e os apresenta em um carrossel finito: três cards lado a lado em telas largas, dois em tablets e um em telas estreitas. As setas navegam entre grupos e os indicadores permitem ir diretamente a um grupo. Os cards têm altura consistente e as imagens usam uma altura fixa. A primeira linha de dados contém o identificador opcional, uma ou mais categorias, um título opcional e um texto introdutório opcional:

| card-event        |                                    |                      |                                    |
| ----------------- | ---------------------------------- | -------------------- | ---------------------------------- |
| # id (opcional)   | categorias (separadas por vírgula) | título (opcional)    | texto (opcional)                   |
| programacao-cirio | Círio, Missas                      | Programação do Círio | Celebrações e atividades do Círio. |

O bloco exibe eventos que correspondam a pelo menos uma das categorias selecionadas. Um evento selecionado por mais de uma categoria aparece apenas uma vez. Para cadastrar ou alterar os dados do evento, edite a linha correspondente no documento `events-list` do mês; não repita a programação no `card-event`.

As tabelas antigas de `card-event` que ainda contêm linhas de programação precisam ser migradas: mova cada evento para o `events-list` do mês e substitua a tabela antiga por uma configuração de categorias. O sincronizador aponta essas tabelas antigas com uma mensagem de erro para evitar perder a programação silenciosamente.

### Agenda de eventos

A agenda usa três blocks relacionados:

- `upcoming-events` mostra os três próximos eventos cadastrados em todos os `events-list`.
- `events-list` (também aceita `events`) apresenta a agenda completa, agrupada por mês.
- `card-event` apresenta em coluna os mesmos eventos filtrados pelas categorias selecionadas.

Para mostrar os próximos eventos, inclua esta tabela, por exemplo, no documento da página inicial:

| upcoming-events          |                         |             |                       |
| ------------------------ | ----------------------- | ----------- | --------------------- |
| texto do link (opcional) | URL da lista (opcional) | id opcional | categorias (opcional) |
| Ver todos                | /eventos/               | eventos     | Missas, Círio         |

Categorias são opcionais e podem ser separadas por vírgulas, ponto e vírgula, barra vertical ou linhas. Se o campo ficar vazio, o bloco considera eventos de todas as categorias. A tabela não é obrigatória; sem ela, a seção simplesmente não aparece naquela página. Para incluir texto pequeno, título ou descrição antes dela, use uma tabela `section-header` imediatamente antes.

Na pasta raiz do Drive, mantenha a pasta `Eventos` para a agenda. Um Google Doc diretamente dentro dela pode definir a página `/eventos/`; organize os documentos que cadastram eventos por ano e mês:

```text
Eventos/
├── 2026/
│   ├── outubro/
│   │   └── outubro 2026 (Google Docs)
│   └── novembro/
│       └── novembro 2026 (Google Docs)
└── 2027/
	└── janeiro/
		└── janeiro 2027 (Google Docs)
```

O Google Doc diretamente dentro de `Eventos` é o documento de apresentação da rota `/eventos/`: nele você define banner, cabeçalhos e a posição do block `events-list`. Essa tabela funciona como espaço de renderização; mantenha o cabeçalho e a linha de ID (`eventos`), mas não coloque linhas de eventos nela. O block lê automaticamente a coleção compartilhada formada pelos documentos mensais. Assim, o Doc da página não cadastra nem duplica eventos.

Cada documento mensal contém seu próprio `events-list`, e é nele que os eventos são cadastrados. As pastas de ano/mês são usadas apenas para organizar e sincronizar o conteúdo, não geram páginas no site. Header e footer da página `/eventos/` continuam sendo incluídos automaticamente. Em cada tabela, a linha de orientação iniciada por `#` é ignorada; depois dela, a primeira linha de dados é o identificador opcional da lista e cada linha seguinte cadastra um evento:

| events-list        |                     |                     |                                  |                                                  |                                   |                   |              |                              |
| ------------------ | ------------------- | ------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------- | ----------------- | ------------ | ---------------------------- |
| id opcional        |                     |                     |                                  |                                                  |                                   |                   |              |                              |
| eventos            |                     |                     |                                  |                                                  |                                   |                   |              |                              |
| imagem             | texto alternativo   | categoria(s)        | título do evento                 | descrição                                        | local                             | data (AAAA-MM-DD) | hora (HH:MM) | hora final (opcional, HH:MM) |
| Cole a imagem aqui | Fiéis em celebração | Festividade, Missas | Festa de Nossa Senhora de Nazaré | Celebração solene com procissão e missa festiva. | Santuário Nossa Senhora de Nazaré | 2026-10-14        | 19:00        | 21:00                        |

Imagem, título, descrição, local, data e hora inicial são obrigatórios. Use datas no formato `AAAA-MM-DD` e horários no formato `HH:MM`. Hora final, categoria e texto alternativo são opcionais. Quando informada, a hora final aparece no card e define o fim do evento no arquivo `.ics`; se ficar vazia, o calendário mantém a duração padrão de uma hora. Para associar várias categorias, separe-as por vírgulas, ponto e vírgula, barra vertical ou linhas; por exemplo, `Missas, Círio`. Para incluir texto pequeno, título ou descrição antes da lista, use uma tabela `section-header` imediatamente antes. O botão **Adicionar ao calendário** gera um arquivo `.ics`.

Quando `npm run sync:google` é executado, os `events-list` da pasta `Eventos` e das demais páginas/fragmentos são reunidos em `src/content/events.json`, a fonte compartilhada de `upcoming-events`, `events-list` e `card-event`. Evite cadastrar o mesmo evento mais de uma vez. A agenda ordena por data e, no mesmo dia, por horário; o horário não afeta a visibilidade: eventos de hoje permanecem durante todo o dia. A lista começa mostrando eventos do mês atual e do próximo; **Mostrar mais eventos** libera mais dois meses por clique e desaparece quando não houver eventos futuros restantes.

### Citação

Use `quote` (ou `citation` / `citacao`) para destacar uma frase. A primeira célula é o texto, que aceita negrito, itálico e quebras de linha; a segunda é a autoria opcional.

| quote                                     |                        |
| ----------------------------------------- | ---------------------- |
| O sacerdote é o amor do coração de Jesus. | São João Maria Vianney |

### Página 404

O layout da página de erro é fixo, mas seus textos e botão podem ser alterados pelo Google Docs. Na pasta `fragmentos`, crie a pasta `404` e coloque dentro dela um Google Doc (o nome do documento é livre). Use uma tabela `not-found` com uma linha de dados:

| not-found             |                                      |                                                                   |                      |               |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------- | -------------------- | ------------- |
| texto pequeno         | título                               | descrição                                                         | texto do botão       | link do botão |
| Página não encontrada | Este caminho não nos levou até aqui. | Talvez o endereço esteja incorreto ou a página tenha sido movida. | Voltar para o início | /             |

Depois de salvar o documento, execute `npm run sync:google` (ou publique o repositório) para atualizar a página. Se o fragmento ainda não existir, o site usa os textos padrão acima.

### Carrossel de banners

Use `banner-carousel` (ou `carousel`) para criar uma faixa de destaques com uma linha por slide. A categoria é opcional: deixe a terceira célula vazia quando não quiser exibi-la. O carrossel avança automaticamente a cada cinco segundos, pausa ao passar o mouse ou navegar pelo teclado e também oferece setas e indicadores.

| banner-carousel |                   |           |        |      |
| --------------- | ----------------- | --------- | ------ | ---- |
| imagem          | texto alternativo | categoria | título | link |

Exemplo:

| banner-carousel  |                           |             |                                  |           |
| ---------------- | ------------------------- | ----------- | -------------------------------- | --------- |
| imagem do evento | Pessoas em uma celebração | Festividade | Festa de Nossa Senhora de Nazaré | /eventos/ |
| imagem da igreja | Fachada do Santuário      |             | Conheça os horários das missas   | /missas/  |

Cada slide precisa de imagem e título. A imagem pode ser colada na primeira célula ou informada como URL e é materializada em WebP durante a sincronização.

### Doações e Pix

Use uma tabela `donation` (também são aceitos `doacao` e `doação`). A primeira linha de dados configura a contribuição; as linhas seguintes são os dados bancários. O QR Code deve ser **colado ou inserido como imagem na segunda célula** da primeira linha de dados, e não como texto ou link. Para inserir texto pequeno, título ou descrição antes da doação, use `section-header` imediatamente antes.

| donation           |                                   |                          |                                       |                                                               |
| ------------------ | --------------------------------- | ------------------------ | ------------------------------------- | ------------------------------------------------------------- |
| chave Pix          | imagem do QR Code                 | texto alternativo        | instrução do QR Code                  | observação presencial                                         |
| 00.000.000/0001-00 | Cole o QR Code aqui               | QR Code Pix do Santuário | Aponte a câmera para o QR Code acima. | Também aceitamos contribuições presencialmente na secretaria. |
| Banco              | Banco do Brasil                   |
| Agência            | 1234-5                            |
| Conta Corrente     | 00001-0                           |
| Favorecido         | Santuário Nossa Senhora de Nazaré |

Chave Pix e imagem do QR Code são obrigatórios. A chave Pix ganha um botão para cópia; os dados bancários e os textos complementares são opcionais. A imagem do QR Code é convertida para WebP e armazenada em `public/images/` durante `npm run sync:google`.

### Horários de missas

Use o identificador `mass-schedule` (ou `missas`) na primeira linha. Cada linha de dados usa três colunas: grupo, dia e horário. O componente agrupa automaticamente as linhas com o mesmo grupo e não solicita local, pois todas as celebrações acontecem na mesma igreja. Para inserir texto pequeno, título ou descrição antes dos horários, use `section-header` imediatamente antes.

| mass-schedule |                       |                     |
| ------------- | --------------------- | ------------------- |
| grupo         | dia                   | horário             |
| Presenciais   | Segunda a Sexta-feira | 6h30 e 18h          |
| Presenciais   | Sábado                | 6h30 e 17h          |
| Presenciais   | Domingo               | 6h30, 9h, 17h e 19h |
| Transmitidas  | Segunda a Sexta-feira | 18h                 |
| Transmitidas  | Sábado                | 17h                 |
| Transmitidas  | Domingo               | 9h e 19h            |

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
title   -> título
text    -> texto completo
image   -> imagem | título da imagem | texto alternativo
```

Use `title` para o título principal da notícia e `text` para cada trecho de conteúdo. Ambos têm uma única célula de dados; `title` é obrigatório para que a notícia apareça nos cards. Quebras de linha, negrito e itálico aplicados no Google Docs são preservados na página da notícia. Para aplicar formatação, selecione o trecho na célula e use os controles normais do Google Docs. O resumo dos cards usa o primeiro block `text`.

| title                                               |     |
| --------------------------------------------------- | --- |
| título da notícia                                   |
| Festa de Nossa Senhora de Nazaré reúne a comunidade |

| text                                                     |     |
| -------------------------------------------------------- | --- |
| texto completo                                           |
| A comunidade se reuniu para celebrar este momento de fé. |

A imagem do `banner` é usada nos cards de `News` e `AllNews`. O título do block `title` e o primeiro `text` também aparecem no card, com o texto sendo usado como resumo. Os blocks `image` aparecem somente na página individual. Imagens coladas ou URLs são convertidas para WebP durante `npm run sync:google`.

Para inserir o preview de três notícias em qualquer página, use uma tabela:

| news          |             |             |
| ------------- | ----------- | ----------- |
| texto do link | URL do link | id opcional |
| Ver todas     | /noticias/  | noticias    |

Use `section-header` imediatamente antes de `news` ou `all-news` quando quiser exibir texto pequeno, título e descrição. O componente `AllNews` mostra nove notícias por página e cria URLs como `/noticias/`, `/noticias/pagina/2/` e assim por diante. Cada notícia gera uma página individual em `/noticias/nome-do-documento/`.

Para inserir a listagem paginada de todas as notícias, use uma tabela `all-news` com o identificador opcional da seção:

| all-news    |     |
| ----------- | --- |
| id opcional |
| noticias    |

Coloque um `section-header` imediatamente antes se quiser um título e uma descrição na página. O componente lê automaticamente as notícias da pasta `noticias` e exibe até nove por página. Sem preencher o campo, o id padrão é `noticias`.

### Fragmentos reutilizáveis

Crie uma pasta `fragmentos` dentro da pasta raiz do Drive. Dentro dela, crie pastas `header` e `footer` com os documentos globais correspondentes; o layout inclui esses dois fragmentos automaticamente em todas as páginas. Não é necessário inserir tabelas `fragment` de header ou footer nos documentos das páginas. Outros fragmentos reutilizáveis continuam podendo ser referenciados por uma tabela `fragment`.

```text
fragmentos/
└── header/
	└── header (Google Docs)
```

Essa estrutura gera `src/content/fragments/header/index.json`. O documento usa o mesmo contrato de blocks das páginas. O sincronizador também aceita documentos diretamente dentro de `fragmentos`, usando o nome do documento como nome do fragmento.

Para usar outro fragmento em uma página, adicione uma tabela cuja primeira linha seja `fragment` e cuja primeira célula da segunda linha contenha o nome do fragmento:

| fragment |     |
| -------- | --- |
| header   |     |

A referência usa o caminho do documento dentro de `fragmentos`, sem a extensão do arquivo. Para documentos diretamente dentro da pasta, use apenas o nome. A referência pode aparecer em qualquer posição e o mesmo fragmento pode ser usado em várias páginas.

Para o footer, crie o documento `footer` em `fragmentos/footer/` e use uma tabela com esta estrutura:

| footer            |                 |                                                   |                         |                                                 |                          |
| ----------------- | --------------- | ------------------------------------------------- | ----------------------- | ----------------------------------------------- | ------------------------ |
| # logo (opcional) | texto pequeno   | nome da marca                                     | descrição               | copyright                                       | diocese                  |
| Cole o logo aqui  | Santuário       | Nossa Senhora de Nazaré                           | Descrição da comunidade | © 2025 Santuário. Todos os direitos reservados. | Diocese de Belém do Pará |
| # tipo            | rótulo          | URL ou informação                                 |                         |                                                 |                          |
| quick             | Início          | /                                                 |                         |                                                 |                          |
| quick             | Notícias        | /noticias/                                        |                         |                                                 |                          |
| service           | Círio de Nazaré | /cirio/                                           |                         |                                                 |                          |
| service           | Círio Ecológico | /cirio/cirio-ecologico/                           |                         |                                                 |                          |
| contact           | Tel             | (91) 3234-5678                                    |                         |                                                 |                          |
| contact           | E-mail          | secretaria@santuarionazare.org.br                 |                         |                                                 |                          |
| contact           | @Instagram      | https://www.instagram.com/santuariodenazareslz/   |                         |                                                 |                          |
| office            | Atendimento     | Seg - Sex: 08h00 às 18h00; Sábado: 08h00 às 12h00 |                         |                                                 |                          |

A linha de orientação iniciada por `#` mostra a função de cada coluna e não aparece no site. Na linha da marca, informe nesta ordem: logo opcional, texto pequeno, nome da marca, descrição, copyright e diocese. Cole a imagem diretamente na primeira célula ou informe uma URL pública. Se não for usar logo, remova a coluna de logo e use o formato antigo de cinco colunas: texto pequeno, nome da marca, descrição, copyright e diocese; assim o footer exibe a cruz dourada. Nas linhas seguintes, `quick` cria links rápidos, `service` cria links da seção **Círios**, `contact` cria informações de contato e `office` define o atendimento. Para redes sociais, use `contact` com o rótulo começando por `@`, por exemplo `@Instagram`, e informe a URL na terceira coluna; Instagram, YouTube, Facebook e WhatsApp aparecem com seus respectivos ícones. Em `contact` e `office`, use quebras de linha ou uma lista com marcadores no Google Docs para exibir cada informação em sua própria linha. A imagem será convertida para WebP durante `npm run sync:google`.

O fragmento `footer` segue o mesmo princípio do `header`: basta manter seu documento em `fragmentos/footer/`; ele será exibido automaticamente em todas as páginas.

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
