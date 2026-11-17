# Automatisches Deployment (CI + Watchtower)

Diese Kette sorgt dafür, dass der Server sich nach einem Commit selbst aktualisiert:

```
git push (main)  ->  GitHub Action baut & pusht Images nach GHCR  ->  Watchtower pullt & startet die Container neu
```

## Wie es funktioniert

1. **Push auf `main`** löst den Workflow `.github/workflows/docker-publish.yml` aus.
2. Dieser baut die Images `familie-backend` und `familie-frontend` und pusht sie nach
   `ghcr.io/kruemmel2704/...:latest` (und zusätzlich mit dem Commit-SHA als Tag).
3. Der **Watchtower**-Container prüft alle 120 Sekunden die Registry. Findet er ein neues
   `:latest`-Image für einen gelabelten Container, zieht er es und startet den Container neu.

> Hinweis: Watchtower reagiert auf **neue Images**, nicht direkt auf Git-Commits. Der Umweg
> über die Registry ist nötig, weil Watchtower keine lokal gebauten Images aktualisieren kann.

## Einmalige Einrichtung

### 1. GitHub Secrets (für den Frontend-Build)
Repo → *Settings → Secrets and variables → Actions* → folgende Secrets anlegen
(öffentliche IDs, keine echten Geheimnisse, aber so bleiben sie zentral):

- `MS_CLIENT_ID`
- `MS_TENANT_ID`

Fehlen sie, baut das Frontend trotzdem – nur ohne Microsoft-SSO-Konfiguration.

### 2. Images-Sichtbarkeit / Zugriff
Nach dem ersten erfolgreichen Workflow-Lauf erscheinen die Pakete unter
*GitHub → Profil → Packages*. Sie sind standardmäßig **privat**.

### 3. Server: bei GHCR einloggen (für private Images)
Auf dem Server, auf dem `docker compose` läuft, einmalig einloggen, damit Watchtower pullen darf:

```bash
# Personal Access Token (classic) mit Scope `read:packages` erstellen und als Passwort verwenden
echo <TOKEN> | docker login ghcr.io -u kruemmel2704 --password-stdin
```

Das legt `~/.docker/config.json` an – genau diese Datei bindet der Watchtower-Service ein.
(Sind die Pakete **public** gestellt, ist dieser Schritt nicht nötig; dann kann die
`config.json`-Volume-Zeile in `docker-compose.yml` entfernt werden.)

### 4. Starten
```bash
docker compose pull      # erste Images aus GHCR holen
docker compose up -d     # Backend, Frontend und Watchtower starten
```

Ab jetzt läuft alles automatisch: Commit auf `main` → ein paar Minuten später ist der Server aktuell.

## Nützliche Befehle
```bash
docker compose logs -f watchtower     # sehen, wann Watchtower prüft/aktualisiert
docker compose pull && docker compose up -d   # manuelles Update erzwingen
```

## Lokale Entwicklung
Lokal weiterhin selbst bauen statt aus GHCR ziehen:
```bash
docker compose build && docker compose up -d
```
