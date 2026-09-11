# Sistema de chave (licença) — Batalha de Pipa

Duas partes:

- **license-server/** → o servidor que guarda as chaves. Você sobe ele na
  internet (grátis, no Render) e é nele que você gera/desativa chaves pelo
  painel `/admin.html`.
- **app/** → seu programa (o que vira o executável). Ele agora pede uma
  chave antes de liberar a tela de configurar/conectar no TikTok.

## Passo 1 — Subir o license-server no Render (grátis)

1. Crie uma conta em https://render.com
2. Suba a pasta `license-server/` num repositório do GitHub (ou use o
   "Deploy from a Git repo" do Render).
3. No Render, crie um **Web Service** apontando pra esse repositório.
   - Build command: `npm install`
   - Start command: `npm start`
4. Em **Environment**, adicione a variável:
   - `ADMIN_SECRET` = uma senha forte só sua (é ela que protege quem pode
     gerar/desativar chave).
5. Depois do deploy, você vai ter uma URL tipo:
   `https://seu-app-de-licenca.onrender.com`
6. Acesse `https://seu-app-de-licenca.onrender.com/admin.html`, coloque a
   senha do `ADMIN_SECRET` e pronto: dali você gera chaves de 24h, 1 semana,
   1 mês (ou horas personalizadas) e desativa quando quiser.

> Atenção: no plano free do Render, o disco onde as chaves ficam salvas
> (`keys.json`) pode ser resetado quando o serviço reinicia/redeploy. Pra
> uso sério, mais pra frente dá pra trocar esse arquivo por um banco de
> dados de verdade (ex: um Postgres free do próprio Render) — posso te
> ajudar com isso quando for a hora.

## Passo 2 — Configurar o app pra falar com o license-server

Dentro de `app/`, antes de gerar o executável, defina a variável de
ambiente `LICENSE_SERVER_URL` com a URL do Passo 1, por exemplo:

```
LICENSE_SERVER_URL=https://seu-app-de-licenca.onrender.com
```

(Isso já está preparado no `server.js` — ele lê `process.env.LICENSE_SERVER_URL`.)

## Passo 3 — Como funciona pro usuário final

1. Ele abre o programa (o executável).
2. Aparece a tela "🔒 Área bloqueada" pedindo a chave.
3. Ele digita a chave que você gerou e manda.
4. O programa consulta o `license-server` pra confirmar que a chave está
   ativa e dentro do prazo — se estiver, libera a tela de configurar/conectar
   no TikTok.
5. A chave usada fica salva localmente (`license-data.json`), então ele não
   precisa digitar de novo toda vez que abrir — mas o programa **reconsulta
   o servidor a cada 2 minutos**. Se você desativar a chave dele no seu
   painel, em no máximo 2 minutos a tela dele volta a pedir chave sozinha
   (e a live é desconectada automaticamente).

## Passo 4 — Gerar o executável

Isso aqui eu não montei ainda — depende de qual ferramenta você prefere
(`pkg`, `nexe`, ou empacotar como Electron). Me avisa quando chegar nessa
parte que eu te ajudo a configurar certinho, já considerando essas
variáveis de ambiente.
