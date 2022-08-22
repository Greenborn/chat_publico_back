var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);


app.ws('/', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);

    let clientes = expressWs.getWss().clients
    
    clientes.forEach(cliente => {
      cliente.send(String(msg))
    })
    
  });

});

app.listen(8999);