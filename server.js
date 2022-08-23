let express = require('express');
let app = express();
let expressWs = require('express-ws')(app);
let uuid = require("uuid")
require("dotenv").config()

let registro_clientes = []
let reporte_conectados = []

expressWs.getWss().on('connection', function(ws) {
  ws['id_conexion'] = uuid.v4()
});

app.ws('/', function(ws, req) {  
  ws.on('message', function(msg) {

    let msgJson = null

    try {
      msgJson = JSON.parse( msg )
      console.log(req.id)

      if (msgJson.hasOwnProperty('accion')){
        switch(msgJson.accion){
          case 'registro':
            msgJson.nombre = msgJson.nombre.replace(/]+(>|$)/g, "")

            if (msgJson.nombre.length < 4){
              ws.send(JSON.stringify({
                accion: 'alerta',
                msg: 'El nombre de usuario debe tener al menos 4 caracteres'
              }))
              return;
            }

            let registro = {
              id: uuid.v4(),
              nombre: msgJson.nombre,
              accion: 'registro',
              id_conexion: this.id_conexion
            }

            //comprobamos que no haya alguien registrado con el mismo nombre
            for(let c=0; c < registro_clientes.length; c++){
              if (registro.nombre == registro_clientes[c].nombre){
                ws.send(JSON.stringify({
                  accion: 'alerta',
                  msg: 'El usuario especificado ya existe'
                }))
                return;
              }
            }
            
            registro_clientes.push( registro )
            reporte_conectados.push( registro.nombre )
    
            console.log('se registro nuevo usuario', registro)
            ws.send(JSON.stringify(registro))

            let clientes = expressWs.getWss().clients
    
            clientes.forEach(cliente => {
              cliente.send(JSON.stringify({
                accion: 'mensaje_sys',
                msg: registro.nombre + ' Se ha unido a la sala'
              }))
            })
          break;
          case 'mensaje':
            //comprobamos que el mensaje provenga de un cliente registrado
            let encontrado = false
            for(let c=0; c < registro_clientes.length; c++){
              if (msgJson.autor.id == registro_clientes[c].id && msgJson.autor.nombre == registro_clientes[c].nombre ){
                encontrado = true;
                break;
              }
            }

            //si es asi lo reenviamos al resto de los clientes
            if (encontrado === true){
              //se hace sanitizacion
              msgJson.texto = msgJson.texto.replace(/]+(>|$)/g, "")
              //se hace validacion 
              if (msgJson.texto.length > 500){
                break;
              }

              let clientes = expressWs.getWss().clients
    
              clientes.forEach(cliente => {
                cliente.send(JSON.stringify(msgJson))
              })
            }
            
          break;
        }
        
      }
    } catch( error ){
      console.log('error', error)
    }
    
  });

  
  ws.on('close', function(code) {
    console.log('desconectado', this.id_conexion)

    let nombre = ''
    for(let c=0; c < registro_clientes.length; c++){
      if (registro_clientes[c].id_conexion == this.id_conexion){
        nombre = registro_clientes[c].nombre
        registro_clientes.splice(c,1)
        reporte_conectados.splice(c,1)
        break;
      }
    }

    if (nombre != ''){
      let clientes = expressWs.getWss().clients
      clientes.forEach(cliente => {
        cliente.send(JSON.stringify({
          accion: 'mensaje_sys',
          msg: nombre+' ha abandonado la sala'
        }))
      })
    }
    
  })

});

setInterval(()=>{
  let clientes = expressWs.getWss().clients
  clientes.forEach(cliente => {
    cliente.send(JSON.stringify({
      accion: 'reporte_online',
      reporte: reporte_conectados
    }))
  })
}, 500)

app.listen(process.env.PUERTO);
console.log('puerto', process.env.PUERTO)