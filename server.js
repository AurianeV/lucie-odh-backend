import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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
 (Brevo API)
========================= */


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

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    "accept": "application/json",
    "api-key": process.env.BREVO_API_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    sender: {
      name: "Lucie ODH",
      email: process.env.BREVO_FROM_EMAIL,
    },
    to: [
      {
        email: process.env.BREVO_TO_EMAIL,
      },
    ],
    replyTo: {
      email: email,
    },
    subject: `📩 ${escapeHTML(type)} - Nouvelle réponse questionnaire`,
    htmlContent: `
      <h2>${escapeHTML(type)}</h2>
      <p><strong>Nom :</strong> ${escapeHTML(nom)}</p>
      <p><strong>Email :</strong> ${escapeHTML(email)}</p>
      <h3>Réponses :</h3>
      <ul>${formattedResponses}</ul>
    `,
  }),
});

if (!brevoResponse.ok) {
  const errorText = await brevoResponse.text();
  console.error("Erreur Brevo API :", errorText);
  return res.status(500).json({ error: "Erreur envoi email" });
}


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