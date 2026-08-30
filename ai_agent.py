import os
import json
import random
import logging
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logging.basicConfig(level=logging.INFO)
logging.getLogger('google_genai').setLevel(logging.ERROR)

logger = logging.getLogger(__name__)


class GoogleActivityAgent:
    """
    AI Agent that uses Google Gemini to search for and generate family activity 
    suggestions in and around Mainz reachable by public transport (ÖPNV).
    """

    def __init__(self, data_dir=None):
        if data_dir is None:
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
        self.data_dir = data_dir
        self.ai_cache_file = os.path.join(self.data_dir, 'ai_generated_activities.json')
        self.fallback_file = os.path.join(self.data_dir, 'activities.json')
        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    def _get_client(self):
        if not self.api_key:
            logger.warning("Kein GEMINI_API_KEY in der Umgebung gefunden.")
            return None
        return genai.Client(api_key=self.api_key)

    def fetch_fresh_activities(self, count=15):
        """
        Queries Google Gemini to find current family activities reachable via ÖPNV in Mainz & surroundings.
        Saves the results to cache and returns the list of activities.
        """
        client = self._get_client()
        if not client:
            logger.error("AI Agent konnte nicht initialisiert werden: API Key fehlt.")
            return self._load_fallback_activities()

        prompt = f"""
Du bist ein erfahrener KI-Reiseführer und Freizeitagent für Mainz und die Rhein-Main-Region.
Erstelle eine Liste von {count} abwechslungsreichen, aktuellen Freizeitaktivitäten für Familien mit Kindern in Mainz und der näheren Umgebung (z.B. Wiesbaden, Bingen, Ingelheim, Frankfurt, Darmstadt), die hervorragend mit öffentlichen Verkehrsmitteln (ÖPNV - Bus, Tram, S-Bahn, Regionalbahn) erreichbar sind.

WICHTIG:
- Berücksichtige sowohl In- als auch Outdoor-Aktivitäten, Parks, Museen, Tierparks, Erlebnisspielplätze und Ausflugsziele.
- Jedes Ziel muss mit Öffis gut erreichbar sein.
- Gib die Antwort ausschließlich als gültiges JSON-Array zurück.
- Jedes Objekt im Array MUSS exakt folgende Schlüssel besitzen:
  - "id": eine eindeutige Zahl (z.B. 1, 2, 3...)
  - "title": ein prägnanter, einladender Titel der Aktivität
  - "description": eine spannende, kinder- und familienfreundliche Beschreibung (2-3 Sätze)
  - "destination": Der genaue Zielort für die Anzeige (z.B. "Volkspark, Mainz" oder "Naturhistorisches Museum, Mainz")
  - "destination_query": Der exakte Suchbegriff für die Google-Maps-ÖPNV-Routenplanung (z.B. "Volkspark Mainz" oder "Naturhistorisches Museum Mainz")

Beispiel-Struktur:
[
  {{
    "id": 1,
    "title": "Abenteuer im Volkspark Mainz",
    "description": "Ein riesiger Park mit einem tollen Wasserspielplatz, einer Minibahn und viel Platz zum Toben. Perfekt für einen sonnigen Tag!",
    "destination": "Volkspark, Mainz",
    "destination_query": "Volkspark Mainz"
  }}
]
"""

        activities = []
        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json"
            )
            res = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config=config
            )
            activities = json.loads(res.text)
            logger.info(f"AI Agent: {len(activities)} Aktivitäten erfolgreich mit Gemini generiert.")

        except Exception as e:
            logger.error(f"Fehler bei Gemini API Aufruf: {e}")

        if activities and isinstance(activities, list) and len(activities) > 0:
            # Ensure each activity has required fields
            cleaned_activities = []
            for idx, act in enumerate(activities, 1):
                if isinstance(act, dict) and 'title' in act and 'description' in act:
                    cleaned_activities.append({
                        "id": act.get("id", idx),
                        "title": act.get("title", f"Aktivität {idx}"),
                        "description": act.get("description", ""),
                        "destination": act.get("destination", "Mainz"),
                        "destination_query": act.get("destination_query", act.get("destination", "Mainz"))
                    })
            if cleaned_activities:
                self._save_ai_cache(cleaned_activities)
                return cleaned_activities

        # Fallback to cache or static file if API generation failed
        return self.get_activities()

    def _save_ai_cache(self, activities):
        try:
            os.makedirs(self.data_dir, exist_ok=True)
            with open(self.ai_cache_file, 'w', encoding='utf-8') as f:
                json.dump(activities, f, ensure_ascii=False, indent=2)
            logger.info("AI Cache erfolgreich aktualisiert.")
        except Exception as e:
            logger.error(f"Fehler beim Speichern des AI Cache: {e}")

    def _load_ai_cache(self):
        if os.path.exists(self.ai_cache_file):
            try:
                with open(self.ai_cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data and isinstance(data, list):
                        return data
            except Exception as e:
                logger.error(f"Fehler beim Lesen des AI Cache: {e}")
        return None

    def _load_fallback_activities(self):
        if os.path.exists(self.fallback_file):
            try:
                with open(self.fallback_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Fehler beim Lesen der Fallback-Datei: {e}")
        return []

    def get_activities(self):
        """
        Returns activities from AI cache if present, otherwise tries to fetch from AI,
        and falls back to static activities.json if necessary.
        """
        cached = self._load_ai_cache()
        if cached:
            return cached

        # If cache doesn't exist yet, fetch fresh activities via Gemini
        if self.api_key:
            return self.fetch_fresh_activities()

        # Fallback
        return self._load_fallback_activities()

    def get_random_activity(self):
        activities = self.get_activities()
        if not activities:
            return {
                "id": 0,
                "title": "Spaziergang am Rhein",
                "description": "Ein entspannter Familienspaziergang am Rheinufer in Mainz.",
                "destination": "Rheinufer, Mainz",
                "destination_query": "Rheinufer Mainz"
            }
        return random.choice(activities)

    def search_activity_by_idea(self, idea_prompt):
        """
        Finds a specific matching activity location in Mainz or nearby region based on user idea prompt.
        """
        client = self._get_client()
        if not client:
            return {
                "id": 999,
                "title": f"Ausflug zu: {idea_prompt}",
                "description": f"Ein schöner Ausflug zum Thema '{idea_prompt}' in Mainz.",
                "destination": "Mainz",
                "destination_query": f"{idea_prompt} Mainz"
            }

        prompt = f"""
Du bist ein erfahrener KI-Reiseführer und Freizeitagent für Familien in Mainz und der Rhein-Main-Region.
Ein Benutzer hat folgendes Wunscherlebnis geäußert:
"{idea_prompt}"

Suche eine konkrete, perfekt dazu passende Freizeitaktivität oder Ausflugsziel in Mainz oder der näheren Umgebung (Wiesbaden, Frankfurt, Bingen, Ingelheim, Darmstadt), das hervorragend mit öffentlichen Verkehrsmitteln (ÖPNV - Bus, Tram, S-Bahn, Regionalbahn) erreichbar ist.

WICHTIG:
- Gib die Antwort ausschließlich als ein einzelnes gültiges JSON-Objekt zurück (KEIN Array).
- Das Objekt MUSS exakt folgende Schlüssel besitzen:
  - "id": 999
  - "title": ein prägnanter, einladender Titel der Aktivität
  - "description": eine spannende, kinder- und familienfreundliche Beschreibung (2-3 Sätze), die erklärt warum dieser Ort perfekt zur Idee "{idea_prompt}" passt
  - "destination": Der genaue Zielort für die Anzeige (z.B. "Volkspark, Mainz" oder "Senckenberg Museum, Frankfurt am Main")
  - "destination_query": Der exakte Suchbegriff für die Google-Maps-ÖPNV-Routenplanung (z.B. "Volkspark Mainz" oder "Senckenberg Museum Frankfurt")

Beispiel-Struktur:
{{
  "id": 999,
  "title": "Dinosaurier-Abenteuer im Naturhistorischen Museum",
  "description": "Für alle Dino-Fans das ideale Ziel: Hier könnt ihr fossile Knochen und spannende Tierwelten in Mainz entdecken!",
  "destination": "Naturhistorisches Museum, Mainz",
  "destination_query": "Naturhistorisches Museum Mainz"
}}
"""

        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json"
            )
            res = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=prompt,
                config=config
            )
            data = json.loads(res.text)
            if isinstance(data, dict) and 'title' in data and 'destination' in data:
                data['id'] = 999
                return data
            elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                act = data[0]
                act['id'] = 999
                return act
        except Exception as e:
            logger.error(f"Fehler bei KI-Ideensuche: {e}")

        return {
            "id": 999,
            "title": f"Aktivität zu '{idea_prompt}'",
            "description": f"Ein tolles Familienerlebnis rund um '{idea_prompt}' in Mainz.",
            "destination": "Mainz",
            "destination_query": f"{idea_prompt} Mainz"
        }
