# Como encontrar o link correto do Apps Script

## Passo 1: Abrir o Apps Script CERTO

O script **precisa** ser criado dentro da planilha Base Etiquetas GRU3:

1. Abra: https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/
2. Menu **Extensões** → **Apps Script**

Se você foi em script.google.com e criou um projeto novo, **esse é o projeto errado**. Use o que abre pela planilha.

## Passo 2: Ver qual URL está implantada

1. No editor do Apps Script, clique em **Implantar**
2. Clique em **Gerencie implantações**
3. Na implantação "Aplicativo da Web", veja a **URL**
4. O link correto é aquele que termina em `/exec`

Exemplo: `https://script.google.com/macros/s/XXXXX...XXXXX/exec`

## Passo 3: Copiar essa URL

- Essa é a **URL correta** do seu script
- Se for **diferente** da que está no `.env.local` / Vercel, atualize:

### No .env.local (projeto local)
```
APP_SCRIPT_URL=COLE_A_URL_QUE_VOCE_COPIOU/exec
```

### Na Vercel
1. vercel.com → seu projeto **Etiquta_GRU3**
2. **Settings** → **Environment Variables**
3. Edite `APP_SCRIPT_URL` e coloque a URL correta
4. Faça um novo deploy (**Deployments** → **Redeploy**)

## Passo 4: Atualizar o código e implantar

1. No Apps Script, apague todo o `Code.gs`
2. Cole o conteúdo de `google-apps-script/Code.gs` deste projeto
3. Salve (Ctrl+S)
4. **Implantar** → **Gerencie implantações** → Editar (lápis)
5. Em **Versão** → **Nova versão**
6. **Implantar**

## Passo 5: Testar

Abra a URL que você copiou no navegador (a que termina em /exec).

- Se aparecer `{"status":"success","data":[...],"versao":"gru3-2026"}` → está correto
- Se aparecer `{"status":"error","message":"Ação não reconhecida"}` → ainda é o script antigo ou o link está errado
