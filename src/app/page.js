'use client';

import { useEffect, useState } from 'react';
import { openDB } from 'idb';

export default function Home() {
  const [coords, setCoords] = useState({ latitude: '', longitude: '' });
  const [isOnline, setIsOnline] = useState(true);
  const [db, setDb] = useState(null);

  useEffect(() => {
    // Initialize IndexedDB on mount
    const initDB = async () => {
      const database = await openDB('formDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('forms')) {
            db.createObjectStore('forms', { keyPath: 'id', autoIncrement: true });
          }
        },
      });
      setDb(database);
    };
    initDB();

    // Network status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getCoords = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      });
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: new Date().toISOString(),
    };

    if (isOnline) {
      // Send data to server
      await sendDataToServer(formData);
    } else {
      // Save to IndexedDB
      await db.add('forms', formData);
    }
  };

  const sendDataToServer = async (formData) => {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      console.log('Data sent successfully!');
    } catch (error) {
      console.error('Failed to send data:', error);
    }
  };

  const syncOfflineData = async () => {
    const forms = await db.getAll('forms');
    forms.forEach(async (form) => {
      await sendDataToServer(form);
      await db.delete('forms', form.id); // Remove after sync
    });
  };

  // Sync data when going online
  useEffect(() => {
    if (isOnline && db) {
      syncOfflineData();
    }
  }, [isOnline, db]);

  return (
    <div>
      <h1>GPS Form</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Latitude: {coords.latitude}</label>
        </div>
        <div>
          <label>Longitude: {coords.longitude}</label>
        </div>
        <button type="button" onClick={getCoords}>
          Get GPS Coordinates
        </button>
        <br></br>
        <button type="submit">Submit</button>
      </form>
      {!isOnline && <p>You are offline. Your data will be sent when you're back online.</p>}
    </div>
  );
}
