const uuid = require("uuid")
const UsuarioChat = require('./UsuarioChat.js')

module.exports = class SalaChat {
  id        = null
  usuarios  = []
  reporte_conectados = []
  titulo    = ''
  iniciador = null

  constructor( config ){
    this.id        = uuid.v4()
    this.usuarios  = []
    this.titulo    = '' 
    this.iniciador = config.iniciador

    setInterval( ()=>{ this.tareasCron() }, 500)
  }

  agregarUsuario( user ){
    //comprobamos que no haya alguien registrado con el mismo nombre
    if (this.buscarUsuario(user.nombre) !== null)
      return false

    this.usuarios.push( user )
    this.reporte_conectados.push( user.nombre )
    console.log('se registro nuevo usuario: ', user)
    return true
  }

  registrarUsuario( msgJson, ws ){
    msgJson.nombre = msgJson.nombre.replace(/]+(>|$)/g, "")
    //comprobamos longitud minima 
    if (msgJson.nombre.length < 4){
      this.enviarAlerta( ws, 'El nombre de usuario debe tener al menos 4 caracteres' )
      return;
    }

    let usuario = new UsuarioChat({ 
      'conexion': ws,
      'nombre': msgJson.nombre,
    })

    if (!this.agregarUsuario( usuario )){
      this.enviarAlerta( ws, 'El nombre de usuario ya esta registrado' )
      return;
    }

    let registro = {
      id: uuid.v4(),
      nombre: msgJson.nombre,
      accion: 'registro',
      id_conexion: this.id_conexion
    }

    this.atiendeOnClose(ws)

    ws.send(JSON.stringify(registro))
    this.envioGeneral({
      accion: 'mensaje_sys', msg: registro.nombre + ' Se ha unido a la sala'
    })
  }

  enviarMensaje( msgJson, ws ){
    //comprobamos que el mensaje provenga de un cliente registrado
    if (!this.buscarUsuario(msgJson.autor.nombre))
      return false
    
    //se reemplazan caracteres problematicos
    msgJson.texto = msgJson.texto.replace(/]+(>|$)/g, "")

    //se comprueba limite de longitud de texto
    if (msgJson.texto.length > 500)
      return false

    this.envioGeneral( msgJson )
  }

  envioGeneral( msg ){
    for (let c=0; c < this.usuarios.length; c++){
      this.usuarios[c].conexion.send(JSON.stringify( msg ))
    }
  }

  buscarUsuario( nombre ){
    for (let c=0; c < this.usuarios.length; c++){
      if (this.usuarios[c].nombre == nombre)
        return this.usuarios[c]
    }
    return null
  }

  enviarAlerta( ws, msg ){
    ws.send(JSON.stringify({
      accion: 'alerta', msg: msg
    }))
  }

  atiendeOnClose(ws){
    let registro_clientes  = this.usuarios
    let reporte_conectados = this.reporte_conectados
    let obj = this
    ws.on('close', function(code) {
      console.log('desconectado', this.id_conexion)
  
      let nombre = ''
      for(let c=0; c < registro_clientes.length; c++){
        if (registro_clientes[c].conexion.id_conexion == this.id_conexion){
          nombre = registro_clientes[c].nombre
          registro_clientes.splice(c,1)
          reporte_conectados.splice(c,1)
          break;
        }
      }
  
      if (nombre != ''){
        obj.envioGeneral({ accion: 'mensaje_sys', msg: nombre+' ha abandonado la sala' })
      }
      
    })
  }

  tareasCron(){
    this.envioGeneral( { accion: 'reporte_online', reporte: this.reporte_conectados })
  }
}