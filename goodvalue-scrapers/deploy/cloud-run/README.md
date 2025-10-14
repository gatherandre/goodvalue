# Deploy GoodValue Scrapers to Google Cloud Run

Requisitos locais:
- `gcloud` CLI autenticado (`gcloud login`, `gcloud config set project <SEU_PROJETO>`)
- Docker (ou Cloud Build) habilitado (vamos usar Cloud Build aqui).

## Passos

1. 
```bash
gcloud builds submit \
  --tag gcr.io/$GOOGLE_CLOUD_PROJECT/goodvalue-scrapers
```

2. Deploy:
```bash
gcloud run deploy goodvalue-scrapers \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/goodvalue-scrapers \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 4000 \
  --memory 1Gi
```

Se precisar alterar a porta, ajuste `PORT` neste diretório (ver `Dockerfile`).
```
