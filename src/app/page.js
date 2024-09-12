'use client';

import { useEffect, useState } from 'react';
import { openDB } from 'idb';

export default function Home() {
  const [coords, setCoords] = useState({ latitude: '', longitude: '' });
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [db, setDb] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
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

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    } finally {
      setIsChecking(false);
    }
  };

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
    const isServerOnline = await checkConnection();
    const formData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: new Date().toISOString(),
    };
    await db.add('forms', formData);
    const forms = await db.getAll('forms');
    forms.forEach(async (form) => console.log(form))
    if (isServerOnline) {
      await sendDataToServer(formData);
    } else {
      await db.add('forms', formData);

    }
    alert("Formulář odeslán")
  };

  const sendDataToServer = async (formData) => {
    //sendData on hook Make.com
    console.log("Data to webhook")
  };

  const syncOfflineData = async () => {
    const forms = await db.getAll('forms');
    forms.forEach(async (form) => {
      await sendDataToServer(form);
      await db.delete('forms', form.id);
    });
  };

  useEffect(() => {
    if (isOnline && db) {
      syncOfflineData();
    }
  }, [isOnline, db, syncOfflineData]);

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
          Získej GPS souřadnice
        </button>
        <br></br>
        <button type="submit">Poslat</button>
      </form>
      {!isOnline && <p>Jste offline, vaše data budou poslány až budete online</p>}
    </div>
  );
}
