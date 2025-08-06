const express = require("express");
const WebSocket = require("ws");
const axios = require("axios");
const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

// Liste des chaînes YouTube à suivre
const channelIds = [ 
"UCpWaR3gNAQGsX48cIlQC0qw",
  "UCWeg2Pkate69NFdBeuRFTAw",
  "UCyWqModMQlbIo8274Wh_ZsQ",
  "UCww2zZWg4Cf5xcRKG-ThmXQ",
  "UCo3i0nUzZjjLuM7VjAVz4zA",
  "UCH0XvUpYcxn4V0iZGnZXMnQ",
  "UCgvqvBoSHB1ctlyyhoHrGwQ",
  "UCL9aTJb0ur4sovxcppAopEw",
  "UCDPK_MTu3uTUFJXRVcTJcEw",
  "UCmPSwsooZq8an7xOLQQhAdw",
  "UCt6IQpsggvn6zmalhPglSEA",
  "UC8I-UIlXPNS4luC4iV7dRdQ",
  "UCzYC9ss2P77Ry2LzIDL5Xsw",
  "UCow2IGnug1l3Xazkrc5jM_Q",
  "UCAhaFPP6v3WCfK5Tjao0B7A",
  "UC8Q0SLrZLiTj5s4qc9aad-w",
  "UCLMKLU-ZuDQIsbjMvR3bbog",
  "UCWMYFDuCcvkmPiOf1RP_IKQ",
  "UCKq9JxyISqBHDd-fXfV3QtQ",
  "UCXFrzOlPpbOZOd1KClSWlQw",
  "UCTt2AnK--mnRmICnf-CCcrw",
  "UCK3inMNRNAVUleEbpDU1k2g",
  "UCvlBxzsiVjykUcKW9OxN8kg",
  "UCP8A8blIPLuL2kSSrhKJIhg",
  "UCOdKaYgvLlPuinUJ1z5Gm2g",
  "UCtihF1ZtlYVzoaj_bKLQZ-Q",
  "UC-4M8AN08hw39nn2v91VuMQ",
  "UCGjUTQ-YV71V7T6WfdmZDiw",
  "UCgrdZm9Nx3rCj8WenIoSIqw",
  "UCY-_QmcW09PHAImgVnKxU2g",
  "UCiFyJ_EBmF2XJuR9buWE_3A",
  "UCmIoN2ICieMp1hX2R_VmYkg",
  "UCByWJsWPztkY3Rta2B62tgg",
  "UCugeH-Bmo9a5-Jnbt9X-3bA",
  "UCWnfDPdZw6A23UtuBpYBbAg",
  "UC_i8X3p8oZNaik8X513Zn1Q",
  "UCUl7mwOyySfZzUkq4H29nug",
  "UC3rxwrZSiTp6Kk2RXcyHtCA",
  "UCyNeKmBHI10u4bwYEKimlZA",
  "UCCFqUJYKT97UerMmb6DM0bw",
  "UCeqsLJGWhZXEerY5JWvwLkg",
  "UCoZoRz4-y6r87ptDp4Jk74g",
  "UCC_r3spMB5i5QKgtdNVO0OQ",
  "UCMqzZ17aTG2hKj2mVl7U4MA",
  "UC_yP2DpIgs5Y1uWC0T03Chw",
  "UCyMy3i-BaVOmOwTZskm52Ew",
  "UCZ8kV8vuMdDLSerCIFfWnFQ",
  "UC99LgIedzGD1GirhFGldfUQ",
  "UCzQHmV0xBte_ll7oNrFpQeA",
  "UCkYN96I4bvKx2fIF8KXjs3w",
];

// Objet pour stocker les données en cache
let cachedData = [];
const cacheTTL = 60000; // Cache pour 1 minute

// Fonction pour récupérer les informations des chaînes depuis l'API
async function fetchChannelData() {
  const results = [];
  const currentTime = Date.now();
  
  for (const id of channelIds) {
    const cachedEntry = cachedData.find(item => item.id === id);
    if (cachedEntry && (currentTime - cachedEntry.timestamp < cacheTTL)) {
      results.push(cachedEntry.data);
      continue;
    }

    try {
      const response = await axios.get(`https://backend.mixerno.space/api/youtube/estv3/${id}`);
      if (response.data.success && response.data.items.length > 0) {
        const item = response.data.items[0];
        const channelData = {
          cimage: item.snippet.thumbnails.default.url,
          cname: item.snippet.title,
          subscriberCount: Number(item.statistics.subscriberCount),
        };
        results.push(channelData);
        cachedData.push({ id, data: channelData, timestamp: currentTime });
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération des données pour l'ID ${id}:`, error.message);
    }
  }
  results.sort((a, b) => b.subscriberCount - a.subscriberCount);
  return results;
}

// Fonction pour envoyer des données à tous les clients connectés
async function broadcastData() {
  const data = await fetchChannelData();
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

// Gestion des connexions WebSocket
wss.on("connection", (ws) => {
  console.log("Client connecté");

  // Envoyer les données initiales au nouveau client
  fetchChannelData().then((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });

  // Envoie un "ping" toutes les 30 secondes
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);

  // Nettoyer l'intervalle de ping lorsque le client se déconnecte
  ws.on("close", () => {
    clearInterval(pingInterval);
    console.log("Client déconnecté");
  });
});

// Lancer le serveur
server.listen(3000, () => {
  console.log("Serveur en écoute sur le port 3000");
});

// Mettre à jour les données toutes les 10 secondes
setInterval(broadcastData, 10000);
