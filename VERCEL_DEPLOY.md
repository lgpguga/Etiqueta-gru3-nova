# Deploy Etiqueta GRU3 — GitHub + Vercel

## 1. Repositório no GitHub

Repositório: [github.com/lgpguga/Etiquta_GRU3](https://github.com/lgpguga/Etiquta_GRU3)

Se ainda estiver vazio, envie o código desta pasta.

## 2. Enviar o projeto para o GitHub

```powershell
cd "C:\Users\Anjun\Documents\Etiqueta GRU3 - SP-RR-002"

git init
git add .
git commit -m "Sistema Etiqueta GRU3 SP-RR-002 - primeira versão"
git remote add origin https://github.com/lgpguga/Etiquta_GRU3.git
git branch -M main
git push -u origin main
```

## 3. Criar o projeto na Vercel (dashboard)

**Link direto (importar o repositório):**  
[Importar Etiquta_GRU3 na Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flgpguga%2FEtiquta_GRU3&branch=main)

1. Faça login na Vercel (se pedir, **Continue with GitHub** e autorize o acesso aos repositórios).
2. Na tela de importação, confira:
   - **Framework Preset:** Next.js (detectado automaticamente)
   - **Root Directory:** `./` (raiz do repositório)
3. Expanda **Environment Variables** e adicione:
   - **Name:** `APP_SCRIPT_URL`
   - **Value:** a URL `/exec` do Google Apps Script implantado na planilha Base Etiquetas GRU3 (sem isso o site não carrega a lista IATA).
4. Clique em **Deploy**.

Se o link acima não abrir o repositório certo, use **Add New** → **Project** → procure **Etiquta_GRU3** na lista do GitHub.

### Alternativa: CLI (no seu PC)

Se `vercel whoami` der erro de token inválido, rode `npx vercel login` no terminal (abre o navegador) e tente de novo. Depois, na pasta do projeto:

```powershell
cd "C:\Users\Anjun\Documents\Etiqueta GRU3 - SP-RR-002"
npx vercel link    # selecione o time e crie o projeto
npx vercel env add APP_SCRIPT_URL production   # cole a URL /exec quando pedir
npx vercel --prod
```

## 4. Deploy automático

Após a configuração, cada `git push` no branch `main` gera um novo deploy automaticamente na Vercel.

## Domínio

O site ficará em algo como: `https://etiquta-gru3.vercel.app` (ou o nome que você definir no projeto Vercel).
