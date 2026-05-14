import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

/* =========================
   CORS (autorise ton site)
========================= */
const corsOptions = {
  origin: [ "https://www.lucieodh.fr",
    "https://lucieodh.fr",
    "http://localhost:5173",
    "http://localhost:5174"
  ],
  methods: ["POST"],
  allowedHeaders: ["Content-Type"]
};

app.use(cors(corsOptions));
app.use(express.json());

/* =========================
   Sécurité : Escape HTML
========================= */
const escapeHTML = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/* =========================
   Nodemailer (Brevo SMTP)
========================= */
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000

});
transporter.verify(function(error, success) {
  if (error) {
    console.log("Erreur SMTP :", error);
  } else {
    console.log("SMTP prêt ✅");
  }
});

/* =========================
   Route test
========================= */
app.get("/", (req, res) => {
  res.send("Le backend fonctionne 🚀");
});

/* =========================
   Route Questionnaire
========================= */
app.post("/questionnaire", async (req, res) => {
  try {
    const { type, nom, email, reponses, website } = req.body;

    // Honeypot anti-spam
    if (website) {
      return res.status(200).end();
    }

    // Validation minimale
    if (!type || !nom || !email || !reponses) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Construction des réponses HTML sécurisées
    const formattedResponses = Object.entries(reponses)
      .map(
        ([key, value]) =>
          `<li><strong>${escapeHTML(key)} :</strong> ${escapeHTML(value)}</li>`
      )
      .join("");

    const info = await transporter.sendMail({
      from: `"Lucie ODH" <${process.env.BREVO_FROM_EMAIL}>`,
      to: process.env.BREVO_TO_EMAIL,
      replyTo: email,
      subject: `📩 ${escapeHTML(type)} - Nouvelle réponse questionnaire `,
      html: `
        <h2>${escapeHTML(type)}</h2>
        <p><strong>Nom :</strong> ${escapeHTML(nom)}</p>
        <p><strong>Email :</strong> ${escapeHTML(email)}</p>
        <h3>Réponses :</h3>
        <ul>
          ${formattedResponses}
        </ul>
      `
    });

console.log("Email envoyé :", info.messageId);
console.log("Accepté par :", info.accepted);
console.log("Refusé par :", info.rejected);
console.log("Réponse SMTP :", info.response);

res.json({ success: true });

  } catch (error) {
    console.error("Erreur email :", error);
    res.status(500).json({ error: "Erreur envoi email" });
  }
});

/* =========================
   Lancement serveur
========================= */
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});