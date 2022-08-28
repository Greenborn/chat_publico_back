const SalaChat = require('./SalaChat.js')

let express = require('express');
let app = express();
let expressWs = require('express-ws')(app);
const uuid = require("uuid")
require("dotenv").config()

let sala_general = new SalaChat({ iniciador: null })

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
            sala_general.abrirSubSala( msgJson, ws )
          break;
          
          case 'registro':
            sala_general.registrarUsuario( msgJson, ws )
          break;

          case 'mensaje':
            sala_general.enviarMensaje( msgJson, ws )
          break;

          case 'cerrar_chat':
            sala_general.cerrarChat( msgJson, ws )
          break;

          case 'mensaje_privado':
            sala_general.envioMensajePrivado( msgJson, ws )
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