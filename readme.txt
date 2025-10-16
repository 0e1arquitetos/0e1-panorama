ZERO E UM Panorama Studio
==========================

Aplicativo web em Next.js para compor passeios virtuais utilizando a identidade visual ZERO E UM.

## Funcionalidades

- Cadastro de projetos com nome, descrição e planta baixa em PNG.
- Gerenciamento de panoramas com upload de imagens, posicionamento na planta e configuração de hotspots.
- Publicação com geração de URL exclusiva e QR Code em SVG para cada cena.
- Visualização pública com planta navegável e galeria de cenas.

## Desenvolvimento

### Requisitos

- Node.js 18+
- npm

### Scripts

- `npm install` — instala dependências.
- `npm run dev` — inicia o ambiente de desenvolvimento.
- `npm run build` — cria a build de produção.
- `npm start` — inicia o servidor após a build.

## Deploy

O projeto é compatível com plataformas serverless (ex: Vercel). Defina a variável `NEXT_PUBLIC_SITE_URL` para garantir a geração correta dos QR Codes compartilháveis.
