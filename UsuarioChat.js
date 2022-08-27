const uuid = require("uuid")

module.exports = class UsuarioChat {
  conexion = null
  nombre = ''
  id = null

  constructor ( params ){
    this.conexion = params.conexion
    this.nombre = params.nombre
    this.id = uuid.v4()
  }
}