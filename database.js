import mongoose from 'mongoose'

mongoose.connect('mongodb+srv://Jennifer:Alejandro@cluser1.agzay.mongodb.net/sessions?retryWrites=true&w=majority&appName=cluser1')
.then(()=> console.log('Aplicación conectada a la Base de Datos'))
.catch((error)=> console.error(error))

export default mongoose

