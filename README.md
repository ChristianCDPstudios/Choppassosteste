# CHOPPASSOS

Sistema web de pedidos por mesa do CHOPPASSOS, com chopp, bebidas, doses, aperitivos e porções. O destaque da casa é chopp e panceta.

## Configuração do Supabase

Os pedidos são compartilhados entre dispositivos pelo Supabase. Antes de usar o sistema:

1. Crie um projeto no Supabase e execute o conteúdo de `supabase-schema.sql` no SQL Editor.
2. Em **Authentication → Providers**, mantenha desabilitado o cadastro público de usuários. Em **Authentication → Users**, crie uma conta para cada pessoa autorizada a usar a cozinha.
3. Copie a URL do projeto e a chave `anon`/publishable em **Project Settings → API** para `url` e `anonKey` em `supabase-config.js`. Essa chave pública pode estar no navegador; nunca coloque a chave `service_role` nesse arquivo.
4. Hospede os arquivos do site em um endereço HTTPS. Abra o endereço nos celulares para fazer pedidos; abra o mesmo endereço com `?view=kitchen` na tela da cozinha e entre com a conta da equipe.

O painel atualiza automaticamente a cada 5 segundos. O banco permite que visitantes criem pedidos novos, mas só usuários autenticados podem consultar pedidos e alterar seus status. Não crie contas de cozinha para clientes.

Também é possível selecionar uma mesa pelo endereço com `?mesa=3`.

## Pedidos anteriores

Pedidos que foram salvos pela versão anterior no `localStorage` continuam apenas no navegador em que foram criados; eles não são enviados automaticamente ao banco Supabase.
