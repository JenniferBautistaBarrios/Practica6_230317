import "./database.js";
import express from "express";
import session from "express-session";
import requestIp from "request-ip";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import * as os from "os";
import { model, Schema } from "mongoose";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIp.mw());
app.use(
  session({
    secret: "Practica06 JBB#Jenny-Sessiones",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 1000 },
  })
);

const sessionSchema = new Schema(
  {
    sessionId: { 
        unique: true, 
        required: true, 
        type: String },
    name: { 
        required: true, 
        type: String },
    email: { 
        unique: true, 
        required: true, 
        type: String },
    clientData: {
      macAddress: String,
      ipAddress: String,
    },
    serverData: {
      macAddress: String,
      ipAddress: String,
    },
    status: {
      enum: ["Activa", "Inactiva", "Finalizada por el Usuario", "Finalizada por fallo de Sistema"],
      type: String,
    },
  },{ 
    versionKey: false, 
    timestamps: true 
});

const sessionModel = model("session", sessionSchema);

const getServerIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
};

const getServerMac = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.mac;
      }
    }
  }
};

app.get("/", async (req, res) => {
  res.status(200).json({ 
    message: "Bienvenido a la Aplicación de manejo de Sesiones con datos persistentes",
    author: "Jennifer Bautista Barrios" });
});

app.post("/login", async (req, res) => {
  const { name, email, clientMac } = req.body;
  if (!email || !name || !clientMac) {
    return res.status(400).json({ 
        error: "Datos no recibidos correctamente" 
    });
  }
  const sessionId = uuidv4();
  const sessionData = {
    sessionId,
    name,
    email,
    clientData: { 
        ipAddress: req.socket.remoteAddress, 
        macAddress: clientMac 
    },
    serverData: { 
        macAddress: getServerMac(), 
        ipAddress: getServerIp() 
    },
    status: "Activa",
  };
  try {
    await sessionModel.create(sessionData);
    return res.status(200).json({ 
        message: "Usuario registrado exitosamente", 
        sessionId 
    });
  } catch (error) {
    return res.status(500).json({ 
        error: error.message 
    });
  }
});
app.get('/session', async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ 
        message: "Falta el sessionId" 
    });

    try {
        const session = await sessionModel.findOne({ sessionId });
        if (!session) return res.status(404).json({ 
            message: "No existe una sesión activa" 
        });
        
        const lastAccessTime = moment(session.lastAccess, 'YYYY-MM-DD HH:mm:ss');
        const sessionDuration = moment().diff(lastAccessTime, 'seconds');
        return res.status(200).json({ session, 
            sessionDuration: `${sessionDuration} segundos` });
    } catch (error) {
        return res.status(500).json({ 
            error: error.message 
        });
    }
});
app.get("/listCurrentSessions", async (req, res) => {
  try {
    const sessions = await sessionModel.find({ status: "Activa" });
    return res.status(200).json({ 
        message: "Sesiones activas", 
        sessions });
  } catch (error) {
    return res.status(500).json({ 
        error: error.message 
    });
  }
});

app.put("/update", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ 
    error: "No se proporcionó sessionId" 
});
  try {
    
    await sessionModel.findOneAndUpdate(
      { sessionId },
      { $set: { "status": "Activa", updatedAt: moment().tz("America/Mexico_City").format() } }
    );
    return res.status(200).json({ 
        message: "Datos de sesión actualizados" 
    });
  } catch (error) {
    return res.status(500).json({ 
        error: error.message 
    });
  }
});

app.post("/logout", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ 
    error: "No se proporcionó sessionId" 
});
  try {
    await sessionModel.findOneAndUpdate(
      { sessionId },
      { $set: { status: "Finalizada por el Usuario" } }
    );
    return res.status(200).json({ message: "Sesión finalizada correctamente" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/listAllSessions", async (req, res) => {
  try {
    const sessions = await sessionModel.find();
    return res.status(200).json({ 
      message: "Todas las sesiones", 
      sessions 
    });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }
});

app.delete("/deleteAllSessions", async (req, res) => {
  try {
    await sessionModel.deleteMany();
    return res.status(200).json({ message: "Todas las sesiones han sido eliminadas" });
  } catch (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }
});


app.listen(3000, () => console.log("Aplicación iniciada en el puerto 3000"));
