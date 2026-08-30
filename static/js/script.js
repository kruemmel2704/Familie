document.addEventListener('DOMContentLoaded', () => {
    const revealedContent = document.getElementById('revealed-content');
    const titleEl = document.getElementById('activity-title');
    const descEl = document.getElementById('activity-description');
    const btnMaps = document.getElementById('btn-maps');
    const btnRecipe = document.getElementById('btn-recipe');
    const btnCalendar = document.getElementById('btn-calendar');
    const btnReset = document.getElementById('btn-reset');
    const cbAlone = document.getElementById('hailey-lars-alone');
    const statusMsg = document.getElementById('calendar-status');
    const boxesWrapper = document.getElementById('boxes-wrapper');
    const mysteryBoxes = document.querySelectorAll('.mystery-box');
    const datePickerContainer = document.getElementById('date-picker-container');
    const eventDatetime = document.getElementById('event-datetime');

    let isRevealed = false;
    let currentActivity = null;
    let currentActivities = window.PRELOADED_ACTIVITIES || [];

    if (!boxesWrapper) return; // Not on the index page

    function getNextHourDatetimeLocal() {
        const date = new Date();
        date.setHours(date.getHours() + 1);
        date.setMinutes(0);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function fetchActivity() {
        fetch('/get_activities_batch')
            .then(res => res.json())
            .then(data => {
                currentActivities = data;
            });
    }

    function revealBox(clickedBox) {
        if (isRevealed) return;
        if (!currentActivities || currentActivities.length < 3) return;
        isRevealed = true;
        
        const boxIndex = parseInt(clickedBox.getAttribute('data-box')) - 1;
        currentActivity = currentActivities[boxIndex];
        
        titleEl.textContent = currentActivity.title;
        descEl.textContent = currentActivity.description;

        // Hide other boxes
        mysteryBoxes.forEach(box => {
            if (box !== clickedBox) {
                box.classList.add('hidden');
            }
        });

        // Animate clicked box
        clickedBox.classList.add('opening');

        setTimeout(() => {
            boxesWrapper.style.display = 'none';
            const ideaBtnContainer = document.getElementById('idea-button-container');
            if (ideaBtnContainer) ideaBtnContainer.style.display = 'none';
            revealedContent.style.display = 'flex';
            
            if (datePickerContainer) {
                datePickerContainer.style.display = 'block';
                eventDatetime.value = getNextHourDatetimeLocal();
            }
            
            if (currentActivity && currentActivity.recipe_url) {
                if (btnRecipe) {
                    btnRecipe.href = currentActivity.recipe_url;
                    btnRecipe.style.display = 'inline-flex';
                }
                btnMaps.style.display = 'none';
            } else {
                if (btnRecipe) btnRecipe.style.display = 'none';
                btnMaps.style.display = 'inline-flex';
            }
            
            btnCalendar.style.display = 'inline-flex';
            btnReset.style.display = 'inline-flex';
        }, 600); // Matches the animation duration
    }

    mysteryBoxes.forEach(box => {
        box.addEventListener('click', () => revealBox(box));
    });

    // Custom Idea Modal Logic
    const btnIdeaPrompt = document.getElementById('btn-idea-prompt');
    const ideaModal = document.getElementById('idea-modal');
    const closeIdeaModal = document.getElementById('close-idea-modal');
    const ideaInput = document.getElementById('idea-input');
    const btnSubmitIdea = document.getElementById('btn-submit-idea');
    const ideaBtnContainer = document.getElementById('idea-button-container');

    if (btnIdeaPrompt && ideaModal) {
        btnIdeaPrompt.addEventListener('click', () => {
            ideaModal.style.display = 'flex';
            if (ideaInput) ideaInput.focus();
        });

        if (closeIdeaModal) {
            closeIdeaModal.addEventListener('click', () => {
                ideaModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === ideaModal) {
                ideaModal.style.display = 'none';
            }
        });

        function submitCustomIdea() {
            const val = ideaInput ? ideaInput.value.trim() : '';
            if (!val) {
                alert("Bitte gib eine Idee ein.");
                return;
            }

            btnSubmitIdea.disabled = true;
            btnSubmitIdea.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> KI sucht Ziel...';

            fetch('/search_activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea: val })
            })
            .then(res => res.json())
            .then(data => {
                btnSubmitIdea.disabled = false;
                btnSubmitIdea.innerHTML = '<i class="fa-solid fa-compass"></i> Passende Aktivität finden';
                ideaModal.style.display = 'none';
                if (ideaInput) ideaInput.value = '';

                currentActivity = data;
                titleEl.textContent = data.title;
                descEl.textContent = data.description;

                isRevealed = true;
                boxesWrapper.style.display = 'none';
                if (ideaBtnContainer) ideaBtnContainer.style.display = 'none';

                revealedContent.style.display = 'flex';

                if (datePickerContainer) {
                    datePickerContainer.style.display = 'block';
                    eventDatetime.value = getNextHourDatetimeLocal();
                }

                if (currentActivity && currentActivity.recipe_url) {
                    if (btnRecipe) {
                        btnRecipe.href = currentActivity.recipe_url;
                        btnRecipe.style.display = 'inline-flex';
                    }
                    btnMaps.style.display = 'none';
                } else {
                    if (btnRecipe) btnRecipe.style.display = 'none';
                    btnMaps.style.display = 'inline-flex';
                }

                btnCalendar.style.display = 'inline-flex';
                btnReset.style.display = 'inline-flex';
            })
            .catch(err => {
                alert("Fehler bei der KI-Suche: " + err);
                btnSubmitIdea.disabled = false;
                btnSubmitIdea.innerHTML = '<i class="fa-solid fa-compass"></i> Passende Aktivität finden';
            });
        }

        if (btnSubmitIdea) {
            btnSubmitIdea.addEventListener('click', submitCustomIdea);
        }
        if (ideaInput) {
            ideaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submitCustomIdea();
            });
        }
    }

    // Reset button
    btnReset.addEventListener('click', () => {
        isRevealed = false;
        
        boxesWrapper.style.display = 'flex';
        if (ideaBtnContainer) ideaBtnContainer.style.display = 'block';
        revealedContent.style.display = 'none';

        
        mysteryBoxes.forEach(box => {
            box.classList.remove('hidden');
            box.classList.remove('opening');
        });

        btnMaps.style.display = 'none';
        if (btnRecipe) btnRecipe.style.display = 'none';
        btnCalendar.style.display = 'none';
        btnReset.style.display = 'none';
        statusMsg.textContent = '';
        statusMsg.className = 'status-msg';
        
        if (datePickerContainer) {
            datePickerContainer.style.display = 'none';
        }
        
        // Reset directions
        const dirContainer = document.getElementById('directions-container');
        if (dirContainer) {
            dirContainer.style.display = 'none';
            document.getElementById('directions-panel').innerHTML = '';
        }
        
        fetchActivity();
    });

    // Maps button
    btnMaps.addEventListener('click', () => {
        if (!currentActivity) return;
        
        btnMaps.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lade Route...';
        
        if (typeof google !== 'undefined' && google.maps) {
            // Use in-app Maps API
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        
                        const directionsService = new google.maps.DirectionsService();
                        const directionsRenderer = new google.maps.DirectionsRenderer();
                        
                        document.getElementById('directions-container').style.display = 'block';
                        directionsRenderer.setPanel(document.getElementById('directions-panel'));
                        
                        directionsService.route({
                            origin: new google.maps.LatLng(lat, lng),
                            destination: currentActivity.destination_query || currentActivity.destination,
                            travelMode: google.maps.TravelMode.TRANSIT
                        }, (response, status) => {
                            if (status === 'OK') {
                                directionsRenderer.setDirections(response);
                                btnMaps.style.display = 'none'; // Hide button after success
                            } else {
                                alert('Routenplanung fehlgeschlagen: ' + status);
                                btnMaps.innerHTML = '<i class="fa-solid fa-bus"></i> Wie kommen wir dorthin?';
                            }
                        });
                    },
                    (error) => {
                        alert("Standort konnte nicht ermittelt werden.");
                        btnMaps.innerHTML = '<i class="fa-solid fa-bus"></i> Wie kommen wir dorthin?';
                    }
                );
            } else {
                alert("Geolocation wird von diesem Browser nicht unterstützt.");
                btnMaps.innerHTML = '<i class="fa-solid fa-bus"></i> Wie kommen wir dorthin?';
            }
        } else {
            // Fallback to opening Google Maps
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        const dest = encodeURIComponent(currentActivity.destination_query || currentActivity.destination);
                        const url = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dest}&travelmode=transit`;
                        window.open(url, '_blank');
                        btnMaps.innerHTML = '<i class="fa-solid fa-bus"></i> Wie kommen wir dorthin?';
                    },
                    (error) => {
                        alert("Standort konnte nicht ermittelt werden. Öffne Karte ohne Startpunkt.");
                        const dest = encodeURIComponent(currentActivity.destination_query || currentActivity.destination);
                        const url = `https://www.google.com/maps/search/?api=1&query=${dest}`;
                        window.open(url, '_blank');
                        btnMaps.innerHTML = '<i class="fa-solid fa-bus"></i> Wie kommen wir dorthin?';
                    }
                );
            } else {
                const dest = encodeURIComponent(currentActivity.destination_query || currentActivity.destination);
                const url = `https://www.google.com/maps/search/?api=1&query=${dest}`;
                window.open(url, '_blank');
            }
        }
    });

    // Calendar button
    btnCalendar.addEventListener('click', () => {
        if (!currentActivity) return;
        
        btnCalendar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Speichere...';
        btnCalendar.disabled = true;

        const payload = {
            ...currentActivity,
            hailey_lars_alone: cbAlone.checked,
            event_datetime: eventDatetime ? eventDatetime.value : null
        };

        fetch('/add_event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                statusMsg.textContent = 'Erfolgreich im Kalender gespeichert!';
                statusMsg.className = 'status-msg success';
                btnCalendar.innerHTML = '<i class="fa-solid fa-check"></i> Gespeichert';
                setTimeout(() => {
                    window.open(data.event_link, '_blank');
                }, 1000);
            } else {
                statusMsg.textContent = 'Fehler: ' + data.error;
                statusMsg.className = 'status-msg error';
                btnCalendar.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Im Kalender speichern';
                btnCalendar.disabled = false;
            }
        })
        .catch(err => {
            statusMsg.textContent = 'Verbindungsfehler.';
            statusMsg.className = 'status-msg error';
            btnCalendar.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Im Kalender speichern';
            btnCalendar.disabled = false;
        });
    });

    // Initialize
    resizeCanvas();
    // fetchActivity(); // Not needed on first load, we use PRELOADED_ACTIVITIES
});
