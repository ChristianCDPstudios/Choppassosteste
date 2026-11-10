# CHOPPASSOS

Sistema web de pedidos por mesa do CHOPPASSOS, com chopp, bebidas, doses, aperitivos e porções. O destaque da casa é chopp e panceta.

## Como abrir

Abra `index.html` em um navegador. Escolha os itens do cardápio, selecione a mesa e envie o pedido. Use **Painel da cozinha** no cabeçalho para acompanhar os pedidos e avançar o status: novo, preparando, pronto e entregue.

O painel da cozinha pede a senha `192503`, inclusive quando aberto diretamente com `?view=kitchen`. A senha protege apenas a interface no navegador; como este projeto é estático e não possui autenticação no servidor, não use essa proteção para dados confidenciais. Também é possível selecionar uma mesa pelo endereço com `?mesa=3`.

## Armazenamento e sincronização

Esta versão salva pedidos no `localStorage` do navegador. As alterações são sincronizadas entre abas abertas no mesmo navegador, mas não entre dispositivos ou navegadores diferentes. Para instalar em um restaurante e receber pedidos de celulares na tela da cozinha, é necessário hospedar a aplicação com um backend compartilhado e autenticação apropriada.
