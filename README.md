# ZERO E UM Panorama Studio

Aplicativo web que permite criar, configurar e compartilhar passeios virtuais baseados em panoramas renderizados, seguindo a identidade visual do escritório ZERO E UM arquitetos.

## Requisitos atendidos

- Upload da planta baixa e de imagens panorâmicas em um novo projeto.
- Posicionamento das câmeras diretamente sobre a planta com pré-visualização 360º.
- Miniaturas clicáveis dos panoramas para orientar o posicionamento e garantir que todas as câmeras sejam definidas antes de liberar os hotspots.
- Configuração de hotspots entre panoramas com visualização esférica interativa.
- Geração automática de URLs públicas para o projeto completo (`/projects/:id`) e para cada panorama individual (`/panoramas/:projectId/:panoramaId`).
- Página dedicada a cada panorama com QR Code em SVG para download.
- Layout e cores alinhados ao manual de marca fornecido.
- Pode ser executado em serviços gratuitos como Vercel, Render ou Railway (aplicação Node.js sem dependências externas).

## Estrutura do projeto
teste
```
.
├── data/
│   └── projects.json        # banco de dados em JSON utilizado pelo servidor
├── public/
│   ├── app.js               # fluxo de criação e publicação dos tours
│   ├── project.js           # visualização pública do tour
│   ├── panorama.js          # visualização individual com QR code
│   ├── lib/qrcode.js        # gerador de QR Code em SVG (MIT)
│   ├── index.html           # tela principal de criação
│   ├── project.html         # tela pública do tour
│   ├── panorama.html        # tela pública do panorama
│   └── styles.css           # estilos com identidade ZERO E UM
├── server.js                # servidor HTTP que expõe API REST simples
├── package.json             # scripts npm (start/dev)
└── README.md
```

## Executando localmente

```bash
npm install # não há dependências, mas garante atualização de lockfile se necessário
npm run dev
```

O servidor será iniciado em `http://localhost:3000`.

## API

- `GET /api/projects` — lista todos os projetos.
- `POST /api/projects` — cria um novo projeto. Payload esperado:
  ```json
  {
    "name": "Residência Horizonte",
    "description": "opcional",
    "floorPlan": { "filename": "planta.png", "dataUrl": "data:image/png;base64,..." },
    "panoramas": [
      {
        "id": "panorama-123",
        "name": "Sala",
        "filename": "sala.png",
        "dataUrl": "data:image/png;base64,...",
        "floorPosition": { "x": 50, "y": 32 },
        "hotspots": [
          {
            "id": "hotspot-1",
            "x": 64,
            "y": 42,
            "yaw": 1.05,
            "pitch": -0.18,
            "targetPanoramaId": "panorama-456"
          }
        ]
      }
    ]
  }
  ```
- `GET /api/projects/:id` — retorna um projeto.
- `PUT /api/projects/:id` — atualiza um projeto existente.
- `GET /api/projects/:id/panoramas/:panoramaId` — retorna um panorama específico com dados do projeto.

## Deploy

1. Faça o fork do repositório em uma conta GitHub.
2. Crie um novo projeto em Vercel / Render apontando para o repositório.
3. Defina o comando de build como `npm install` (opcional) e o comando de execução como `npm start`.
4. Configure a variável de ambiente `PORT` (Render) se necessário.
5. Habilite persistência do arquivo `data/projects.json` ou substitua por um storage dedicado em produção.

## Enviando para o GitHub

1. Instale o [Git](https://git-scm.com/) e faça login com `gh auth login` ou configure suas credenciais HTTPS/SSH.
2. Dentro da pasta do projeto, inicialize o repositório (caso ainda não exista) com `git init` e adicione o remoto: `git remote add origin git@github.com:seu-usuario/seu-repo.git` (ou use a URL HTTPS).
3. Confirme o estado dos arquivos com `git status`, depois adicione tudo o que deseja versionar: `git add .`.
4. Faça um commit descrevendo as alterações: `git commit -m "chore: primeira versão do tour"`.
5. Defina o nome da branch principal, se necessário, usando `git branch -M main`.
6. Envie o conteúdo ao GitHub com `git push -u origin main`. Em pushes seguintes, use apenas `git push`.
7. No GitHub, verifique se os arquivos foram enviados corretamente e, se for trabalhar em equipe, abra pull requests a partir das branches de feature.

## Identidade visual

- Fonte principal: `N27` (fallback para `Exo`).
- Fonte auxiliar: `Exo` importada do Google Fonts.
- Paleta de cores aplicada conforme manual (azul, índigo, verde neon, lilás e teal).
- Marca “0E1 arquitetos” presente em todas as páginas, com destaque para o nome do projeto.

## Licença

Código licenciado sob MIT. O gerador de QR code é derivado de QRCode for JavaScript (Kazuhiko Arase), também MIT.
