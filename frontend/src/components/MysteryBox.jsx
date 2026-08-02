import React, { useState, useEffect } from 'react';

export default function MysteryBox({ apiBaseUrl, showMothersDay, onCloseMothersDay }) {
  const [activities, setActivities] = useState([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [clickedBoxIndex, setClickedBoxIndex] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [aloneWithoutAmy, setAloneWithoutAmy] = useState(false);
  
  // Event Date Picker
  const [eventDatetime, setEventDatetime] = useState('');
  const [calendarStatus, setCalendarStatus] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);

  // Geolocation & Directions
  const [directions, setDirections] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Initialize event datetime to next hour
  const getNextHourDatetimeLocal = () => {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const fetchBatch = () => {
    fetch(`${apiBaseUrl}/api/activities/batch`)
      .then(res => res.json())
      .then(data => {
        setActivities(data);
      })
      .catch(err => console.error("Error fetching activities batch:", err));
  };

  useEffect(() => {
    fetchBatch();
    setEventDatetime(getNextHourDatetimeLocal());
  }, []);

  const handleBoxClick = (index) => {
    if (isRevealed || activities.length < 3) return;
    setClickedBoxIndex(index);
    setSelectedActivity(activities[index]);
    
    // Trigger opening animation delay
    setTimeout(() => {
      setIsRevealed(true);
    }, 600);
  };

  const handleReset = () => {
    setIsRevealed(false);
    setClickedBoxIndex(null);
    setSelectedActivity(null);
    setCalendarStatus({ text: '', type: '' });
    setDirections(null);
    fetchBatch();
  };

  const handleMapsRedirect = () => {
    if (!selectedActivity) return;
    setIsLoadingRoute(true);

    const dest = selectedActivity.destinationQuery || selectedActivity.destination;
    const isApple = /iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent) || 
                    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(navigator.userAgent));
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          let url;
          if (isApple) {
            url = `maps://?saddr=${lat},${lng}&daddr=${encodeURIComponent(dest)}&dirflg=r`;
          } else {
            url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(dest)}&travelmode=transit`;
          }
          const isMobile = isApple || /Android/i.test(navigator.userAgent);
          if (isMobile) {
            window.location.href = url;
          } else {
            window.open(url, '_blank');
          }
          setIsLoadingRoute(false);
        },
        () => {
          const url = isApple 
            ? `maps://?q=${encodeURIComponent(dest)}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
          const isMobile = isApple || /Android/i.test(navigator.userAgent);
          if (isMobile) {
            window.location.href = url;
          } else {
            window.open(url, '_blank');
          }
          setIsLoadingRoute(false);
        }
      );
    } else {
      const url = isApple 
        ? `maps://?q=${encodeURIComponent(dest)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
      const isMobile = isApple || /Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = url;
      } else {
        window.open(url, '_blank');
      }
      setIsLoadingRoute(false);
    }
  };

  const handleSaveToCalendar = () => {
    if (!selectedActivity) return;
    setIsSavingCalendar(true);
    setCalendarStatus({ text: 'Speichere...', type: '' });

    const payload = {
      title: selectedActivity.title,
      description: selectedActivity.description,
      destination: selectedActivity.destination,
      eventDatetime: eventDatetime,
      haileyLarsAlone: aloneWithoutAmy
    };

    fetch(`${apiBaseUrl}/api/calendar/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setIsSavingCalendar(false);
        if (data.success) {
          setCalendarStatus({ text: 'Erfolgreich im Kalender gespeichert!', type: 'success' });
          if (data.eventLink) {
            setTimeout(() => {
              window.open(data.eventLink, '_blank');
            }, 1000);
          }
        } else {
          setCalendarStatus({ text: 'Fehler: ' + data.error, type: 'error' });
        }
      })
      .catch(err => {
        setIsSavingCalendar(false);
        setCalendarStatus({ text: 'Verbindungsfehler zum Kalender-Service.', type: 'error' });
      });
  };

  return (
    <div className="scratch-container">
      <h1 className="page-title">Was machen wir heute?</h1>
      <p className="subtitle">Wähle eine der drei Geheimboxen für unser nächstes Abenteuer!</p>

      {!isRevealed && (
        <div className="options-container">
          <label className="custom-checkbox">
            <input 
              type="checkbox" 
              checked={aloneWithoutAmy}
              onChange={(e) => setAloneWithoutAmy(e.target.checked)}
            />
            <span className="checkmark"></span>
            <span className="label-text">Hailey und Lars alleine <br/><small>(ohne Amy)</small></span>
          </label>
        </div>
      )}

      {/* The 3 Mystery Boxes */}
      {!isRevealed && (
        <div className="boxes-wrapper">
          {[0, 1, 2].map((idx) => {
            const isClicked = clickedBoxIndex === idx;
            const isAnyClicked = clickedBoxIndex !== null;
            return (
              <div 
                key={idx}
                className={`mystery-box ${isClicked ? 'opening' : ''} ${isAnyClicked && !isClicked ? 'hidden' : ''}`}
                onClick={() => handleBoxClick(idx)}
              >
                <i className="fa-solid fa-box-open box-icon"></i>
                <span>Box {idx + 1}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* The Revealed Content */}
      {isRevealed && selectedActivity && (
        <div className="revealed-content">
          <div className="prize-badge"><i className="fa-solid fa-trophy"></i> GEWINN!</div>
          <h2>{selectedActivity.title}</h2>
          <p>{selectedActivity.description}</p>
          
          <div className="date-picker-container">
            <label htmlFor="event-datetime">Wann machen wir das?</label>
            <input 
              type="datetime-local" 
              id="event-datetime"
              className="date-picker-input"
              value={eventDatetime}
              onChange={(e) => setEventDatetime(e.target.value)}
            />
          </div>

          <div className="action-buttons">
            {selectedActivity.recipeUrl ? (
              <a 
                className="btn btn-primary" 
                href={selectedActivity.recipeUrl} 
                target="_blank" 
                rel="noreferrer"
              >
                <i className="fa-solid fa-utensils"></i> Zum Rezept
              </a>
            ) : (
              <button className="btn btn-primary" onClick={handleMapsRedirect} disabled={isLoadingRoute}>
                <i className="fa-solid fa-bus"></i> {isLoadingRoute ? 'Lade Route...' : 'Wie kommen wir dorthin?'}
              </button>
            )}
            
            <button className="btn btn-success" onClick={handleSaveToCalendar} disabled={isSavingCalendar}>
              <i className="fa-solid fa-calendar-check"></i> {isSavingCalendar ? 'Speichere...' : 'Im Kalender speichern'}
            </button>
          </div>

          {calendarStatus.text && (
            <div className={`status-msg ${calendarStatus.type}`}>
              {calendarStatus.text}
            </div>
          )}
        </div>
      )}

      {isRevealed && (
        <button className="btn btn-secondary mt-20" onClick={handleReset}>
          <i className="fa-solid fa-rotate-right"></i> Neue Boxen wählen
        </button>
      )}

      {/* Mothers Day Modal */}
      {showMothersDay && (
        <div className="modal">
          <div className="modal-content">
            <span 
              onClick={onCloseMothersDay}
              style={{
                color: '#fff', 
                position: 'absolute', 
                top: '-15px', 
                right: '-15px', 
                fontSize: '28px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                background: '#333', 
                borderRadius: '50%', 
                width: '40px', 
                height: '40px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              &times;
            </span>
            <h2 style={{ fontFamily: "'Chewy', cursive", color: '#d63031', fontSize: '2.5rem', marginBottom: '20px' }}>
              <i className="fa-solid fa-heart"></i> Alles Liebe zum Muttertag!
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#2d3436', lineHeight: '1.6', fontFamily: "'Outfit', sans-serif" }}>
              Herzlichen Glückwunsch zum Muttertag. Jetzt bist du seit fast 6 jahren Mutter und du meisterst das einfach
              mega. Deine Nerven liegen oft blank und trotzdem liebst du jeden, du bist eine Wunderschöne Frau die weder
              ich noch Hailey mehr missen wollen. Bleib so wie du bist. Dies ist das Zufallsunternehmungstool, ich habe
              das entwickelt um Aktivitäten zu planen. Auf dich warten hier 179 Aktivitäten die ich für dich
              rausgesucht habe. Alle Termine die du hier setzt werden von mir geplant und durchgeführt. Du musst dich also
              um nichts mehr kümmern. Dies ist ein Rundum Sorglos Paket. Du bist die aller beste Mama und Freundin der
              Welt. Wir lieben dich über alles.
            </p>
            <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#d63031', marginTop: '25px', fontFamily: "'Chewy', cursive" }}>
              In Liebe,<br/>Hailey und Lars
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
