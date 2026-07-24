# Atualizar Apps Script - Passo a passo obrigatório

O erro "Document is missing" ocorre quando a **versão implantada** ainda usa código antigo. Siga TODOS os passos:

## 1. Onde está o seu Apps Script?

O script **tem que estar** dentro da planilha Base Etiquetas GRU3.

- **Certo:** Abrir a planilha → Extensões → Apps Script
- **Errado:** Ir direto em script.google.com e criar projeto novo

Se você criou um projeto em script.google.com, **delete** e crie de novo dentro da planilha.

## 2. Abrir o editor

1. Abra: https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/
2. **Extensões** → **Apps Script**

## 3. Trocar o código

1. Apague **todo** o conteúdo do `Code.gs`
2. Copie o conteúdo de `google-apps-script/Code.gs` deste projeto
3. Cole no editor
4. **Ctrl+S** para salvar

## 4. Criar nova versão da implantação

1. **Implantar** → **Gerencie implantações**
2. Clique no ícone de **lápis** (editar) na implantação existente
3. Em **Versão**, abra o menu e escolha **Nova versão**
4. Clique em **Implantar**
5. Feche a janela

## 5. Conferir se atualizou

Abra no navegador a URL de execução da sua implantação (termina em `/exec`).

Se aparecer JSON com `"status":"success"` e `"versao":"gru3-2026-nova-base"` (aba Nova Base de Dados) → o novo código está ativo.

Se ainda aparecer erro de "Document" ou "Ação não reconhecida" → a implantação não foi atualizada. Repita o passo 4.

## 6. Testar a lista IATA

Depois do teste acima:

```
.../exec?action=getIataList
```

(Se o script expuser só `doGet`, teste abrindo diretamente a URL `/exec` — a resposta deve incluir a lista.)

Resposta esperada: `{"status":"success","data":["MG-W-H001","RJ-W-H001",...]}`
