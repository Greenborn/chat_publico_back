const SalaChat = require('./SalaChat.js')

let express = require('express');
let app = express();
let expressWs = require('express-ws')(app);
const uuid = require("uuid")
require("dotenv").config()

let salas_chat = []

let sala_general = new SalaChat({ iniciador: null })
salas_chat.push(sala_general)

expressWs.getWss().on('connection', function(ws) {
  ws['id_conexion'] = uuid.v4()
});

app.ws('/', function(ws, req) {  
  ws.on('message', function(msg) {

    let msgJson = null

    try {
      msgJson = JSON.parse( msg )
      console.log(msgJson)

      if (msgJson.hasOwnProperty('accion')){
        
        switch(msgJson.accion){
          case 'registro_sala_privada':
            
          break;
          
          case 'registro':
            sala_general.registrarUsuario( msgJson, ws )
          break;

          case 'mensaje':
            sala_general.enviarMensaje( msgJson, ws )
          break;
        }
        
      }
    } catch( error ){
      console.log('error', error)
    }
    
  });

});

app.listen(process.env.PUERTO);
console.log('puerto', process.env.PUERTO)