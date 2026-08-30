import React, { useState, useEffect } from 'react';

export default function Admin({ apiBaseUrl }) {
  const [config, setConfig] = useState({ calendarId: '' });
  const [calendars, setCalendars] = useState([]);
  const [googleStatus, setGoogleStatus] = useState({ clientSecretExists: false });
  const [aiStatus, setAiStatus] = useState({ geminiKeyExists: false, aiCacheExists: false, aiActivitiesCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isCallbackProcessing, setIsCallbackProcessing] = useState(false);

  const redirectUri = `${window.location.origin}/`; // Redirect back to React app

  // Load configuration and status
  const loadData = () => {
    fetch(`${apiBaseUrl}/api/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Error loading config:", err));

    fetch(`${apiBaseUrl}/api/calendar/status`)
      .then(res => res.json())
      .then(data => setGoogleStatus(data))
      .catch(err => console.error("Error loading status:", err));

    fetch(`${apiBaseUrl}/api/ai/status`)
      .then(res => res.json())
      .then(data => setAiStatus(data))
      .catch(err => console.error("Error loading AI status:", err));

    fetch(`${apiBaseUrl}/api/calendar/list`)
      .then(res => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then(data => setCalendars(data))
      .catch(() => setCalendars([]));
  };

  useEffect(() => {
    loadData();

    // Check if we are returning from Google OAuth redirect with ?code=...
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setIsCallbackProcessing(true);
      setStatusMessage('Verbindung mit Google Kalender wird hergestellt...');
      
      // Call backend to exchange code
      fetch(`${apiBaseUrl}/api/calendar/callback?code=${code}&redirectUri=${encodeURIComponent(redirectUri)}`)
        .then(res => res.json())
        .then(data => {
          setIsCallbackProcessing(false);
          if (data.success) {
            setStatusMessage('Erfolgreich mit Google Kalender verbunden!');
            // Clear URL search params
            window.history.replaceState({}, document.title, window.location.pathname);
            loadData();
          } else {
            setStatusMessage('Fehler bei der OAuth-Verbindung: ' + data.error);
          }
        })
        .catch(err => {
          setIsCallbackProcessing(false);
          setStatusMessage('Netzwerkfehler während der Google-Verbindung.');
        });
    }
  }, []);

  const handleConnectGoogle = () => {
    setIsLoading(true);
    setStatusMessage('');
    fetch(`${apiBaseUrl}/api/calendar/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`)
      .then(res => res.json())
      .then(data => {
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          setStatusMessage('Fehler: ' + data.error);
          setIsLoading(false);
        }
      })
      .catch(err => {
        setStatusMessage('Fehler beim Abrufen der OAuth-URL.');
        setIsLoading(false);
      });
  };

  const handleSaveCalendar = (e) => {
    e.preventDefault();
    setIsLoading(true);
    fetch(`${apiBaseUrl}/api/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    })
      .then(res => res.json())
      .then(data => {
        setIsLoading(false);
        if (data.success) {
          setStatusMessage('Kalender-ID erfolgreich gespeichert!');
        } else {
          setStatusMessage('Fehler: ' + data.message);
        }
      })
      .catch(err => {
        setIsLoading(false);
        setStatusMessage('Fehler beim Speichern der Konfiguration.');
      });
  };

  const handleRefreshAi = (e) => {
    e.preventDefault();
    setIsRefreshingAi(true);
    setStatusMessage('Google AI Agent sucht neue Aktivitäten...');
    fetch(`${apiBaseUrl}/api/ai/refresh`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        setIsRefreshingAi(false);
        if (data.success) {
          setStatusMessage(data.message || `Google AI Agent: ${data.count} neue ÖPNV-Aktivitäten generiert!`);
          loadData();
        } else {
          setStatusMessage('Fehler bei der KI-Generierung: ' + data.error);
        }
      })
      .catch(err => {
        setIsRefreshingAi(false);
        setStatusMessage('Fehler bei der KI-Generierung.');
      });
  };

  return (
    <div className="admin-container">
      <h1><i className="fa-solid fa-gear"></i> Admin-Bereich</h1>
      <p>Verwalte hier die Verbindung zum Google Kalender, damit eure Abenteuer direkt eingetragen werden können.</p>

      {statusMessage && (
        <div style={{
          padding: '15px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid var(--glass-border)',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          {statusMessage}
        </div>
      )}

      {isCallbackProcessing ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: 'var(--primary-color)' }}></i>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>1. Google Kalender verbinden</h2>
            {googleStatus.clientSecretExists ? (
              <>
                <p>Die <code>client_secret.json</code> wurde gefunden. Du kannst dich nun mit Google verbinden.</p>
                <button 
                  onClick={handleConnectGoogle} 
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  <i className="fa-brands fa-google"></i> Google Kalender verbinden
                </button>
              </>
            ) : (
              <div className="alert alert-warning">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <strong> Wichtig:</strong> Die Datei <code>client_secret.json</code> fehlt im Hauptverzeichnis.
                <br /><br />
                Um den Google Kalender nutzen zu können, musst du:
                <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
                  <li>In der <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a> ein Projekt erstellen.</li>
                  <li>Die "Google Calendar API" aktivieren.</li>
                  <li>Unter "APIs & Dienste" &gt; "Anmeldedaten" eine OAuth-Client-ID (Webanwendung) erstellen.</li>
                  <li>Als autorisierte Weiterleitungs-URI <code>http://localhost:5173/</code> eintragen.</li>
                  <li>Die JSON-Datei herunterladen und als <code>client_secret.json</code> im Projektordner speichern.</li>
                </ol>
              </div>
            )}
          </div>

          {calendars.length > 0 && (
            <div className="card mt-20">
              <h2>2. Kalender auswählen</h2>
              <p>Wähle den Kalender aus, in dem die Aktivitäten gespeichert werden sollen.</p>
              
              <form onSubmit={handleSaveCalendar} className="calendar-form">
                <select 
                  className="calendar-select"
                  value={config.calendarId || ''}
                  onChange={(e) => setConfig({ ...config, calendarId: e.target.value })}
                >
                  <option value="">-- Bitte Kalender wählen --</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-success mt-10" disabled={isLoading}>
                  <i className="fa-solid fa-floppy-disk"></i> Speichern
                </button>
              </form>
            </div>
          )}

          <div className="card mt-20">
            <h2><i className="fa-solid fa-robot"></i> Google AI Agent (Mainz & ÖPNV)</h2>
            <p>Der Google AI Agent sucht automatisch nach abwechslungsreichen Freizeitangeboten in Mainz und Umgebung, die perfekt mit öffentlichen Verkehrsmitteln (ÖPNV) erreichbar sind.</p>

            <div style={{ margin: '15px 0' }}>
              <p><strong>API-Status:</strong>{' '}
                {aiStatus.geminiKeyExists ? (
                  <span style={{ color: '#2ec4b6', fontWeight: 'bold' }}><i className="fa-solid fa-circle-check"></i> Gemini API Schlüssel aktiv</span>
                ) : (
                  <span style={{ color: '#e71d36', fontWeight: 'bold' }}><i className="fa-solid fa-circle-xmark"></i> API-Schlüssel fehlt</span>
                )}
              </p>
              <p><strong>Verfügbare Aktivitäten:</strong> {aiStatus.aiActivitiesCount} Angebote</p>
            </div>

            <form onSubmit={handleRefreshAi}>
              <button type="submit" className="btn btn-primary" disabled={isRefreshingAi || isLoading}>
                {isRefreshingAi ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Generiere Aktivitäten...</>
                ) : (
                  <><i className="fa-solid fa-wand-magic-sparkles"></i> Neue Aktivitäten mit Google AI suchen</>
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
