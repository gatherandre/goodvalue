# GoodValue

Monorepo with:
- goodvalue-app (Expo React Native)
- goodvalue-scrapers (Node scrapers with Cheerio & Puppeteer)
- docker-compose.yml to run both together

## Pré-requisitos
- Node 20 (Volta ou nvm recomendados)
- npm 10+

## Instalação

```bash
npm install --prefix goodvalue-scrapers
npm install --prefix goodvalue-app
```

## Executando a API

```bash
cd goodvalue-scrapers
npm run build
npm start
```

A API ficará disponível em `http://localhost:4000` com as rotas:
- `GET /health`
- `GET /suggestions`
- `GET /marketplaces`
- `GET /search?q=<produto>`

## Executando o aplicativo Expo

Em outro terminal:

```bash
cd goodvalue-app
export EXPO_PUBLIC_API_URL=http://localhost:4000
npm run start
```

Escaneie o QR code com o aplicativo Expo Go ou rode `npm run web` para abrir no navegador.

> Se for compilar Android/iOS nativos, rode `npx expo prebuild` após alterar `app.config.ts` para manter as pastas `android/` e `ios/` sincronizadas.
