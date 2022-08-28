const uuid = require("uuid")
const UsuarioChat = require('./UsuarioChat.js')

module.exports = class SalaChat {
  id        = null
  usuarios  = []
  reporte_conectados = []
  sub_salas = {}
  titulo    = ''
  iniciador = null

  constructor( config ){
    this.id        = uuid.v4()
    this.usuarios  = []
    this.titulo    = '' 
    this.iniciador = config.iniciador

    setInterval( ()=>{ this.tareasCron() }, 500)
  }

  abrirSubSala( msgJson, ws ){
    let iniciador = this.buscarUsuario( msgJson.nombre_origen )
    let destino   = this.buscarUsuario( msgJson.nombre_destino )
    if (iniciador === null || destino === null)
      return false;
    
    let sub_sala = new SalaChat({ iniciador: iniciador })
    console.log('nueva subsala creada')

    sub_sala.agregarUsuario(iniciador)
    sub_sala.agregarUsuario(destino)

    let notif = { accion: 'registro_sala_privada', 'id_nueva_sala': sub_sala.id, 'iniciador': msgJson.nombre_origen, 'destino': msgJson.nombre_destino }
    iniciador.enviarMesaje(notif)
    destino.enviarMesaje(notif)

    sub_sala.envioGeneral({
      accion: 'mensaje_sys', msg: 'Nueva conversación privada iniciada por ' + msgJson.nombre_origen
    })

    this.sub_salas[sub_sala.id] = sub_sala
  }

  cerrarChat( msgJson, ws ){
    if (!this.sub_salas.hasOwnProperty(msgJson.id_sala))
      return false
    
    let sub_sala = this.sub_salas[msgJson.id_sala]
    let usuario = sub_sala.buscarUsuario(msgJson.usuario.nombre)

    if (usuario === null){
      console.log('usuario no presente en subsala')
      return false
    }
      
    sub_sala.envioGeneral({
      accion: 'mensaje_sys', msg: msgJson.usuario.nombre + ' desidió terminar la conversación '
    })

    delete this.sub_salas[msgJson.id_sala]
  }

  agregarUsuario( user ){
    //comprobamos que no haya alguien registrado con el mismo nombre
    if (this.buscarUsuario(user.nombre) !== null)
      return false

    this.usuarios.push( user )
    this.reporte_conectados.push( user.nombre )
    console.log('se registro nuevo usuario en la sala: ', user.nombre)
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
      id_sala: this.id,
      id_conexion: this.id_conexion
    }

    this.atiendeOnClose(ws)

    usuario.enviarMesaje(registro)
    this.envioGeneral({
      accion: 'mensaje_sys', msg: registro.nombre + ' Se ha unido a la sala'
    })
  }

  envioMensajePrivado( msgJson, ws ){
    //buscamos la subsala a la cual va dirigido
    if (!this.sub_salas.hasOwnProperty(msgJson.id_sala))
      return false

    this.sub_salas[msgJson.id_sala].enviarMensaje( msgJson, ws )
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
    msg['id_sala'] = this.id
    for (let c=0; c < this.usuarios.length; c++){
      this.usuarios[c].enviarMesaje( msg )
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